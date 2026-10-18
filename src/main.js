// Presentation layer: rendering, keyboard input and the gravity timer.
// Holds no game rules. Uses globals from the inlined logic.js
// (newGame, update, WIDTH, HEIGHT, COLORS).

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

document.addEventListener('keydown', (e) => {
  const type = KEYS[e.key];
  if (!type) return;
  e.preventDefault();
  send({ type });
});

setInterval(() => send({ type: 'tick' }), GRAVITY_MS);
render();
