import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecentOpponents,
  buildSocialViewModel,
  sanitizePublicProfile,
  summarizeFriendshipState,
} from '../src/product/social.js';
import { createSocialActionId, submitSocialAction, subscribeSocialPaths } from '../src/firebase/social.js';
import {
  convergePendingAcceptedInvite,
  convergePendingHostedInvite,
  getActionIdFromPath,
} from '../src/product/inviteConvergence.js';
import { updateSocialNotificationState } from '../src/product/socialNotifications.js';
import { buildRematchRoomSeed, canOfferRematch, getRematchButtonText } from '../src/product/rematch.js';

test('public profile sanitizer keeps only safe public fields', () => {
  const profile = sanitizePublicProfile({
    uid: 'u1',
    displayName: '  דנה <b> ',
    avatarPreference: 'star',
    email: 'private@example.com',
    stats: { gamesPlayed: 9, wins: 4, winRate: 44.44, capturesMade: 99 },
  });

  assert.equal(profile.displayName, 'דנה <b>');
  assert.equal(profile.avatarPreference, 'star');
  assert.deepEqual(Object.keys(profile.stats).sort(), ['bestStreak', 'currentStreak', 'gamesPlayed', 'lastPlayedAt', 'winRate', 'wins']);
});

test('recent opponents deduplicates newest first and excludes diagnostics', () => {
  const rows = buildRecentOpponents([
    { matchId: 'old', opponentUid: 'u2', opponentDisplayName: 'ישן', result: 'loss', endedAt: 10 },
    { matchId: 'new', opponentUid: 'u2', opponentDisplayName: 'חדש', result: 'win', endedAt: 30 },
    { matchId: 'diag', opponentUid: 'diagnostic-1', opponentDisplayName: 'diag', result: 'win', endedAt: 40 },
    { matchId: 'other', opponentUid: 'u3', opponentDisplayName: 'אחר', result: 'loss', endedAt: 20 },
  ], {
    u2: { uid: 'u2', displayName: 'נועם', avatarPreference: 'dice', stats: { gamesPlayed: 3, winRate: 66.6 } },
  });

  assert.deepEqual(rows.map(row => row.uid), ['u2', 'u3']);
  assert.equal(rows[0].displayName, 'נועם');
  assert.equal(rows[1].displayName, 'אחר');
  assert.equal(rows[0].lastResult, 'win');
});

test('friendship state and social view model expose compact Hebrew-ready rows', () => {
  assert.equal(summarizeFriendshipState({ uid: 'u2', friends: { u2: {} } }), 'friends');
  assert.equal(summarizeFriendshipState({ uid: 'u2', incomingRequests: { u2: { status: 'pending' } } }), 'incoming');
  assert.equal(summarizeFriendshipState({ uid: 'u2', outgoingRequests: { u2: { status: 'pending' } } }), 'outgoing');
  assert.equal(summarizeFriendshipState({ uid: 'u2' }), 'none');

  const view = buildSocialViewModel({
    friends: { u2: {} },
    incomingRequests: { u3: { requesterUid: 'u3', status: 'pending' } },
    outgoingRequests: { u4: { status: 'pending' } },
    publicProfiles: {
      u2: { uid: 'u2', displayName: 'דנה', stats: { gamesPlayed: 2, winRate: 50 } },
      u3: { uid: 'u3', displayName: 'רון' },
    },
  });

  assert.equal(view.friendsCount, 1);
  assert.equal(view.friendRows[0].displayName, 'דנה');
  assert.equal(view.incomingRows[0].displayName, 'רון');
  assert.equal(view.outgoingCount, 1);
  assert.equal(view.emptyFriendsText, 'עדיין אין לך חברים.');
});

test('social view model counts live invite and request notifications', () => {
  const view = buildSocialViewModel({
    incomingRequests: { u2: { requesterUid: 'u2', status: 'pending' } },
    incomingGameInvites: { i1: { inviteId: 'i1', senderUid: 'u3', senderDisplayName: 'Ron', status: 'pending', expiresAt: Date.now() + 1000 } },
    outgoingGameInvites: { i2: { inviteId: 'i2', targetUid: 'u4', targetDisplayName: 'Dana', status: 'pending', expiresAt: Date.now() + 1000 } },
  });

  assert.equal(view.activeNotificationCount, 2);
  assert.equal(view.incomingInviteRows[0].uid, 'u3');
  assert.equal(view.outgoingInviteRows[0].uid, 'u4');
});

test('subscribeSocialPaths attaches own-path listeners and cleanup unsubscribes all', () => {
  const paths = [];
  const unsubscribed = [];
  const unsubscribe = subscribeSocialPaths({
    database: {},
    ref: (_database, path) => path,
    onValue: (path, callback) => {
      paths.push(path);
      callback({ val: () => ({ ok: true }) });
      return () => unsubscribed.push(path);
    },
    uid: 'u1',
    onChange: () => {},
  });

  assert.deepEqual(paths.sort(), [
    'friendRequests/u1',
    'friends/u1',
    'gameInvites/u1',
    'outgoingFriendRequests/u1',
    'outgoingGameInvites/u1',
  ].sort());
  unsubscribe();
  assert.equal(unsubscribed.length, 5);
});

test('invite convergence waits when listener fires before pending id exists, then joins after pending assignment', async () => {
  const socialState = {
    pendingHostInviteId: '',
    outgoingGameInvites: { action1: { inviteId: 'action1', status: 'pending', roomCode: '1234' } },
  };
  const joined = [];

  assert.equal((await convergePendingHostedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, false);
  socialState.pendingHostInviteId = 'action1';
  assert.equal((await convergePendingHostedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, true);
  assert.deepEqual(joined, ['1234']);
  assert.equal(socialState.pendingHostInviteId, '');
});

test('invite convergence handles slower backend and duplicate listener events without duplicate joins', async () => {
  const socialState = { pendingHostInviteId: 'action1', outgoingGameInvites: {} };
  const joined = [];

  assert.equal((await convergePendingHostedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, false);
  socialState.outgoingGameInvites.action1 = { inviteId: 'action1', status: 'pending', roomCode: '5555' };
  assert.equal((await convergePendingHostedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, true);
  assert.equal((await convergePendingHostedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, false);
  assert.deepEqual(joined, ['5555']);
});

test('accepted target convergence joins only after server marks invite accepted', async () => {
  const socialState = {
    pendingJoinInviteId: 'invite1',
    incomingGameInvites: { invite1: { inviteId: 'invite1', status: 'pending', roomCode: '7777' } },
  };
  const joined = [];

  assert.equal((await convergePendingAcceptedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, false);
  socialState.incomingGameInvites.invite1.status = 'accepted';
  assert.equal((await convergePendingAcceptedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, true);
  assert.equal((await convergePendingAcceptedInvite({ socialState, joinRoomByCode: code => joined.push(code) })).joined, false);
  assert.deepEqual(joined, ['7777']);
});

test('invite convergence does not rejoin hosted room after reload when already online', async () => {
  const socialState = {
    pendingHostInviteId: 'invite1',
    outgoingGameInvites: { invite1: { inviteId: 'invite1', status: 'pending', roomCode: '8888' } },
  };
  const joined = [];
  const result = await convergePendingHostedInvite({
    socialState,
    isOnline: () => true,
    joinRoomByCode: code => joined.push(code),
  });

  assert.equal(result.joined, false);
  assert.deepEqual(joined, []);
});

test('social action id can be recovered from written action path', () => {
  assert.equal(getActionIdFromPath('socialActions/u1/action_123'), 'action_123');
  assert.match(createSocialActionId({ now: () => 100, random: () => 0.123456789 }), /^100_[a-z0-9]+$/);
});

test('submitSocialAction can use caller-provided id before backend finishes', async () => {
  const writes = [];
  const result = await submitSocialAction({
    database: {},
    ref: (_database, path) => path,
    set: async (path, value) => writes.push({ path, value }),
    uid: 'u1',
    type: 'sendGameInvite',
    targetUid: 'u2',
    actionId: 'known-action',
    inviteKind: 'game',
    now: () => 200,
  });

  assert.equal(result.path, 'socialActions/u1/known-action');
  assert.equal(writes[0].path, 'socialActions/u1/known-action');
  assert.equal(writes[0].value.inviteKind, 'game');
});

test('social notifications skip initial hydration but toast on first new 0 to 1 update', () => {
  const state = { lastIncomingCount: 0, notificationHydrated: false };
  assert.equal(updateSocialNotificationState(state, 2, { hasReceivedSnapshot: true }).shouldToast, false);
  assert.equal(state.lastIncomingCount, 2);
  assert.equal(updateSocialNotificationState(state, 2, { hasReceivedSnapshot: true }).shouldToast, false);
  assert.equal(updateSocialNotificationState(state, 3, { hasReceivedSnapshot: true }).shouldToast, true);

  const emptyHydration = { lastIncomingCount: 0, notificationHydrated: false };
  assert.equal(updateSocialNotificationState(emptyHydration, 0, { hasReceivedSnapshot: true }).shouldToast, false);
  assert.equal(updateSocialNotificationState(emptyHydration, 1, { hasReceivedSnapshot: true }).shouldToast, true);
});

test('rematch helpers require real online context and create a new-room seed', () => {
  assert.equal(canOfferRematch({
    matchResult: { mode: 'online', matchId: 'm1' },
    gameMode: 'online',
    roomCode: '1234',
    playerUids: { human: 'u1', computer: 'u2' },
  }), true);
  assert.equal(canOfferRematch({ matchResult: { mode: 'online', matchId: 'm1' }, gameMode: 'local' }), false);

  const seed = buildRematchRoomSeed({
    previousMatchId: 'm1',
    roomCode: '1234',
    requesterUid: 'u1',
    targetUid: 'u2',
    requesterName: 'דנה',
    targetName: 'נועם',
    now: () => 500,
  });
  assert.equal(seed.rematchOf, 'm1');
  assert.equal(seed.requestedAt, 500);
  assert.equal(getRematchButtonText({ busy: true }), 'פותח משחק נוסף...');
});
