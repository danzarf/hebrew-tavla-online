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
  assert.equal(view.googleButtonText, 'התחבר עם Google');
  assert.equal(view.googleButtonDisabled, false);
  assert.equal(view.shouldSkipAccountChoice, false);
  assert.match(view.accountSummary, /להתחבר עם Google/);
});

test('start home shows connected Google state without a confusing connect action', () => {
  const view = buildStartHomeViewModel({
    displayName: 'דנה',
    isLinkedAccount: true,
    googleLinkingEnabled: true,
    canTryGoogleLink: false,
  });

  assert.equal(view.guestButtonText, 'המשך כאורח');
  assert.equal(view.googleButtonText, 'מחובר עם Google');
  assert.equal(view.googleButtonDisabled, true);
  assert.equal(view.showConnectedBadge, true);
  assert.equal(view.shouldSkipAccountChoice, true);
  assert.match(view.accountSummary, /חשבון שמור/);
});

test('start home progression note stays coming-soon only', () => {
  const view = buildStartHomeViewModel();

  assert.match(view.progressNote, /יתווספו בהמשך/);
  for (const copy of FORBIDDEN_REAL_PROGRESS_COPY) {
    assert.equal(JSON.stringify(view).includes(copy), false);
  }
});

test('index start rules panel keeps the complete Hebrew rules structure', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  for (const heading of ['מה זה ששבש טורקי?', 'בסיס המשחק בקצרה', 'החוקים המיוחדים', 'חשוב לדעת']) {
    assert.ok(html.includes(heading), `${heading} heading should be present`);
  }

  for (const rule of ['1–2', 'דאבל', 'שלושה דאבלים', '4–5', '5–6', 'ירושלמי']) {
    assert.ok(html.includes(rule), `${rule} rule should be documented`);
  }

  assert.match(html, /סטטיסטיקות, רמות ומטבעות יתווספו בהמשך/);
  assert.match(html, /id="joinRoomPanel" class="friendLobbyPanel" style="display:none"/);
  assert.match(html, /friendLobbyPrimaryActions/);
  assert.match(html, /friendLobbySecondaryActions/);
  assert.match(html, /function setFriendActionState\(activeAction=''\)/);
  assert.match(html, /openRoomModeBtn\?\.classList\.toggle\('active',isCreate\)/);
  assert.match(html, /joinRoomModeBtn\?\.classList\.toggle\('active',isJoin\)/);
  assert.match(html, /הכנס קוד חדר/);
  assert.equal(/פתיחת חדר חדש לחבר/.test(html), false);
  assert.equal(/פתח חדר עכשיו/.test(html), false);
  assert.match(html, /פתח חדר/);
  assert.match(html, /הצטרף לחדר/);
  assert.match(html, /התחל משחק מול מחשב/);
  assert.match(html, /id="computerPanel" class="subPanel"/);
  assert.equal(/id="computerPanel" class="subPanel show"/.test(html), false);
  assert.match(html, /friendLobbyPrimaryBtn/);
  assert.match(html, /friendLobbySecondaryActions[\s\S]*modeRulesBtn[\s\S]*homeProfileBtn/);
  assert.match(
    html,
    /profilePanelAccountSectionTitle[\s\S]*aria-label="סטטיסטיקות"[\s\S]*profilePanelUpgradeTitle[\s\S]*aria-label="התקדמות עתידית"/,
  );

});
