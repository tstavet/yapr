import { supabase } from './supabase';

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

export async function transcribe(audioBlob) {
  const headers = await authHeaders();
  const form = new FormData();
  form.append('audio', audioBlob, 'audio.webm');
  const resp = await fetch(`${WORKER_URL}/api/transcribe`, {
    method: 'POST',
    headers,
    body: form
  });
  if (!resp.ok) throw new Error(`Transcribe failed: ${resp.status}`);
  return resp.json();
}

export async function chat(text) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  const resp = await fetch(`${WORKER_URL}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  if (!resp.ok) throw new Error(`Chat failed: ${resp.status}`);
  return resp.json();
}

export async function speak(text) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  const resp = await fetch(`${WORKER_URL}/api/speak`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  if (!resp.ok) throw new Error(`Speak failed: ${resp.status}`);
  return resp.blob();
}

/**
 * Streaming chat + TTS. Replaces the chained chat() + speak() calls.
 * Calls onEvent for each SSE message:
 *   { type: 'text', delta: '...' }
 *   { type: 'audio', b64: '...' }
 *   { type: 'done', conversationId: '...' }
 *   { type: 'error', message: '...' }
 *
 * Resolves when the stream closes. onEvent may be async; we await it
 * before reading more bytes (back-pressure on the caller).
 */
export async function streamTalk(text, onEvent) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  const resp = await fetch(`${WORKER_URL}/api/talk`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text })
  });
  if (!resp.ok || !resp.body) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`talk: ${resp.status} ${txt}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by a blank line ("\n\n").
    const messages = buffer.split('\n\n');
    buffer = messages.pop();

    for (const msg of messages) {
      const line = msg.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      try {
        const event = JSON.parse(data);
        await onEvent(event);
      } catch (err) {
        console.warn('bad SSE event', data, err);
      }
    }
  }
}

export async function endConversation(conversationId) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  await fetch(`${WORKER_URL}/api/end-conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ conversationId })
  });
}
