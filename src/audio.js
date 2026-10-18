// Synthesized sound effects (Web Audio, no audio files) and mute state.
// The AudioContext is created lazily on the first play()/unlock() call, which
// callers make from a user gesture; if audio is unavailable everything is a no-op.

// Each sound is a list of [frequency Hz, start s, duration s, waveform, volume].
const SOUNDS = {
  move: [[220, 0, 0.04, 'square', 0.05]],
  rotate: [[440, 0, 0.05, 'square', 0.06], [660, 0.05, 0.05, 'square', 0.06]],
  lock: [[110, 0, 0.12, 'triangle', 0.2]],
  lineclear: [[523, 0, 0.1, 'square', 0.08], [659, 0.1, 0.1, 'square', 0.08], [784, 0.2, 0.1, 'square', 0.08], [1047, 0.3, 0.2, 'square', 0.08]],
  gameover: [[392, 0, 0.2, 'sawtooth', 0.08], [330, 0.2, 0.2, 'sawtooth', 0.08], [262, 0.4, 0.2, 'sawtooth', 0.08], [196, 0.6, 0.5, 'sawtooth', 0.08]],
};

function createAudio(AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined) {
  let ctx = null;
  let muted = false;

  function context() {
    if (!ctx && AudioContextClass) {
      try {
        ctx = new AudioContextClass();
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  return {
    // Call from a user gesture so the browser allows audio to start.
    unlock() {
      context();
    },
    play(name) {
      const notes = SOUNDS[name];
      if (!notes) throw new Error(`Unknown sound: ${name}`);
      if (muted) return;
      try {
        const c = context();
        if (!c) return;
        for (const [freq, start, dur, wave, vol] of notes) {
          const osc = c.createOscillator();
          const gain = c.createGain();
          const t = c.currentTime + start;
          osc.type = wave;
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(vol, t);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(t);
          osc.stop(t + dur);
        }
      } catch (e) {
        // audio failed: the game carries on silently
      }
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}

const audioModule = { createAudio, SOUNDS };
if (typeof module !== 'undefined') module.exports = audioModule;
