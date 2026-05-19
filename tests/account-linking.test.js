import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canLinkGuestToGoogle,
  getGoogleLinkFriendlyMessage,
  getGoogleSignInFriendlyMessage,
  isLinkedAuthUser,
  linkGuestToGoogle,
  signInExistingGoogleAccount,
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
  assert.match(result.message, /אפשר להתחבר אליו עם Google/);
});

test('linkGuestToGoogle reports auth readiness instead of coming-soon when the anonymous user is missing', async () => {
  const result = await linkGuestToGoogle({
    auth: { currentUser: null },
    GoogleAuthProvider: FakeGoogleProvider,
    linkWithPopup: async () => { throw new Error('popup should not open without a user'); },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'auth-not-ready');
  assert.doesNotMatch(result.message, /זמינה בקרוב/);
  assert.match(result.message, /חשבון האורח/);
});

test('Google linking errors are mapped to friendly player messages', () => {
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/popup-closed-by-user' }), /בוטל/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/operation-not-allowed' }), /ספק Google/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/unauthorized-domain' }), /לא מורשה/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/popup-blocked' }), /חסם/);
  assert.match(getGoogleLinkFriendlyMessage({ code: 'auth/network-request-failed' }), /אפשר להמשיך כאורח/);
});

test('signInExistingGoogleAccount signs in with popup for existing account flow', async () => {
  const auth = { currentUser: null };
  const result = await signInExistingGoogleAccount({
    auth,
    GoogleAuthProvider: FakeGoogleProvider,
    signInWithPopup: async (currentAuth, provider) => {
      assert.equal(currentAuth, auth);
      assert.deepEqual(provider.parameters, { prompt: 'select_account' });
      return { user: { uid: 'google_uid', isAnonymous: false } };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.user.uid, 'google_uid');
});

test('Google sign-in errors are mapped to friendly player messages', () => {
  assert.match(getGoogleSignInFriendlyMessage({ code: 'auth/popup-closed-by-user' }), /בוטלה/);
  assert.match(getGoogleSignInFriendlyMessage({ code: 'auth/unauthorized-domain' }), /לא מורשה/);
});
