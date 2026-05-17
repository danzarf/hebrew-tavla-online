import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProfileCreateValues,
  buildProfileUpdateValues,
  profilePath,
  sanitizeDisplayName,
  upsertPlayerProfile,
} from '../src/firebase/profile.js';

test('sanitizeDisplayName trims whitespace, strips angle brackets, and enforces max length', () => {
  assert.equal(sanitizeDisplayName('  <אורח    בדיקה>  '), 'אורח בדיקה');
  assert.equal(sanitizeDisplayName(''), 'אורח');
  assert.equal(sanitizeDisplayName('abcdefghijklmnopqrs'), 'abcdefghijklmnopqr');
});

test('profilePath stores profiles under the uid-owned profile path', () => {
  assert.equal(profilePath('uid_123'), 'profiles/uid_123');
  assert.throws(() => profilePath(''), /uid is required/);
});

test('buildProfileCreateValues includes only safe non-economy profile fields', () => {
  const timestamp = { '.sv': 'timestamp' };
  const profile = buildProfileCreateValues({ uid: 'uid_1', displayName: 'Player', timestamp });

  assert.deepEqual(Object.keys(profile).sort(), [
    'avatarPreference',
    'createdAt',
    'displayName',
    'isAnonymous',
    'lastSeenAt',
    'uid',
    'updatedAt',
  ]);
  assert.equal(profile.uid, 'uid_1');
  assert.equal(profile.displayName, 'Player');
  assert.equal(profile.isAnonymous, true);
  assert.equal(profile.avatarPreference, 'default');
  assert.equal(profile.createdAt, timestamp);
  assert.equal(profile.updatedAt, timestamp);
  assert.equal(profile.lastSeenAt, timestamp);
  assert.equal(Object.hasOwn(profile, 'coins'), false);
  assert.equal(Object.hasOwn(profile, 'xp'), false);
  assert.equal(Object.hasOwn(profile, 'wins'), false);
  assert.equal(Object.hasOwn(profile, 'losses'), false);
});

test('buildProfileUpdateValues does not include uid or createdAt', () => {
  const timestamp = { '.sv': 'timestamp' };
  const profile = buildProfileUpdateValues({ displayName: 'Player', timestamp });

  assert.deepEqual(Object.keys(profile).sort(), [
    'avatarPreference',
    'displayName',
    'isAnonymous',
    'lastSeenAt',
    'updatedAt',
  ]);
  assert.equal(Object.hasOwn(profile, 'uid'), false);
  assert.equal(Object.hasOwn(profile, 'createdAt'), false);
});

test('upsertPlayerProfile creates a profile when missing', async () => {
  const writes = [];
  const result = await upsertPlayerProfile({
    db: {},
    ref: (_db, path) => ({ path }),
    get: async () => ({ exists: () => false }),
    set: async (target, values) => writes.push(['set', target.path, values]),
    update: async (target, values) => writes.push(['update', target.path, values]),
    serverTimestamp: () => 'SERVER_TIME',
    uid: 'uid_1',
    displayName: 'Player',
  });

  assert.equal(result.uid, 'uid_1');
  assert.equal(result.displayName, 'Player');
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'set');
  assert.equal(writes[0][1], 'profiles/uid_1');
});

test('upsertPlayerProfile updates safe fields when profile exists', async () => {
  const writes = [];
  const result = await upsertPlayerProfile({
    db: {},
    ref: (_db, path) => ({ path }),
    get: async () => ({ exists: () => true }),
    set: async (target, values) => writes.push(['set', target.path, values]),
    update: async (target, values) => writes.push(['update', target.path, values]),
    serverTimestamp: () => 'SERVER_TIME',
    uid: 'uid_1',
    displayName: 'Updated',
  });

  assert.equal(result.displayName, 'Updated');
  assert.equal(Object.hasOwn(result, 'uid'), false);
  assert.equal(Object.hasOwn(result, 'createdAt'), false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'update');
  assert.equal(writes[0][1], 'profiles/uid_1');
});

test('upsertPlayerProfile is a no-op when uid is missing', async () => {
  const result = await upsertPlayerProfile({ uid: null });

  assert.equal(result, null);
});
