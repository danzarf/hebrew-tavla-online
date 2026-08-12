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
      playerIds: { human: 'guest-host', computer: 'guest-joiner' },
      playerUids: { human: 'uid-host', computer: 'uid-joiner' },
      playerNames: { human: 'Host', computer: 'Guest' },
      playerMatchStats: {
        human: { capturesMade: 1, capturesSuffered: 3 },
        computer: { capturesMade: 3, capturesSuffered: 1 },
      },
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
  assert.equal(result.winnerUid, 'uid-joiner');
  assert.equal(result.loserUid, 'uid-host');
  assert.equal(result.loserColor, 'white');
  assert.equal(result.clientSubmittedBy, 'uid-host');
  assert.equal(result.statsSchemaVersion, 2);
  assert.equal(result.hasPlayerMatchStats, true);
  assert.match(result.playerMatchStatsDebugLabel, /room:1234/);
  assert.deepEqual(result.playerMatchStats, {
    'uid-host': { capturesMade: 1, capturesSuffered: 3 },
    'uid-joiner': { capturesMade: 3, capturesSuffered: 1 },
  });
  assert.equal(result.serverVerified, false);
  assert.equal(result.endedAt, 123456);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
  assertNoForbiddenFields(result);
});

test('buildGameEndMatchResult includes zero V2 capture stats for online games with no hits', () => {
  const result = buildGameEndMatchResult({
    state: {
      gameMode: 'online',
      roomCode: '7788',
      victoryId: 'victory-zero',
      humanColor: 'white',
      computerColor: 'black',
      playerIds: { human: 'host', computer: 'guest' },
      playerUids: { human: 'uid-host', computer: 'uid-guest' },
      playerNames: { human: 'Host', computer: 'Guest' },
      playerMatchStats: {
        human: { capturesMade: 0, capturesSuffered: 0 },
        computer: { capturesMade: 0, capturesSuffered: 0 },
      },
    },
    winnerColor: 'white',
    localActor: 'human',
    currentPlayerId: 'host',
    currentUid: 'uid-host',
    endedAt: 333333,
  });

  assert.equal(result.statsSchemaVersion, 2);
  assert.equal(result.hasPlayerMatchStats, true);
  assert.deepEqual(result.playerMatchStats, {
    'uid-host': { capturesMade: 0, capturesSuffered: 0 },
    'uid-guest': { capturesMade: 0, capturesSuffered: 0 },
  });
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
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
