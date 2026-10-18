# Tetris Clone

A personal, classic-style Tetris clone delivered as a single self-contained HTML file that runs locally in a browser with no installation.

## Language

**Tetromino**:
One of the seven four-block shapes (I, O, T, S, Z, J, L) that falls into the playfield.
_Avoid_: Piece, block, brick

**Playfield**:
The 10-wide grid in which tetrominoes fall and settle.
_Avoid_: Board, matrix, well

**Active tetromino**:
The tetromino currently falling and under the player's control.
_Avoid_: Current piece

**Next preview**:
The display of the single upcoming tetromino.
_Avoid_: Queue

**Lock**:
The moment the active tetromino can fall no further and becomes part of the settled blocks, with no grace period.
_Avoid_: Land, place

**Line clear**:
The removal of every fully filled row of the playfield, with the rows above dropping down.
_Avoid_: Row completion, line break

**Soft drop**:
Player-accelerated falling of the active tetromino while the key is held.

**Hard drop**:
Instantly placing the active tetromino at the lowest reachable position and locking it.
_Avoid_: Slam

**Level**:
The difficulty stage that rises with cleared lines and sets the fall speed.

**High score**:
The best score reached, persisted between sessions on the local machine.

**Game over**:
The end of a game, reached when a new tetromino cannot spawn.
_Avoid_: Top out
