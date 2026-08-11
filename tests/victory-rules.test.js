import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePendingVictoryDoubleRoll } from '../src/game/victoryRules.js';
import { buildGameEndMatchResult } from '../src/product/matchResultSession.js';

test('third consecutive double while victory is pending gives the win to the opponent', () => {
  const decision = resolvePendingVictoryDoubleRoll({
    pending: { winner: 'white', loser: 'black', actor: 'human' },
    dice: [6, 6],
    nextStreak: 3,
  });

  assert.deepEqual(decision, { action: 'penalty-win', winner: 'black', loser: 'white' });
});

test('third-double penalty result submission uses the opponent as winner', () => {
  const result = buildGameEndMatchResult({
    state: {
      gameMode: 'online',
      roomCode: '5175',
      victoryId: 'third-double-penalty',
      humanColor: 'white',
      computerColor: 'black',
      playerIds: { human: 'guest-white', computer: 'guest-black' },
      playerUids: { human: 'uid-white', computer: 'uid-black' },
      playerNames: { human: 'White', computer: 'Black' },
    },
    winnerColor: 'black',
    localActor: 'human',
    currentPlayerId: 'guest-white',
    currentUid: 'uid-white',
    endedAt: 123456,
  });

  assert.equal(result.winnerColor, 'black');
  assert.equal(result.winnerUid, 'uid-black');
  assert.equal(result.loserUid, 'uid-white');
  assert.equal(result.winnerId, 'guest-black');
  assert.equal(result.loserId, 'guest-white');
});
