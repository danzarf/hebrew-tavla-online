import test from 'node:test';
import assert from 'node:assert/strict';

import { computerMoveText, isImportantComputerMove, logMove } from '../src/ui/messages.js';

test('normal computer point-to-point moves are quiet', () => {
  const move = { color: 'black', from: 13, to: 8, die: 5, hit: false };

  assert.equal(isImportantComputerMove(move), false);
  assert.equal(computerMoveText(move), '');
});

test('important computer moves still get a message', () => {
  assert.equal(isImportantComputerMove({ from: 8, to: 5, hit: true }), true);
  assert.match(computerMoveText({ from: 8, to: 5, hit: true }), /אוכל אבן/);

  assert.equal(isImportantComputerMove({ from: 6, to: 'off', hit: false }), true);
  assert.match(computerMoveText({ from: 6, to: 'off', hit: false }), /מוציא אבן/);

  assert.equal(isImportantComputerMove({ from: 'bar', to: 20, hit: false }), true);
  assert.match(computerMoveText({ from: 'bar', to: 20, hit: false }), /נכנס מהבר/);
});

test('human move logging remains unchanged for regular moves', () => {
  const entries = [];
  logMove((text, type = '') => entries.push({ text, type }), 'אתה', {
    from: 13,
    to: 8,
    die: 5,
    hit: false,
  });

  assert.deepEqual(entries, [{ text: 'אתה הזיז מ־13 ל־8', type: '' }]);
});
