const test = require('node:test');
const assert = require('node:assert');
const { nextHighScore, loadHighScore, saveHighScore } = require('../src/highscore.js');

test('a score above the high score becomes the new high score', () => {
  assert.strictEqual(nextHighScore(100, 150), 150);
});

test('a score equal to or below the high score leaves it unchanged', () => {
  assert.strictEqual(nextHighScore(100, 100), 100);
  assert.strictEqual(nextHighScore(100, 40), 100);
});

test('save then load round-trips through storage', () => {
  const data = {};
  const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
  saveHighScore(storage, 1200);
  assert.strictEqual(loadHighScore(storage), 1200);
});

test('load returns 0 when nothing is stored or the value is garbage', () => {
  assert.strictEqual(loadHighScore({ getItem: () => null }), 0);
  assert.strictEqual(loadHighScore({ getItem: () => 'abc' }), 0);
  assert.strictEqual(loadHighScore({ getItem: () => '-5' }), 0);
});

test('unavailable storage never throws', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.strictEqual(loadHighScore(broken), 0);
  assert.doesNotThrow(() => saveHighScore(broken, 10));
  assert.strictEqual(loadHighScore(undefined), 0);
  assert.doesNotThrow(() => saveHighScore(undefined, 10));
});
