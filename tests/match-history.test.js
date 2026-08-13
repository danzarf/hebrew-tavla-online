import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MATCH_HISTORY_EMPTY_TEXT,
  buildMatchHistoryViewModel,
  sanitizePlayerMatchHistory,
} from '../src/product/matchHistory.js';

test('match history view model sorts newest first and formats compact rows', () => {
  const view = buildMatchHistoryViewModel({
    history: [
      { matchId: 'old', opponentUid: 'u2', opponentDisplayName: 'דנה', result: 'loss', capturesMade: 2, capturesSuffered: 8, endedAt: 1000 },
      { matchId: 'new', opponentUid: 'u3', opponentDisplayName: '<b>נועם</b>', result: 'win', capturesMade: 9, capturesSuffered: 2, endedAt: 2000 },
    ],
  });

  assert.equal(view.state, 'populated');
  assert.equal(view.rows[0].matchId, 'new');
  assert.equal(view.rows[0].title, 'ניצחון מול <b>נועם</b>');
  assert.equal(view.rows[0].subtitle, '9 אכילות | אכלו אותי 2');
  assert.equal(view.rows[1].title, 'הפסד מול דנה');
});

test('match history view model exposes loading empty and error states', () => {
  assert.deepEqual(buildMatchHistoryViewModel({ isLoading: true }), {
    state: 'loading',
    message: 'טוען היסטוריית משחקים...',
    rows: [],
  });
  assert.deepEqual(buildMatchHistoryViewModel(), {
    state: 'empty',
    message: MATCH_HISTORY_EMPTY_TEXT,
    rows: [],
  });
  assert.deepEqual(buildMatchHistoryViewModel({ errorMessage: 'בעיה' }), {
    state: 'error',
    message: 'בעיה',
    rows: [],
  });
});

test('sanitizePlayerMatchHistory limits rows and drops incomplete entries', () => {
  const history = sanitizePlayerMatchHistory({
    a: { matchId: 'a', opponentUid: 'u-a', endedAt: 1 },
    b: { matchId: '', opponentUid: 'u-b', endedAt: 3 },
    c: { matchId: 'c', opponentUid: 'u-c', endedAt: 2 },
  }, { limit: 1 });

  assert.deepEqual(history.map(entry => entry.matchId), ['c']);
});
