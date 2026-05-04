import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { transcribe, chat, speak, endConversation } from '../lib/api';
import Orb from '../components/Orb';

// States of the conversation loop:
//   idle       — waiting for Victoria to tap
//   listening  — mic open, recording
//   thinking   — waiting on transcribe + chat
//   speaking   — audio playing
//
// Flow: tap → listening → (tap again) → thinking → speaking → idle → repeat

export default function Talk() {
  const [state, setState] = useState('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastReply, setLastReply] = useState('');
  const [error, setError] = useState('');

  // One AudioContext for the lifetime of the page. Created lazily on the
  // first user gesture so iOS Safari starts it in 'running' state. Reused
  // for both the mic analyser (waveform) and TTS playback.
  const audioCtxRef = useRef(null);
  // Tracks whether we've already played anything through the context, so
  // we only do the iOS unlock dance once.
  const audioUnlockedRef = useRef(false);
  // Holds the currently-playing TTS source so we can interrupt it.
  const currentSourceRef = useRef(null);

  // Lazy getter so the recorder hook can grab the same context.
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const { level, start, stop } = useVoiceRecorder({ getAudioContext });

  const conversationIdRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // End conversation on tab close / 30 min idle
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

  // Play a TTS audio Blob through the AudioContext. Because the context
  // was resumed inside a user gesture, this works even after multiple
  // awaits — unlike HTMLAudioElement.play().
  async function playThroughContext(blob) {
    const ctx = getAudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    // Some Safari versions still want the callback-style API.
    const audioBuffer = await new Promise((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer, resolve, reject);
    });
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSourceRef.current = source;
    return new Promise((resolve) => {
      source.onended = () => {
        if (currentSourceRef.current === source) currentSourceRef.current = null;
        resolve();
      };
      source.start();
    });
  }

  async function handleTap() {
    setError('');

    // ─── iOS unlock: must run synchronously inside the click event ───
    // Create or resume the AudioContext, and prime it with a silent
    // buffer the first time. After this, decodeAudioData + BufferSource
    // playback will work later in the handler even after many awaits.
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      // Note: resume() returns a Promise but does not need to be awaited
      // for the gesture to count. We let it resolve in the background.
      ctx.resume();
    }
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
      currentSourceRef.current?.stop();
      currentSourceRef.current = null;
      setState('idle');
      return;
    }

    if (state === 'idle') {
      try {
        await start();
        setState('listening');
      } catch (e) {
        // Distinguish iOS permission denial from other failures so the
        // UI can give actionable guidance.
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

        const { reply, conversationId } = await chat(text);
        conversationIdRef.current = conversationId;
        setLastReply(reply);
        scheduleEnd();

        const audioBlob = await speak(reply);
        setState('speaking');
        await playThroughContext(audioBlob);
        setState('idle');
      } catch (e) {
        console.error(e);
        // Surface where the failure actually happened so future debugging
        // doesn't get lied to by a generic message.
        const stage = e.message?.startsWith('Transcribe')
          ? 'transcribe'
          : e.message?.startsWith('Chat')
          ? 'chat'
          : e.message?.startsWith('Speak')
          ? 'speak'
          : 'unknown';
        setError(`${stage}: ${e.message || 'something went sideways.'}`);
        setState('idle');
      }
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
