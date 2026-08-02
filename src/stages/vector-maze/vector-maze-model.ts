export interface VectorMazePoint {
  readonly x: number;
  readonly y: number;
}

export interface VectorMazeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface VectorMazeDirectionInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

export interface VectorMazeState {
  readonly player: VectorMazePoint;
  readonly complete: boolean;
}

export const VECTOR_MAZE_VIEW_WIDTH = 600;
export const VECTOR_MAZE_VIEW_HEIGHT = 620;
export const VECTOR_MAZE_CELL_SIZE = 48;
export const VECTOR_MAZE_WALL_THICKNESS = 12;
export const VECTOR_MAZE_PLAYER_RADIUS = 7;
export const VECTOR_MAZE_PLAYER_SPEED = 210;

const MAZE_ORIGIN_X = 60;
const MAZE_ORIGIN_Y = 60;
const MAZE_CELL_COUNT = 10;
const MAX_COLLISION_STEP = 2;

export const VECTOR_MAZE_HORIZONTAL_EDGES = [
  "####.#####",
  ".##....#..",
  "##.###..##",
  "..#.#..##.",
  "###..###..",
  "...####.##",
  "...##.##..",
  ".#...####.",
  "#.###...#.",
  "...#####..",
  "#####.####",
] as const;

export const VECTOR_MAZE_VERTICAL_EDGES = [
  "#...#.#..##",
  "#..#.##.#.#",
  "##.#..##..#",
  "#...#.#..##",
  "#.#.#..#.##",
  "###.....#.#",
  "##.#.#...##",
  "#.#.##.#..#",
  "###...#.#.#",
  "#.#...#..##",
] as const;

export const VECTOR_MAZE_START_POSITION: VectorMazePoint = {
  x: MAZE_ORIGIN_X + VECTOR_MAZE_CELL_SIZE * 5.5,
  y: 568,
};

export const VECTOR_MAZE_EXIT_POSITION: VectorMazePoint = {
  x: MAZE_ORIGIN_X + VECTOR_MAZE_CELL_SIZE * 4.5,
  y: 32,
};

export const VECTOR_MAZE_EXIT_RECT: VectorMazeRect = {
  x: VECTOR_MAZE_EXIT_POSITION.x - 10,
  y: VECTOR_MAZE_EXIT_POSITION.y - 10,
  width: 20,
  height: 20,
};

const PLAYER_MIN_X =
  MAZE_ORIGIN_X
  + VECTOR_MAZE_WALL_THICKNESS / 2
  + VECTOR_MAZE_PLAYER_RADIUS;

const PLAYER_MAX_X =
  MAZE_ORIGIN_X
  + MAZE_CELL_COUNT * VECTOR_MAZE_CELL_SIZE
  - VECTOR_MAZE_WALL_THICKNESS / 2
  - VECTOR_MAZE_PLAYER_RADIUS;

const PLAYER_MIN_Y = VECTOR_MAZE_EXIT_POSITION.y;
const PLAYER_MAX_Y = VECTOR_MAZE_START_POSITION.y;

function appendHorizontalWallRuns(
  walls: VectorMazeRect[],
): void {
  const halfThickness = VECTOR_MAZE_WALL_THICKNESS / 2;

  VECTOR_MAZE_HORIZONTAL_EDGES.forEach((row, rowIndex) => {
    let runStart = -1;

    for (let column = 0; column <= row.length; column += 1) {
      const hasWall = row[column] === "#";

      if (hasWall && runStart < 0) {
        runStart = column;
        continue;
      }

      if (hasWall || runStart < 0) {
        continue;
      }

      walls.push({
        x:
          MAZE_ORIGIN_X
          + runStart * VECTOR_MAZE_CELL_SIZE
          - halfThickness,
        y:
          MAZE_ORIGIN_Y
          + rowIndex * VECTOR_MAZE_CELL_SIZE
          - halfThickness,
        width:
          (column - runStart) * VECTOR_MAZE_CELL_SIZE
          + VECTOR_MAZE_WALL_THICKNESS,
        height: VECTOR_MAZE_WALL_THICKNESS,
      });

      runStart = -1;
    }
  });
}

function appendVerticalWallRuns(
  walls: VectorMazeRect[],
): void {
  const halfThickness = VECTOR_MAZE_WALL_THICKNESS / 2;

  for (let column = 0; column <= MAZE_CELL_COUNT; column += 1) {
    let runStart = -1;

    for (let row = 0; row <= MAZE_CELL_COUNT; row += 1) {
      const hasWall =
        row < MAZE_CELL_COUNT
        && VECTOR_MAZE_VERTICAL_EDGES[row]?.[column] === "#";

      if (hasWall && runStart < 0) {
        runStart = row;
        continue;
      }

      if (hasWall || runStart < 0) {
        continue;
      }

      walls.push({
        x:
          MAZE_ORIGIN_X
          + column * VECTOR_MAZE_CELL_SIZE
          - halfThickness,
        y:
          MAZE_ORIGIN_Y
          + runStart * VECTOR_MAZE_CELL_SIZE
          - halfThickness,
        width: VECTOR_MAZE_WALL_THICKNESS,
        height:
          (row - runStart) * VECTOR_MAZE_CELL_SIZE
          + VECTOR_MAZE_WALL_THICKNESS,
      });

      runStart = -1;
    }
  }
}

function createMazeWalls(): readonly VectorMazeRect[] {
  const walls: VectorMazeRect[] = [];
  appendHorizontalWallRuns(walls);
  appendVerticalWallRuns(walls);
  return walls;
}

export const VECTOR_MAZE_WALLS = createMazeWalls();

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function circleIntersectsRect(
  center: VectorMazePoint,
  radius: number,
  rect: VectorMazeRect,
): boolean {
  const nearestX = clamp(center.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(center.y, rect.y, rect.y + rect.height);
  const differenceX = center.x - nearestX;
  const differenceY = center.y - nearestY;

  return (
    differenceX * differenceX + differenceY * differenceY
    < radius * radius
  );
}

function isBlocked(position: VectorMazePoint): boolean {
  return VECTOR_MAZE_WALLS.some((wall) =>
    circleIntersectsRect(
      position,
      VECTOR_MAZE_PLAYER_RADIUS,
      wall,
    ),
  );
}

function moveAxis(
  position: VectorMazePoint,
  axis: "x" | "y",
  amount: number,
): VectorMazePoint {
  if (amount === 0) {
    return position;
  }

  const proposed: VectorMazePoint =
    axis === "x"
      ? {
          x: clamp(position.x + amount, PLAYER_MIN_X, PLAYER_MAX_X),
          y: position.y,
        }
      : {
          x: position.x,
          y: clamp(position.y + amount, PLAYER_MIN_Y, PLAYER_MAX_Y),
        };

  return isBlocked(proposed) ? position : proposed;
}

function hasReachedExit(position: VectorMazePoint): boolean {
  return circleIntersectsRect(
    position,
    VECTOR_MAZE_PLAYER_RADIUS,
    VECTOR_MAZE_EXIT_RECT,
  );
}

export function getVectorMazeDirection(
  input: VectorMazeDirectionInput,
): VectorMazePoint {
  const x = Number(input.right) - Number(input.left);
  const y = Number(input.down) - Number(input.up);
  const length = Math.hypot(x, y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / length,
    y: y / length,
  };
}

export function createInitialVectorMazeState(): VectorMazeState {
  return {
    player: { ...VECTOR_MAZE_START_POSITION },
    complete: false,
  };
}

export function stepVectorMaze(
  state: VectorMazeState,
  direction: VectorMazePoint,
  deltaSeconds: number,
): VectorMazeState {
  if (state.complete || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return state;
  }

  const distanceX =
    direction.x * VECTOR_MAZE_PLAYER_SPEED * deltaSeconds;
  const distanceY =
    direction.y * VECTOR_MAZE_PLAYER_SPEED * deltaSeconds;
  const stepCount = Math.max(
    1,
    Math.ceil(
      Math.max(Math.abs(distanceX), Math.abs(distanceY))
      / MAX_COLLISION_STEP,
    ),
  );
  const stepX = distanceX / stepCount;
  const stepY = distanceY / stepCount;

  let player = state.player;

  for (let step = 0; step < stepCount; step += 1) {
    player = moveAxis(player, "x", stepX);
    player = moveAxis(player, "y", stepY);
  }

  return {
    player,
    complete: hasReachedExit(player),
  };
}
