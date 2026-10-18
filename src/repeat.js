// Auto-repeat (DAS) timing for held Left/Right. Pure: no DOM, no clock;
// callers pass timestamps in ms. Holds no game rules.

// Tune the feel here.
const DAS_DELAY_MS = 170; // hold time before repeating starts
const DAS_INTERVAL_MS = 50; // time between repeats once started

function createRepeater({ delay = DAS_DELAY_MS, interval = DAS_INTERVAL_MS } = {}) {
  const held = []; // held directions, most recent last
  let nextAt = 0; // when the active (most recent) direction next repeats

  return {
    // Returns the directions to move right now.
    press(dir, now) {
      if (held.includes(dir)) return [];
      held.push(dir);
      nextAt = now + delay;
      return [dir];
    },
    release(dir, now) {
      const i = held.indexOf(dir);
      if (i < 0) return;
      const wasActive = i === held.length - 1;
      held.splice(i, 1);
      if (wasActive && held.length) nextAt = now + interval;
    },
    // Returns the directions whose repeat is due by `now`.
    poll(now) {
      const moves = [];
      if (!held.length) return moves;
      const dir = held[held.length - 1];
      while (nextAt <= now) {
        moves.push(dir);
        nextAt += interval;
      }
      return moves;
    },
  };
}

const repeat = { createRepeater, DAS_DELAY_MS, DAS_INTERVAL_MS };
if (typeof module !== 'undefined') module.exports = repeat;
