const test = require('node:test');
const assert = require('node:assert');
const { newGame, update, WIDTH, TYPES, COLORS } = require('../src/logic.js');

function fixed(...values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
const pick = (index) => (index + 0.5) / TYPES.length;

function cellsOf(active) {
  return active.cells.map(([dx, dy]) => [active.x + dx, active.y + dy]);
}

// Cells of the active tetromino relative to its top-left, sorted.
function shapeOf(active) {
  const cells = cellsOf(active);
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const game = (type) => newGame(fixed(pick(TYPES.indexOf(type)), pick(0)));

test('each tetromino spawns with its standard shape and a distinct standard color', () => {
  const expected = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [1, 0], [2, 0], [2, 1]],
    L: [[0, 0], [1, 0], [2, 0], [0, 1]],
  };
  const colors = { I: '#00e5ff', O: '#ffeb3b', T: '#aa00ff', S: '#00e676', Z: '#ff1744', J: '#2979ff', L: '#ff9100' };
  for (const type of TYPES) {
    assert.deepStrictEqual(shapeOf(game(type).active), expected[type], type);
    assert.strictEqual(COLORS[type], colors[type], type);
  }
});

test('clockwise rotation turns a T through its four orientations', () => {
  let state = game('T');
  const seen = [];
  for (let i = 0; i < 4; i++) {
    state = update(state, { type: 'rotateCW' });
    seen.push(shapeOf(state.active));
  }
  assert.deepStrictEqual(seen, [
    [[1, 0], [0, 1], [1, 1], [1, 2]], // stem pointing left
    [[1, 0], [0, 1], [1, 1], [2, 1]], // stem pointing up
    [[0, 0], [0, 1], [1, 1], [0, 2]], // stem pointing right
    [[0, 0], [1, 0], [2, 0], [1, 1]], // stem pointing down (spawn)
  ]);
});

test('counter-clockwise rotation undoes clockwise rotation', () => {
  for (const type of TYPES) {
    const start = game(type);
    const there = update(start, { type: 'rotateCW' });
    const back = update(there, { type: 'rotateCCW' });
    assert.deepStrictEqual(cellsOf(back.active), cellsOf(start.active), type);
  }
});

test('four rotations in either direction return to the start; O never changes', () => {
  for (const type of TYPES) {
    for (const dir of ['rotateCW', 'rotateCCW']) {
      let state = game(type);
      const start = cellsOf(state.active);
      for (let i = 0; i < 4; i++) state = update(state, { type: dir });
      assert.deepStrictEqual(cellsOf(state.active), start, type);
    }
  }
  const o = game('O');
  assert.deepStrictEqual(shapeOf(update(o, { type: 'rotateCW' }).active), shapeOf(o.active));
});

test('rotation keeps four cells inside the playfield for every tetromino and orientation', () => {
  for (const type of TYPES) {
    let state = game(type);
    for (let i = 0; i < 4; i++) {
      state = update(state, { type: 'rotateCW' });
      assert.strictEqual(new Set(cellsOf(state.active).map(String)).size, 4);
      assert.ok(cellsOf(state.active).every(([x, y]) => x >= 0 && x < WIDTH && y >= 0));
    }
  }
});

test('a rotation that would collide is rejected and leaves the tetromino unchanged', () => {
  const state = game('T');
  // T pointing right needs the cell below-middle of its box; block that one.
  const rotated = update(state, { type: 'rotateCW' });
  const [bx, by] = cellsOf(rotated.active).find((c) => !cellsOf(state.active).some((o) => String(o) === String(c)));
  const playfield = state.playfield.map((row) => row.slice());
  playfield[by][bx] = 'I';
  const blocked = { ...state, playfield };
  assert.deepStrictEqual(update(blocked, { type: 'rotateCW' }).active, state.active);
});

test('a rotation that would cross a wall is rejected (no wall kicks)', () => {
  let state = update(game('I'), { type: 'rotateCW' }); // vertical
  for (let i = 0; i < 20; i++) state = update(state, { type: 'left' });
  assert.strictEqual(Math.min(...cellsOf(state.active).map(([x]) => x)), 0);
  assert.deepStrictEqual(update(state, { type: 'rotateCW' }).active, state.active);
});

test('the next preview matches the tetromino that spawns next', () => {
  const random = fixed(pick(0), pick(3), pick(5));
  let state = newGame(random);
  assert.strictEqual(state.next, 'S');
  const previewed = state.next;
  for (let i = 0; i < 40 && state.active.type !== previewed; i++) {
    state = update(state, { type: 'tick' }, random);
  }
  assert.strictEqual(state.active.type, previewed);
  assert.strictEqual(state.next, 'J');
});
