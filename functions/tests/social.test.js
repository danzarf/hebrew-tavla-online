import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPublicProfileProjection, buildPublicStatsProjection, updatePublicProfileProjection } from '../src/publicProfile.js';
import { processSocialAction } from '../src/social.js';

function getAt(root, path) {
  if (!path) return root;
  return path.split('/').reduce((node, key) => node?.[key], root);
}

function setAt(root, path, value) {
  const parts = path.split('/').filter(Boolean);
  let node = root;
  for (const part of parts.slice(0, -1)) node = node[part] ||= {};
  if (value === null) delete node[parts.at(-1)];
  else node[parts.at(-1)] = value;
}

function updateAt(root, updates) {
  for (const [path, value] of Object.entries(updates)) setAt(root, path, value);
}

function createMemoryDb(initial = {}) {
  const data = structuredClone(initial);
  return {
    data,
    ref(path = '') {
      return {
        child(childPath) {
          return this.rootRef(`${path}/${childPath}`);
        },
        rootRef: (nextPath) => this.ref(nextPath.replace(/^\/+/, '')),
        async get() {
          return { val: () => getAt(data, path) || null };
        },
        async set(value) {
          setAt(data, path, value);
        },
        async update(updates) {
          updateAt(path ? getAt(data, path) : data, updates);
        },
      };
    },
  };
}

test('public profile projection exposes only safe profile and public stats', () => {
  const projection = buildPublicProfileProjection({
    uid: 'u1',
    profile: { displayName: '  דנה<script> ', avatarPreference: 'star', email: 'private@example.com' },
    stats: { gamesPlayed: 8, wins: 5, losses: 3, winRate: 62.51, capturesMade: 99, updatedAt: 123 },
    updatedAt: 500,
  });

  assert.deepEqual(Object.keys(projection).sort(), ['avatarPreference', 'displayName', 'stats', 'uid', 'updatedAt']);
  assert.deepEqual(Object.keys(projection.stats).sort(), ['bestStreak', 'currentStreak', 'gamesPlayed', 'lastPlayedAt', 'winRate', 'wins']);
  assert.equal(projection.displayName, 'דנה<script>');
  assert.equal(projection.stats.winRate, 62.5);
});

test('send friend request writes incoming and outgoing pending state', async () => {
  const db = createMemoryDb();
  const result = await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'a1',
    raw: { actorUid: 'u1', type: 'sendRequest', targetUid: 'u2' },
    now: () => 100,
  });

  assert.equal(result.status, 'applied');
  assert.equal(db.data.friendRequests.u2.u1.status, 'pending');
  assert.equal(db.data.outgoingFriendRequests.u1.u2.status, 'pending');
  assert.equal(db.data.socialActions.u1.a1.serverReview.status, 'applied');
});

test('duplicate friend request is idempotent and self/spoof requests are rejected', async () => {
  const db = createMemoryDb({
    friendRequests: { u2: { u1: { status: 'pending' } } },
  });

  const duplicate = await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'dup',
    raw: { actorUid: 'u1', type: 'sendRequest', targetUid: 'u2' },
    now: () => 110,
  });
  assert.equal(duplicate.status, 'noop');
  assert.equal(duplicate.reason, 'already-pending');

  const self = await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'self',
    raw: { actorUid: 'u1', type: 'sendRequest', targetUid: 'u1' },
    now: () => 120,
  });
  assert.equal(self.status, 'rejected');
  assert.ok(self.reason.includes('self-request'));

  const spoof = await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'spoof',
    raw: { actorUid: 'u9', type: 'sendRequest', targetUid: 'u2' },
    now: () => 130,
  });
  assert.equal(spoof.status, 'rejected');
  assert.ok(spoof.reason.includes('actor-spoof'));
});

test('accept request creates symmetric friendship; decline marks request; remove deletes both sides', async () => {
  const db = createMemoryDb({
    friendRequests: { u2: { u1: { requesterUid: 'u1', targetUid: 'u2', status: 'pending' } } },
    outgoingFriendRequests: { u1: { u2: { requesterUid: 'u1', targetUid: 'u2', status: 'pending' } } },
  });

  const accepted = await processSocialAction({
    db,
    uid: 'u2',
    actionId: 'accept',
    raw: { actorUid: 'u2', type: 'acceptRequest', targetUid: 'u1' },
    now: () => 200,
  });
  assert.equal(accepted.status, 'applied');
  assert.equal(db.data.friends.u1.u2.friendUid, 'u2');
  assert.equal(db.data.friends.u2.u1.friendUid, 'u1');
  assert.equal(db.data.friendRequests.u2.u1.status, 'accepted');

  await processSocialAction({
    db,
    uid: 'u2',
    actionId: 'remove',
    raw: { actorUid: 'u2', type: 'removeFriend', targetUid: 'u1' },
    now: () => 210,
  });
  assert.equal(db.data.friends.u1.u2, undefined);
  assert.equal(db.data.friends.u2.u1, undefined);

  db.data.friendRequests.u3 = { u4: { requesterUid: 'u4', targetUid: 'u3', status: 'pending' } };
  db.data.outgoingFriendRequests.u4 = { u3: { requesterUid: 'u4', targetUid: 'u3', status: 'pending' } };
  const declined = await processSocialAction({
    db,
    uid: 'u3',
    actionId: 'decline',
    raw: { actorUid: 'u3', type: 'declineRequest', targetUid: 'u4' },
    now: () => 220,
  });
  assert.equal(declined.status, 'applied');
  assert.equal(db.data.friendRequests.u3.u4.status, 'declined');
});

test('public stats projection does not expose captures or private internals', () => {
  assert.deepEqual(buildPublicStatsProjection({
    gamesPlayed: 4,
    wins: 3,
    winRate: 75,
    currentStreak: 2,
    bestStreak: 5,
    capturesMade: 22,
    updatedAt: 100,
  }), {
    gamesPlayed: 4,
    wins: 3,
    winRate: 75,
    currentStreak: 2,
    bestStreak: 5,
    lastPlayedAt: null,
  });
});

test('profile projection refresh reads existing trusted stats server-side', async () => {
  const db = createMemoryDb({
    playerStats: {
      u1: { gamesPlayed: 7, wins: 4, winRate: 4 / 7, currentStreak: 2, bestStreak: 3, capturesMade: 99 },
    },
    publicProfiles: {
      u1: { uid: 'u1', displayName: 'Old', avatarPreference: 'default', stats: { gamesPlayed: 0, wins: 0, winRate: 0 } },
    },
  });

  const result = await updatePublicProfileProjection({
    db,
    uid: 'u1',
    profile: { displayName: 'New', avatarPreference: 'dice' },
    now: () => 300,
  });

  assert.equal(result.projection.displayName, 'New');
  assert.equal(result.projection.stats.gamesPlayed, 7);
  assert.equal(result.projection.stats.wins, 4);
  assert.equal(result.projection.stats.winRate, 57.1);
  assert.equal(db.data.publicProfiles.u1.stats.capturesMade, undefined);
});

test('game invite creates server room and target inbox; accept and decline update invite state', async () => {
  const db = createMemoryDb({
    friends: { u1: { u2: { friendUid: 'u2' } } },
    publicProfiles: {
      u1: { displayName: 'A', avatarPreference: 'dice' },
      u2: { displayName: 'B', avatarPreference: 'star' },
    },
  });

  const sent = await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'invite1',
    raw: { actorUid: 'u1', type: 'sendGameInvite', targetUid: 'u2', inviteKind: 'game' },
    now: () => 1000,
  });

  assert.equal(sent.status, 'applied');
  assert.equal(db.data.gameInvites.u2.invite1.status, 'pending');
  assert.equal(db.data.outgoingGameInvites.u1.invite1.status, 'pending');
  assert.equal(db.data.rooms[sent.roomCode].players.human.uid, 'u1');
  assert.equal(db.data.rooms[sent.roomCode].players.computer, null);

  const accepted = await processSocialAction({
    db,
    uid: 'u2',
    actionId: 'acceptInvite',
    raw: { actorUid: 'u2', type: 'acceptGameInvite', targetUid: 'u1', inviteId: 'invite1' },
    now: () => 1100,
  });

  assert.equal(accepted.status, 'applied');
  assert.equal(db.data.gameInvites.u2.invite1.status, 'accepted');
  assert.equal(db.data.outgoingGameInvites.u1.invite1.status, 'accepted');
  assert.equal(db.data.rooms[sent.roomCode].players.computer.uid, 'u2');

  db.data.friends.u1.u3 = { friendUid: 'u3' };
  db.data.publicProfiles.u3 = { displayName: 'C' };
  await processSocialAction({
    db,
    uid: 'u1',
    actionId: 'invite2',
    raw: { actorUid: 'u1', type: 'sendGameInvite', targetUid: 'u3', inviteKind: 'game' },
    now: () => 1200,
  });
  const declined = await processSocialAction({
    db,
    uid: 'u3',
    actionId: 'declineInvite',
    raw: { actorUid: 'u3', type: 'declineGameInvite', targetUid: 'u1', inviteId: 'invite2' },
    now: () => 1300,
  });
  assert.equal(declined.status, 'applied');
  assert.equal(db.data.gameInvites.u3.invite2.status, 'declined');
});

test('game invite rejects self, spoof, non-friend, expired, and full-room accepts', async () => {
  const db = createMemoryDb({
    friends: { u1: { u2: { friendUid: 'u2' } } },
    gameInvites: {
      u2: {
        old: { inviteId: 'old', senderUid: 'u1', targetUid: 'u2', status: 'pending', roomCode: '1111', expiresAt: 1000 },
        full: { inviteId: 'full', senderUid: 'u1', targetUid: 'u2', status: 'pending', roomCode: '2222', expiresAt: 5000 },
      },
    },
    outgoingGameInvites: {
      u1: {
        old: { inviteId: 'old', senderUid: 'u1', targetUid: 'u2', status: 'pending', roomCode: '1111', expiresAt: 1000 },
        full: { inviteId: 'full', senderUid: 'u1', targetUid: 'u2', status: 'pending', roomCode: '2222', expiresAt: 5000 },
      },
    },
    rooms: { 2222: { players: { computer: { uid: 'u9' } } } },
  });

  const nonFriend = await processSocialAction({
    db,
    uid: 'u3',
    actionId: 'badInvite',
    raw: { actorUid: 'u3', type: 'sendGameInvite', targetUid: 'u4' },
    now: () => 100,
  });
  assert.equal(nonFriend.status, 'rejected');
  assert.ok(nonFriend.reason.includes('invite-not-allowed'));

  const expired = await processSocialAction({
    db,
    uid: 'u2',
    actionId: 'expired',
    raw: { actorUid: 'u2', type: 'acceptGameInvite', targetUid: 'u1', inviteId: 'old' },
    now: () => 2000,
  });
  assert.equal(expired.status, 'rejected');
  assert.equal(db.data.gameInvites.u2.old.status, 'expired');

  const full = await processSocialAction({
    db,
    uid: 'u2',
    actionId: 'full',
    raw: { actorUid: 'u2', type: 'acceptGameInvite', targetUid: 'u1', inviteId: 'full' },
    now: () => 2100,
  });
  assert.equal(full.status, 'rejected');
  assert.equal(db.data.gameInvites.u2.full.status, 'stale');
});
