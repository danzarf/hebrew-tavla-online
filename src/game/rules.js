export const WHITE = 'white';
export const BLACK = 'black';

export const SIGN = {
  [WHITE]: -1,
  [BLACK]: 1,
};

export function otherColor(color) {
  return color === WHITE ? BLACK : WHITE;
}

export function countColorAt(state, point, color) {
  const value = state?.board?.[point] || 0;
  const count = value * SIGN[color];
  return count > 0 ? count : 0;
}

export function oppCountAt(state, point, color) {
  return countColorAt(state, point, otherColor(color));
}

export function isBlocked(state, point, color) {
  return oppCountAt(state, point, color) >= 2;
}
