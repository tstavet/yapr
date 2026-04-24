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

export async function endConversation(conversationId) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  await fetch(`${WORKER_URL}/api/end-conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ conversationId })
  });
}
