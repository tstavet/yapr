import { useEffect, useRef, useState, useCallback } from 'react';

// useVoiceRecorder
// Tap-to-start recording with optional auto-stop on silence (VAD).
//
// Why VAD here is so simple: we already have an AnalyserNode running
// to drive the orb waveform. We piggy-back on its frequency data to
// detect sustained silence after speech, and fire onSilence so the
// caller can finish the turn without waiting for a second tap.
//
// IMPORTANT (iOS): pass in an AudioContext that was already created
// and resumed inside a user gesture.

const SPEECH_THRESHOLD = 0.04;     // mean amplitude (0-1) above = speech
const SILENCE_HANG_MS = 800;        // ms of continuous quiet after speech to trigger stop
const MIN_SPEECH_MS = 300;          // need at least this much speech before VAD can fire
const MAX_LISTEN_MS = 30_000;       // hard cap so a stuck mic can't run forever

export function useVoiceRecorder({ getAudioContext, onSilence } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);

  // VAD state — reset every start()
  const speechStartedAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const onSilenceFiredRef = useRef(false);
  const onSilenceRef = useRef(onSilence);
  useEffect(() => { onSilenceRef.current = onSilence; }, [onSilence]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    streamRef.current = stream;

    const ctx = getAudioContext
      ? getAudioContext()
      : new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const buf = new Uint8Array(analyser.frequencyBinCount);
    speechStartedAtRef.current = 0;
    lastSpeechAtRef.current = 0;
    onSilenceFiredRef.current = false;
    recordingStartedAtRef.current = performance.now();

    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
      setLevel(avg);

      const now = performance.now();
      const isSpeech = avg > SPEECH_THRESHOLD;

      if (isSpeech) {
        if (!speechStartedAtRef.current) speechStartedAtRef.current = now;
        lastSpeechAtRef.current = now;
      } else if (
        !onSilenceFiredRef.current &&
        speechStartedAtRef.current &&
        lastSpeechAtRef.current - speechStartedAtRef.current >= MIN_SPEECH_MS &&
        now - lastSpeechAtRef.current >= SILENCE_HANG_MS
      ) {
        // We had real speech, then enough silence after it. Fire once.
        onSilenceFiredRef.current = true;
        onSilenceRef.current?.();
      }

      // Hard cap
      if (
        !onSilenceFiredRef.current &&
        now - recordingStartedAtRef.current >= MAX_LISTEN_MS
      ) {
        onSilenceFiredRef.current = true;
        onSilenceRef.current?.();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  }, [getAudioContext]);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve(null);
      // Idempotent: if mr is already inactive (e.g. VAD already triggered
      // a stop and we got called again from a manual tap), just bail.
      if (mr.state === 'inactive') {
        return resolve(new Blob(chunksRef.current, { type: 'audio/webm' }));
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setLevel(0);
        setIsRecording(false);
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { isRecording, level, start, stop };
}
