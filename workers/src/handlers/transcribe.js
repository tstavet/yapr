// workers/src/handlers/transcribe.js
// POST /api/transcribe
// Body: multipart/form-data with 'audio' field (webm/mp4/wav)
// Returns: { text: "..." }

import { requireUser } from '../lib/auth.js';

export async function handleTranscribe(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  await requireUser(request, env);

  const formData = await request.formData();
  const audio = formData.get('audio');
  if (!audio) return new Response('Missing audio field', { status: 400 });

  // Forward to OpenAI Whisper
  const whisperForm = new FormData();
  whisperForm.append('file', audio, 'audio.webm');
  whisperForm.append('model', 'gpt-4o-mini-transcribe');
  whisperForm.append('response_format', 'json');

  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: whisperForm
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(
      JSON.stringify({ error: `Whisper: ${err}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await resp.json();
  return new Response(JSON.stringify({ text: data.text }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
