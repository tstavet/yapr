// workers/src/lib/memory.js
// The three-layer memory system.
//
//   L1: session buffer  — last N messages, verbatim
//   L2: structured facts — living bio, merged into system prompt
//   L3: episodic memory  — vector search over past moments

import { createSupabase, createAdminSupabase } from './supabase.js';

const SESSION_BUFFER_SIZE = 20;
const EPISODIC_MATCH_COUNT = 3;

// Generate an embedding via OpenAI
export async function embed(text, env) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });
  if (!resp.ok) throw new Error(`Embedding failed: ${await resp.text()}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

// Layer 1 — session buffer
export async function loadSessionBuffer(sb, conversationId) {
  const rows = await sb.req(
    `/messages?conversation_id=eq.${conversationId}&order=created_at.asc&limit=${SESSION_BUFFER_SIZE}`
  );
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

// Layer 2 — structured facts
export async function loadFacts(sb, userId) {
  const rows = await sb.req(`/user_facts?user_id=eq.${userId}&limit=1`);
  return rows[0]?.facts || {};
}

// Layer 3 — episodic memories via semantic search.
// Callers should gate on bigger heuristics before calling — this is the
// last-resort floor to avoid wasting an embedding call on a single word.
export async function loadRelevantMemories(sb, userId, queryText, env) {
  if (!queryText || queryText.length < 16) return [];
  const embedding = await embed(queryText, env);
  const rows = await sb.rpc('match_memories', {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: EPISODIC_MATCH_COUNT
  });
  return rows || [];
}

// Write a user or assistant message to the session buffer
export async function appendMessage(sb, { conversationId, userId, role, content }) {
  await sb.req('/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content
    })
  });
}

// Get or create the active conversation for this user.
// v1 rule: one open conversation at a time. Ends after 30 min of inactivity.
export async function getOrCreateConversation(sb, userId) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const open = await sb.req(
    `/conversations?user_id=eq.${userId}&ended_at=is.null&started_at=gte.${thirtyMinAgo}&order=started_at.desc&limit=1`
  );
  if (open.length) return open[0];

  const [created] = await sb.req('/conversations', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  });
  return created;
}
