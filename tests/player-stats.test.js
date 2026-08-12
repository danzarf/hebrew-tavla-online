import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLAYER_STATS_FIELDS,
  calculateWinRate,
  createEmptyPlayerStats,
  formatPlayerStatsForProfile,
  isVisiblePlayerStatsUid,
  sanitizePlayerStats,
} from '../src/product/playerStats.js';

test('createEmptyPlayerStats returns the safe empty contract', () => {
  assert.deepEqual(createEmptyPlayerStats(), {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
    capturesMade: 0,
    capturesSuffered: 0,
    averageCapturesMadePerGame: 0,
    averageCapturesSufferedPerGame: 0,
    lastPlayedAt: null,
    updatedAt: null,
  });

  assert.deepEqual(PLAYER_STATS_FIELDS, [
    'gamesPlayed',
    'wins',
    'losses',
    'winRate',
    'currentStreak',
    'bestStreak',
    'capturesMade',
    'capturesSuffered',
    'averageCapturesMadePerGame',
    'averageCapturesSufferedPerGame',
    'lastPlayedAt',
    'updatedAt',
  ]);
});

test('calculateWinRate returns bounded and rounded percentages', () => {
  assert.equal(calculateWinRate(0, 0), 0);
  assert.equal(calculateWinRate(1, 3), 33.3);
  assert.equal(calculateWinRate(5, 4), 100);
  assert.equal(calculateWinRate(-1, 10), 0);
});

test('sanitizePlayerStats normalizes invalid and inconsistent values', () => {
  const sanitized = sanitizePlayerStats({
    gamesPlayed: 4.9,
    wins: -3,
    losses: 20,
    currentStreak: 'abc',
    bestStreak: 2,
    capturesMade: 7,
    capturesTaken: 3,
    lastPlayedAt: 'not-a-date',
    updatedAt: '2026-05-19T10:00:00Z',
    coins: 999,
    xp: 888,
    rewards: { daily: true },
  });

  assert.deepEqual(sanitized, {
    gamesPlayed: 4,
    wins: 0,
    losses: 4,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 2,
    capturesMade: 7,
    capturesSuffered: 3,
    averageCapturesMadePerGame: 1.8,
    averageCapturesSufferedPerGame: 0.8,
    lastPlayedAt: null,
    updatedAt: '2026-05-19T10:00:00.000Z',
  });

  assert.equal(Object.hasOwn(sanitized, 'coins'), false);
  assert.equal(Object.hasOwn(sanitized, 'xp'), false);
  assert.equal(Object.hasOwn(sanitized, 'rewards'), false);
});

test('formatPlayerStatsForProfile keeps UI as coming soon by default', () => {
  const formatted = formatPlayerStatsForProfile({ gamesPlayed: 22, wins: 11 });

  assert.equal(formatted.isPlaceholder, true);
  assert.deepEqual(formatted.items.map(item => item.label), ['משחקים', 'ניצחונות', 'הפסדים', 'אחוז ניצחון', 'רצף נוכחי', 'שיא רצף', 'אכלתי כל הזמן', 'אכלו אותי כל הזמן', 'ממוצע אכילות למשחק', 'ממוצע שאכלו אותי']);
  assert.ok(formatted.items.every(item => item.value === 'בקרוב'));
  assert.match(formatted.note, /משחקים מאומתים/);
});

test('formatPlayerStatsForProfile shows trusted capture stats and averages', () => {
  const formatted = formatPlayerStatsForProfile({
    gamesPlayed: 2,
    wins: 1,
    losses: 1,
    capturesMade: 5,
    capturesSuffered: 3,
  }, { showComingSoon: false });

  assert.equal(formatted.items.find(item => item.label === 'אכלתי כל הזמן')?.value, '5');
  assert.equal(formatted.items.find(item => item.label === 'אכלו אותי כל הזמן')?.value, '3');
  assert.equal(formatted.items.find(item => item.label === 'ממוצע אכילות למשחק')?.value, '2.5');
  assert.equal(formatted.items.find(item => item.label === 'ממוצע שאכלו אותי')?.value, '1.5');
});

test('diagnostic users are hidden from visible stats surfaces', () => {
  assert.equal(isVisiblePlayerStatsUid('uid-player'), true);
  assert.equal(isVisiblePlayerStatsUid('diagnostic-31477927029'), false);
  assert.equal(isVisiblePlayerStatsUid('diagnostic-31477927029_winner'), false);
});
