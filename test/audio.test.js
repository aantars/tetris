const test = require('node:test');
const assert = require('node:assert/strict');
const { SOUND_NAMES, soundsFor } = require('../src/sounds.js');
const { SOUNDS, createAudio } = require('../src/audio.js');
const { newGame, update } = require('../src/logic.js');

test('every sound name has a sound in the audio table', () => {
  for (const name of SOUND_NAMES) assert.ok(SOUNDS[name], name);
});

test('every name soundsFor returns is a declared sound name', () => {
  const s = newGame(() => 0);
  const copy = { ...s, playfield: s.playfield.map((r) => r.slice()) };
  const transitions = [
    update(s, { type: 'left' }),
    update(s, { type: 'rotateCW' }),
    { ...copy, lines: 1 },
    { ...copy, status: 'gameover' },
  ];
  for (const next of transitions) {
    for (const name of soundsFor(s, next)) assert.ok(SOUND_NAMES.includes(name), name);
  }
});

test('playing an unknown sound name fails loudly', () => {
  assert.throws(() => createAudio(null).play('nope'), /Unknown sound/);
});

test('music runs only while wanted and unmuted, and stops cleanly', () => {
  const created = [];
  class FakeCtx {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createOscillator() {
      const o = { frequency: {}, connect() {}, start() { created.push(o); }, stop() {} };
      return o;
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() { this.disconnected = true; },
      };
    }
  }
  const audio = createAudio(FakeCtx);
  audio.setMusic(true);
  assert.ok(created.length > 0, 'notes scheduled');
  const before = created.length;
  audio.toggleMute(); // mute stops the music
  audio.setMusic(true);
  assert.equal(created.length, before);
  audio.toggleMute(); // unmute restarts it
  assert.ok(created.length > before);
  audio.setMusic(false); // clears the interval so the process can exit
});

test('the melody has only positive lengths', () => {
  const { MELODY } = require('../src/audio.js');
  for (const [freq, beats] of MELODY) assert.ok(freq >= 0 && beats > 0);
});
