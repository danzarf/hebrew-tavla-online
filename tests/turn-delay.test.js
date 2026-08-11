import test from 'node:test';
import assert from 'node:assert/strict';

import { createAutoEndState, getEndTurnDelaySeconds } from '../src/game/turnDelay.js';

test('online friend mode keeps the 3 second end-turn delay for both actors', () => {
  assert.equal(getEndTurnDelaySeconds({ gameMode: 'online', currentActor: 'human' }), 3);
  assert.equal(getEndTurnDelaySeconds({ gameMode: 'online', currentActor: 'computer' }), 3);
});

test('computer mode still lets the AI skip the unnecessary end-turn delay', () => {
  assert.equal(getEndTurnDelaySeconds({ gameMode: 'computer', currentActor: 'computer' }), 0);
  assert.equal(getEndTurnDelaySeconds({ gameMode: 'computer', currentActor: 'human' }), 3);
});

test('createAutoEndState creates a shareable deadline for remote countdown display', () => {
  assert.deepEqual(
    createAutoEndState({ seconds: 3, prefix: 'סיום', now: () => 1000 }),
    { deadline: 4000, prefix: 'סיום' },
  );
});
