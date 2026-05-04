import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { transcribe, streamTalk, endConversation } from '../lib/api';
import { StreamingAudioPlayer } from '../lib/audioPlayer';
import Orb from '../components/Orb';

// States of the conversation loop:
//   idle       — waiting for Victoria to tap
//   listening  — mic open, recording (auto-stops on silence via VAD)
//   thinking   — waiting on transcribe + first audio chunk
//   speaking   — audio playing (more chunks may still be arriving)
//
// Flow: tap → listening → (silence or tap) → thinking → speaking → idle

export default function Talk() {
  const [state, setState] = useState('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState('');

  const audioCtxRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const playerRef = useRef(null);
  const conversationIdRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  // Latch so the auto-VAD stop only fires once per recording session.
  const autoStopFiredRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  // VAD callback: fired by the recorder hook when it detects a long
  // enough stretch of silence after speech. We forward this to the
  // same code path as a manual tap during the listening state.
  const handleSilenceDetected = useCallback(() => {
    if (autoStopFiredRef.current) return;
    autoStopFiredRef.current = true;
    // Defer to next tick so we don't recurse into the recorder hook.
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

  // Shared logic for stopping the mic and running the streaming turn.
  // Used by both the manual tap and the VAD silence detector.
  async function finishListening() {
    setState('thinking');
    try {
      const blob = await stop();
      if (!blob || blob.size < 500) {
        setState('idle');
        return;
      }

      const { text } = await transcribe(blob);
      if (!text?.trim()) {
        setState('idle');
        return;
      }
      setLastTranscript(text);
      setLastReply('');

      // Spin up a fresh player. Old one (if any) is already stopped.
      const player = new StreamingAudioPlayer(getAudioContext());
      playerRef.current = player;

      let firstAudio = false;
      let replyAccum = '';

      await streamTalk(text, async (evt) => {
        if (evt.type === 'text') {
          replyAccum += evt.delta;
          setLastReply(replyAccum);
        } else if (evt.type === 'audio') {
          if (!firstAudio) {
            firstAudio = true;
            setState('speaking');
          }
          // Don't await — let chunks decode in parallel. The player
          // schedules them in order via the AudioContext clock.
          player.enqueue(evt.b64).catch((err) => console.error('decode:', err));
        } else if (evt.type === 'done') {
          conversationIdRef.current = evt.conversationId;
          scheduleEnd();
        } else if (evt.type === 'error') {
          throw new Error(evt.message);
        }
      });

      // SSE closed — wait for the audio queue to actually finish.
      await player.waitForEnd();
      if (playerRef.current === player) playerRef.current = null;
      setState('idle');
    } catch (e) {
      console.error(e);
      setError(`talk: ${e.message || 'something went sideways.'}`);
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

    // Tap during speaking = interrupt. Stop playback and go idle.
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
          setError('mic blocked. tap the ᴀA in the address bar → website settings → microphone → allow.');
        } else if (e.name === 'NotFoundError') {
          setError('no microphone found.');
        } else {
          setError(`could not start mic: ${e.message || e.name}`);
        }
        setState('idle');
      }
      return;
    }

    if (state === 'listening') {
      // Manual tap-to-stop. Same code path as VAD auto-stop.
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
    idle: 'tap to talk',
    listening: 'listening…',
    thinking: 'thinking…',
    speaking: 'tap to interrupt'
  }[state];

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 pt-6 md:px-10">
        <span className="display text-2xl tracking-tight">
          yapr<span className="text-rust">.</span>
        </span>
        <button
          onClick={handleSignOut}
          className="text-mist/70 hover:text-cream text-xs uppercase tracking-[0.2em] transition-colors"
        >
          sign out
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <button
          onClick={handleTap}
          className="group focus:outline-none"
          aria-label={statusLabel}
        >
          <Orb state={state} level={level} />
        </button>

        <p className="mt-16 display text-3xl md:text-4xl italic text-cream">
          {statusLabel}
        </p>

        {error && (
          <p className="mt-4 text-rust text-sm max-w-md text-center">{error}</p>
        )}
      </div>

      {(lastTranscript || lastReply) && (
        <div className="px-6 pb-10 md:px-10 max-w-2xl mx-auto w-full space-y-4 text-sm opacity-60 hover:opacity-100 transition-opacity">
          {lastTranscript && (
            <p className="text-mist">
              <span className="text-cream/50 uppercase tracking-[0.2em] text-xs mr-3">you</span>
              {lastTranscript}
            </p>
          )}
          {lastReply && (
            <p className="text-cream">
              <span className="text-rust uppercase tracking-[0.2em] text-xs mr-3">kones</span>
              {lastReply}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
