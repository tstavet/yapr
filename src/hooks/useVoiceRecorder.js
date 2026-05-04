import { useEffect, useRef, useState, useCallback } from 'react';

// useVoiceRecorder
// Manages microphone access + push-to-talk style recording.
// v1 is tap-to-start, tap-to-stop. VAD auto-stop is a v2 upgrade.
//
// IMPORTANT (iOS): pass in an AudioContext that was already created
// and resumed inside a user gesture. We do not create one here because
// by the time start() runs, the gesture may be consumed (we awaited
// getUserMedia first), and a freshly-created context would start in
// 'suspended' state, leaving the analyser silent.

export function useVoiceRecorder({ getAudioContext } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);  // 0-1, for waveform
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    streamRef.current = stream;

    // Use the externally-managed AudioContext if available, otherwise
    // create one (fine on desktop, suspended on iOS).
    const ctx = getAudioContext
      ? getAudioContext()
      : new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255;
      setLevel(avg);
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
