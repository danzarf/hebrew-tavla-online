export const DICE_MIN = 1;
export const DICE_MAX = 6;

export function isValidDie(value) {
  return Number.isInteger(value) && value >= DICE_MIN && value <= DICE_MAX;
}

export function isDicePair(dice) {
  return Array.isArray(dice) && dice.length === 2 && dice.every(isValidDie);
}

export function isDouble(dice) {
  return isDicePair(dice) && dice[0] === dice[1];
}

// Dice generation is intentionally actor- and difficulty-agnostic.
// Gameplay modes and AI levels may change move selection, but must never change rolls.
export function die() {
  return Math.floor(Math.random() * (DICE_MAX - DICE_MIN + 1)) + DICE_MIN;
}

export function rollDicePair() {
  return [die(), die()];
}

export function isOneTwo(dice) {
  return (dice[0] === 1 && dice[1] === 2) || (dice[0] === 2 && dice[1] === 1);
}

export function isFourFive(dice) {
  return (dice[0] === 4 && dice[1] === 5) || (dice[0] === 5 && dice[1] === 4);
}

export function isFiveSix(dice) {
  return (dice[0] === 5 && dice[1] === 6) || (dice[0] === 6 && dice[1] === 5);
}
