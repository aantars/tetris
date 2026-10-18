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

// SPAWN[type] = { size, cells }: the spawn orientation as four [dx, dy]
// cells inside a size x size box anchored at the active tetromino's (x, y).
const SPAWN = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  L: { size: 3, cells: [[0, 0], [1, 0], [2, 0], [0, 1]] },
};

// SHAPES[type][rotation]: the four clockwise orientations, each a rotation of
// the previous one within the box.
const SHAPES = {};
for (const type of Object.keys(SPAWN)) {
  const { size, cells } = SPAWN[type];
  SHAPES[type] = [cells];
  for (let r = 1; r < 4; r++) {
    SHAPES[type].push(SHAPES[type][r - 1].map(([dx, dy]) => [size - 1 - dy, dx]));
  }
}

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
  return {
    status: 'playing',
    playfield: emptyPlayfield(),
    active: spawn(first),
    next,
    score: 0,
    level: 0,
    lines: 0,
  };
}

// The screen shown on load: a game waiting for `start`.
function startScreen(random = Math.random) {
  return { ...newGame(random), status: 'start' };
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

// Rotate by `steps` quarter turns clockwise; rejected (state unchanged) if it
// would collide. No wall kicks.
function rotated(state, steps) {
  const rotation = (state.active.rotation + steps) % 4;
  const active = { ...state.active, rotation, cells: SHAPES[state.active.type][rotation] };
  return fits(state.playfield, active, 0, 0) ? { ...state, active } : state;
}

const LINE_SCORES = [0, 40, 100, 300, 1200];
const LINES_PER_LEVEL = 10;

// Remove every full row, letting the rows above drop; returns the new
// playfield and the number of rows cleared.
function clearLines(playfield) {
  const kept = playfield.filter((row) => row.some((cell) => cell === null));
  const cleared = playfield.length - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(WIDTH).fill(null));
  return { playfield: [...empty, ...kept], cleared };
}

// Settle the active tetromino into the playfield, clear full rows (scoring
// and levelling up), and spawn the next one, drawing a fresh next preview.
function lock(state, random) {
  const { active } = state;
  const playfield = state.playfield.map((row) => row.slice());
  for (const [cx, cy] of active.cells) playfield[active.y + cy][active.x + cx] = active.type;
  const { playfield: settled, cleared } = clearLines(playfield);
  const lines = state.lines + cleared;
  const spawned = spawn(state.next);
  return {
    ...state,
    status: fits(settled, spawned, 0, 0) ? state.status : 'gameover',
    playfield: settled,
    active: spawned,
    next: randomType(random),
    score: state.score + LINE_SCORES[cleared] * (state.level + 1),
    lines,
    level: Math.max(state.level, Math.floor(lines / LINES_PER_LEVEL)),
  };
}

// Gravity: fall one row; locks the moment it can fall no further (no lock delay).
function tick(state, random) {
  const fallen = fits(state.playfield, state.active, 0, 1) ? moved(state, 0, 1) : state;
  return fits(fallen.playfield, fallen.active, 0, 1) ? fallen : lock(fallen, random);
}

// Events: { type: 'left' | 'right' | 'tick' | 'start' | 'pause' | 'restart' }.
// status is 'start' | 'playing' | 'paused' | 'gameover'; movement and gravity
// only act while playing. Later tickets add rotate, soft drop and hard drop.
function update(state, event, random = Math.random) {
  switch (event.type) {
    case 'start':
      return state.status === 'start' || state.status === 'gameover' ? newGame(random) : state;
    case 'restart':
      return newGame(random);
    case 'pause':
      if (state.status === 'playing') return { ...state, status: 'paused' };
      if (state.status === 'paused') return { ...state, status: 'playing' };
      return state;
  }
  if (state.status !== 'playing') return state;
  switch (event.type) {
    case 'left':
      return fits(state.playfield, state.active, -1, 0) ? moved(state, -1, 0) : state;
    case 'right':
      return fits(state.playfield, state.active, 1, 0) ? moved(state, 1, 0) : state;
    case 'rotateCW':
      return rotated(state, 1);
    case 'rotateCCW':
      return rotated(state, 3);
    case 'tick':
      return tick(state, random);
    default:
      return state;
  }
}

const logic = { newGame, startScreen, update, WIDTH, HEIGHT, TYPES, COLORS, SHAPES };
if (typeof module !== 'undefined') module.exports = logic;
