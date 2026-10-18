// Presentation layer: rendering, keyboard input and the gravity timer.
// Holds no game rules. Uses globals from the inlined logic.js
// (newGame, update, WIDTH, HEIGHT, COLORS) and repeat.js (createRepeater).

const CELL = 30;
const GRAVITY_MS = 800; // constant for now; the gravity ticket adds the level table

const canvas = document.getElementById('playfield');
canvas.width = WIDTH * CELL;
canvas.height = HEIGHT * CELL;
const ctx = canvas.getContext('2d');

let state = newGame();

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
}

function send(event) {
  state = update(state, event);
  render();
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right' };

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

setInterval(() => send({ type: 'tick' }), GRAVITY_MS);
render();
