import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatsUpdate, sanitizeSubmission, validateSubmissionForTrustedStats } from '../src/verification.js';
import {
  buildInvalidLocalSubmission,
  buildMaliciousRewardSubmission,
  buildMismatchedSubmitterSubmission,
  buildMissingPlayersSubmission,
  buildValidOnlineSubmission,
} from './fixtures/submissions.js';

test('sanitize ignores reward/economy fields by omission', () => {
  const safe = sanitizeSubmission(buildMaliciousRewardSubmission({ rewards: ['x'] }));
  assert.equal(Object.hasOwn(safe, 'coins'), false);
  assert.equal(Object.hasOwn(safe, 'xp'), false);
  assert.equal(Object.hasOwn(safe, 'rewards'), false);
});

test('valid online submission passes validation', () => {
  const safe = sanitizeSubmission(buildValidOnlineSubmission());
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, true);
});

test('validation rejects client server flags', () => {
  const safe = sanitizeSubmission(buildValidOnlineSubmission({ serverVerified: true, trustedStatsApplied: true }));
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('client-cannot-server-verify'));
  assert.ok(result.errors.includes('client-cannot-mark-stats-applied'));
});

test('validation rejects local/ai modes for trusted stats', () => {
  for (const mode of ['local', 'ai']) {
    const safe = sanitizeSubmission(buildInvalidLocalSubmission({ mode }));
    const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('unsupported-mode'));
  }
});

test('validation rejects same uid as winner and loser', () => {
  const safe = sanitizeSubmission(buildValidOnlineSubmission({ winnerUid: 'u1', loserUid: 'u1' }));
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('same-player'));
});

test('validation rejects missing players', () => {
  const safe = sanitizeSubmission(buildMissingPlayersSubmission());
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('missing-players'));
});

test('validation rejects winner/loser not included in players list', () => {
  const safe = sanitizeSubmission(buildValidOnlineSubmission({ winnerUid: 'u3' }));
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('winner-not-in-players'));
});

test('validation rejects unrelated submitter', () => {
  const safe = sanitizeSubmission(buildMismatchedSubmitterSubmission({ clientSubmittedBy: 'u3' }));
  const result = validateSubmissionForTrustedStats(safe, { pathUid: 'u1' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('submitter-path-mismatch'));
  assert.ok(result.errors.includes('unrelated-submitter'));
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

test('buildStatsUpdate resets current streak on loss and keeps best streak', () => {
  const next = buildStatsUpdate({ gamesPlayed: 3, wins: 2, losses: 1, currentStreak: 2, bestStreak: 3 }, 'loss', 400, 500);
  assert.equal(next.currentStreak, 0);
  assert.equal(next.bestStreak, 3);
  assert.equal(next.winRate, 0.5);
});
