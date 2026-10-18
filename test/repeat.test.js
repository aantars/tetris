const test = require('node:test');
const assert = require('node:assert');
const { createRepeater, DAS_DELAY_MS, DAS_INTERVAL_MS } = require('../src/repeat.js');

test('timing defaults are about 170 ms delay then 50 ms interval', () => {
  assert.strictEqual(DAS_DELAY_MS, 170);
  assert.strictEqual(DAS_INTERVAL_MS, 50);
});

test('a single tap moves exactly one cell', () => {
  const r = createRepeater();
  assert.deepStrictEqual(r.press('left', 0), ['left']);
  r.release('left', 50);
  assert.deepStrictEqual(r.poll(1000), []);
});

test('holding repeats after the delay, then at the interval', () => {
  const r = createRepeater();
  r.press('right', 0);
  assert.deepStrictEqual(r.poll(169), []);
  assert.deepStrictEqual(r.poll(170), ['right']);
  assert.deepStrictEqual(r.poll(219), []);
  assert.deepStrictEqual(r.poll(220), ['right']);
});

test('a late poll catches up on every missed repeat', () => {
  const r = createRepeater();
  r.press('right', 0);
  assert.deepStrictEqual(r.poll(270), ['right', 'right', 'right']);
});

test('releasing stops the repeat', () => {
  const r = createRepeater();
  r.press('left', 0);
  r.release('left', 100);
  assert.deepStrictEqual(r.poll(500), []);
});

test('pressing the other direction takes over with a fresh delay', () => {
  const r = createRepeater();
  r.press('left', 0);
  r.poll(300);
  assert.deepStrictEqual(r.press('right', 300), ['right']);
  assert.deepStrictEqual(r.poll(469), []);
  assert.deepStrictEqual(r.poll(470), ['right']);
});

test('releasing the newer direction resumes the still-held one at the interval', () => {
  const r = createRepeater();
  r.press('left', 0);
  r.press('right', 100);
  r.release('right', 200);
  assert.deepStrictEqual(r.poll(249), []);
  assert.deepStrictEqual(r.poll(250), ['left']);
});

test('releasing a non-active held direction does not disturb the repeat', () => {
  const r = createRepeater();
  r.press('left', 0);
  r.press('right', 100);
  r.release('left', 120);
  assert.deepStrictEqual(r.poll(270), ['right']);
});

test('key auto-repeat presses of an already held direction are ignored', () => {
  const r = createRepeater();
  r.press('left', 0);
  assert.deepStrictEqual(r.press('left', 100), []);
  assert.deepStrictEqual(r.poll(170), ['left']);
});
