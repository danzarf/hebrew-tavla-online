import test from 'node:test';
import assert from 'node:assert/strict';

import { createSharedGameState, normalizeBoard, getRemoteRollFeedbackId, shouldTriggerRemoteRollFeedback } from '../src/game/onlineState.js';

test('normalizeBoard returns a 25-length array for missing input', () => {
  const board = normalizeBoard();

  assert.equal(Array.isArray(board), true);
  assert.equal(board.length, 25);
  assert.ok(board.every(value => value === 0));
});

test('normalizeBoard supports array input and fills missing values with 0', () => {
  const board = normalizeBoard([0, -2, undefined, 4]);

  assert.equal(board.length, 25);
  assert.equal(board[1], -2);
  assert.equal(board[2], 0);
  assert.equal(board[3], 4);
  assert.equal(board[24], 0);
});

test('normalizeBoard supports Firebase-like object input', () => {
  const board = normalizeBoard({ 1: -2, 6: 5, 24: 2 });

  assert.equal(board.length, 25);
  assert.equal(board[1], -2);
  assert.equal(board[6], 5);
  assert.equal(board[24], 2);
  assert.equal(board[13], 0);
});

test('createSharedGameState includes the key synchronized game fields', () => {
  const source = {
    board: Array(25).fill(0),
    bar: { white: 1, black: 0 },
    off: { white: 2, black: 3 },
    humanColor: 'white',
    computerColor: 'black',
    currentActor: 'human',
    status: 'humanMoving',
    difficulty: 'medium',
    diceMode: 'manual',
    dice: [3, 4],
    remaining: [3],
    freeMode: false,
    doubleExtra: false,
    chosenDouble: false,
    log: [{ text: 'move', type: '' }],
    doubleStreak: { human: 0, computer: 1 },
    gameOver: false,
    lastChance: { phase: 'choose' },
    pendingVictory: { winner: 'white', loser: 'black', actor: 'human', streak: 2 },
  };

  const before = Date.now();
  const shared = createSharedGameState(source);
  const after = Date.now();

  for (const key of [
    'board',
    'bar',
    'off',
    'humanColor',
    'computerColor',
    'currentActor',
    'status',
    'dice',
    'remaining',
    'log',
    'lastChance',
    'pendingVictory',
    'lastMove',
    'winnerColor',
    'stolen',
    'victoryId',
    'updatedAt',
  ]) {
    assert.ok(Object.hasOwn(shared, key), `missing ${key}`);
  }

  assert.equal(shared.board, source.board);
  assert.equal(shared.bar, source.bar);
  assert.equal(shared.off, source.off);
  assert.equal(shared.humanColor, 'white');
  assert.equal(shared.computerColor, 'black');
  assert.equal(shared.currentActor, 'human');
  assert.equal(shared.status, 'humanMoving');
  assert.deepEqual(shared.dice, [3, 4]);
  assert.deepEqual(shared.remaining, [3]);
  assert.equal(shared.log, source.log);
  assert.equal(shared.lastChance, source.lastChance);
  assert.equal(shared.pendingVictory, source.pendingVictory);
  assert.equal(shared.lastMove, null);
  assert.equal(shared.winnerColor, null);
  assert.equal(shared.victoryId, null);
  assert.equal(shared.stolen, false);
  assert.equal(typeof shared.stolen, 'boolean');
  assert.equal(typeof shared.updatedAt, 'number');
  assert.ok(shared.updatedAt >= before);
  assert.ok(shared.updatedAt <= after);
});

test('createSharedGameState preserves last move and winner metadata when provided', () => {
  const source = {
    board: [],
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    humanColor: 'black',
    computerColor: 'white',
    currentActor: 'computer',
    status: 'gameover',
    difficulty: 'hard',
    diceMode: 'auto',
    dice: [6, 6],
    remaining: [],
    freeMode: false,
    doubleExtra: false,
    chosenDouble: false,
    log: [],
    doubleStreak: { human: 0, computer: 0 },
    gameOver: true,
    lastChance: null,
    pendingVictory: null,
    lastMove: { id: 'move-1' },
    winnerColor: 'white',
    stolen: 1,
    victoryId: 'victory-1',
  };

  const shared = createSharedGameState(source);

  assert.deepEqual(shared.lastMove, { id: 'move-1' });
  assert.equal(shared.winnerColor, 'white');
  assert.equal(shared.stolen, true);
  assert.equal(shared.victoryId, 'victory-1');
});

test('getRemoteRollFeedbackId returns id for synchronized roll log + dice', () => {
  const shared = {
    currentActor: 'computer',
    dice: [5, 2],
    log: [
      { text: 'משה הזיז אבן', time: '10:00:00' },
      { text: 'חבר גלגל: 5–2', time: '10:00:05' },
    ],
  };

  assert.equal(
    getRemoteRollFeedbackId(shared),
    'computer|10:00:05|חבר גלגל: 5–2|5-2',
  );
});

test('shouldTriggerRemoteRollFeedback does not trigger twice for same feedback id', () => {
  const shared = {
    currentActor: 'computer',
    dice: [3, 6],
    log: [{ text: 'חבר גלגל: 3–6', time: '11:12:13' }],
  };

  const first = shouldTriggerRemoteRollFeedback({ shared, localActor: 'human', lastSeenFeedbackId: null });
  assert.equal(first.shouldTrigger, true);

  const second = shouldTriggerRemoteRollFeedback({ shared, localActor: 'human', lastSeenFeedbackId: first.feedbackId });
  assert.equal(second.shouldTrigger, false);
});

test('shouldTriggerRemoteRollFeedback does not trigger for local actor', () => {
  const shared = {
    currentActor: 'human',
    dice: [1, 4],
    log: [{ text: 'אתה גלגל: 1–4', time: '09:00:00' }],
  };

  const res = shouldTriggerRemoteRollFeedback({ shared, localActor: 'human', lastSeenFeedbackId: null });
  assert.equal(res.shouldTrigger, false);
});
