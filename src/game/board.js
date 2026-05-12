export const BOARD_POINTS = 24;
export const TOP_POINTS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
export const BOTTOM_POINTS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export function isBoardPoint(point) {
  return Number.isInteger(point) && point >= 1 && point <= BOARD_POINTS;
}

export function createEmptyBoard() {
  return Array(BOARD_POINTS + 1).fill(0);
}

export function cloneBoard(board) {
  return Array.isArray(board) ? board.slice() : createEmptyBoard();
}

export function getPointValue(state, point) {
  if (!isBoardPoint(point)) return 0;
  return state?.board?.[point] || 0;
}
