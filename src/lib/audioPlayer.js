// src/lib/audioPlayer.js
//
// Plays a sequence of complete MP3 chunks back-to-back through a single
// AudioContext. Built for iOS Safari, where MediaSource Extensions are
// flaky and HTMLAudioElement has trouble after multiple awaits.
//
// Each chunk is a complete, self-contained MP3 (one sentence's worth of
// TTS). We decode each one as it arrives, then schedule it to start at
// max(currentTime, end-time-of-previous-chunk) so playback is gapless
// even though chunks arrive at irregular intervals.
//
// Usage:
//   const player = new StreamingAudioPlayer(audioContext);
//   await player.enqueue(base64Mp3);   // call repeatedly as chunks arrive
//   await player.waitForEnd();         // resolves when last chunk finishes
//   player.stop();                     // cancels everything in progress

export class StreamingAudioPlayer {
  constructor(audioContext) {
    this.ctx = audioContext;
    // The earliest moment the next chunk can start playing.
    this.nextStart = 0;
    // All sources we've started but not yet finished.
    this.activeSources = new Set();
    // Resolves when waitForEnd() should return.
    this._endResolvers = [];
    this._stopped = false;
  }

  /**
   * Decode and schedule one mp3 chunk. Returns a promise that resolves
   * when this specific chunk finishes playing (rarely needed — usually
   * you fire-and-forget and call waitForEnd() at the end).
   */
  async enqueue(base64Mp3) {
    if (this._stopped) return;

    const bytes = base64ToUint8Array(base64Mp3);
    // decodeAudioData may take 50-200ms on iOS for a 1-2s clip. Fine.
    const audioBuffer = await new Promise((resolve, reject) => {
      // .slice() because iOS Safari sometimes mutates the buffer.
      this.ctx.decodeAudioData(bytes.buffer.slice(0), resolve, reject);
    });

    if (this._stopped) return;

    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);

    // Start now, or right after the previous chunk ends — whichever is later.
    const startAt = Math.max(this.ctx.currentTime, this.nextStart);
    this.nextStart = startAt + audioBuffer.duration;

    this.activeSources.add(source);
    return new Promise((resolveChunk) => {
      source.onended = () => {
        this.activeSources.delete(source);
        resolveChunk();
        // If this was the last chunk and someone's waiting for the end,
        // notify them.
        if (this.activeSources.size === 0 && this.ctx.currentTime >= this.nextStart) {
          this._endResolvers.forEach((r) => r());
          this._endResolvers = [];
        }
      };
      source.start(startAt);
    });
  }

  /**
   * Resolves when all currently-scheduled audio has finished playing.
   * Call this AFTER all enqueue() calls have been made.
   */
  waitForEnd() {
    return new Promise((resolve) => {
      // Already done?
      if (this.activeSources.size === 0 && this.ctx.currentTime >= this.nextStart) {
        resolve();
        return;
      }
      this._endResolvers.push(resolve);
    });
  }

  /**
   * Cancel everything in progress. Used when the user taps to interrupt.
   */
  stop() {
    this._stopped = true;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {}
    }
    this.activeSources.clear();
    this.nextStart = 0;
    this._endResolvers.forEach((r) => r());
    this._endResolvers = [];
  }
}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
