// workers/src/handlers/chat.js
// POST /api/chat
// Body: { text: "what the user just said" }
// Returns: { reply: "kones's response", conversationId: "..." }

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

  // 1. Get or create the active conversation
  const conversation = await getOrCreateConversation(sb, userId);

  // 2. Write the user message immediately (so it's in the buffer for this turn)
  await appendMessage(sb, {
    conversationId: conversation.id,
    userId,
    role: 'user',
    content: text
  });

  // 3. Load the three memory layers in parallel
  const [sessionBuffer, facts, relevantMemories] = await Promise.all([
    loadSessionBuffer(sb, conversation.id),
    loadFacts(sb, userId),
    loadRelevantMemories(sb, userId, text, env)
  ]);

  // 4. Build the system prompt
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',  // TODO: pull from profile
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  });
  const systemPrompt = buildSystemPrompt({ facts, relevantMemories, now });

  // 5. Call Claude
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
      system: systemPrompt,
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

  // 6. Persist the assistant message
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
