// workers/src/handlers/end-conversation.js
// POST /api/end-conversation
// Body: { conversationId: "..." }
//
// When Victoria closes the app or times out:
//   1. Mark conversation ended
//   2. Run fact extraction (Haiku) → update user_facts
//   3. Run episodic extraction (Haiku) → insert embeddings into episodic_memories
//
// These run in ctx.waitUntil so the client doesn't wait for them.

import { requireUser } from '../lib/auth.js';
import { createSupabase, createAdminSupabase } from '../lib/supabase.js';
import { FACT_EXTRACTION_PROMPT, EPISODIC_EXTRACTION_PROMPT } from '../prompts.js';
import { embed } from '../lib/memory.js';

export async function handleEndConversation(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);
  const { conversationId } = await request.json();
  if (!conversationId) return new Response('Missing conversationId', { status: 400 });

  const sb = createSupabase(env, token);

  // Mark ended immediately
  await sb.req(`/conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ended_at: new Date().toISOString() })
  });

  // Kick off memory extraction in the background
  ctx.waitUntil(runMemoryExtraction({ conversationId, userId, env }));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function runMemoryExtraction({ conversationId, userId, env }) {
  const admin = createAdminSupabase(env);

  // Load full transcript
  const messages = await admin.req(
    `/messages?conversation_id=eq.${conversationId}&order=created_at.asc`
  );
  if (!messages.length) return;

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Kones'}: ${m.content}`)
    .join('\n');

  // Run both extractions in parallel
  await Promise.all([
    extractFacts({ transcript, userId, admin, env }),
    extractEpisodic({ transcript, userId, conversationId, admin, env })
  ]);
}

async function extractFacts({ transcript, userId, admin, env }) {
  try {
    // Load existing facts
    const rows = await admin.req(`/user_facts?user_id=eq.${userId}&limit=1`);
    const existing = rows[0]?.facts || {};

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: FACT_EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Current known facts:\n${JSON.stringify(existing, null, 2)}\n\nNew conversation:\n${transcript}`
          }
        ]
      })
    });

    if (!resp.ok) {
      console.error('Fact extraction failed:', await resp.text());
      return;
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text || '{}';
    const parsed = safeParseJson(raw);
    if (!parsed) return;

    const updated = { ...existing, ...(parsed.add_or_update || {}) };
    for (const key of parsed.remove || []) delete updated[key];

    await admin.req(`/user_facts?user_id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ facts: updated, updated_at: new Date().toISOString() })
    });
  } catch (err) {
    console.error('extractFacts error:', err);
  }
}

async function extractEpisodic({ transcript, userId, conversationId, admin, env }) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: EPISODIC_EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: transcript }]
      })
    });

    if (!resp.ok) {
      console.error('Episodic extraction failed:', await resp.text());
      return;
    }

    const data = await resp.json();
    const raw = data.content?.[0]?.text || '{}';
    const parsed = safeParseJson(raw);
    if (!parsed?.moments?.length) return;

    // Embed each moment and insert
    for (const moment of parsed.moments) {
      try {
        const embedding = await embed(moment, env);
        await admin.req('/episodic_memories', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            conversation_id: conversationId,
            content: moment,
            embedding
          })
        });
      } catch (err) {
        console.error('Failed to store moment:', moment, err);
      }
    }
  } catch (err) {
    console.error('extractEpisodic error:', err);
  }
}

function safeParseJson(s) {
  try {
    // Strip markdown fences if present
    const cleaned = s.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
