import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROFILE_PANEL_PROGRESS_PLACEHOLDERS,
  buildProfilePanelViewModel,
  getProfilePanelAuthLabel,
} from '../src/ui/profilePanel.js';

test('buildProfilePanelViewModel shows sanitized display name and anonymous connection copy', () => {
  const view = buildProfilePanelViewModel({
    typedName: '  דנה\nהאלופה  ',
    authStatus: 'authenticated',
    hasAuthenticatedUid: true,
  });

  assert.equal(view.displayName, 'דנה האלופה');
  assert.equal(view.statusText, 'אורח מחובר');
  assert.equal(view.authLabel, 'מחובר כאורח');
  assert.match(view.note, /התחברות מלאה/);
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

test('profile panel uses safe guest fallback labels when auth is unavailable', () => {
  assert.equal(getProfilePanelAuthLabel({ authStatus: 'fallback' }), 'אורח מקומי');
  assert.equal(getProfilePanelAuthLabel({ authStatus: 'initializing' }), 'מתחבר כאורח');

  const view = buildProfilePanelViewModel({ stateName: 'אתה', authStatus: 'fallback' });
  assert.equal(view.displayName, 'אורח');
  assert.equal(view.statusText, 'אורח מקומי');
  assert.equal(view.authLabel, 'אורח מקומי');
});
