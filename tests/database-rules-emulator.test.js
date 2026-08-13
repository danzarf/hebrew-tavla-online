import test, { after, before, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';

const projectId = 'demo-hebrew-tavla-rules';
const shouldRun = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
let testEnv;
let assertFails;
let assertSucceeds;
let initializeTestEnvironment;
let get;
let ref;
let set;

function dbFor(uid) {
  return uid
    ? testEnv.authenticatedContext(uid).database()
    : testEnv.unauthenticatedContext().database();
}

async function seed(data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), '/'), data);
  });
}

before(async () => {
  if (!shouldRun) return;
  ({ assertFails, assertSucceeds, initializeTestEnvironment } = await import('@firebase/rules-unit-testing'));
  ({ get, ref, set } = await import('firebase/database'));
  testEnv = await initializeTestEnvironment({
    projectId,
    database: {
      rules: readFileSync('database.rules.json', 'utf8'),
    },
  });
});

beforeEach(async () => {
  if (!shouldRun) return;
  await testEnv.clearDatabase();
  await seed({
    friendRequests: {
      A: { B: { requesterUid: 'B', targetUid: 'A', status: 'pending' } },
      B: { A: { requesterUid: 'A', targetUid: 'B', status: 'pending' } },
    },
    outgoingFriendRequests: {
      A: { B: { requesterUid: 'A', targetUid: 'B', status: 'pending' } },
      B: { A: { requesterUid: 'B', targetUid: 'A', status: 'pending' } },
    },
    friends: {
      A: { B: { friendUid: 'B' } },
      B: { A: { friendUid: 'A' } },
    },
    gameInvites: {
      B: { invite1: { inviteId: 'invite1', senderUid: 'A', targetUid: 'B', status: 'pending' } },
    },
    outgoingGameInvites: {
      A: { invite1: { inviteId: 'invite1', senderUid: 'A', targetUid: 'B', status: 'pending' } },
    },
    publicProfiles: {
      A: { uid: 'A', displayName: 'A', stats: { gamesPlayed: 1 } },
    },
    playerStats: {
      A: { gamesPlayed: 1, wins: 1 },
    },
    playerMatchHistory: {
      A: { m1: { matchId: 'm1' } },
    },
    recentMatches: { m1: { matchId: 'm1' } },
    readableMatches: { m1: { matchId: 'm1' } },
    debugLatestMatch: { matchId: 'm1' },
    debugLatestRealMatch: { matchId: 'm1' },
    debugLatestDiagnosticMatch: { matchId: 'diagnostic' },
    debugMatchCounter: 1,
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test('friend request inbox parent reads match client shape', { skip: !shouldRun }, async () => {
  await assertSucceeds(get(ref(dbFor('A'), 'friendRequests/A')));
  await assertFails(get(ref(dbFor('A'), 'friendRequests/B')));
  await assertSucceeds(get(ref(dbFor('B'), 'friendRequests/B')));
  await assertFails(get(ref(dbFor(null), 'friendRequests/A')));
});

test('outgoing request and friends parent reads are owner-only', { skip: !shouldRun }, async () => {
  await assertSucceeds(get(ref(dbFor('A'), 'outgoingFriendRequests/A')));
  await assertFails(get(ref(dbFor('A'), 'outgoingFriendRequests/B')));
  await assertSucceeds(get(ref(dbFor('A'), 'friends/A')));
  await assertFails(get(ref(dbFor('A'), 'friends/B')));
});

test('game invite inbox and outbox reads are owner-only', { skip: !shouldRun }, async () => {
  await assertSucceeds(get(ref(dbFor('B'), 'gameInvites/B')));
  await assertFails(get(ref(dbFor('A'), 'gameInvites/B')));
  await assertFails(get(ref(dbFor('C'), 'gameInvites/B')));
  await assertSucceeds(get(ref(dbFor('A'), 'outgoingGameInvites/A')));
  await assertFails(get(ref(dbFor('B'), 'outgoingGameInvites/A')));
});

test('clients cannot write server-derived trusted/social paths', { skip: !shouldRun }, async () => {
  const client = dbFor('A');
  for (const path of [
    'friends/A/C',
    'friendRequests/A/C',
    'outgoingFriendRequests/A/C',
    'gameInvites/A/i2',
    'outgoingGameInvites/A/i2',
    'publicProfiles/A',
    'playerStats/A',
    'playerMatchHistory/A/m2',
    'recentMatches/m2',
    'readableMatches/m2',
    'debugLatestMatch',
    'debugLatestRealMatch',
    'debugLatestDiagnosticMatch',
    'debugMatchCounter',
  ]) {
    await assertFails(set(ref(client, path), { blocked: true }));
  }
});

test('socialActions accepts valid owner action and rejects invalid writes', { skip: !shouldRun }, async () => {
  await assertSucceeds(set(ref(dbFor('A'), 'socialActions/A/action1'), {
    actorUid: 'A',
    type: 'sendRequest',
    targetUid: 'B',
    createdAt: 100,
    clientStatus: 'pending',
  }));
  await assertFails(set(ref(dbFor('A'), 'socialActions/B/action2'), {
    actorUid: 'A',
    type: 'sendRequest',
    targetUid: 'B',
    createdAt: 100,
    clientStatus: 'pending',
  }));
  await assertFails(set(ref(dbFor('A'), 'socialActions/A/action3'), {
    actorUid: 'B',
    type: 'sendRequest',
    targetUid: 'C',
    createdAt: 100,
    clientStatus: 'pending',
  }));
  await assertFails(set(ref(dbFor('A'), 'socialActions/A/action4'), {
    actorUid: 'A',
    type: 'sendRequest',
    targetUid: 'A',
    createdAt: 100,
    clientStatus: 'pending',
  }));
  await assertFails(set(ref(dbFor('A'), 'socialActions/A/action5'), {
    actorUid: 'A',
    type: 'hack',
    targetUid: 'B',
    createdAt: 100,
    clientStatus: 'pending',
  }));
});
