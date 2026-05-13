import test from 'node:test';
import assert from 'node:assert/strict';

import {
  die,
  isDouble,
  isFiveSix,
  isFourFive,
  isOneTwo,
  rollDicePair,
} from '../src/game/dice.js';

function withMockedRandom(values, fn) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[index++ % values.length];
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

test('die returns integer values in the fair 1-6 range', () => {
  withMockedRandom([0, 0.01, 0.2, 0.4, 0.6, 0.83, 0.999999], () => {
    for (let i = 0; i < 14; i++) {
      const value = die();
      assert.equal(Number.isInteger(value), true);
      assert.equal(value >= 1 && value <= 6, true);
    }
  });
});

test('rollDicePair uses the same actor-agnostic dice helper for both dice', () => {
  withMockedRandom([0, 0.999999], () => {
    assert.deepEqual(rollDicePair(), [1, 6]);
  });

  assert.equal(die.length, 0);
  assert.equal(rollDicePair.length, 0);
});

test('special roll detection depends only on dice values', () => {
  assert.equal(isOneTwo([1, 2]), true);
  assert.equal(isOneTwo([2, 1]), true);
  assert.equal(isOneTwo([1, 3]), false);

  assert.equal(isFourFive([4, 5]), true);
  assert.equal(isFourFive([5, 4]), true);
  assert.equal(isFourFive([4, 6]), false);

  assert.equal(isFiveSix([5, 6]), true);
  assert.equal(isFiveSix([6, 5]), true);
  assert.equal(isFiveSix([5, 5]), false);

  assert.equal(isDouble([6, 6]), true);
  assert.equal(isDouble([6, 5]), false);
});
