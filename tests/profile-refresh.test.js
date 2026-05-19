import test from 'node:test';
import assert from 'node:assert/strict';

import { getTrustedStatsRefreshFeedback } from '../src/ui/profileRefresh.js';

test('guest/no uid refresh returns friendly warning state', () => {
  const missingUid = getTrustedStatsRefreshFeedback({ hasUid: false, isAnonymous: true });
  assert.equal(missingUid.tone, 'warning');

  const guest = getTrustedStatsRefreshFeedback({ hasUid: true, isAnonymous: true });
  assert.equal(guest.message, 'אין סטטיסטיקות במצב אורח.');
  assert.equal(guest.tone, '');
});

test('no trusted stats refresh returns non-busy no-data message', () => {
  const noData = getTrustedStatsRefreshFeedback({
    hasUid: true,
    isAnonymous: false,
    result: { skipped: false, hasTrustedStats: false },
  });
  assert.equal(noData.message, 'אין סטטיסטיקות מאומתות עדיין.');
  assert.equal(noData.tone, '');
});

test('failed refresh returns friendly warning', () => {
  const failed = getTrustedStatsRefreshFeedback({
    hasUid: true,
    isAnonymous: false,
    result: { skipped: true, reason: 'read-failed' },
  });
  assert.equal(failed.message, 'לא הצלחנו לרענן כרגע. אפשר לנסות שוב.');
  assert.equal(failed.tone, 'warning');
});

test('successful refresh returns success message', () => {
  const success = getTrustedStatsRefreshFeedback({
    hasUid: true,
    isAnonymous: false,
    result: { skipped: false, hasTrustedStats: true },
  });
  assert.equal(success.message, 'הסטטיסטיקות עודכנו.');
  assert.equal(success.tone, 'success');
});
