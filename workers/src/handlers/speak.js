// workers/src/handlers/speak.js
// POST /api/speak
// Body: { text: "..." }
// Returns: audio/mpeg stream

import { requireUser } from '../lib/auth.js';
import { createSupabase } from '../lib/supabase.js';

export async function handleSpeak(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);
  const { text } = await request.json();
  if (!text) return new Response('Missing text', { status: 400 });

  // Load voice preference from profile
  const sb = createSupabase(env, token);
  const profiles = await sb.req(`/profiles?id=eq.${userId}&select=buddy_voice&limit=1`);
  const voice = profiles[0]?.buddy_voice || 'shimmer';

 const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      instructions: "Speak like you're chatting with your best friend on the phone: bubbly and super engaged. "You are a kind, gentle friend speaking softly to someone you care about deeply. Your tone is warm, patient, and unhurried. Smile while you speak — you can hear it. Speak at a relaxed, even pace. Be soothing, never sharp. Sound like you have all the time in the world for this person.",
      response_format: 'mp3',
      speed: 1.0
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(
      JSON.stringify({ error: `TTS: ${err}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream audio back to the client
  return new Response(resp.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  });
}
