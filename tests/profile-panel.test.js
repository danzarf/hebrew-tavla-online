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
  assert.match(view.placeholderNote, /לא נשמרים עדיין/);
});

test('profile panel enables Google button only when the feature is configured', () => {
  const view = buildProfilePanelViewModel({
    typedName: 'דנה',
    authStatus: 'authenticated',
    hasAuthenticatedUid: true,
    googleLinkingEnabled: true,
  });

  assert.equal(view.googleButtonText, 'חבר חשבון Google');
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
