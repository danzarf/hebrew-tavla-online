import test from 'node:test';
import assert from 'node:assert/strict';
const dbHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'demo-hebrew-tavla';

const shouldRun = Boolean(dbHost);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(db, path, predicate, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snap = await db.ref(path).get();
    const value = snap.val();
    if (predicate(value)) return value;
    await sleep(250);
  }
  throw new Error(`Timeout waiting for ${path}`);
}

test('verified stats flow works and is idempotent in emulator', { skip: !shouldRun }, async () => {
  const { initializeApp } = await import('firebase-admin/app');
  const { getDatabase } = await import('firebase-admin/database');
  initializeApp({ projectId, databaseURL: `http://${dbHost}?ns=${projectId}` });
  const db = getDatabase();

  const runId = `it_${Date.now()}`;
  const submitterUid = `u_submitter_${runId}`;
  const winnerUid = `u_winner_${runId}`;
  const loserUid = `u_loser_${runId}`;
  const matchId = `m_${runId}`;
  const basePath = `matchResultSubmissions/${submitterUid}/${matchId}`;

  const validSubmission = {
    matchId,
    mode: 'online',
    players: [{ uid: winnerUid, color: 'white' }, { uid: loserUid, color: 'black' }],
    winnerColor: 'white',
    loserColor: 'black',
    resultSource: 'integration-emulator',
    gameType: 'tavla',
    ruleset: 'hebrew-tavla',
    finalStatus: 'normal-win',
    clientSubmittedBy: submitterUid,
    serverVerified: false,
    trustedStatsApplied: false,
    endedAt: Date.now(),
    submittedAt: Date.now(),
  };

  await db.ref(basePath).set(validSubmission);

  const serverReview = await waitFor(db, `${basePath}/serverReview`, (v) => v?.status === 'applied');
  assert.equal(serverReview.status, 'applied');

  const trustedApplied = await waitFor(db, `trustedStatsApplications/${matchId}`, (v) => v?.status === 'applied');
  assert.equal(trustedApplied.winnerUid, winnerUid);
  assert.equal(trustedApplied.loserUid, loserUid);

  const winnerStats = await waitFor(db, `playerStats/${winnerUid}`, (v) => Number(v?.wins) === 1);
  const loserStats = await waitFor(db, `playerStats/${loserUid}`, (v) => Number(v?.losses) === 1);
  assert.equal(winnerStats.gamesPlayed, 1);
  assert.equal(loserStats.gamesPlayed, 1);

  await db.ref(basePath).update({ trustedStatsApplied: false, serverVerified: false, submittedAt: Date.now() + 1 });

  const duplicateReview = await waitFor(db, `${basePath}/serverReview`, (v) => v?.status === 'duplicate');
  assert.equal(duplicateReview.status, 'duplicate');

  const winnerStatsAfterDuplicate = (await db.ref(`playerStats/${winnerUid}`).get()).val();
  const loserStatsAfterDuplicate = (await db.ref(`playerStats/${loserUid}`).get()).val();
  assert.equal(winnerStatsAfterDuplicate.wins, 1);
  assert.equal(loserStatsAfterDuplicate.losses, 1);

  const invalidMatchId = `${matchId}_invalid_local`;
  const invalidPath = `matchResultSubmissions/${submitterUid}/${invalidMatchId}`;
  await db.ref(invalidPath).set({
    ...validSubmission,
    matchId: invalidMatchId,
    mode: 'local',
    submittedAt: Date.now() + 2,
  });

  const invalidReview = await waitFor(db, `${invalidPath}/serverReview`, (v) => v?.status === 'rejected');
  assert.equal(invalidReview.status, 'rejected');
  assert.ok(Array.isArray(invalidReview.reason));
  assert.ok(invalidReview.reason.includes('unsupported-mode'));

  const maliciousMatchId = `${matchId}_malicious`;
  const maliciousPath = `matchResultSubmissions/${submitterUid}/${maliciousMatchId}`;
  await db.ref(maliciousPath).set({
    ...validSubmission,
    matchId: maliciousMatchId,
    clientSubmittedBy: 'different_submitter',
    submittedAt: Date.now() + 3,
    coins: 999,
    xp: 500,
    rewards: ['hack'],
  });

  const maliciousReview = await waitFor(db, `${maliciousPath}/serverReview`, (v) => v?.status === 'rejected');
  assert.equal(maliciousReview.status, 'rejected');
  assert.ok(maliciousReview.reason.includes('submitter-path-mismatch'));
  assert.ok(maliciousReview.reason.includes('unrelated-submitter'));

  await db.ref(`__integrationRuns/${runId}`).set({
    submitterUid,
    winnerUid,
    loserUid,
    matchId,
    createdAt: Date.now(),
  });
});
