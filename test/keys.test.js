const test = require('node:test');
const assert = require('node:assert/strict');
const { keyDown, keyUp } = require('../src/keys.js');

test('only left and right go through the repeater', () => {
  assert.deepEqual(keyDown('ArrowLeft', false), { type: 'left', mode: 'repeater' });
  assert.deepEqual(keyDown('ArrowRight', false), { type: 'right', mode: 'repeater' });
  for (const key of ['ArrowUp', 'x', 'X', 'z', 'Z', 'Enter', 'p', 'P', 'r', 'R', ' ', 'm', 'M']) {
    assert.equal(keyDown(key, false).mode, 'once', key);
  }
});

test('one-shot keys fire once per physical press: key auto-repeat is ignored', () => {
  for (const key of ['ArrowUp', 'x', 'z', 'Enter', 'p', 'r', ' ', 'm']) {
    assert.ok(keyDown(key, false), key);
    assert.equal(keyDown(key, true), null, key);
  }
});

test('hard drop is a one-shot event', () => {
  assert.deepEqual(keyDown(' ', false), { type: 'hardDrop', mode: 'once' });
});

test('soft drop is a held key', () => {
  assert.deepEqual(keyDown('ArrowDown', false), { type: 'softDrop', mode: 'hold' });
  assert.deepEqual(keyDown('ArrowDown', true), { type: 'softDrop', mode: 'hold' });
});

test('key release reports which mode to release; unmapped keys are null', () => {
  assert.deepEqual(keyUp('ArrowLeft'), { type: 'left', mode: 'repeater' });
  assert.deepEqual(keyUp('ArrowDown'), { type: 'softDrop', mode: 'hold' });
  assert.equal(keyDown('q', false), null);
  assert.equal(keyUp('q'), null);
});
