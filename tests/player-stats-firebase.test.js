import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRUSTED_PLAYER_STATS_PATH,
  getTrustedPlayerStats,
  trustedPlayerStatsPath,
} from '../src/firebase/playerStats.js';

test('trusted player stats path is stable and per-user', () => {
  assert.equal(TRUSTED_PLAYER_STATS_PATH, 'playerStats');
  assert.equal(trustedPlayerStatsPath('uid-1'), 'playerStats/uid-1');
  assert.equal(trustedPlayerStatsPath(''), null);
});

test('getTrustedPlayerStats sanitizes trusted stats from RTDB', async () => {
  const result = await getTrustedPlayerStats({
    database: { ok: true },
    ref: (_, path) => ({ path }),
    get: async () => ({
      exists: () => true,
      val: () => ({ gamesPlayed: 5, wins: 9, losses: 2, currentStreak: -2 }),
    }),
    uid: 'user-1',
  });

  assert.equal(result.skipped, false);
  assert.equal(result.hasTrustedStats, true);
  assert.deepEqual(result.stats, {
    gamesPlayed: 5,
    wins: 5,
    losses: 0,
    winRate: 100,
    currentStreak: 0,
    bestStreak: 0,
    capturesMade: 0,
    capturesTaken: 0,
    lastPlayedAt: null,
    updatedAt: null,
  });
});

test('getTrustedPlayerStats falls back safely when no trusted stats exist', async () => {
  const result = await getTrustedPlayerStats({
    database: { ok: true },
    ref: (_, path) => ({ path }),
    get: async () => ({ exists: () => false }),
    uid: 'user-1',
  });

  assert.equal(result.skipped, false);
  assert.equal(result.hasTrustedStats, false);
  assert.equal(result.stats.gamesPlayed, 0);
});

test('getTrustedPlayerStats times out safely and returns read-failed fallback', async () => {
  const result = await getTrustedPlayerStats({
    database: {},
    ref: (_db, path) => path,
    get: async () => new Promise(() => {}),
    uid: 'uid-timeout',
    timeoutMs: 10,
    logger: { warn: () => {} },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'read-failed');
  assert.equal(result.hasTrustedStats, false);
});
