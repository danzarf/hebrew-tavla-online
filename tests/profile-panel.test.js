import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROFILE_PANEL_PROGRESS_PLACEHOLDERS,
  PROFILE_PANEL_SAFE_EDIT_FIELDS,
  buildProfilePanelViewModel,
  buildSafeProfileEditView,
  getProfilePanelAuthLabel,
} from '../src/ui/profilePanel.js';

const ECONOMY_AND_PROGRESSION_FIELDS = ['coins', 'xp', 'wins', 'losses', 'stats', 'rewards', 'level'];

test('buildProfilePanelViewModel shows sanitized display name and anonymous connection copy', () => {
  const view = buildProfilePanelViewModel({
    typedName: '  דנה\nהאלופה  ',
    authStatus: 'authenticated',
    hasAuthenticatedUid: true,
    avatarPreference: 'star',
  });

  assert.equal(view.displayName, 'דנה האלופה');
  assert.equal(view.statusText, 'אורח מחובר');
  assert.equal(view.authLabel, 'מחובר כאורח');
  assert.equal(view.avatarPreference, 'star');
  assert.equal(view.avatarText, '⭐');
  assert.match(view.note, /כאורח/);
  assert.equal(view.accountUpgradeTitle, 'שמור התקדמות');
  assert.match(view.accountUpgradeBody, /בין מכשירים/);
  assert.equal(view.googleButtonText, 'Google יופעל בקרוב');
  assert.equal(view.googleButtonDisabled, true);
  assert.match(view.googleSetupNote, /Firebase/);
});

test('profile panel exposes only safe editable profile fields', () => {
  assert.deepEqual(PROFILE_PANEL_SAFE_EDIT_FIELDS, ['displayName', 'avatarPreference']);

  for (const field of ECONOMY_AND_PROGRESSION_FIELDS) {
    assert.equal(PROFILE_PANEL_SAFE_EDIT_FIELDS.includes(field), false, `${field} must not be editable from the panel`);
  }
});

test('buildSafeProfileEditView sanitizes display name and normalizes unsafe avatars', () => {
  const view = buildSafeProfileEditView({
    displayName: '  רוני\tהזריז  ',
    avatarPreference: 'https://example.com/avatar.png',
  });

  assert.deepEqual(view, {
    displayName: 'רוני הזריז',
    avatarPreference: 'default',
    avatarText: '👤',
  });
});

test('profile panel avatar choices are built-in values only', () => {
  const view = buildProfilePanelViewModel({ avatarPreference: 'wolf' });

  assert.ok(view.avatarOptions.length >= 6);
  assert.deepEqual(view.recommendedAvatarOptions.map(option => option.label), ['👤', '🎲', '🏆', '⭐', '👑', '🧿', '🐺', '🦊']);
  assert.ok(view.expandedAvatarOptions.some(option => option.label === '🐉'));
  assert.equal(view.hasMoreAvatars, true);
  assert.ok(view.avatarOptions.every(option => !String(option.value).includes('://')));
});

test('profile panel progression fields are coming-soon placeholders only', () => {
  const view = buildProfilePanelViewModel({ stateName: 'אורח 123', authStatus: 'fallback' });

  assert.deepEqual(
    view.progressPlaceholders,
    PROFILE_PANEL_PROGRESS_PLACEHOLDERS.map(item => ({ ...item })),
  );
  assert.ok(view.progressPlaceholders.every(item => item.value === 'בקרוב'));
  assert.deepEqual(view.progressPlaceholders.map(item => item.label), ['משחקים', 'ניצחונות', 'הפסדים', 'אחוז ניצחון', 'רצף נוכחי']);
  assert.match(view.placeholderNote, /משחקים מאומתים/);
});

test('profile panel enables Google button only when the feature is configured', () => {
  const view = buildProfilePanelViewModel({
    typedName: 'דנה',
    authStatus: 'authenticated',
    hasAuthenticatedUid: true,
    googleLinkingEnabled: true,
  });

  assert.equal(view.googleButtonText, 'שמור אורח עם Google');
  assert.equal(view.googleButtonDisabled, false);
  assert.match(view.googleSetupNote, /אפשר להמשיך כאורח/);
});

test('profile panel shows linked Google account copy without exposing technical details', () => {
  assert.equal(getProfilePanelAuthLabel({ authStatus: 'linked', hasAuthenticatedUid: true, isAnonymous: false }), 'חשבון שמור');

  const view = buildProfilePanelViewModel({
    typedName: 'דנה',
    authStatus: 'linked',
    hasAuthenticatedUid: true,
    isAnonymous: false,
  });

  assert.equal(view.statusText, 'חשבון שמור');
  assert.equal(view.authLabel, 'חשבון שמור');
  assert.equal(view.googleButtonText, 'חשבון Google מחובר');
  assert.equal(view.googleButtonDisabled, true);
  assert.match(view.accountUpgradeBody, /פרופיל האורח נשמר/);
});

test('profile panel uses safe guest fallback labels when auth is unavailable', () => {
  assert.equal(getProfilePanelAuthLabel({ authStatus: 'fallback' }), 'אורח מקומי');
  assert.equal(getProfilePanelAuthLabel({ authStatus: 'initializing' }), 'מתחבר כאורח');

  const view = buildProfilePanelViewModel({ stateName: 'אתה', authStatus: 'fallback', avatarPreference: '<img>' });
  assert.equal(view.displayName, 'אורח');
  assert.equal(view.statusText, 'אורח מקומי');
  assert.equal(view.authLabel, 'אורח מקומי');
  assert.equal(view.avatarPreference, 'default');
  assert.match(view.saveHint, /מקומית/);
});


test('profile panel shows trusted stats values when trusted stats exist', () => {
  const view = buildProfilePanelViewModel({
    hasTrustedStats: true,
    trustedStats: { gamesPlayed: 10, wins: 7, losses: 3, currentStreak: 2 },
  });

  assert.equal(view.progressPlaceholders[0].value, '10');
  assert.equal(view.progressPlaceholders[1].value, '7');
  assert.equal(view.progressPlaceholders[2].value, '3');
  assert.equal(view.progressPlaceholders[3].value, '70%');
  assert.equal(view.progressPlaceholders[4].value, '2');
  assert.match(view.placeholderNote, /ממקור מאומת בלבד/);
});

test('profile panel exposes compact stats refresh state for manual refresh UX', () => {
  const view = buildProfilePanelViewModel({
    statsRefreshBusy: true,
    statsRefreshMessage: 'בודק עדכון סטטיסטיקות...',
    statsRefreshTone: 'success',
    statsLastCheckedAt: '12:45',
  });

  assert.equal(view.statsRefreshActionText, 'מרענן...');
  assert.equal(view.statsRefreshDisabled, true);
  assert.equal(view.statsRefreshMessage, 'בודק עדכון סטטיסטיקות...');
  assert.equal(view.statsRefreshTone, 'success');
  assert.match(view.statsLastCheckedText, /12:45/);
});

test('profile panel keeps safe fallback tone for failed refresh state', () => {
  const view = buildProfilePanelViewModel({
    statsRefreshTone: 'warning',
    statsRefreshMessage: 'לא הצלחנו לרענן כרגע. אפשר לנסות שוב.',
  });

  assert.equal(view.statsRefreshDisabled, false);
  assert.equal(view.statsRefreshTone, 'warning');
  assert.match(view.statsRefreshMessage, /לרענן/);
});
