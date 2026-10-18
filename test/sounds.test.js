const test = require('node:test');
const assert = require('node:assert/strict');
const { soundsFor } = require('../src/sounds.js');
const { newGame, update } = require('../src/logic.js');

const seeded = () => 0;
const playing = () => newGame(seeded);

test('no sound when nothing changed', () => {
  const s = playing();
  assert.deepEqual(soundsFor(s, s), []);
});

test('horizontal move plays move', () => {
  const s = playing();
  assert.deepEqual(soundsFor(s, update(s, { type: 'left' })), ['move']);
});

test('gravity fall alone is silent', () => {
  const s = playing();
  assert.deepEqual(soundsFor(s, update(s, { type: 'tick' })), []);
});

test('changed orientation plays rotate', () => {
  const s = playing();
  const next = { ...s, active: { ...s.active, cells: s.active.cells.map(([x, y]) => [-y, x]) } };
  assert.deepEqual(soundsFor(s, next), ['rotate']);
});

test('lock plays lock', () => {
  const before = playing();
  let s = before;
  while (s.playfield === before.playfield) s = update(s, { type: 'tick' }, seeded);
  assert.deepEqual(soundsFor(before, s), ['lock']);
});

test('lines increasing plays lineclear instead of lock', () => {
  const s = playing();
  const next = { ...s, playfield: s.playfield.map((r) => r.slice()), lines: s.lines + 1 };
  assert.deepEqual(soundsFor(s, next), ['lineclear']);
});

test('becoming gameover plays gameover only', () => {
  const s = playing();
  const next = { ...s, playfield: s.playfield.map((r) => r.slice()), status: 'gameover' };
  assert.deepEqual(soundsFor(s, next), ['gameover']);
});

test('starting or pausing is silent', () => {
  const s = playing();
  assert.deepEqual(soundsFor(s, update(s, { type: 'pause' })), []);
  assert.deepEqual(soundsFor(s, newGame(seeded)), []);
});
