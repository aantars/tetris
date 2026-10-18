// Sound triggers derived by diffing two logic states. Pure: no DOM, no audio.
// Holds no game rules; the presentation layer plays what this names.

const filled = (playfield) => playfield.flat().filter(Boolean).length;

// Returns the sound names ('move' | 'rotate' | 'lock' | 'lineclear' | 'gameover')
// to play for the transition prev -> next.
function soundsFor(prev, next) {
  if (prev.status !== 'playing') return [];
  if (next.status === 'gameover') return ['gameover'];
  if (next.status !== 'playing') return [];
  if (next.lines > prev.lines) return ['lineclear'];
  // A lock without a clear adds exactly the four blocks of the tetromino
  // (a restart empties the playfield instead, and stays silent).
  if (filled(next.playfield) === filled(prev.playfield) + 4) return ['lock'];
  if (JSON.stringify(next.active.cells) !== JSON.stringify(prev.active.cells)) return ['rotate'];
  if (next.active.x !== prev.active.x) return ['move'];
  return [];
}

const sounds = { soundsFor };
if (typeof module !== 'undefined') module.exports = sounds;
