import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLastChanceStatus } from '../src/ui/lastChanceStatus.js';

const actorForColor = (color) => (color === 'white' ? 'human' : 'computer');
const actorName = (actor) => (actor === 'human' ? 'דניאל' : 'חבר');

test('winner with no pieces sees a clear remote Jerusalem choice status', () => {
  const view = buildLastChanceStatus({
    lastChance: { winner: 'white', loser: 'black', phase: 'choose' },
    localActor: 'human',
    actorForColor,
    actorName,
  });

  assert.equal(view.modalRole, 'waiting-for-choice');
  assert.match(view.statusText, /בוחר מספרים לירושלמי/);
  assert.equal(view.waitingText, 'השחקן השני בוחר מספרים לירושלמי...');
});

test('loser who owns Jerusalem choice still gets the choice modal role', () => {
  const view = buildLastChanceStatus({
    lastChance: { winner: 'white', loser: 'black', phase: 'choose' },
    localActor: 'computer',
    actorForColor,
    actorName,
  });

  assert.equal(view.modalRole, 'choose');
  assert.match(view.statusText, /בחר שני מספרים/);
});

test('waiting player sees a clear Jerusalem roll status after numbers were picked', () => {
  const view = buildLastChanceStatus({
    lastChance: { winner: 'white', loser: 'black', phase: 'roll', choice: [5, 6] },
    localActor: 'computer',
    actorForColor,
    actorName,
  });

  assert.equal(view.modalRole, 'waiting-for-roll');
  assert.match(view.waitingText, /יזרוק לירושלמי/);
});
