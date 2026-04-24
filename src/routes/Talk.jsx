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
  const { isRecording, level, start, stop } = useVoiceRecorder();
  const audioRef = useRef(null);
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
        // Best-effort — browsers kill fetch on unload, so use sendBeacon-style
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_WORKER_URL}/api/end-conversation`,
          JSON.stringify({ conversationId: conversationIdRef.current })
        );
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  async function handleTap() {
    setError('');

    if (state === 'speaking') {
      // Interrupt playback and return to idle
      audioRef.current?.pause();
      setState('idle');
      return;
    }

    if (state === 'idle') {
      try {
        await start();
        setState('listening');
      } catch (e) {
        setError(e.message === 'Permission denied' ? 'mic access needed.' : 'could not start mic.');
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
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setState('speaking');
        audio.onended = () => {
          setState('idle');
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setState('idle');
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch (e) {
        console.error(e);
        setError(e.message || 'something went sideways.');
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
      {/* Header */}
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

      {/* Orb + prompt */}
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
          <p className="mt-4 text-rust text-sm">{error}</p>
        )}
      </div>

      {/* Transcript preview (subtle, at bottom) */}
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
