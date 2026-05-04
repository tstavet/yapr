// workers/src/handlers/chat.js
// POST /api/chat
// Body: { text: "what the user just said" }
// Returns: { reply: "kones's response", conversationId: "..." }
//
// Legacy non-streaming endpoint. /api/talk is preferred. This is kept
// for any non-streaming callers (debug tools, future text-only mode).

import { requireUser } from '../lib/auth.js';
import { createSupabase } from '../lib/supabase.js';
import {
  getOrCreateConversation,
  loadSessionBuffer,
  loadFacts,
  loadRelevantMemories,
  appendMessage
} from '../lib/memory.js';
import { buildSystemPrompt } from '../prompts.js';

export async function handleChat(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);
  const { text } = await request.json();
  if (!text || typeof text !== 'string') {
    return new Response('Missing text', { status: 400 });
  }

  const sb = createSupabase(env, token);
  const conversation = await getOrCreateConversation(sb, userId);

  await appendMessage(sb, {
    conversationId: conversation.id,
    userId,
    role: 'user',
    content: text
  });

  const [sessionBuffer, facts, relevantMemories] = await Promise.all([
    loadSessionBuffer(sb, conversation.id),
    loadFacts(sb, userId),
    loadRelevantMemories(sb, userId, text, env)
  ]);

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  });
  const systemPrompt = buildSystemPrompt({ facts, relevantMemories, now });

  const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      // System prompt as a structured block with cache_control. The same
      // facts + memories + identity get reused across turns within a
      // conversation, so caching the prefix cuts both latency and cost.
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: sessionBuffer.map((m) => ({ role: m.role, content: m.content }))
    })
  });

  if (!claudeResp.ok) {
    const err = await claudeResp.text();
    return new Response(
      JSON.stringify({ error: `Claude: ${err}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const claudeData = await claudeResp.json();
  const reply = claudeData.content?.[0]?.text || '';

  await appendMessage(sb, {
    conversationId: conversation.id,
    userId,
    role: 'assistant',
    content: reply
  });

  return new Response(
    JSON.stringify({ reply, conversationId: conversation.id }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
