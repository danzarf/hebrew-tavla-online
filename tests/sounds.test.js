import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SOUND_FILES } from '../src/ui/sounds.js';

test('default sound file map uses the documented premium asset paths', () => {
  assert.deepEqual(DEFAULT_SOUND_FILES, {
    roll: {
      variants: [
        'assets/sounds/dice-roll-1.mp3',
        'assets/sounds/dice-roll-2.mp3',
        'assets/sounds/dice-roll-3.mp3',
      ],
      fallback: 'assets/sounds/dice-roll.mp3',
    },
    move: 'assets/sounds/checker-move.mp3',
    hit: 'assets/sounds/checker-hit.mp3',
    special: 'assets/sounds/special-roll.mp3',
    win: 'assets/sounds/win.mp3',
    lastChance: 'assets/sounds/last-chance.mp3',
  });
});
