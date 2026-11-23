/**
 * Minimal local audio cue via Web Audio API.
 * Zero external audio files, zero network requests, zero extra permissions.
 */
export function playChime(kind = 'done') {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;

  if (!Ctx) {
    return;
  }

  try {
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = kind === 'break' ? [523.25, 659.25] : [659.25, 783.99];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.14;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.38);
    });

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 900);
  } catch {
    // AudioContext blocked or unavailable.
  }
}
