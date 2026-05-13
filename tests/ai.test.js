import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseBestSequenceFor, generateSequences, pipCount, simulateSequence } from '../src/game/ai.js';
import { WHITE, BLACK } from '../src/game/rules.js';

function emptyState() {
  return {
    board: Array(25).fill(0),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    difficulty: 'hard',
  };
}

test('pipCount works for white and black checkers', () => {
  const state = emptyState();
  state.board[6] = 2;
  state.board[24] = 1;
  state.board[19] = -3;
  state.board[1] = -1;

  assert.equal(pipCount(state, WHITE), 36);
  assert.equal(pipCount(state, BLACK), 42);
});

test('pipCount includes bar penalty', () => {
  const state = emptyState();
  state.board[6] = 1;
  state.board[24] = -1;
  state.bar.white = 2;
  state.bar.black = 1;

  assert.equal(pipCount(state, WHITE), 56);
  assert.equal(pipCount(state, BLACK), 26);
});

test('simulateSequence does not mutate the original state', () => {
  const state = emptyState();
  state.board[8] = 1;
  state.board[5] = -1;

  const result = simulateSequence(state, WHITE, [{ color: WHITE, from: 8, to: 5, die: 3 }]);

  assert.equal(state.board[8], 1);
  assert.equal(state.board[5], -1);
  assert.equal(state.bar.black, 0);
  assert.notEqual(result, state);
});

test('simulateSequence applies a simple sequence correctly', () => {
  const state = emptyState();
  state.board[8] = 1;
  state.board[5] = -1;

  const result = simulateSequence(state, WHITE, [{ color: WHITE, from: 8, to: 5, die: 3 }]);

  assert.equal(result.board[8], 0);
  assert.equal(result.board[5], 1);
  assert.equal(result.bar.black, 1);
});

test('generateSequences returns legal sequences in a simple deterministic scenario', () => {
  const state = emptyState();
  state.board[8] = 1;

  const sequences = generateSequences(state, WHITE, [3], false);

  assert.deepEqual(sequences, [[{ color: WHITE, from: 8, to: 5, die: 3, hit: false }]]);
});


test('hard AI chooses an obvious hit', () => {
  const state = emptyState();
  state.board[8] = 1;
  state.board[5] = -1;

  const sequence = chooseBestSequenceFor(state, WHITE, [3], false);

  assert.deepEqual(sequence, [{ color: WHITE, from: 8, to: 5, die: 3, hit: true }]);
});

test('hard AI can prefer a tactical hit over a non-winning bear-off', () => {
  const state = emptyState();
  state.off.white = 11;
  state.board[1] = 1;
  state.board[2] = 1;
  state.board[4] = 1;
  state.board[5] = 1;
  state.board[3] = -1;

  const sequence = chooseBestSequenceFor(state, WHITE, [1, 2], false);

  assert.equal(sequence.some((move) => move.hit), true);
  assert.equal(sequence.filter((move) => move.to === 'off').length, 0);
  assert.deepEqual(sequence.map((move) => [move.from, move.to]), [[4, 3], [5, 3]]);
});

test('hard AI does not choose a hit if bearing off wins the game', () => {
  const state = emptyState();
  state.off.white = 14;
  state.board[1] = 1;
  state.board[3] = -1;

  const sequence = chooseBestSequenceFor(state, WHITE, ['free'], true);

  assert.deepEqual(sequence, [{ color: WHITE, from: 1, to: 'off', die: 'free', bearOff: true }]);
});
