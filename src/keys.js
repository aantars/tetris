// Keyboard mapping. Pure: no DOM. Decides what each key event means and how
// it is delivered; main.js performs the delivery. Holds no game rules.

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotateCW',
  x: 'rotateCW',
  X: 'rotateCW',
  z: 'rotateCCW',
  Z: 'rotateCCW',
  ArrowDown: 'softDrop',
  ' ': 'hardDrop',
  Enter: 'start',
  p: 'pause',
  P: 'pause',
  r: 'restart',
  R: 'restart',
  m: 'mute',
  M: 'mute',
};

// Delivery modes: 'repeater' (auto-repeat DAS, left/right only), 'hold'
// (soft drop while held), 'once' (one event per physical key press).
const REPEATER_TYPES = ['left', 'right'];

function modeOf(type) {
  if (REPEATER_TYPES.includes(type)) return 'repeater';
  return type === 'softDrop' ? 'hold' : 'once';
}

// -> { type, mode } or null. `isRepeat` is the browser's KeyboardEvent.repeat.
function keyDown(key, isRepeat) {
  const type = KEYS[key];
  if (!type) return null;
  const mode = modeOf(type);
  if (mode === 'once' && isRepeat) return null;
  return { type, mode };
}

function keyUp(key) {
  const type = KEYS[key];
  return type ? { type, mode: modeOf(type) } : null;
}

const keys = { KEYS, keyDown, keyUp };
if (typeof module !== 'undefined') module.exports = keys;
