import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialBoard } from '../src/game/state.js';
import { applyMove, canBearOff, legalMovesForToken } from '../src/game/moves.js';
import { BLACK, WHITE, countColorAt, isBlocked, otherColor } from '../src/game/rules.js';

function emptyState() {
  return {
    board: Array(25).fill(0),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
  };
}

test('createInitialBoard returns the standard 25-slot board with 15 checkers per color', () => {
  const board = createInitialBoard();

  assert.equal(board.length, 25);

  const whiteTotal = board.filter(v => v > 0).reduce((sum, v) => sum + v, 0);
  const blackTotal = board.filter(v => v < 0).reduce((sum, v) => sum + Math.abs(v), 0);
  assert.equal(whiteTotal, 15);
  assert.equal(blackTotal, 15);
});

test('createInitialBoard places checkers on the expected starting points', () => {
  const board = createInitialBoard();

  assert.equal(board[24], 2);
  assert.equal(board[13], 5);
  assert.equal(board[8], 3);
  assert.equal(board[6], 5);
  assert.equal(board[1], -2);
  assert.equal(board[12], -5);
  assert.equal(board[17], -3);
  assert.equal(board[19], -5);
});

test('countColorAt and otherColor return the expected values', () => {
  const state = emptyState();
  state.board[8] = 3;
  state.board[12] = -5;

  assert.equal(countColorAt(state, 8, WHITE), 3);
  assert.equal(countColorAt(state, 8, BLACK), 0);
  assert.equal(countColorAt(state, 12, BLACK), 5);
  assert.equal(countColorAt(state, 12, WHITE), 0);
  assert.equal(countColorAt(state, 4, WHITE), 0);
  assert.equal(otherColor(WHITE), BLACK);
  assert.equal(otherColor(BLACK), WHITE);
});

test('isBlocked is true only for points with two or more opponent checkers', () => {
  const state = emptyState();
  state.board[5] = -1;
  state.board[6] = -2;
  state.board[7] = 2;

  assert.equal(isBlocked(state, 5, WHITE), false);
  assert.equal(isBlocked(state, 6, WHITE), true);
  assert.equal(isBlocked(state, 7, WHITE), false);
  assert.equal(isBlocked(state, 7, BLACK), true);
});

test('applyMove normal move updates source and destination', () => {
  const state = emptyState();
  state.board[8] = 2;
  state.board[5] = 1;

  applyMove(state, { color: WHITE, from: 8, to: 5, die: 3 });

  assert.equal(state.board[8], 1);
  assert.equal(state.board[5], 2);
  assert.deepEqual(state.bar, { white: 0, black: 0 });
  assert.deepEqual(state.off, { white: 0, black: 0 });
});

test('applyMove hit sends one opponent checker to the bar', () => {
  const state = emptyState();
  state.board[8] = 1;
  state.board[5] = -1;

  const move = { color: WHITE, from: 8, to: 5, die: 3 };
  applyMove(state, move);

  assert.equal(state.board[8], 0);
  assert.equal(state.board[5], 1);
  assert.equal(state.bar.black, 1);
  assert.equal(move.hit, true);
});

test('applyMove bearing off increases off count', () => {
  const state = emptyState();
  state.board[3] = 1;

  applyMove(state, { color: WHITE, from: 3, to: 'off', die: 3 });

  assert.equal(state.board[3], 0);
  assert.equal(state.off.white, 1);
});

test('applyMove from bar decreases the moving color bar count', () => {
  const state = emptyState();
  state.bar.white = 1;

  applyMove(state, { color: WHITE, from: 'bar', to: 23, die: 2 });

  assert.equal(state.bar.white, 0);
  assert.equal(state.board[23], 1);
});

test('canBearOff is blocked while the color has a checker on the bar', () => {
  const state = emptyState();
  state.board[3] = 1;
  state.bar.white = 1;

  assert.equal(canBearOff(state, WHITE, 3, 3), false);
});

test('legalMovesForToken does not include blocked destinations', () => {
  const state = emptyState();
  state.board[8] = 1;
  state.board[5] = -2;

  const moves = legalMovesForToken(state, WHITE, 3);

  assert.equal(moves.some(m => m.from === 8 && m.to === 5), false);
});

test('when a checker is on the bar, legal moves must come from the bar', () => {
  const state = emptyState();
  state.board[8] = 2;
  state.bar.white = 1;

  const moves = legalMovesForToken(state, WHITE, 2);

  assert.ok(moves.length > 0);
  assert.ok(moves.every(m => m.from === 'bar'));
});
