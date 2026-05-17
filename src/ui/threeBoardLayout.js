import { BOTTOM_POINTS, TOP_POINTS } from "../game/board.js";

export const BOARD_3D_DIMENSIONS = Object.freeze({
  width: 16,
  height: 9,
  innerWidth: 13.7,
  innerHeight: 7.25,
  wallThickness: 0.5,
  wallHeight: 0.58,
  floorThickness: 0.18,
  centerBarWidth: 0.44,
  pointGap: 0.04,
});

const HALF_INNER_WIDTH = BOARD_3D_DIMENSIONS.innerWidth / 2;
const HALF_INNER_HEIGHT = BOARD_3D_DIMENSIONS.innerHeight / 2;
const HALF_CENTER_BAR = BOARD_3D_DIMENSIONS.centerBarWidth / 2;
const POINTS_PER_QUADRANT = 6;

function columnBounds(order) {
  const usableHalf = HALF_INNER_WIDTH - HALF_CENTER_BAR;
  const pointWidth = usableHalf / POINTS_PER_QUADRANT;
  const sideIndex = order % POINTS_PER_QUADRANT;
  const rightSide = order >= POINTS_PER_QUADRANT;
  const minX = rightSide
    ? HALF_CENTER_BAR + sideIndex * pointWidth
    : -HALF_INNER_WIDTH + sideIndex * pointWidth;
  const maxX = minX + pointWidth;

  return {
    minX: minX + BOARD_3D_DIMENSIONS.pointGap,
    maxX: maxX - BOARD_3D_DIMENSIONS.pointGap,
    centerX: (minX + maxX) / 2,
  };
}

function createTriangle(point, row, order) {
  const { minX, maxX, centerX } = columnBounds(order);
  const top = row === 'top';
  const baseZ = top ? HALF_INNER_HEIGHT : -HALF_INNER_HEIGHT;
  const tipZ = top ? 0.18 : -0.18;

  return {
    point,
    row,
    order,
    baseZ,
    tipZ,
    centerX,
    vertices: [
      [minX, baseZ],
      [maxX, baseZ],
      [centerX, tipZ],
    ],
  };
}

export function createBoardPointLayout() {
  return [
    ...TOP_POINTS.map((point, order) => createTriangle(point, 'top', order)),
    ...BOTTOM_POINTS.map((point, order) => createTriangle(point, 'bottom', order)),
  ];
}
