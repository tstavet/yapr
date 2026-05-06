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
import { buildSystemPrompt, YAP_TTS_INSTRUCTIONS, INCREMENTAL_FACT_PROMPT } from '../prompts.js';

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

  // Auth runs synchronously so a 401 stays a 401, not an error event.
  const { userId, token } = await requireUser(request, env);

  // Set up the SSE stream and return it RIGHT AWAY. Everything else — body
  // parsing, Whisper, Supabase, Claude, TTS — happens inside work() with
  // the stream already open. Doing heavy I/O before returning the Response
  // makes iOS Safari give up with "Load failed" and CF kill the worker for
  // appearing hung.
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  const work = async () => {
    let conversationId = null;

    try {
      // 1. Parse the body and (if multipart) run Whisper.
      const contentType = request.headers.get('Content-Type') || '';
      let userText = '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const audio = formData.get('audio');
        if (!audio) {
          await send({ type: 'error', message: 'Missing audio field' });
          return;
        }

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
          await send({ type: 'error', message: `Whisper: ${err.slice(0, 200)}` });
          return;
        }
        const whisperJson = await whisperResp.json();
        userText = (whisperJson.text || '').trim();
      } else {
        const body = await request.json().catch(() => ({}));
        userText = typeof body.text === 'string' ? body.text.trim() : '';
      }

      // 2. Tell the client what we heard (UX win: transcript appears before audio).
      await send({ type: 'transcript', text: userText });

      // 3. Silent / unintelligible audio — close cleanly, no Claude call, no DB write.
      if (!userText || userText.length < 2) {
        await send({ type: 'done', conversationId: null });
        return;
      }

      // 4. Get the conversation and stash the user message in the background.
      const sb = createSupabase(env, token);
      const conversation = await getOrCreateConversation(sb, userId);
      conversationId = conversation.id;
      ctx.waitUntil(
        appendMessage(sb, {
          conversationId,
          userId,
          role: 'user',
          content: userText
        }).catch((err) => console.error('user appendMessage failed:', err))
      );

      // 5. Cheap loads always run.
      const [sessionBuffer, facts, profileRows] = await Promise.all([
        loadSessionBuffer(sb, conversationId),
        loadFacts(sb, userId),
        sb.req(`/profiles?id=eq.${userId}&select=buddy_voice&limit=1`)
      ]);

      // 6. Episodic recall: skip when input is short or facts are empty
      // (a brand-new user almost certainly has no memories either). Cap at
      // 600ms so a slow embedding never tanks TTFT.
      const RECALL_TIMEOUT_MS = 600;
      const haveAnyFacts = facts && Object.keys(facts).length > 0;
      const queryWorthRecall = userText.length >= 16 && haveAnyFacts;
      let relevantMemories = [];
      if (queryWorthRecall) {
        relevantMemories = await Promise.race([
          loadRelevantMemories(sb, userId, userText, env).catch((err) => {
            console.error('memory load failed:', err);
            return [];
          }),
          new Promise((resolve) => setTimeout(() => resolve([]), RECALL_TIMEOUT_MS))
        ]);
      }

      // Tell the client what Yap is recalling this turn (if anything). Lets
      // the UI surface "remembers: …" so the moat is visible to the user.
      if (relevantMemories.length > 0) {
        await send({
          type: 'recall',
          items: relevantMemories.map((m) => m.content).filter(Boolean)
        });
      }

      const voice = profileRows[0]?.buddy_voice || 'shimmer';
      const now = new Date().toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit'
      });
      const systemPrompt = buildSystemPrompt({ facts, relevantMemories, now });

      // 7. Build Claude messages. Append current turn since the user-msg
      // write went into waitUntil and almost certainly hasn't landed yet.
      const claudeMessages = sessionBuffer.map((m) => ({ role: m.role, content: m.content }));
      const last = claudeMessages[claudeMessages.length - 1];
      if (!(last && last.role === 'user' && last.content === userText)) {
        claudeMessages.push({ role: 'user', content: userText });
      }

      // 8. Sentence-level streaming pipeline. Each completed sentence is
      // sanitized, sent as a text event, and TTS'd in parallel; audio events
      // are emitted in generation order via emitTail.
      let fullReply = '';
      let sentenceBuffer = '';
      let emitTail = Promise.resolve();
      let firstFlush = true;

      const flushSentence = () => {
        const raw = sentenceBuffer.trim();
        sentenceBuffer = '';
        if (!raw) return;
        const sentence = sanitize(raw);
        if (!sentence) return;
        const textPromise = send({ type: 'text', delta: sentence + ' ' });
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

      // 9. Call Claude with streaming + prompt caching on the system prompt.
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
        throw new Error(`Claude ${claudeResp.status}: ${errText.slice(0, 200)}`);
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
            sentenceBuffer += delta;
            fullReply += delta;

            const endsWithTerminator = /[.!?][\s)"'\]]?\s*$/.test(sentenceBuffer);
            if (endsWithTerminator) {
              flushSentence();
            } else if (firstFlush && sentenceBuffer.length > 12 && /,\s*$/.test(sentenceBuffer)) {
              flushSentence();
            } else if (sentenceBuffer.length > 80 && /,\s*$/.test(sentenceBuffer)) {
              flushSentence();
            }
          }
        }
      }

      if (sentenceBuffer.trim()) flushSentence();
      await emitTail;

      // 10. Persist the SANITIZED reply so banned words can't leak into
      // future-turn context.
      const cleanReply = sanitize(fullReply);
      ctx.waitUntil(
        appendMessage(sb, {
          conversationId,
          userId,
          role: 'assistant',
          content: cleanReply
        }).catch((err) => console.error('assistant appendMessage failed:', err))
      );

      // 11. Incremental memory extraction — fire-and-forget. After every turn
      // we ask Haiku "anything fact-worthy in this exchange?" and merge any
      // result into user_facts. Replaces the broken end-of-conversation
      // trigger with something that just works on every turn.
      ctx.waitUntil(
        extractFactsIncremental({
          userText,
          replyText: cleanReply,
          existingFacts: facts,
          sb,
          userId,
          env
        }).catch((err) => console.error('fact extraction failed:', err))
      );

      await send({ type: 'done', conversationId });
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

// Per-turn fact extraction. Looks at just the latest exchange + already-known
// facts. Most turns are no-ops; exchanges with new info merge into user_facts.
// Runs in ctx.waitUntil so it never blocks the response stream.
async function extractFactsIncremental({ userText, replyText, existingFacts, sb, userId, env }) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: INCREMENTAL_FACT_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            `Known facts:\n${JSON.stringify(existingFacts || {}, null, 2)}\n\n` +
            `This exchange:\nUser: ${userText}\nYap: ${replyText}`
        }
      ]
    })
  });
  if (!resp.ok) {
    console.error('Incremental fact extraction non-OK:', await resp.text());
    return;
  }

  const data = await resp.json();
  const raw = data.content?.[0]?.text || '{}';
  const parsed = safeParseJson(raw);
  if (!parsed) return;

  const addUpdate = parsed.add_or_update || {};
  const remove = Array.isArray(parsed.remove) ? parsed.remove : [];
  if (Object.keys(addUpdate).length === 0 && remove.length === 0) return;

  const updated = { ...(existingFacts || {}), ...addUpdate };
  for (const key of remove) delete updated[key];

  // user_facts row is created on signup by the handle_new_user trigger, so
  // PATCH is enough — no upsert. The user owns the row, RLS lets them write.
  await sb.req(`/user_facts?user_id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ facts: updated, updated_at: new Date().toISOString() })
  });

  console.log('Facts updated:', {
    added: Object.keys(addUpdate),
    removed: remove
  });
}

function safeParseJson(s) {
  try {
    // Strip markdown code fences if Haiku wraps the JSON.
    const cleaned = s.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
