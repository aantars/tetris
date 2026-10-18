// Presentation layer: rendering, keyboard input and the gravity timer.
// Holds no game rules. Uses globals from the inlined logic.js
// (newGame, update, WIDTH, HEIGHT, COLORS), repeat.js (createRepeater) and keys.js (keyDown, keyUp).

const CELL = 30;

const canvas = document.getElementById('playfield');
canvas.width = WIDTH * CELL;
canvas.height = HEIGHT * CELL;
const ctx = canvas.getContext('2d');

let state = startScreen();

// Best score, persisted in localStorage (may be unavailable; guarded in highscore.js).
function getStorage() {
  try { return window.localStorage; } catch { return undefined; }
}
const storage = getStorage();
let highScore = loadHighScore(storage);

const OVERLAYS = {
  start: ['Press Enter to start'],
  paused: ['Paused', 'P to resume'],
  gameover: ['Game over', 'Press Enter to restart'],
};

function drawOverlay() {
  const lines = OVERLAYS[state.status];
  if (!lines) return;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(lines[0], canvas.width / 2, canvas.height / 2);
  if (lines[1]) {
    ctx.font = '18px sans-serif';
    ctx.fillText(lines[1], canvas.width / 2, canvas.height / 2 + 32);
  }
}

function drawCell(x, y, type) {
  ctx.fillStyle = COLORS[type];
  ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
}

function renderPanel() {
  const best = nextHighScore(highScore, state.score);
  if (best !== highScore) {
    highScore = best;
    saveHighScore(storage, highScore);
  }
  document.getElementById('highscore').textContent = highScore;
  for (const key of ['score', 'level', 'lines']) {
    document.getElementById(key).textContent = state[key];
  }
}

function render() {
  renderPanel();
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.playfield.forEach((row, y) => row.forEach((type, x) => type && drawCell(x, y, type)));
  const { active } = state;
  for (const [dx, dy] of active.cells) drawCell(active.x + dx, active.y + dy, active.type);
  drawOverlay();
  renderNext();
}

// Next preview: the upcoming tetromino in its spawn orientation.
const NEXT_SIZE = 120; // canvas side in px (CSS scales it with the window)
const NEXT_PADDING = 15;
const NEXT_CELL = 24;
const nextCanvas = document.getElementById('next');
nextCanvas.width = NEXT_SIZE;
nextCanvas.height = NEXT_SIZE;
const nextCtx = nextCanvas.getContext('2d');
function renderNext() {
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
  nextCtx.fillStyle = COLORS[state.next];
  for (const [dx, dy] of SHAPES[state.next][0]) {
    nextCtx.fillRect(NEXT_PADDING + dx * NEXT_CELL, NEXT_PADDING + dy * NEXT_CELL, NEXT_CELL - 1, NEXT_CELL - 1);
  }
}

const audio = createAudio();

function renderSound() {
  document.getElementById('sound').textContent = audio.muted ? 'Muted' : 'On';
}

// Gravity timer: when the last fall happened (ms).
let lastFall = performance.now();

function send(event) {
  const prev = state;
  state = update(state, event);
  // A game that starts, restarts or resumes gets a full gravity interval
  // before its first fall.
  if (state.status === 'playing' && (prev.status !== 'playing' || event.type === 'restart')) {
    lastFall = performance.now();
  }
  for (const name of soundsFor(prev, state)) audio.play(name);
  render();
}

// Left/Right auto-repeat (DAS); timing values live in src/repeat.js.
// Only left/right use it: every other key fires once per physical press.
const repeater = createRepeater();

// Soft drop: Down held falls one cell per softDropInterval(level), starting
// immediately (no DAS delay, so it does not use the repeater).
let softDropTimer = null;

function softDropStep() {
  send({ type: 'softDrop' });
  softDropTimer = setTimeout(softDropStep, softDropInterval(state.level));
}

function stopSoftDrop() {
  clearTimeout(softDropTimer);
  softDropTimer = null;
}

document.addEventListener('keydown', (e) => {
  audio.unlock(); // audio may only start after a user interaction
  const action = keyDown(e.key, e.repeat);
  if (!action) return;
  e.preventDefault();
  if (action.mode === 'repeater') {
    for (const move of repeater.press(action.type, performance.now())) send({ type: move });
  } else if (action.mode === 'hold') {
    if (softDropTimer === null) softDropStep();
  } else if (action.type === 'mute') {
    audio.toggleMute();
    renderSound();
  } else {
    send({ type: action.type });
  }
});

document.addEventListener('keyup', (e) => {
  const action = keyUp(e.key);
  if (!action) return;
  if (action.mode === 'repeater') repeater.release(action.type, performance.now());
  else if (action.mode === 'hold') stopSoftDrop();
});

window.addEventListener('blur', () => {
  for (const type of ['left', 'right']) repeater.release(type, performance.now());
  stopSoftDrop();
});

setInterval(() => {
  for (const move of repeater.poll(performance.now())) send({ type: move });
}, 10);

// Gravity: the interval for the current level is read once per pass, so a
// level-up changes the fall speed from the next pass on.
setInterval(() => {
  const now = performance.now();
  const interval = gravityInterval(state.level);
  for (let n = 0; n < 5 && now - lastFall >= interval; n++) {
    lastFall += interval;
    send({ type: 'tick' });
  }
  if (now - lastFall >= interval) lastFall = now;
}, 5);

render();
