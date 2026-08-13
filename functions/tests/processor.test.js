import test from 'node:test';
import assert from 'node:assert/strict';

import { processMatchResultSubmission, shouldProcessSubmission } from '../src/processor.js';
import { buildValidOnlineSubmission } from './fixtures/submissions.js';

function getAt(root, path) {
  if (!path) return root;
  return path.split('/').reduce((node, key) => node?.[key], root);
}

function setAt(root, path, value) {
  const parts = path.split('/').filter(Boolean);
  let node = root;
  for (const part of parts.slice(0, -1)) node = node[part] ||= {};
  node[parts.at(-1)] = value;
}

function updateAt(root, updates) {
  for (const [path, value] of Object.entries(updates)) setAt(root, path, value);
}

function createMemoryDb({ failStatsRead = false } = {}) {
  const data = {};
  const writes = [];
  return {
    data,
    writes,
    ref(path = '') {
      return {
        child(childPath) {
          return this.rootRef(`${path}/${childPath}`);
        },
        rootRef: (nextPath) => this.ref(nextPath.replace(/^\/+/, '')),
        async get() {
          if (failStatsRead && path.startsWith('playerStats/')) throw new Error('stats read failed');
          return { val: () => getAt(data, path) || null };
        },
        async set(value) {
          writes.push({ type: 'set', path, value });
          setAt(data, path, value);
        },
        async update(updates) {
          writes.push({ type: 'update', path, value: updates });
          if (path && !getAt(data, path)) setAt(data, path, {});
          updateAt(path ? getAt(data, path) : data, updates);
        },
        async transaction(updater) {
          const current = getAt(data, path) || null;
          const next = updater(current);
          if (next === undefined) return { committed: false, snapshot: { val: () => current } };
          setAt(data, path, next);
          return { committed: true, snapshot: { val: () => next } };
        },
      };
    },
  };
}

test('processMatchResultSubmission applies valid online submission to trusted stats', async () => {
  const db = createMemoryDb();
  const raw = buildValidOnlineSubmission({
    matchId: 'm-apply',
    winnerUid: 'u1',
    loserUid: 'u2',
    players: [
      { uid: 'u1', color: 'white', displayName: 'Player 1' },
      { uid: 'u2', color: 'black', displayName: 'Player 2' },
    ],
    playerMatchStats: {
      u1: { capturesMade: 4, capturesSuffered: 1 },
      u2: { capturesMade: 1, capturesSuffered: 4 },
    },
    serverVerified: false,
    trustedStatsApplied: false,
  });

  const result = await processMatchResultSubmission({ db, raw, uid: 'u1', matchId: 'm-apply', now: () => 500 });

  assert.equal(result.status, 'applied');
  assert.equal(db.data.matchResultSubmissions.u1['m-apply'].serverReview.status, 'applied');
  assert.equal(db.writes[0].path, 'matchResultSubmissions/u1/m-apply/serverReview');
  assert.equal(db.writes[0].value.status, 'processing');
  assert.equal(db.data.trustedStatsApplications['m-apply'].status, 'applied');
  assert.equal(db.data.playerStats.u1.wins, 1);
  assert.equal(db.data.playerStats.u1.capturesMade, 4);
  assert.equal(db.data.playerStats.u1.capturesSuffered, 1);
  assert.equal(db.data.playerStats.u1.averageCapturesMadePerGame, 4);
  assert.equal(db.data.playerStats.u2.losses, 1);
  assert.equal(db.data.playerStats.u2.capturesMade, 1);
  assert.equal(db.data.playerStats.u2.capturesSuffered, 4);
  assert.deepEqual(db.data.playerMatchHistory.u1['m-apply'], {
    matchId: 'm-apply',
    opponentUid: 'u2',
    opponentDisplayName: 'Player 2',
    playerColor: 'white',
    opponentColor: 'black',
    result: 'win',
    roomCode: null,
    capturesMade: 4,
    capturesSuffered: 1,
    endedAt: raw.endedAt,
    processedAt: 500,
    statsSchemaVersion: 1,
  });
  assert.deepEqual(db.data.playerMatchHistory.u2['m-apply'], {
    matchId: 'm-apply',
    opponentUid: 'u1',
    opponentDisplayName: 'Player 1',
    playerColor: 'black',
    opponentColor: 'white',
    result: 'loss',
    roomCode: null,
    capturesMade: 1,
    capturesSuffered: 4,
    endedAt: raw.endedAt,
    processedAt: 500,
    statsSchemaVersion: 1,
  });
  assert.equal(db.data.recentMatches['m-apply'].serverReviewStatus, 'applied');
  assert.equal(db.data.recentMatches['m-apply'].serverVerified, true);
  assert.equal(db.data.recentMatches['m-apply'].trustedStatsApplied, true);
  assert.equal(db.data.recentMatches['m-apply'].isDiagnostic, false);
  assert.equal(db.data.recentMatches['m-apply'].statsSchemaVersion, 1);
  assert.deepEqual(db.data.recentMatches['m-apply'].playerMatchStats.u1, { capturesMade: 4, capturesSuffered: 1 });
  assert.equal(db.data.debugMatchCounter, 1);
  assert.equal(db.data.debugLatestMatch.matchId, 'm-apply');
  assert.equal(db.data.debugLatestRealMatch.matchId, 'm-apply');
  assert.equal(db.data.debugLatestDiagnosticMatch, undefined);
  assert.equal(db.data.readableMatches['000001'].matchId, 'm-apply');
  assert.match(db.data.debugLatestRealMatch.readableName, /000001 \| REAL \| No room/);
});

test('processMatchResultSubmission treats missing capture stats as zero', async () => {
  const db = createMemoryDb();
  const result = await processMatchResultSubmission({
    db,
    raw: buildValidOnlineSubmission({
      matchId: 'm-zero-captures',
      winnerUid: 'u1',
      loserUid: 'u2',
      serverVerified: false,
      trustedStatsApplied: false,
    }),
    uid: 'u1',
    matchId: 'm-zero-captures',
    now: () => 550,
  });

  assert.equal(result.status, 'applied');
  assert.equal(db.data.playerStats.u1.capturesMade, 0);
  assert.equal(db.data.playerStats.u1.capturesSuffered, 0);
  assert.equal(db.data.playerStats.u2.capturesMade, 0);
  assert.equal(db.data.playerStats.u2.capturesSuffered, 0);
  assert.deepEqual(db.data.recentMatches['m-zero-captures'].playerMatchStats, {
    u1: { capturesMade: 0, capturesSuffered: 0 },
    u2: { capturesMade: 0, capturesSuffered: 0 },
  });
});

test('processMatchResultSubmission rejects invalid submissions with serverReview', async () => {
  const db = createMemoryDb();
  const result = await processMatchResultSubmission({
    db,
    raw: buildValidOnlineSubmission({ mode: 'local' }),
    uid: 'u1',
    matchId: 'm-reject',
    now: () => 600,
  });

  assert.equal(result.status, 'rejected');
  assert.equal(db.data.matchResultSubmissions.u1['m-reject'].serverReview.status, 'rejected');
  assert.equal(db.data.matchResultSubmissions.u1['m-reject'].serverReview.processedAt, 600);
});

test('processMatchResultSubmission writes error serverReview before rethrowing server failures', async () => {
  const db = createMemoryDb({ failStatsRead: true });
  const raw = buildValidOnlineSubmission({
    matchId: 'm-error',
    winnerUid: 'u1',
    loserUid: 'u2',
    serverVerified: false,
    trustedStatsApplied: false,
  });

  await assert.rejects(
    processMatchResultSubmission({ db, raw, uid: 'u1', matchId: 'm-error', now: () => 700, logger: null }),
    /stats read failed/,
  );
  assert.equal(db.data.matchResultSubmissions.u1['m-error'].serverReview.status, 'error');
  assert.equal(db.data.matchResultSubmissions.u1['m-error'].serverReview.message, 'stats read failed');
});

test('shouldProcessSubmission skips writes that already have a serverReview', () => {
  assert.equal(shouldProcessSubmission(null), false);
  assert.equal(shouldProcessSubmission({ matchId: 'm-pending' }), true);
  assert.equal(shouldProcessSubmission({ matchId: 'm-reviewed', serverReview: { status: 'applied' } }), false);
});

test('processMatchResultSubmission duplicate does not double-count capture stats', async () => {
  const db = createMemoryDb();
  const raw = buildValidOnlineSubmission({
    matchId: 'm-duplicate',
    winnerUid: 'u1',
    loserUid: 'u2',
    playerMatchStats: {
      u1: { capturesMade: 2, capturesSuffered: 0 },
      u2: { capturesMade: 0, capturesSuffered: 2 },
    },
    serverVerified: false,
    trustedStatsApplied: false,
  });

  await processMatchResultSubmission({ db, raw, uid: 'u1', matchId: 'm-duplicate', now: () => 900 });
  const duplicate = await processMatchResultSubmission({
    db,
    raw: buildValidOnlineSubmission({ ...raw, serverReview: undefined }),
    uid: 'u1',
    matchId: 'm-duplicate',
    now: () => 950,
  });

  assert.equal(duplicate.status, 'duplicate');
  assert.equal(db.data.playerStats.u1.gamesPlayed, 1);
  assert.equal(db.data.playerStats.u1.capturesMade, 2);
  assert.equal(db.data.playerStats.u2.capturesSuffered, 2);
  assert.equal(Object.keys(db.data.recentMatches).length, 1);
  assert.equal(db.data.recentMatches['m-duplicate'].serverReviewStatus, 'applied');
  assert.equal(db.data.debugMatchCounter, 1);
  assert.equal(Object.keys(db.data.readableMatches).length, 1);
  assert.equal(Object.keys(db.data.playerMatchHistory.u1).length, 1);
  assert.equal(Object.keys(db.data.playerMatchHistory.u2).length, 1);
});

test('processMatchResultSubmission marks diagnostic matches in recent match index', async () => {
  const db = createMemoryDb();
  const raw = buildValidOnlineSubmission({
    matchId: 'diagnostic-123-1',
    clientSubmittedBy: 'diagnostic-123',
    winnerUid: 'diagnostic-123_winner',
    loserUid: 'diagnostic-123',
    players: [
      { uid: 'diagnostic-123_winner', color: 'black', displayName: 'Diagnostic Winner' },
      { uid: 'diagnostic-123', color: 'white', displayName: 'Diagnostic Loser' },
    ],
    winnerColor: 'black',
    loserColor: 'white',
    resultSource: 'diagnostic-workflow',
    statsSchemaVersion: 2,
    playerMatchStats: {
      'diagnostic-123_winner': { capturesMade: 3, capturesSuffered: 1 },
      'diagnostic-123': { capturesMade: 1, capturesSuffered: 3 },
    },
    serverVerified: false,
    trustedStatsApplied: false,
  });

  const result = await processMatchResultSubmission({
    db,
    raw,
    uid: 'diagnostic-123',
    matchId: 'diagnostic-123-1',
    now: () => 1000,
  });

  assert.equal(result.status, 'applied');
  assert.equal(db.data.recentMatches['diagnostic-123-1'].isDiagnostic, true);
  assert.equal(db.data.recentMatches['diagnostic-123-1'].statsSchemaVersion, 2);
  assert.match(db.data.recentMatches['diagnostic-123-1'].debugLabel, /DIAGNOSTIC/);
  assert.equal(db.data.debugLatestDiagnosticMatch.matchId, 'diagnostic-123-1');
  assert.equal(db.data.debugLatestRealMatch, undefined);
  assert.match(db.data.readableMatches['000001'].readableName, /DIAGNOSTIC/);
  assert.equal(db.data.playerMatchHistory, undefined);
});

test('diagnostic match does not overwrite latest real match shortcut', async () => {
  const db = createMemoryDb();

  await processMatchResultSubmission({
    db,
    raw: buildValidOnlineSubmission({
      matchId: 'm-real',
      winnerUid: 'u1',
      loserUid: 'u2',
      serverVerified: false,
      trustedStatsApplied: false,
    }),
    uid: 'u1',
    matchId: 'm-real',
    now: () => 1100,
  });

  await processMatchResultSubmission({
    db,
    raw: buildValidOnlineSubmission({
      matchId: 'diagnostic-999-1',
      clientSubmittedBy: 'diagnostic-999',
      winnerUid: 'diagnostic-999_winner',
      loserUid: 'diagnostic-999',
      players: [
        { uid: 'diagnostic-999_winner', color: 'black', displayName: 'Diagnostic Winner' },
        { uid: 'diagnostic-999', color: 'white', displayName: 'Diagnostic Loser' },
      ],
      winnerColor: 'black',
      loserColor: 'white',
      resultSource: 'diagnostic-workflow',
      statsSchemaVersion: 2,
      serverVerified: false,
      trustedStatsApplied: false,
    }),
    uid: 'diagnostic-999',
    matchId: 'diagnostic-999-1',
    now: () => 1200,
  });

  assert.equal(db.data.debugLatestRealMatch.matchId, 'm-real');
  assert.equal(db.data.debugLatestDiagnosticMatch.matchId, 'diagnostic-999-1');
  assert.equal(db.data.debugLatestMatch.matchId, 'diagnostic-999-1');
  assert.equal(db.data.readableMatches['000001'].matchId, 'm-real');
  assert.equal(db.data.readableMatches['000002'].matchId, 'diagnostic-999-1');
});
