// Presentation layer: rendering, keyboard input and the gravity timer.
// Holds no game rules. Uses globals from the inlined logic.js
// (newGame, update, WIDTH, HEIGHT, COLORS) and repeat.js (createRepeater).

const CELL = 30;

const canvas = document.getElementById('playfield');
canvas.width = WIDTH * CELL;
canvas.height = HEIGHT * CELL;
const ctx = canvas.getContext('2d');

let state = startScreen();

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
const nextCtx = document.getElementById('next').getContext('2d');
function renderNext() {
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, 120, 120);
  nextCtx.fillStyle = COLORS[state.next];
  for (const [dx, dy] of SHAPES[state.next][0]) {
    nextCtx.fillRect(15 + dx * 24, 15 + dy * 24, 23, 23);
  }
}

function send(event) {
  state = update(state, event);
  render();
}

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotateCW',
  x: 'rotateCW',
  X: 'rotateCW',
  z: 'rotateCCW',
  Z: 'rotateCCW',
  Enter: 'start',
  p: 'pause',
  P: 'pause',
  r: 'restart',
  R: 'restart',
};

// Left/Right auto-repeat (DAS); timing values live in src/repeat.js.
const repeater = createRepeater();

document.addEventListener('keydown', (e) => {
  const type = KEYS[e.key];
  if (!type) return;
  e.preventDefault();
  for (const move of repeater.press(type, performance.now())) send({ type: move });
});

document.addEventListener('keyup', (e) => {
  const type = KEYS[e.key];
  if (type) repeater.release(type, performance.now());
});

window.addEventListener('blur', () => {
  for (const type of Object.values(KEYS)) repeater.release(type, performance.now());
});

setInterval(() => {
  for (const move of repeater.poll(performance.now())) send({ type: move });
}, 10);

// Gravity: re-read the interval for the current level on every check, so a
// level-up changes the fall speed immediately.
let lastFall = performance.now();
setInterval(() => {
  const now = performance.now();
  for (let n = 0; n < 5 && now - lastFall >= gravityInterval(state.level); n++) {
    lastFall += gravityInterval(state.level);
    send({ type: 'tick' });
  }
  if (now - lastFall >= gravityInterval(state.level)) lastFall = now;
}, 5);

// Soft drop: Down held falls one cell per interval, starting immediately
// (no DAS delay, so it does not use the repeater).
const SOFT_DROP_MS = 50;
let softDropTimer = null;

function stopSoftDrop() {
  clearInterval(softDropTimer);
  softDropTimer = null;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (softDropTimer === null) {
      send({ type: 'softDrop' });
      softDropTimer = setInterval(() => send({ type: 'softDrop' }), SOFT_DROP_MS);
    }
  } else if (e.key === ' ') {
    e.preventDefault();
    if (!e.repeat) send({ type: 'hardDrop' });
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowDown') stopSoftDrop();
});

window.addEventListener('blur', stopSoftDrop);

render();
