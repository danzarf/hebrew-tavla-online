import test from 'node:test';
import assert from 'node:assert/strict';

import { getMatchResultSummaryRows } from '../src/ui/matchResultSummary.js';

test('match result summary exposes only safe display fields', () => {
  const rows = getMatchResultSummaryRows({
    mode: 'online',
    roomCode: '1234',
    winnerColor: 'black',
    winnerUid: 'uid-secret',
    winnerId: 'guest-secret',
    finalStatus: 'completed',
    players: [
      { color: 'white', displayName: 'Dana' },
      { color: 'black', displayName: 'Noam' },
    ],
  });

  assert.deepEqual(rows, [
    { label: 'מנצח', value: 'Noam' },
    { label: 'צבע', value: 'שחור' },
    { label: 'מצב', value: 'אונליין' },
    { label: 'חדר', value: '1234' },
    { label: 'סטטוס', value: 'המשחק הסתיים' },
  ]);
  assert.equal(JSON.stringify(rows).includes('uid-secret'), false);
  assert.equal(JSON.stringify(rows).includes('guest-secret'), false);
});

test('match result summary returns no rows when result is missing', () => {
  assert.deepEqual(getMatchResultSummaryRows(null), []);
  assert.deepEqual(getMatchResultSummaryRows(undefined), []);
});

test('match result summary hides room code outside online mode', () => {
  const rows = getMatchResultSummaryRows({
    mode: 'ai',
    roomCode: '9999',
    winnerColor: 'white',
    finalStatus: 'completed',
    players: [{ color: 'white', displayName: 'Computer' }],
  });

  assert.equal(rows.some(row => row.label === 'חדר'), false);
  assert.equal(rows.find(row => row.label === 'מצב')?.value, 'מול מחשב');
});
