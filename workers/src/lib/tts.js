// workers/src/lib/tts.js
// Shared TTS helpers for the voice pipeline. ElevenLabs Flash v2.5.

// Default Yap voice — Gigi.
export const ELEVENLABS_DEFAULT_VOICE = 'n7Wi4g1bhpw4Bs8HK5ph';

// profiles.buddy_voice may still hold legacy OpenAI voice names ('shimmer',
// 'alloy', etc.) for users created before the ElevenLabs swap. ElevenLabs IDs
// are ~20 chars; OpenAI names are short — anything under 16 chars falls back.
export function resolveVoice(stored) {
  if (typeof stored === 'string' && stored.length >= 16) return stored;
  return ELEVENLABS_DEFAULT_VOICE;
}

export async function synthesize(text, env, voice) {
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
    const err = await resp.text().catch(() => '');
    throw new Error(`TTS ${resp.status}: ${err.slice(0, 200)}`);
  }
  return await resp.arrayBuffer();
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
