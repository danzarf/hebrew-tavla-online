import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORBIDDEN_MATCH_RESULT_FIELDS,
  SAFE_MATCH_RESULT_FIELDS,
  SAFE_MATCH_PLAYER_FIELDS,
  createMatchResult,
  sanitizeMatchResult,
  validateMatchResult,
} from '../src/product/matchResult.js';

function assertNoForbiddenFields(value) {
  if (!value || typeof value !== 'object') return;

  for (const forbiddenField of FORBIDDEN_MATCH_RESULT_FIELDS) {
    assert.equal(Object.hasOwn(value, forbiddenField), false, `${forbiddenField} must not be included`);
  }

  for (const childValue of Object.values(value)) {
    if (Array.isArray(childValue)) {
      for (const item of childValue) assertNoForbiddenFields(item);
    } else {
      assertNoForbiddenFields(childValue);
    }
  }
}

test('createMatchResult creates a valid safe match result object', () => {
  const result = createMatchResult({
    matchId: 'match_1',
    roomCode: 'ROOM42',
    mode: 'online',
    players: [
      { id: 'local-white', uid: 'uid-white', displayName: 'White Player', color: 'white', coins: 1000 },
      { id: 'local-black', uid: 'uid-black', displayName: 'Black Player', color: 'black', xp: 50 },
    ],
    winnerColor: 'white',
    startedAt: 1000,
    endedAt: 2000,
    resultSource: 'online-game-end',
    clientSubmittedBy: 'uid-white',
    coins: 500,
    xp: 25,
    rewards: ['coin-bonus'],
  });

  assert.deepEqual(Object.keys(result).sort(), [
    'clientSubmittedBy',
    'endedAt',
    'finalStatus',
    'gameType',
    'loserColor',
    'loserId',
    'loserUid',
    'matchId',
    'mode',
    'players',
    'resultSource',
    'roomCode',
    'ruleset',
    'serverVerified',
    'startedAt',
    'winnerColor',
    'winnerId',
    'winnerUid',
  ]);
  assert.equal(result.matchId, 'match_1');
  assert.equal(result.mode, 'online');
  assert.equal(result.winnerId, 'uid-white');
  assert.equal(result.winnerUid, 'uid-white');
  assert.equal(result.loserId, 'uid-black');
  assert.equal(result.loserUid, 'uid-black');
  assert.equal(result.winnerColor, 'white');
  assert.equal(result.loserColor, 'black');
  assert.equal(result.gameType, 'tavla');
  assert.equal(result.ruleset, 'hebrew-tavla');
  assert.equal(result.serverVerified, false);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
});

test('sanitizeMatchResult rejects unsafe top-level and player fields by allow-listing the contract', () => {
  const result = sanitizeMatchResult({
    matchId: 'match_unsafe',
    mode: 'ranked-paid-table',
    players: [
      { uid: 'uid-1', color: 'white', displayName: ' Player 1 ', stats: { wins: 10 }, level: 9 },
      { uid: 'uid-2', color: 'black', displayName: ' Player 2 ', rewards: ['daily'] },
      { uid: 'uid-3', color: 'white' },
    ],
    winnerColor: 'white',
    endedAt: 3000,
    coinReward: 100,
    xpReward: 20,
    wins: 1,
    losses: 0,
    unknownField: 'remove me',
    now: () => 3000,
  });

  assert.deepEqual(Object.keys(result).every(key => SAFE_MATCH_RESULT_FIELDS.includes(key)), true);
  assert.deepEqual(result.players.length, 2);
  assert.deepEqual(result.players.every(player => Object.keys(player).every(key => SAFE_MATCH_PLAYER_FIELDS.includes(key))), true);
  assert.equal(result.mode, 'local');
  assertNoForbiddenFields(result);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
});

test('createMatchResult does not include economy, progression, reward, or statistics fields', () => {
  const result = createMatchResult({
    matchId: 'match_no_rewards',
    players: [
      { id: 'white-player', color: 'white' },
      { id: 'black-player', color: 'black' },
    ],
    winnerColor: 'black',
    coins: 100,
    xp: 10,
    level: 2,
    rewards: { daily: true },
    stats: { wins: 1, losses: 0 },
    wins: 1,
    losses: 0,
    now: () => 4000,
  });

  assertNoForbiddenFields(result);
  assert.equal(Object.hasOwn(result, 'coins'), false);
  assert.equal(Object.hasOwn(result, 'xp'), false);
  assert.equal(Object.hasOwn(result, 'level'), false);
  assert.equal(Object.hasOwn(result, 'rewards'), false);
  assert.equal(Object.hasOwn(result, 'stats'), false);
  assert.equal(Object.hasOwn(result, 'wins'), false);
  assert.equal(Object.hasOwn(result, 'losses'), false);
});

test('validateMatchResult flags invalid or client-verified result objects', () => {
  const validation = validateMatchResult({
    matchId: '',
    mode: 'paid',
    players: [{ id: 'white-player', color: 'white', coins: 10 }],
    winnerColor: 'green',
    endedAt: null,
    serverVerified: true,
    xp: 25,
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(','), /forbidden-field:xp/);
  assert.match(validation.errors.join(','), /invalid-mode/);
  assert.match(validation.errors.join(','), /missing-players/);
  assert.match(validation.errors.join(','), /missing-winnerColor/);
  assert.match(validation.errors.join(','), /missing-endedAt/);
  assert.match(validation.errors.join(','), /client-cannot-server-verify/);
  assert.match(validation.errors.join(','), /forbidden-player-field:coins/);
});

test('createMatchResult works without UID by using safe guest or player id fallback', () => {
  const result = createMatchResult({
    matchId: null,
    mode: 'local',
    players: [
      { playerId: 'guest-white-123', displayName: 'Guest White', color: 'white' },
      { guestId: 'guest-black-456', displayName: 'Guest Black', color: 'black' },
    ],
    winnerColor: 'black',
    now: () => 5000,
    idFactory: () => 'match-fallback',
  });

  assert.equal(result.matchId, 'match-fallback');
  assert.equal(result.players[0].id, 'guest-white-123');
  assert.equal(result.players[0].guestId, 'guest-white-123');
  assert.equal(result.players[0].isAnonymous, true);
  assert.equal(result.players[1].id, 'guest-black-456');
  assert.equal(result.winnerId, 'guest-black-456');
  assert.equal(result.loserId, 'guest-white-123');
  assert.equal(result.endedAt, 5000);
  assert.deepEqual(validateMatchResult(result), { valid: true, errors: [] });
});
