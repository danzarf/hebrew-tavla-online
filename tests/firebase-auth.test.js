import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalGuestId,
  getAuthenticatedUid,
  getOrCreateLocalGuestId,
  resolvePlayerId,
  startAnonymousAuth,
} from '../src/firebase/auth.js';

function memoryStorage(initial = {}) {
  const values = { ...initial };
  return {
    getItem(key) {
      return Object.hasOwn(values, key) ? values[key] : null;
    },
    setItem(key, value) {
      values[key] = value;
    },
  };
}

test('buildLocalGuestId keeps the legacy local guest id prefix', () => {
  assert.equal(buildLocalGuestId(0.123456789, 123456789), 'p_12345678921i3v9');
});

test('getOrCreateLocalGuestId reuses an existing stored guest id', () => {
  const storage = memoryStorage({ tavlaPlayerId: 'p_existing' });

  assert.equal(getOrCreateLocalGuestId({ storage }), 'p_existing');
});

test('getOrCreateLocalGuestId creates and stores a guest id when missing', () => {
  const storage = memoryStorage();
  const id = getOrCreateLocalGuestId({ storage, random: () => 0.42, now: () => 1000 });

  assert.equal(id, 'p_42rs');
  assert.equal(storage.getItem('tavlaPlayerId'), 'p_42rs');
});

test('resolvePlayerId prefers the authenticated uid over local guest fallback', () => {
  assert.equal(resolvePlayerId({ authenticatedUid: 'uid_123', localGuestId: 'p_local' }), 'uid_123');
  assert.equal(resolvePlayerId({ authenticatedUid: null, localGuestId: 'p_local' }), 'p_local');
});

test('getAuthenticatedUid supports auth state objects and users', () => {
  assert.equal(getAuthenticatedUid({ uid: 'state_uid' }), 'state_uid');
  assert.equal(getAuthenticatedUid({ user: { uid: 'user_uid' } }), 'user_uid');
  assert.equal(getAuthenticatedUid(null), null);
});

test('startAnonymousAuth exposes uid when Firebase sign-in succeeds', async () => {
  const session = startAnonymousAuth({
    firebaseApp: {},
    getAuth: () => ({}),
    signInAnonymously: async () => ({ user: { uid: 'anon_uid' } }),
  });

  assert.equal(await session.ready, 'anon_uid');
  assert.equal(session.getUid(), 'anon_uid');
  assert.equal(session.getStatus(), 'authenticated');
});

test('startAnonymousAuth falls back without throwing when Firebase sign-in fails', async () => {
  const error = new Error('auth unavailable');
  const session = startAnonymousAuth({
    firebaseApp: {},
    getAuth: () => ({}),
    signInAnonymously: async () => { throw error; },
    logger: { warn() {} },
  });

  assert.equal(await session.ready, null);
  assert.equal(session.getUid(), null);
  assert.equal(session.getStatus(), 'fallback');
  assert.equal(session.getError(), error);
});
