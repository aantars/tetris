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

// Background music: "Korobeiniki", a public-domain Russian folk song (1861).
// [frequency Hz or 0 for a rest, length in beats].
const [A4, B4, C5, D5, E5, F5, G5, A5] = [440, 494, 523, 587, 659, 698, 784, 880];
const MELODY = [
  [E5, 1], [B4, 0.5], [C5, 0.5], [D5, 1], [C5, 0.5], [B4, 0.5],
  [A4, 1], [A4, 0.5], [C5, 0.5], [E5, 1], [D5, 0.5], [C5, 0.5],
  [B4, 1.5], [C5, 0.5], [D5, 1], [E5, 1],
  [C5, 1], [A4, 1], [A4, 1], [0, 1],
  [D5, 1.5], [F5, 0.5], [A5, 1], [G5, 0.5], [F5, 0.5],
  [E5, 1.5], [C5, 0.5], [E5, 1], [D5, 0.5], [C5, 0.5],
  [B4, 1], [B4, 0.5], [C5, 0.5], [D5, 1], [E5, 1],
  [C5, 1], [A4, 1], [A4, 1], [0, 1],
];
const BEAT = 0.3; // seconds per beat
const MUSIC_VOLUME = 0.04;
const LOOKAHEAD = 0.3; // seconds of music scheduled ahead of the clock

function createAudio(AudioContextClass = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined) {
  let ctx = null;
  let muted = false;
  let musicWanted = false;
  let musicTimer = null;
  let musicOut = null; // gain node the current music run plays through
  let noteIndex = 0;
  let nextNoteTime = 0;

  function scheduleMusic() {
    for (; nextNoteTime < ctx.currentTime + LOOKAHEAD; noteIndex = (noteIndex + 1) % MELODY.length) {
      const [freq, beats] = MELODY[noteIndex];
      const dur = beats * BEAT;
      if (freq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(MUSIC_VOLUME, nextNoteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, nextNoteTime + dur * 0.95);
        osc.connect(gain);
        gain.connect(musicOut);
        osc.start(nextNoteTime);
        osc.stop(nextNoteTime + dur);
      }
      nextNoteTime += dur;
    }
  }

  function stopMusicNow() {
    clearInterval(musicTimer);
    musicTimer = null;
    if (musicOut) {
      musicOut.disconnect(); // silences notes already scheduled
      musicOut = null;
    }
  }

  function syncMusic() {
    const shouldPlay = musicWanted && !muted;
    if (!shouldPlay) {
      stopMusicNow();
      return;
    }
    if (musicTimer !== null) return;
    try {
      const c = context();
      if (!c) return;
      musicOut = c.createGain();
      musicOut.connect(c.destination);
      nextNoteTime = c.currentTime + 0.05;
      scheduleMusic();
      musicTimer = setInterval(scheduleMusic, 100);
    } catch (e) {
      stopMusicNow(); // audio failed: the game carries on silently
    }
  }

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
    // Music plays only while wanted and not muted; it resumes from where it
    // stopped (the melody position is kept across pauses).
    setMusic(wanted) {
      musicWanted = wanted;
      syncMusic();
    },
    toggleMute() {
      muted = !muted;
      syncMusic();
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}

const audioModule = { createAudio, SOUNDS, MELODY };
if (typeof module !== 'undefined') module.exports = audioModule;
