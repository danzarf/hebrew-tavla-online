import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatsUpdate, sanitizeSubmission, validateSubmissionForTrustedStats } from '../src/verification.js';

test('sanitize ignores reward/economy fields by omission', () => {
  const safe = sanitizeSubmission({
    matchId: 'm1', mode: 'online', winnerColor: 'white', loserColor: 'black',
    gameType: 'tavla', ruleset: 'hebrew-tavla', endedAt: 123,
    players: [{ uid: 'u1', color: 'white' }, { uid: 'u2', color: 'black' }],
    coins: 100,
    xp: 40,
  });
  assert.equal(Object.hasOwn(safe, 'coins'), false);
  assert.equal(Object.hasOwn(safe, 'xp'), false);
});

test('validation rejects client server flags', () => {
  const safe = sanitizeSubmission({
    matchId: 'm1', mode: 'online', winnerColor: 'white', loserColor: 'black',
    gameType: 'tavla', ruleset: 'hebrew-tavla', endedAt: 123,
    players: [{ uid: 'u1', color: 'white' }, { uid: 'u2', color: 'black' }],
    serverVerified: true,
    trustedStatsApplied: true,
  });
  const result = validateSubmissionForTrustedStats(safe);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('client-cannot-server-verify'));
  assert.ok(result.errors.includes('client-cannot-mark-stats-applied'));
});

test('buildStatsUpdate calculates winRate and streaks', () => {
  const next = buildStatsUpdate({ gamesPlayed: 2, wins: 1, losses: 1, currentStreak: 1, bestStreak: 1 }, 'win', 200, 300);
  assert.deepEqual(next, {
    gamesPlayed: 3,
    wins: 2,
    losses: 1,
    winRate: 0.6667,
    currentStreak: 2,
    bestStreak: 2,
    lastPlayedAt: 200,
    updatedAt: 300,
  });
});

test('buildStatsUpdate resets current streak on loss', () => {
  const next = buildStatsUpdate({ gamesPlayed: 3, wins: 2, losses: 1, currentStreak: 2, bestStreak: 2 }, 'loss', 400, 500);
  assert.equal(next.currentStreak, 0);
  assert.equal(next.bestStreak, 2);
  assert.equal(next.winRate, 0.5);
});
