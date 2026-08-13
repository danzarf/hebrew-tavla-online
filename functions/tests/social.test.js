import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPublicProfileProjection, buildPublicStatsProjection } from '../src/publicProfile.js';
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
