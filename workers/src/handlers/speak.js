// workers/src/handlers/speak.js
// POST /api/speak
// Body: { text: "..." }
// Returns: audio/mpeg stream
//
// Legacy endpoint. The streaming /api/talk endpoint is preferred for the voice
// loop and is what the live frontend uses. Kept here for non-streaming callers
// (CLI debug, future use). Updated to ElevenLabs Flash v2.5 alongside /api/talk.

import { requireUser } from '../lib/auth.js';
import { createSupabase } from '../lib/supabase.js';

const ELEVENLABS_DEFAULT_VOICE = 'n7Wi4g1bhpw4Bs8HK5ph';

function resolveVoice(stored) {
  if (typeof stored === 'string' && stored.length >= 16) return stored;
  return ELEVENLABS_DEFAULT_VOICE;
}

export async function handleSpeak(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);
  const { text } = await request.json();
  if (!text) return new Response('Missing text', { status: 400 });

  const sb = createSupabase(env, token);
  const profiles = await sb.req(`/profiles?id=eq.${userId}&select=buddy_voice&limit=1`);
  const voice = resolveVoice(profiles[0]?.buddy_voice);

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true
      }
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    return new Response(
      JSON.stringify({ error: `TTS: ${err}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(resp.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store'
    }
  });
}
