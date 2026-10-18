// Presentation layer: rendering, keyboard input and the gravity timer.
// Holds no game rules. Uses globals from the inlined logic.js
// (newGame, update, WIDTH, HEIGHT, COLORS) and repeat.js (createRepeater).

const CELL = 30;
const GRAVITY_MS = 800; // constant for now; the gravity ticket adds the level table

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
}

function send(event) {
  state = update(state, event);
  render();
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', Enter: 'start', p: 'pause', P: 'pause', r: 'restart', R: 'restart' };

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

setInterval(() => send({ type: 'tick' }), GRAVITY_MS);
render();
