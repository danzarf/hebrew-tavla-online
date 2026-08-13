import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRecentOpponents,
  buildSocialViewModel,
  sanitizePublicProfile,
  summarizeFriendshipState,
} from '../src/product/social.js';
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
