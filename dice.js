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
