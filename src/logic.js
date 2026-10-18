// Pure game logic: no DOM, no globals. Public interface:
//   newGame(random)            -> state
//   update(state, event, random) -> next state   (never mutates `state`)
// `random` is an injectable function returning a number in [0, 1).
// This file is both required by Node tests and inlined into the browser page.

const WIDTH = 10;
const HEIGHT = 20;
const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const COLORS = {
  I: '#00e5ff',
  O: '#ffeb3b',
  T: '#aa00ff',
  S: '#00e676',
  Z: '#ff1744',
  J: '#2979ff',
  L: '#ff9100',
};

// SHAPES[type][rotation] = four [dx, dy] cells relative to the active
// tetromino's (x, y). Only the spawn rotation exists so far; the rotation
// ticket adds the other states here.
const SHAPES = {
  I: [[[0, 0], [1, 0], [2, 0], [3, 0]]],
  O: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  T: [[[0, 0], [1, 0], [2, 0], [1, 1]]],
  S: [[[1, 0], [2, 0], [0, 1], [1, 1]]],
  Z: [[[0, 0], [1, 0], [1, 1], [2, 1]]],
  J: [[[0, 0], [1, 0], [2, 0], [2, 1]]],
  L: [[[0, 0], [1, 0], [2, 0], [0, 1]]],
};

function randomType(random) {
  return TYPES[Math.floor(random() * TYPES.length)];
}

function spawn(type) {
  const cells = SHAPES[type][0];
  const width = Math.max(...cells.map(([dx]) => dx)) + 1;
  return { type, rotation: 0, cells, x: Math.floor((WIDTH - width) / 2), y: 0 };
}

function emptyPlayfield() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
}

function newGame(random = Math.random) {
  const first = randomType(random);
  const next = randomType(random);
  return { playfield: emptyPlayfield(), active: spawn(first), next };
}

// True if the active tetromino, shifted by (dx, dy), stays inside the
// playfield walls/floor and overlaps no settled block.
function fits(playfield, active, dx, dy) {
  return active.cells.every(([cx, cy]) => {
    const x = active.x + cx + dx;
    const y = active.y + cy + dy;
    return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && playfield[y][x] === null;
  });
}

function moved(state, dx, dy) {
  return { ...state, active: { ...state.active, x: state.active.x + dx, y: state.active.y + dy } };
}

// Settle the active tetromino into the playfield and spawn the next one,
// drawing a fresh next preview.
function lock(state, random) {
  const { active } = state;
  const playfield = state.playfield.map((row) => row.slice());
  for (const [cx, cy] of active.cells) playfield[active.y + cy][active.x + cx] = active.type;
  return { ...state, playfield, active: spawn(state.next), next: randomType(random) };
}

// Gravity: fall one row; locks the moment it can fall no further (no lock delay).
function tick(state, random) {
  const fallen = fits(state.playfield, state.active, 0, 1) ? moved(state, 0, 1) : state;
  return fits(fallen.playfield, fallen.active, 0, 1) ? fallen : lock(fallen, random);
}

// Events: { type: 'left' | 'right' | 'tick' }. Later tickets add rotate,
// soft drop, hard drop, start, restart and pause as further cases.
function update(state, event, random = Math.random) {
  switch (event.type) {
    case 'left':
      return fits(state.playfield, state.active, -1, 0) ? moved(state, -1, 0) : state;
    case 'right':
      return fits(state.playfield, state.active, 1, 0) ? moved(state, 1, 0) : state;
    case 'tick':
      return tick(state, random);
    default:
      return state;
  }
}

const logic = { newGame, update, WIDTH, HEIGHT, TYPES, COLORS };
if (typeof module !== 'undefined') module.exports = logic;
