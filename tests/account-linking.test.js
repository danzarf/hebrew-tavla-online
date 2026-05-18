import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canLinkGuestToGoogle,
  getGoogleLinkFriendlyMessage,
  isLinkedAuthUser,
  linkGuestToGoogle,
} from '../src/firebase/accountLinking.js';

class FakeGoogleProvider {
  constructor() {
    this.parameters = null;
  }

  setCustomParameters(parameters) {
    this.parameters = parameters;
  }
}

test('canLinkGuestToGoogle only enables linking for an anonymous Firebase user', () => {
  assert.equal(canLinkGuestToGoogle({ auth: {}, user: { uid: 'anon', isAnonymous: true } }), true);
  assert.equal(canLinkGuestToGoogle({ auth: {}, user: { uid: 'saved', isAnonymous: false } }), false);
  assert.equal(canLinkGuestToGoogle({ auth: {}, user: null }), false);
  assert.equal(canLinkGuestToGoogle({ auth: null, user: { uid: 'anon', isAnonymous: true } }), false);
});

test('isLinkedAuthUser identifies a saved non-anonymous account without exposing uid copy', () => {
  assert.equal(isLinkedAuthUser({ uid: 'saved_uid', isAnonymous: false }), true);
  assert.equal(isLinkedAuthUser({ uid: 'anon_uid', isAnonymous: true }), false);
  assert.equal(isLinkedAuthUser(null), false);
});

test('linkGuestToGoogle links the current anonymous user and keeps the same uid', async () => {
  const user = { uid: 'anon_uid', isAnonymous: true };
  const auth = { currentUser: user };
  let linkedUser = null;

  const result = await linkGuestToGoogle({
    auth,
    user,
    GoogleAuthProvider: FakeGoogleProvider,
    linkWithPopup: async (currentUser, provider) => {
      assert.equal(currentUser, user);
      assert.deepEqual(provider.parameters, { prompt: 'select_account' });
      linkedUser = { ...currentUser, isAnonymous: false };
      auth.currentUser = linkedUser;
      return { user: linkedUser };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.user.uid, 'anon_uid');
  assert.equal(result.user.isAnonymous, false);
  assert.match(result.message, /נשמר/);
});

test('linkGuestToGoogle does not sign into an existing Google account over the guest profile', async () => {
  const error = Object.assign(new Error('credential exists'), { code: 'auth/credential-already-in-use' });
  const result = await linkGuestToGoogle({
    auth: { currentUser: { uid: 'anon_uid', isAnonymous: true } },
    GoogleAuthProvider: FakeGoogleProvider,
    linkWithPopup: async () => { throw error; },
    logger: { warn() {} },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'link-failed');
  assert.match(result.message, /כדי לא לאבד את הפרופיל/);
});

test('Google linking errors are mapped to friendly player messages', () => {
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/popup-closed-by-user' }), /בוטל/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/operation-not-allowed' }), /Firebase/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/unauthorized-domain' }), /הדומיין המורשה/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/popup-blocked' }), /חסם/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/network-request-failed' }), /אפשר להמשיך כאורח/);
});
