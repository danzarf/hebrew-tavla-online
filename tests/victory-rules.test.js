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

test('non-double 5-6 after pending bearing-off victory confirms winner without opening free moves', () => {
  const decision = resolvePendingVictoryDoubleRoll({
    pending: { winner: 'white', loser: 'black', actor: 'human' },
    dice: [5, 6],
    nextStreak: 0,
  });

  assert.deepEqual(decision, { action: 'confirm-victory', winner: 'white', loser: 'black' });
});

test('second double after pending bearing-off victory keeps victory pending', () => {
  const decision = resolvePendingVictoryDoubleRoll({
    pending: { winner: 'white', loser: 'black', actor: 'human' },
    dice: [4, 4],
    nextStreak: 2,
  });

  assert.deepEqual(decision, { action: 'continue-pending', streak: 2 });
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
