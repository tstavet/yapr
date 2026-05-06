// workers/src/handlers/talk.js
// POST /api/talk
// Body (preferred): multipart/form-data with 'audio' field — Whisper runs inline.
// Body (debug):     application/json { text } — skips Whisper, useful from CLI.
// Returns: text/event-stream of:
//   data: {"type":"transcript","text":"..."} ← what Whisper heard (only on multipart)
//   data: {"type":"text","delta":"..."}      ← partial reply (sanitized, sentence-level)
//   data: {"type":"audio","b64":"..."}       ← one sentence of mp3, base64
//   data: {"type":"done","conversationId":"..."}
//   data: {"type":"error","message":"..."}

import { requireUser } from '../lib/auth.js';
import { createSupabase } from '../lib/supabase.js';
import {
  getOrCreateConversation,
  loadSessionBuffer,
  loadFacts,
  loadRelevantMemories,
  appendMessage
} from '../lib/memory.js';
import { buildSystemPrompt, YAP_TTS_INSTRUCTIONS } from '../prompts.js';

// Banned words. Stripped from anything Yap says before it reaches TTS or
// the visible transcript. Belt-and-suspenders for the prompt rule —
// because Haiku has been observed to slip even with a strong rule.
// Whole-word match only, case-insensitive.
const BANNED_WORDS = [
  'shit', 'shits', 'shitty', 'bullshit',
  'fuck', 'fucks', 'fucked', 'fucking', 'fucker', 'motherfucker',
  'damn', 'damned', 'dammit', 'damnit', 'goddamn', 'goddamnit',
  'hell',
  'ass', 'asses', 'asshole', 'asshat', 'jackass', 'dumbass',
  'sucks', 'sucked', 'sucking', 'suck',
  'crap', 'crappy',
  'piss', 'pissed', 'pissing',
  'bitch', 'bitches', 'bitching', 'bitchy',
  'bastard', 'bastards'
];
const BANNED_REGEX = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'gi');

function sanitize(text) {
  return text
    .replace(BANNED_REGEX, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([,;:])\s*([,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function handleTalk(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);

  // Accept either multipart audio (the phone's hot path) or JSON {text} (debug).
  // We open the SSE stream BEFORE any awaits we don't have to make the client wait
  // on, but Whisper has to finish before we know the transcript or whether to bail,
  // so it stays inline. Net effect: one device round-trip instead of two.
  const contentType = request.headers.get('Content-Type') || '';
  let userText = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const audio = formData.get('audio');
    if (!audio) return new Response('Missing audio field', { status: 400 });

    const whisperForm = new FormData();
    whisperForm.append('file', audio, 'audio.webm');
    whisperForm.append('model', 'gpt-4o-mini-transcribe');
    whisperForm.append('response_format', 'json');

    const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: whisperForm
    });
    if (!whisperResp.ok) {
      const err = await whisperResp.text();
      return new Response(
        JSON.stringify({ error: `Whisper: ${err}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const whisperJson = await whisperResp.json();
    userText = (whisperJson.text || '').trim();
  } else {
    const body = await request.json();
    userText = typeof body.text === 'string' ? body.text.trim() : '';
  }

  // Silent / unintelligible audio — most common failure mode. Stream a transcript
  // event so the client can clear the spinner, then close. No Claude call, no DB write.
  if (!userText || userText.length < 2) {
    const emptyStream = new TransformStream();
    const w = emptyStream.writable.getWriter();
    const enc = new TextEncoder();
    w.write(enc.encode(`data: ${JSON.stringify({ type: 'transcript', text: userText || '' })}\n\n`));
    w.write(enc.encode(`data: ${JSON.stringify({ type: 'done', conversationId: null })}\n\n`));
    w.close();
    return new Response(emptyStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  }

  const sb = createSupabase(env, token);
  const conversation = await getOrCreateConversation(sb, userId);
  // User-message write doesn't need to block Claude — it just has to land before
  // the next turn's loadSessionBuffer. Push it into waitUntil.
  ctx.waitUntil(
    appendMessage(sb, {
      conversationId: conversation.id,
      userId,
      role: 'user',
      content: userText
    }).catch((err) => console.error('user appendMessage failed:', err))
  );

  const [sessionBuffer, facts, relevantMemories, profileRows] = await Promise.all([
    loadSessionBuffer(sb, conversation.id),
    loadFacts(sb, userId),
    loadRelevantMemories(sb, userId, userText, env),
    sb.req(`/profiles?id=eq.${userId}&select=buddy_voice&limit=1`)
  ]);

  const voice = profileRows[0]?.buddy_voice || 'shimmer';
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit'
  });
  const systemPrompt = buildSystemPrompt({ facts, relevantMemories, now });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  // Tell the client what Whisper heard before Claude starts. UX win: the
  // transcript pane fills in immediately instead of waiting for first audio.
  await send({ type: 'transcript', text: userText });

  // We pushed the user-message write into waitUntil, so loadSessionBuffer
  // almost certainly didn't include this turn. Append it in-memory for Claude.
  // If the buffer somehow did land first, drop the trailing duplicate to keep
  // Anthropic happy about non-consecutive same-role messages.
  const claudeMessages = sessionBuffer.map((m) => ({ role: m.role, content: m.content }));
  const last = claudeMessages[claudeMessages.length - 1];
  if (!(last && last.role === 'user' && last.content === userText)) {
    claudeMessages.push({ role: 'user', content: userText });
  }

  const work = async () => {
    let fullReply = '';
    let buffer = '';
    let emitTail = Promise.resolve();
    let firstFlush = true;

    const flushSentence = () => {
      const raw = buffer.trim();
      buffer = '';
      if (!raw) return;
      // Sanitize before anything else sees this sentence.
      const sentence = sanitize(raw);
      if (!sentence) return; // entire sentence was banned words, just skip
      // Emit sanitized text to the frontend (replaces token-level streaming).
      const textPromise = send({ type: 'text', delta: sentence + ' ' });
      // Fire TTS in parallel; serialize emission order via emitTail.
      const ttsPromise = synthesize(sentence, env, voice).catch((err) => {
        console.error('TTS error:', err);
        return null;
      });
      emitTail = emitTail
        .then(() => textPromise)
        .then(async () => {
          const audioBuffer = await ttsPromise;
          if (!audioBuffer) return;
          const b64 = arrayBufferToBase64(audioBuffer);
          await send({ type: 'audio', b64 });
        });
      firstFlush = false;
    };

    try {
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
          stream: true,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: claudeMessages
        })
      });

      if (!claudeResp.ok) {
        const errText = await claudeResp.text();
        throw new Error(`Claude ${claudeResp.status}: ${errText}`);
      }

      const reader = claudeResp.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });

        const lines = pending.split('\n');
        pending = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          let evt;
          try {
            evt = JSON.parse(data);
          } catch {
            continue;
          }

          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            const delta = evt.delta.text;
            buffer += delta;
            fullReply += delta;

            const endsWithTerminator = /[.!?][\s)"'\]]?\s*$/.test(buffer);
            if (endsWithTerminator) {
              flushSentence();
            } else if (firstFlush && buffer.length > 12 && /,\s*$/.test(buffer)) {
              flushSentence();
            } else if (buffer.length > 80 && /,\s*$/.test(buffer)) {
              flushSentence();
            }
          }
        }
      }

      if (buffer.trim()) flushSentence();

      await emitTail;

      // Persist the SANITIZED reply, not the raw one. We don't want banned
      // words sitting in conversation history influencing future turns.
      const cleanReply = sanitize(fullReply);
      await appendMessage(sb, {
        conversationId: conversation.id,
        userId,
        role: 'assistant',
        content: cleanReply
      });

      await send({ type: 'done', conversationId: conversation.id });
    } catch (err) {
      console.error('talk error:', err);
      try {
        await send({ type: 'error', message: err.message || 'unknown error' });
      } catch {}
    } finally {
      try {
        await writer.close();
      } catch {}
    }
  };

  ctx.waitUntil(work());

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}

async function synthesize(text, env, voice) {
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
      instructions: YAP_TTS_INSTRUCTIONS,
      response_format: 'mp3',
      speed: 1.0
    })
  });
  if (!resp.ok) throw new Error(`TTS ${resp.status}`);
  return await resp.arrayBuffer();
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
