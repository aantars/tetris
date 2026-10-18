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
