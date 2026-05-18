import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStartHomeViewModel } from '../src/ui/startScreen.js';

const FORBIDDEN_REAL_PROGRESS_COPY = ['+10', 'coins awarded', 'xp awarded'];

test('start home shows a clear guest account state and enabled Google linking when ready', () => {
  const view = buildStartHomeViewModel({
    displayName: 'דנה',
    avatarText: '⭐',
    authLabel: 'מחובר כאורח',
    statusText: 'אורח מחובר',
    googleLinkingEnabled: true,
    canTryGoogleLink: true,
  });

  assert.equal(view.title, 'ששבש טורקי');
  assert.equal(view.displayName, 'דנה');
  assert.equal(view.avatarText, '⭐');
  assert.equal(view.guestButtonText, 'המשך כאורח');
  assert.equal(view.googleButtonText, 'חבר חשבון Google');
  assert.equal(view.googleButtonDisabled, false);
  assert.equal(view.shouldSkipAccountChoice, false);
  assert.match(view.accountSummary, /כאורח/);
});

test('start home shows connected Google state without a confusing connect action', () => {
  const view = buildStartHomeViewModel({
    displayName: 'דנה',
    isLinkedAccount: true,
    googleLinkingEnabled: true,
    canTryGoogleLink: false,
  });

  assert.equal(view.guestButtonText, 'המשך כאורח');
  assert.equal(view.googleButtonText, 'חשבון Google מחובר');
  assert.equal(view.googleButtonDisabled, true);
  assert.equal(view.showConnectedBadge, true);
  assert.equal(view.shouldSkipAccountChoice, true);
  assert.match(view.accountSummary, /Google מחובר/);
});

test('start home progression note stays coming-soon only', () => {
  const view = buildStartHomeViewModel();

  assert.match(view.progressNote, /יתווספו בהמשך/);
  for (const copy of FORBIDDEN_REAL_PROGRESS_COPY) {
    assert.equal(JSON.stringify(view).includes(copy), false);
  }
});
