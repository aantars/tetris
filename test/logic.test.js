const test = require('node:test');
const assert = require('node:assert');
const { newGame, update, WIDTH, HEIGHT, TYPES } = require('../src/logic.js');

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
  const playfield = state.playfield.map((row, y) => (y < 3 ? row.map(() => 'I') : row));
  return { ...state, playfield, active: { ...state.active, y: 5 } };
}

test('game over occurs when a new tetromino cannot spawn', () => {
  const random = fixed(pick(1));
  const state = stackedToSpawn();
  // Settled blocks beneath the active tetromino make it lock; the next spawn overlaps the stack.
  const playfield = state.playfield.map((row) => row.slice());
  playfield[7] = playfield[7].map(() => 'I');
  playfield[8] = playfield[8].map(() => 'I');
  const over = update({ ...state, playfield }, { type: 'tick' }, random);
  assert.strictEqual(over.status, 'gameover');
});

test('game over ignores movement and gravity, and start begins a new game', () => {
  const random = fixed(pick(1));
  const state = stackedToSpawn();
  const playfield = state.playfield.map((row, y) => (y === 7 ? row.map(() => 'I') : row));
  const over = update({ ...state, playfield }, { type: 'tick' }, random);
  assert.strictEqual(over.status, 'gameover');
  for (const type of ['left', 'right', 'tick', 'pause']) {
    assert.deepStrictEqual(update(over, { type }, random), over);
  }
  const again = update(over, { type: 'start' }, fixed(pick(3), pick(4)));
  assert.strictEqual(again.status, 'playing');
  assert.ok(again.playfield.every((row) => row.every((c) => c === null)));
});
