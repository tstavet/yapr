// workers/src/handlers/resume.js
// POST /api/resume
// Body: none.
// Returns: text/event-stream of:
//   data: {"type":"skip","reason":"..."}        ← gates failed; client does nothing
//   data: {"type":"recall","items":[...]}        ← the moment Yap is anchoring on
//   data: {"type":"text","delta":"..."}          ← the opener line (single event)
//   data: {"type":"audio","b64":"..."}           ← the opener audio (single event)
//   data: {"type":"done","conversationId":"..."}
//   data: {"type":"error","message":"..."}
//
// Gates (all must pass to fire):
//   - User has at least one episodic memory in the last 72h.
//   - Last activity (latest message) was > 4h ago.
//   - last_resumption_at on profile is null or > 1h ago (back-to-back guard).
//
// On fire: creates a fresh conversation, stores Yap's opener as the first
// assistant message, stamps last_resumption_at on the profile.

import { requireUser } from '../lib/auth.js';
import { createSupabase } from '../lib/supabase.js';
import { loadFacts, getOrCreateConversation } from '../lib/memory.js';
import { buildResumptionPrompt } from '../prompts.js';
import { synthesize, arrayBufferToBase64, resolveVoice } from '../lib/tts.js';

const RECENT_MOMENT_WINDOW_MS = 72 * 60 * 60 * 1000;   // 72 hours
// TESTING-MODE GATES — revert before real users.
// Production values: MIN_GAP_SINCE_LAST_ACTIVITY_MS = 4 * 60 * 60 * 1000;
//                    RESUMPTION_COOLDOWN_MS = 60 * 60 * 1000;
const MIN_GAP_SINCE_LAST_ACTIVITY_MS = 2 * 60 * 1000;  // 2 minutes (TESTING)
const RESUMPTION_COOLDOWN_MS = 30 * 1000;              // 30 seconds (TESTING)
const MOMENT_FETCH_LIMIT = 5;

// Light sanitizer — same banned-word safety net as /api/talk. If the model
// slips, we just skip the resumption rather than ship a broken sentence.
const BANNED_REGEX =
  /\b(shit|shits|shitty|bullshit|fuck|fucks|fucked|fucking|fucker|motherfucker|damn|damned|dammit|damnit|goddamn|goddamnit|hell|ass|asses|asshole|asshat|jackass|dumbass|sucks|sucked|sucking|suck|crap|crappy|piss|pissed|pissing|bitch|bitches|bitching|bitchy|bastard|bastards)\b/gi;

export async function handleResume(request, env, ctx) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { userId, token } = await requireUser(request, env);

  // Open the SSE stream first; everything else runs inside work().
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const send = (event) =>
    writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

  const work = async () => {
    try {
      const sb = createSupabase(env, token);
      const now = Date.now();

      // 1. Gate checks. Cheap reads in parallel.
      const cutoffMoments = new Date(now - RECENT_MOMENT_WINDOW_MS).toISOString();
      const [profileRows, lastMessageRows, recentMoments] = await Promise.all([
        sb.req(
          `/profiles?id=eq.${userId}&select=buddy_voice,last_resumption_at&limit=1`
        ),
        sb.req(
          `/messages?user_id=eq.${userId}&order=created_at.desc&limit=1&select=created_at`
        ),
        sb.req(
          `/episodic_memories?user_id=eq.${userId}` +
            `&created_at=gte.${cutoffMoments}` +
            `&order=created_at.desc&limit=${MOMENT_FETCH_LIMIT}` +
            `&select=id,content,created_at`
        )
      ]);

      // Not a first session — must have at least one prior message.
      if (!lastMessageRows.length) {
        await send({ type: 'skip', reason: 'first_session' });
        return;
      }

      // Real gap since last activity.
      const lastActivityAt = new Date(lastMessageRows[0].created_at).getTime();
      if (now - lastActivityAt < MIN_GAP_SINCE_LAST_ACTIVITY_MS) {
        await send({ type: 'skip', reason: 'too_recent' });
        return;
      }

      // Cooldown — don't fire two resumptions back-to-back.
      const lastResumptionAt = profileRows[0]?.last_resumption_at
        ? new Date(profileRows[0].last_resumption_at).getTime()
        : 0;
      if (now - lastResumptionAt < RESUMPTION_COOLDOWN_MS) {
        await send({ type: 'skip', reason: 'cooldown' });
        return;
      }

      // Need at least one recent moment to anchor on.
      if (!recentMoments.length) {
        await send({ type: 'skip', reason: 'no_recent_moments' });
        return;
      }

      // 2. Build the prompt.
      const facts = await loadFacts(sb, userId);
      const nowLabel = new Date(now).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit'
      });
      const systemPrompt = buildResumptionPrompt({
        facts,
        recentMoments,
        now: nowLabel
      });

      // 3. One-shot Claude call. Output is short by design — no streaming
      // overhead is worth it for 1-2 sentences.
      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 120,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content:
                "(she just opened the app — open the conversation with a casual one-line callback to one of the recent moments)"
            }
          ]
        })
      });

      if (!claudeResp.ok) {
        const errText = await claudeResp.text();
        throw new Error(`Claude ${claudeResp.status}: ${errText.slice(0, 200)}`);
      }

      const data = await claudeResp.json();
      const opener = (data.content?.[0]?.text || '').trim();
      if (!opener) {
        await send({ type: 'skip', reason: 'empty_reply' });
        return;
      }

      // Safety net: if the model slipped a banned word, drop the resumption
      // entirely. Beats sending a fragmented sentence.
      if (BANNED_REGEX.test(opener)) {
        BANNED_REGEX.lastIndex = 0;
        console.log('resume sanitizer dropped opener:', opener);
        await send({ type: 'skip', reason: 'sanitized' });
        return;
      }
      BANNED_REGEX.lastIndex = 0;

      // 4. Pick the moment Yap is most likely anchoring on. We can't know
      // which moment Sonnet picked from text alone without re-prompting, so
      // surface all recent moments as the "remembering" hint — UI shows just
      // the chip, not the verbatim text, so it's safe.
      await send({
        type: 'recall',
        items: recentMoments.map((m) => m.content).filter(Boolean)
      });

      // 5. Synthesize and emit.
      const voice = resolveVoice(profileRows[0]?.buddy_voice);
      const audioBuffer = await synthesize(opener, env, voice);
      const b64 = arrayBufferToBase64(audioBuffer);

      await send({ type: 'text', delta: opener });
      await send({ type: 'audio', b64 });

      // 6. Create a fresh conversation so the next /api/talk turn flows into
      // it (scheduleEnd, getOrCreateConversation see the open row). We do NOT
      // persist the opener as a message: a buffer that starts with an
      // assistant message breaks Claude's alternating-roles requirement on the
      // next turn. Yap will pick up context from the user's actual reply.
      const conversation = await getOrCreateConversation(sb, userId);
      ctx.waitUntil(
        sb
          .req(`/profiles?id=eq.${userId}`, {
            method: 'PATCH',
            body: JSON.stringify({ last_resumption_at: new Date(now).toISOString() })
          })
          .catch((err) => console.error('last_resumption_at update failed:', err))
      );

      await send({ type: 'done', conversationId: conversation.id });
    } catch (err) {
      console.error('resume error:', err);
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
