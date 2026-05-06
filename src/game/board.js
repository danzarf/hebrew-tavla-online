export const BOARD_POINTS = 24;

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
