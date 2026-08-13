import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_MATCH_HISTORY_PATH,
  getPlayerMatchHistory,
  playerMatchHistoryPath,
} from '../src/firebase/matchHistory.js';

test('player match history path is stable and per-user', () => {
  assert.equal(PLAYER_MATCH_HISTORY_PATH, 'playerMatchHistory');
  assert.equal(playerMatchHistoryPath('uid-1'), 'playerMatchHistory/uid-1');
  assert.equal(playerMatchHistoryPath(''), null);
});

test('getPlayerMatchHistory reads and sanitizes only the requested user path', async () => {
  const result = await getPlayerMatchHistory({
    database: { ok: true },
    ref: (_, path) => ({ path }),
    get: async (targetRef) => {
      assert.equal(targetRef.path, 'playerMatchHistory/uid-1');
      return {
        exists: () => true,
        val: () => ({
          m1: { matchId: 'm1', opponentUid: 'u2', opponentDisplayName: 'דנה', result: 'win', capturesMade: 2, endedAt: 10 },
        }),
      };
    },
    uid: 'uid-1',
  });

  assert.equal(result.skipped, false);
  assert.equal(result.history[0].matchId, 'm1');
  assert.equal(result.history[0].result, 'win');
});

test('getPlayerMatchHistory falls back safely when read fails', async () => {
  const result = await getPlayerMatchHistory({
    database: {},
    ref: (_db, path) => path,
    get: async () => { throw new Error('permission denied'); },
    uid: 'uid-2',
    logger: { warn: () => {} },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'read-failed');
  assert.deepEqual(result.history, []);
});
