const test = require('node:test');
const assert = require('node:assert');
const { newGame, update, gravityInterval, softDropInterval, WIDTH, HEIGHT, TYPES } = require('../src/logic.js');

// A fixed random source: yields the given values in order, then repeats the last.
function fixed(...values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
// A random value that selects TYPES[index].
const pick = (index) => (index + 0.5) / TYPES.length;

function cellsOf(active) {
  return active.cells.map(([dx, dy]) => [active.x + dx, active.y + dy]);
}

test('a new game spawns the first tetromino at the top and previews the next', () => {
  const state = newGame(fixed(pick(0), pick(2)));
  assert.strictEqual(state.active.type, TYPES[0]);
  assert.strictEqual(state.next, TYPES[2]);
  assert.strictEqual(state.playfield.length, HEIGHT);
  assert.strictEqual(state.playfield[0].length, WIDTH);
  for (const [x, y] of cellsOf(state.active)) {
    assert.ok(x >= 0 && x < WIDTH && y >= 0 && y < 2);
  }
});

test('a gravity tick moves the active tetromino down one row', () => {
  const state = newGame(fixed(pick(2)));
  const after = update(state, { type: 'tick' }, fixed(pick(2)));
  assert.strictEqual(after.active.y, state.active.y + 1);
  assert.strictEqual(after.active.x, state.active.x);
});

test('left and right move the active tetromino one cell', () => {
  const state = newGame(fixed(pick(2)));
  const left = update(state, { type: 'left' });
  const right = update(state, { type: 'right' });
  assert.strictEqual(left.active.x, state.active.x - 1);
  assert.strictEqual(right.active.x, state.active.x + 1);
});

test('moves into the walls are rejected', () => {
  let state = newGame(fixed(pick(2)));
  for (let i = 0; i < 20; i++) state = update(state, { type: 'left' });
  assert.strictEqual(Math.min(...cellsOf(state.active).map(([x]) => x)), 0);
  for (let i = 0; i < 20; i++) state = update(state, { type: 'right' });
  assert.strictEqual(Math.max(...cellsOf(state.active).map(([x]) => x)), WIDTH - 1);
});

test('moves into settled blocks are rejected', () => {
  const state = newGame(fixed(pick(2)));
  const [[bx, by]] = cellsOf(state.active);
  const playfield = state.playfield.map((row) => row.slice());
  playfield[by][bx - 1] = 'I';
  const blocked = { ...state, playfield };
  assert.strictEqual(update(blocked, { type: 'left' }).active.x, state.active.x);
});

test('the active tetromino locks as soon as it can fall no further, then the next one spawns', () => {
  const random = fixed(pick(1), pick(2), pick(3));
  let state = newGame(random); // O active, T next
  for (let i = 0; i < HEIGHT - 3; i++) state = update(state, { type: 'tick' }, random);
  assert.strictEqual(state.active.type, 'O'); // one row above the floor, still falling
  state = update(state, { type: 'tick' }, random); // reaches the floor and locks at once
  // O settled in the bottom two rows
  const settled = [];
  state.playfield.forEach((row, y) => row.forEach((c, x) => c && settled.push([x, y, c])));
  assert.strictEqual(settled.length, 4);
  assert.ok(settled.every(([, y, c]) => y >= HEIGHT - 2 && c === 'O'));
  // T spawned at the top, and a new next preview was drawn
  assert.strictEqual(state.active.type, 'T');
  assert.strictEqual(state.active.y, 0);
  assert.strictEqual(state.next, TYPES[3]);
});

test('the active tetromino locks onto settled blocks', () => {
  const random = fixed(pick(1), pick(2));
  const state = newGame(random);
  const [, , , [bx, by]] = cellsOf(state.active); // lowest-right cell of the O
  const playfield = state.playfield.map((row) => row.slice());
  playfield[by + 2][bx] = 'I'; // two rows beneath the O
  const after = update({ ...state, playfield }, { type: 'tick' }, random);
  assert.strictEqual(after.playfield[by + 1][bx], 'O'); // moved down one, then locked
  assert.strictEqual(after.playfield[by][bx], 'O');
  assert.strictEqual(after.active.type, 'T');
});

test('update does not mutate the previous state', () => {
  const state = newGame(fixed(pick(2)));
  const y = state.active.y;
  update(state, { type: 'tick' }, fixed(pick(2)));
  assert.strictEqual(state.active.y, y);
});

// --- Game flow ---

const { startScreen } = require('../src/logic.js');

test('the game opens on the start screen and ignores movement and gravity until started', () => {
  const state = startScreen(fixed(pick(2)));
  assert.strictEqual(state.status, 'start');
  for (const type of ['left', 'right', 'tick']) {
    assert.deepStrictEqual(update(state, { type }, fixed(pick(2))), state);
  }
});

test('start begins a game, and a new game is playing', () => {
  assert.strictEqual(newGame(fixed(pick(2))).status, 'playing');
  const state = update(startScreen(), { type: 'start' }, fixed(pick(1), pick(2)));
  assert.strictEqual(state.status, 'playing');
  assert.strictEqual(state.active.type, 'O');
});

test('start does nothing while playing or paused', () => {
  const playing = newGame(fixed(pick(2)));
  assert.strictEqual(update(playing, { type: 'start' }, fixed(pick(0))), playing);
  const paused = update(playing, { type: 'pause' });
  assert.strictEqual(update(paused, { type: 'start' }, fixed(pick(0))), paused);
});

test('pause toggles, and nothing moves or falls while paused', () => {
  const state = newGame(fixed(pick(2)));
  const paused = update(state, { type: 'pause' });
  assert.strictEqual(paused.status, 'paused');
  for (const type of ['left', 'right', 'tick']) {
    assert.deepStrictEqual(update(paused, { type }, fixed(pick(2))), paused);
  }
  const resumed = update(paused, { type: 'pause' });
  assert.strictEqual(resumed.status, 'playing');
  assert.deepStrictEqual(resumed.active, state.active);
  assert.strictEqual(update(resumed, { type: 'tick' }, fixed(pick(2))).active.y, state.active.y + 1);
});

test('pause is ignored on the start and game over screens', () => {
  const start = startScreen();
  assert.strictEqual(update(start, { type: 'pause' }), start);
});

test('restart begins a fresh game from any status', () => {
  const random = fixed(pick(1), pick(2));
  let state = newGame(random);
  state = update(update(state, { type: 'tick' }, random), { type: 'left' });
  for (const from of [state, update(state, { type: 'pause' }), startScreen()]) {
    const fresh = update(from, { type: 'restart' }, fixed(pick(3), pick(4)));
    assert.strictEqual(fresh.status, 'playing');
    assert.strictEqual(fresh.active.type, TYPES[3]);
    assert.strictEqual(fresh.active.y, 0);
    assert.strictEqual(fresh.next, TYPES[4]);
  }
});

function stackedToSpawn() {
  // Fill every row except one column, up to the spawn rows, so the next spawn overlaps.
  const state = newGame(fixed(pick(1)));
  const playfield = state.playfield.map((row, y) => (y < 3 ? row.map((_, x) => (x < 9 ? 'I' : null)) : row));
  return { ...state, playfield, active: { ...state.active, y: 5 } };
}

test('game over occurs when a new tetromino cannot spawn', () => {
  const random = fixed(pick(1));
  const state = stackedToSpawn();
  // Settled blocks beneath the active tetromino make it lock; the next spawn overlaps the stack.
  const playfield = state.playfield.map((row) => row.slice());
  playfield[7] = playfield[7].map((_, x) => (x < 9 ? 'I' : null));
  playfield[8] = playfield[8].map((_, x) => (x < 9 ? 'I' : null));
  const over = update({ ...state, playfield }, { type: 'tick' }, random);
  assert.strictEqual(over.status, 'gameover');
});

test('game over ignores movement and gravity, and start begins a new game', () => {
  const random = fixed(pick(1));
  const state = stackedToSpawn();
  const playfield = state.playfield.map((row, y) => (y === 7 ? row.map((_, x) => (x < 9 ? 'I' : null)) : row));
  const over = update({ ...state, playfield }, { type: 'tick' }, random);
  assert.strictEqual(over.status, 'gameover');
  for (const type of ['left', 'right', 'tick', 'pause']) {
    assert.deepStrictEqual(update(over, { type }, random), over);
  }
  const again = update(over, { type: 'start' }, fixed(pick(3), pick(4)));
  assert.strictEqual(again.status, 'playing');
  assert.ok(again.playfield.every((row) => row.every((c) => c === null)));
});

// Builds a state whose O (at columns 4-5, resting on the floor) locks on the next tick.
// `rows` lists playfield rows (index from the bottom, 0 = floor row) that are
// filled everywhere except columns 4-5, so the O completes them.
function oAboutToLock(rows, extra = {}) {
  const random = fixed(pick(1), pick(2), pick(3));
  const state = newGame(random);
  const playfield = state.playfield.map((row) => row.slice());
  for (const r of rows) {
    for (let x = 0; x < WIDTH; x++) if (x < 4 || x > 5) playfield[HEIGHT - 1 - r][x] = 'I';
  }
  const active = { ...state.active, y: HEIGHT - 2 };
  return { state: { ...state, playfield, active, ...extra }, random };
}
const tickOnce = ({ state, random }) => update(state, { type: 'tick' }, random);
const filledCount = (s) => s.playfield.flat().filter(Boolean).length;

test('a new game starts with score 0, level 0 and 0 lines', () => {
  const state = newGame(fixed(pick(0)));
  assert.deepStrictEqual([state.score, state.level, state.lines], [0, 0, 0]);
});

test('a full row is removed and the rows above collapse', () => {
  const setup = oAboutToLock([0]);
  setup.state.playfield[HEIGHT - 2][0] = 'Z'; // a marker block above the full row
  const after = tickOnce(setup);
  assert.strictEqual(after.playfield[HEIGHT - 1][0], 'Z'); // dropped one row
  assert.strictEqual(after.playfield[HEIGHT - 1][4], 'O'); // upper half of the O dropped too
  assert.strictEqual(after.playfield[HEIGHT - 1][1], null);
  assert.strictEqual(filledCount(after), 3);
  assert.strictEqual(after.lines, 1);
});

test('simultaneous clears remove every full row, even with a gap between them', () => {
  const after = tickOnce(oAboutToLock([0, 1]));
  assert.strictEqual(filledCount(after), 0);
  assert.strictEqual(after.lines, 2);
  assert.strictEqual(after.playfield.length, HEIGHT);
});

test('clearing 1, 2, 3 or 4 lines scores 40, 100, 300 or 1200 at level 0', () => {
  assert.strictEqual(tickOnce(oAboutToLock([0])).score, 40);
  assert.strictEqual(tickOnce(oAboutToLock([0, 1])).score, 100);
  // 3 and 4 lines need a vertical I: use a state with an I standing in column 4.
  for (const [n, points] of [[3, 300], [4, 1200]]) {
    const random = fixed(pick(0), pick(2), pick(3));
    const state = newGame(random);
    const playfield = state.playfield.map((row) => row.slice());
    for (let r = 0; r < n; r++) for (let x = 0; x < WIDTH; x++) if (x !== 4) playfield[HEIGHT - 1 - r][x] = 'J';
    for (let r = n; r < 4; r++) playfield[HEIGHT - 1 - r][4] = 'J'; // column 4 filled above, so the I stops at the clear rows
    const active = { ...state.active, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], x: 4, y: HEIGHT - 4 };
    const after = update({ ...state, playfield, active }, { type: 'tick' }, random);
    assert.strictEqual(after.lines, n);
    assert.strictEqual(after.score, points);
  }
});

test('a lock that clears nothing scores nothing', () => {
  const after = tickOnce(oAboutToLock([]));
  assert.deepStrictEqual([after.score, after.lines], [0, 0]);
});

test('line clear score is multiplied by level + 1', () => {
  assert.strictEqual(tickOnce(oAboutToLock([0], { level: 3, lines: 3 })).score, 40 * 4);
});

test('the level rises every 10 cleared lines', () => {
  assert.strictEqual(tickOnce(oAboutToLock([0], { lines: 8 })).level, 0);
  assert.strictEqual(tickOnce(oAboutToLock([0], { lines: 9 })).level, 1);
  assert.strictEqual(tickOnce(oAboutToLock([0, 1], { lines: 19, level: 1 })).level, 2);
});

test('the score is scored at the level before the clear raises it', () => {
  assert.strictEqual(tickOnce(oAboutToLock([0], { lines: 9 })).score, 40);
});

test('gravity interval follows the NES frame table at 60 fps, in ms', () => {
  const frames = { 0: 48, 1: 43, 2: 38, 3: 33, 4: 28, 5: 23, 6: 18, 7: 13, 8: 8, 9: 6, 10: 5, 12: 5, 13: 4, 15: 4, 16: 3, 18: 3, 19: 2, 28: 2, 29: 1 };
  for (const [level, f] of Object.entries(frames)) {
    assert.ok(Math.abs(gravityInterval(Number(level)) - (f * 1000) / 60) < 1e-9, `level ${level}`);
  }
  assert.strictEqual(gravityInterval(0), 800);
  assert.strictEqual(gravityInterval(9), 100);
});

test('gravity interval is capped at level 29', () => {
  assert.strictEqual(gravityInterval(30), gravityInterval(29));
  assert.strictEqual(gravityInterval(1000), gravityInterval(29));
  assert.ok(Math.abs(gravityInterval(29) - 1000 / 60) < 1e-9);
});

test('soft drop moves the active tetromino down one cell and scores 1 point', () => {
  const state = newGame(fixed(pick(2)));
  const after = update(state, { type: 'softDrop' }, fixed(pick(2)));
  assert.strictEqual(after.active.y, state.active.y + 1);
  assert.strictEqual(after.score, 1);
});

test('soft drop onto the floor scores the cell and locks at once', () => {
  const setup = oAboutToLock([]);
  setup.state.active.y = HEIGHT - 3; // two rows above the floor
  const after = update(setup.state, { type: 'softDrop' }, setup.random);
  assert.strictEqual(after.score, 1);
  assert.strictEqual(filledCount(after), 4);
  assert.strictEqual(after.active.type, 'T');
});

test('hard drop locks at the lowest position and scores 2 points per cell dropped', () => {
  const random = fixed(pick(1), pick(2), pick(3));
  const state = newGame(random); // O at y 0
  const after = update(state, { type: 'hardDrop' }, random);
  const settled = [];
  after.playfield.forEach((row, y) => row.forEach((c, x) => c && settled.push([x, y])));
  assert.strictEqual(settled.length, 4);
  assert.ok(settled.every(([, y]) => y >= HEIGHT - 2));
  assert.strictEqual(after.score, 2 * (HEIGHT - 2));
  assert.strictEqual(after.active.type, 'T');
  assert.strictEqual(after.active.y, 0);
});

test('hard drop stops on settled blocks', () => {
  const random = fixed(pick(1), pick(2), pick(3));
  const state = newGame(random);
  const playfield = state.playfield.map((row) => row.slice());
  playfield[HEIGHT - 1][state.active.x] = 'I';
  const after = update({ ...state, playfield }, { type: 'hardDrop' }, random);
  assert.strictEqual(after.playfield[HEIGHT - 2][state.active.x], 'O');
  assert.strictEqual(after.playfield[HEIGHT - 3][state.active.x], 'O');
  assert.strictEqual(after.score, 2 * (HEIGHT - 3));
});

test('hard drop of a tetromino already resting scores nothing but still locks', () => {
  const setup = oAboutToLock([]);
  const after = update(setup.state, { type: 'hardDrop' }, setup.random);
  assert.strictEqual(after.score, 0);
  assert.strictEqual(filledCount(after), 4);
});

test('soft drop is never slower than gravity at the current level', () => {
  assert.strictEqual(softDropInterval(0), 50);
  assert.strictEqual(softDropInterval(9), 50); // gravity 100 ms
  for (let level = 0; level <= 35; level++) {
    assert.ok(softDropInterval(level) <= gravityInterval(level), `level ${level}`);
  }
  assert.ok(Math.abs(softDropInterval(29) - 1000 / 60) < 1e-9);
});
