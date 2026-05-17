import test from 'node:test';
import assert from 'node:assert/strict';

import { FORBIDDEN_MATCH_RESULT_FIELDS, validateMatchResult } from '../src/product/matchResult.js';
import {
  buildGameEndMatchResult,
  clearLastMatchResult,
  getLastMatchResult,
  recordGameEndMatchResult,
} from '../src/product/matchResultSession.js';

function assertNoForbiddenFields(value) {
  if (!value || typeof value !== 'object') return;

  for (const forbiddenField of FORBIDDEN_MATCH_RESULT_FIELDS) {
    assert.equal(Object.hasOwn(value, forbiddenField), false, `${forbiddenField} must not be included`);
  }

  for (const childValue of Object.values(value)) {
    if (Array.isArray(childValue)) {
      for (const item of childValue) assertNoForbiddenFields(item);
    } else {
      assertNoForbiddenFields(childValue);
    }
  }
}

test('buildGameEndMatchResult maps an online finished game to a non-persistent match result', () => {
  const result = buildGameEndMatchResult({
    state: {
      gameMode: 'online',
      roomCode: '1234',
      victoryId: 'victory-1',
      humanColor: 'white',
      computerColor: 'black',
      playerId: 'guest-host',
      playerNames: { human: 'Host', computer: 'Guest' },
    },
    winnerColor: 'black',
    localActor: 'human',
    currentPlayerId: 'guest-host',
    currentUid: 'uid-host',
    endedAt: 123456,
  });

  assert.equal(result.matchId, 'victory-1');
  assert.equal(result.roomCode, '1234');
  assert.equal(result.mode, 'online');
  assert.equal(result.resultSource, 'online-game-end');
  assert.equal(result.winnerColor, 'black');
  assert.equal(result.loserColor, 'white');
  assert.equal(result.clientSubmittedBy, 'uid-host');
  assert.equal(result.serverVerified, false);
  assert.equal(result.endedAt, 123456);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
  assertNoForbiddenFields(result);
});

test('recordGameEndMatchResult stores only the latest result in memory', () => {
  clearLastMatchResult();
  assert.equal(getLastMatchResult(), null);

  const result = recordGameEndMatchResult({
    state: {
      gameMode: 'computer',
      victoryId: 'local-ai-win',
      humanColor: 'black',
      computerColor: 'white',
      playerNames: { human: 'Player', computer: 'Computer' },
    },
    winnerColor: 'white',
    currentPlayerId: 'guest-human',
    endedAt: 222222,
  });

  assert.equal(getLastMatchResult(), result);
  assert.equal(result.mode, 'ai');
  assert.equal(result.winnerId, 'ai-computer');
  assert.equal(result.loserId, 'guest-human');
  assert.equal(result.serverVerified, false);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
  assertNoForbiddenFields(result);
});
