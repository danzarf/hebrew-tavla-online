import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AVATAR_PREFERENCE_OPTIONS,
  DEFAULT_AVATAR_PREFERENCE,
  buildProfilePayload,
  createGuestDisplayName,
  getAvatarPreferenceLabel,
  profilePath,
  SAFE_PROFILE_FIELDS,
  sanitizeAvatarPreference,
  sanitizeDisplayName,
  syncPlayerProfile,
} from '../src/firebase/profile.js';

const ECONOMY_AND_PROGRESSION_FIELDS = ['coins', 'xp', 'wins', 'losses', 'stats', 'rewards', 'level'];

function makeSnapshot(value) {
  return {
    exists: () => value !== null,
    val: () => value,
  };
}

test('sanitizeDisplayName trims, normalizes spaces, removes controls, and limits length', () => {
  assert.equal(sanitizeDisplayName('  דני\n\tהאלוף  ', { fallbackName: 'אורח 123' }), 'דני האלוף');
  assert.equal(sanitizeDisplayName('abcdefghijklmnopqrstuv', { fallbackName: 'אורח 123' }), 'abcdefghijklmnopqr');
});

test('sanitizeDisplayName preserves guest fallback when name is empty', () => {
  assert.equal(sanitizeDisplayName('   ', { fallbackName: 'אורח 456' }), 'אורח 456');
  assert.equal(createGuestDisplayName(0), 'אורח 100');
  assert.equal(createGuestDisplayName(0.999), 'אורח 999');
});


test('sanitizeAvatarPreference accepts only built-in safe avatar choices', () => {
  assert.equal(sanitizeAvatarPreference('dice'), 'dice');
  assert.equal(sanitizeAvatarPreference(' evil-eye '), 'evil-eye');
  assert.equal(sanitizeAvatarPreference('https://example.com/avatar.png'), DEFAULT_AVATAR_PREFERENCE);
  assert.equal(sanitizeAvatarPreference('<img>'), DEFAULT_AVATAR_PREFERENCE);
  assert.equal(getAvatarPreferenceLabel('wolf'), '🐺');
  assert.equal(getAvatarPreferenceLabel('not-allowed'), '👤');
  assert.ok(AVATAR_PREFERENCE_OPTIONS.every(option => typeof option.value === 'string' && typeof option.label === 'string'));
});

test('profilePath stores profiles under profiles/{uid}', () => {
  assert.equal(profilePath('anon_uid_123'), 'profiles/anon_uid_123');
});

test('buildProfilePayload creates only safe profile fields', () => {
  const payload = buildProfilePayload({
    uid: 'uid_1',
    displayName: 'שחקן',
    isAnonymous: true,
    avatarPreference: 'dice',
    now: () => 12345,
  });

  assert.deepEqual(Object.keys(payload).sort(), SAFE_PROFILE_FIELDS.toSorted());
  assert.deepEqual(payload, {
    uid: 'uid_1',
    displayName: 'שחקן',
    isAnonymous: true,
    avatarPreference: 'dice',
    createdAt: 12345,
    updatedAt: 12345,
    lastSeenAt: 12345,
  });

  for (const field of ECONOMY_AND_PROGRESSION_FIELDS) {
    assert.equal(Object.hasOwn(payload, field), false, `${field} must not be written`);
  }
});

test('buildProfilePayload updates an existing profile without overwriting createdAt', () => {
  const payload = buildProfilePayload({
    uid: 'uid_1',
    displayName: 'שם חדש',
    existingProfile: { createdAt: 11111 },
    now: () => 22222,
  });

  assert.equal(Object.hasOwn(payload, 'createdAt'), false);
  assert.equal(payload.updatedAt, 22222);
  assert.equal(payload.lastSeenAt, 22222);
});

test('syncPlayerProfile no-ops when UID is missing', async () => {
  let wrote = false;
  const result = await syncPlayerProfile({
    uid: null,
    database: {},
    ref: () => ({}),
    get: async () => makeSnapshot(null),
    set: async () => { wrote = true; },
    update: async () => { wrote = true; },
  });

  assert.deepEqual(result, { skipped: true, reason: 'missing-uid' });
  assert.equal(wrote, false);
});

test('syncPlayerProfile creates and updates profiles at the safe profile path', async () => {
  const writes = [];
  const database = {};
  const ref = (db, path) => ({ db, path });

  const createResult = await syncPlayerProfile({
    uid: 'uid_2',
    displayName: 'שחקנית',
    database,
    ref,
    get: async () => makeSnapshot(null),
    set: async (targetRef, payload) => writes.push(['set', targetRef.path, payload]),
    update: async (targetRef, payload) => writes.push(['update', targetRef.path, payload]),
    now: () => 33333,
  });

  const updateResult = await syncPlayerProfile({
    uid: 'uid_2',
    displayName: 'שחקנית חוזרת',
    database,
    ref,
    get: async () => makeSnapshot({ createdAt: 33333 }),
    set: async (targetRef, payload) => writes.push(['set', targetRef.path, payload]),
    update: async (targetRef, payload) => writes.push(['update', targetRef.path, payload]),
    now: () => 44444,
  });

  assert.equal(createResult.path, 'profiles/uid_2');
  assert.equal(updateResult.path, 'profiles/uid_2');
  assert.equal(writes[0][0], 'set');
  assert.equal(writes[0][1], 'profiles/uid_2');
  assert.equal(writes[1][0], 'update');
  assert.equal(writes[1][1], 'profiles/uid_2');
  assert.equal(Object.hasOwn(writes[1][2], 'createdAt'), false);
});

test('syncPlayerProfile logs a warning and keeps gameplay non-blocking when write fails', async () => {
  const error = new Error('permission denied');
  const warnings = [];
  const result = await syncPlayerProfile({
    uid: 'uid_3',
    displayName: 'שחקן',
    database: {},
    ref: (db, path) => ({ db, path }),
    get: async () => makeSnapshot(null),
    set: async () => { throw error; },
    update: async () => {},
    logger: { warn: (...args) => warnings.push(args) },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'write-failed');
  assert.equal(result.error, error);
  assert.equal(warnings.length, 1);
});
