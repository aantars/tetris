// High score decision and persistence. No DOM: callers pass in a storage
// object (localStorage in the browser); any storage failure is swallowed so
// the game works without it. Holds no game rules.

const HIGH_SCORE_KEY = 'tetris.highScore';

// The high score after a game reaches `score`.
function nextHighScore(high, score) {
  return score > high ? score : high;
}

function loadHighScore(storage) {
  try {
    const n = Number.parseInt(storage.getItem(HIGH_SCORE_KEY), 10);
    return n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(storage, value) {
  try {
    storage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // storage unavailable or full: keep playing without persistence
  }
}

const highscore = { nextHighScore, loadHighScore, saveHighScore, HIGH_SCORE_KEY };
if (typeof module !== 'undefined') module.exports = highscore;
