
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { streamTalk, endConversation } from '../lib/api';
import { StreamingAudioPlayer } from '../lib/audioPlayer';
import Orb from '../components/Orb';

// States of the conversation loop:
//   idle       — waiting for her to tap
//   listening  — mic open, recording (auto-stops on silence via VAD)
//   thinking   — waiting on transcribe + first audio chunk
//   speaking   — audio playing (more chunks may still be arriving)
//
// Flow: tap → listening → (silence or tap) → thinking → speaking → idle

export default function Talk() {
  const [state, setState] = useState('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [recallHints, setRecallHints] = useState([]);
  const [error, setError] = useState('');

  const audioCtxRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const playerRef = useRef(null);
  const conversationIdRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const autoStopFiredRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const handleSilenceDetected = useCallback(() => {
    if (autoStopFiredRef.current) return;
    autoStopFiredRef.current = true;
    queueMicrotask(() => finishListening());
  }, []);

  const { level, start, stop } = useVoiceRecorder({
    getAudioContext,
    onSilence: handleSilenceDetected
  });

  const scheduleEnd = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(async () => {
      if (conversationIdRef.current) {
        try {
          await endConversation(conversationIdRef.current);
        } catch (e) {
          console.error('Failed to end conversation:', e);
        }
        conversationIdRef.current = null;
      }
    }, 30 * 60 * 1000);
  }, []);

  useEffect(() => {
    const handleUnload = () => {
      if (conversationIdRef.current) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_WORKER_URL}/api/end-conversation`,
          JSON.stringify({ conversationId: conversationIdRef.current })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  async function finishListening() {
    setState('thinking');
    try {
      const blob = await stop();
      if (!blob || blob.size < 500) {
        setState('idle');
        return;
      }

      setLastReply('');
      setRecallHints([]);

      const player = new StreamingAudioPlayer(getAudioContext());
      playerRef.current = player;

      let firstAudio = false;
      let replyAccum = '';

      // Send the audio blob directly — Whisper now runs inside /api/talk.
      // We get the transcript back as the first SSE event.
      await streamTalk(blob, async (evt) => {
        if (evt.type === 'transcript') {
          if (!evt.text?.trim()) {
            // Silent / unintelligible audio. Server will close shortly.
            setState('idle');
            return;
          }
          setLastTranscript(evt.text);
        } else if (evt.type === 'recall') {
          // Yap is recalling something specific from past conversations.
          // Surface it so memory is visible — the moat made legible.
          setRecallHints(Array.isArray(evt.items) ? evt.items.slice(0, 3) : []);
        } else if (evt.type === 'text') {
          replyAccum += evt.delta;
          setLastReply(replyAccum);
        } else if (evt.type === 'audio') {
          if (!firstAudio) {
            firstAudio = true;
            setState('speaking');
          }
          player.enqueue(evt.b64).catch((err) => console.error('decode:', err));
        } else if (evt.type === 'done') {
          conversationIdRef.current = evt.conversationId;
          if (evt.conversationId) scheduleEnd();
        } else if (evt.type === 'error') {
          throw new Error(evt.message);
        }
      });

      await player.waitForEnd();
      if (playerRef.current === player) playerRef.current = null;
      setState('idle');
    } catch (e) {
      console.error(e);
      setError(`Talk: ${e.message || 'Something went sideways.'}`);
      setState('idle');
    }
  }

  async function handleTap() {
    setError('');

    // ─── iOS unlock: must run synchronously inside the click event ───
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    if (!audioUnlockedRef.current) {
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
      audioUnlockedRef.current = true;
    }
    // ──────────────────────────────────────────────────────────────────

    if (state === 'speaking') {
      playerRef.current?.stop();
      playerRef.current = null;
      setState('idle');
      return;
    }

    if (state === 'idle') {
      try {
        autoStopFiredRef.current = false;
        await start();
        setState('listening');
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          setError('Mic blocked. Tap the ᴀA in the address bar → Website Settings → Microphone → Allow.');
        } else if (e.name === 'NotFoundError') {
          setError('No microphone found.');
        } else {
          setError(`Could not start mic: ${e.message || e.name}`);
        }
        setState('idle');
      }
      return;
    }

    if (state === 'listening') {
      autoStopFiredRef.current = true;
      await finishListening();
    }
  }

  async function handleSignOut() {
    if (conversationIdRef.current) {
      try {
        await endConversation(conversationIdRef.current);
      } catch {}
    }
    await supabase.auth.signOut();
  }

  const statusLabel = {
    idle: 'Tap to Talk',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Tap to Interrupt'
  }[state];

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 pt-6 md:px-10">
        <span className="display text-2xl tracking-tight text-ink">
          Yapr<span className="text-brown">.</span>
        </span>
        <button
          onClick={handleSignOut}
          className="text-mist hover:text-ink text-xs uppercase tracking-[0.2em] transition-colors"
        >
          Sign Out
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {recallHints.length > 0 && (
          <div className="mb-10 text-center text-xs uppercase tracking-[0.2em]">
            <p className="text-brown">Remembering...</p>
          </div>
        )}

        <button
          onClick={handleTap}
          className="group focus:outline-none"
          aria-label={statusLabel}
        >
          <Orb state={state} level={level} />
        </button>

        <p className="mt-16 display text-3xl md:text-4xl italic text-ink">
          {statusLabel}
        </p>

        {error && (
          <p className="mt-4 text-brown text-sm max-w-md text-center">{error}</p>
        )}
      </div>

      {(lastTranscript || lastReply) && (
        <div className="px-6 pb-10 md:px-10 max-w-2xl mx-auto w-full space-y-4 text-sm opacity-70 hover:opacity-100 transition-opacity">
          {lastTranscript && (
            <p className="text-mist">
              <span className="text-ink/60 uppercase tracking-[0.2em] text-xs mr-3">You</span>
              {lastTranscript}
            </p>
          )}
          {lastReply && (
            <p className="text-ink">
              <span className="text-brown uppercase tracking-[0.2em] text-xs mr-3">Yap</span>
              {lastReply}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
