import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SAFE_MATCH_RESULT_SUBMISSION_FIELDS,
  matchResultSubmissionPath,
  sanitizeMatchResultSubmission,
  submitUnverifiedMatchResult,
} from '../src/firebase/matchResults.js';

test('sanitizeMatchResultSubmission forces unverified flags and strips unsafe fields', () => {
  const submission = sanitizeMatchResultSubmission({
    matchId: 'm-1',
    mode: 'online',
    players: [{ uid: 'u1', color: 'white' }, { uid: 'u2', color: 'black' }],
    winnerColor: 'white',
    endedAt: 123,
    serverVerified: true,
    trustedStatsApplied: true,
    wins: 999,
    coins: 50,
  }, { uid: 'u1', now: () => 321 });

  assert.equal(submission.serverVerified, false);
  assert.equal(submission.trustedStatsApplied, false);
  assert.equal(submission.submittedAt, 321);
  assert.equal(Object.hasOwn(submission, 'wins'), false);
  assert.equal(Object.hasOwn(submission, 'coins'), false);
  assert.equal(Object.keys(submission).every(key => SAFE_MATCH_RESULT_SUBMISSION_FIELDS.includes(key)), true);
});

test('submitUnverifiedMatchResult gracefully skips when auth/db dependencies are missing', async () => {
  const missingUid = await submitUnverifiedMatchResult({ matchResult: { matchId: 'm1' } });
  assert.equal(missingUid.skipped, true);
  assert.equal(missingUid.reason, 'missing-uid');

  const missingDb = await submitUnverifiedMatchResult({ uid: 'u1', matchResult: { matchId: 'm1' } });
  assert.equal(missingDb.skipped, true);
  assert.equal(missingDb.reason, 'missing-database-dependency');
});

test('submitUnverifiedMatchResult writes only safe payload to the user path', async () => {
  const writes = [];
  const result = await submitUnverifiedMatchResult({
    database: { name: 'db' },
    ref: (_db, path) => ({ path }),
    set: async (targetRef, payload) => writes.push({ targetRef, payload }),
    uid: 'uid-7',
    now: () => 777,
    matchResult: {
      matchId: 'match-7',
      mode: 'local',
      players: [{ id: 'p1', color: 'white' }, { id: 'p2', color: 'black' }],
      winnerColor: 'black',
      endedAt: 700,
      xp: 100,
      rewards: ['daily'],
    },
  });

  assert.equal(result.skipped, false);
  assert.equal(result.path, matchResultSubmissionPath('uid-7', 'match-7'));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].targetRef.path, 'matchResultSubmissions/uid-7/match-7');
  assert.equal(writes[0].payload.serverVerified, false);
  assert.equal(writes[0].payload.trustedStatsApplied, false);
  assert.equal(Object.hasOwn(writes[0].payload, 'xp'), false);
  assert.equal(Object.hasOwn(writes[0].payload, 'rewards'), false);
});
