import { describe, expect, it } from "vitest";
import {
  createInitialVectorMazeState,
  getVectorMazeDirection,
  stepVectorMaze,
  VECTOR_MAZE_CELL_SIZE,
  VECTOR_MAZE_EXIT_POSITION,
  VECTOR_MAZE_HORIZONTAL_EDGES,
  VECTOR_MAZE_PLAYER_SPEED,
  VECTOR_MAZE_START_POSITION,
  VECTOR_MAZE_VERTICAL_EDGES,
  VECTOR_MAZE_WALLS,
} from "./vector-maze-model";
import type {
  VectorMazePoint,
  VectorMazeState,
} from "./vector-maze-model";

const SOLUTION_CELL_PATH: readonly (readonly [number, number])[] = [
  [9, 5],
  [9, 4],
  [9, 3],
  [9, 2],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [7, 5],
  [7, 6],
  [8, 6],
  [8, 7],
  [7, 7],
  [7, 8],
  [7, 9],
  [6, 9],
  [5, 9],
  [5, 8],
  [6, 8],
  [6, 7],
  [6, 6],
  [6, 5],
  [5, 5],
  [5, 4],
  [5, 3],
  [5, 2],
  [4, 2],
  [4, 3],
  [3, 3],
  [3, 2],
  [3, 1],
  [2, 1],
  [2, 2],
  [1, 2],
  [1, 1],
  [1, 0],
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 3],
  [1, 4],
  [0, 4],
];

function getCellCenter(
  cell: readonly [number, number],
): VectorMazePoint {
  const [row, column] = cell;

  return {
    x: 60 + (column + 0.5) * VECTOR_MAZE_CELL_SIZE,
    y: 60 + (row + 0.5) * VECTOR_MAZE_CELL_SIZE,
  };
}

function moveStateToward(
  initialState: VectorMazeState,
  target: VectorMazePoint,
): VectorMazeState {
  let state = initialState;

  for (let step = 0; step < 10_000; step += 1) {
    if (state.complete) {
      return state;
    }

    const differenceX = target.x - state.player.x;
    const differenceY = target.y - state.player.y;
    const distance = Math.hypot(differenceX, differenceY);

    if (distance < 0.001) {
      return state;
    }

    const direction = {
      x: differenceX / distance,
      y: differenceY / distance,
    };
    const deltaSeconds = Math.min(
      1 / 120,
      distance / VECTOR_MAZE_PLAYER_SPEED,
    );
    const nextState = stepVectorMaze(
      state,
      direction,
      deltaSeconds,
    );

    if (
      nextState.player.x === state.player.x
      && nextState.player.y === state.player.y
    ) {
      throw new Error(
        `Solution route was blocked near ${target.x}, ${target.y}.`,
      );
    }

    state = nextState;
  }

  throw new Error("Solution-route simulation exceeded its safety limit.");
}

describe("vector maze model", () => {
  it("preserves the reference maze topology and its two openings", () => {
    expect(VECTOR_MAZE_HORIZONTAL_EDGES).toHaveLength(11);
    expect(VECTOR_MAZE_VERTICAL_EDGES).toHaveLength(10);
    expect(VECTOR_MAZE_HORIZONTAL_EDGES[0]?.[4]).toBe(".");
    expect(VECTOR_MAZE_HORIZONTAL_EDGES[10]?.[5]).toBe(".");
    expect(VECTOR_MAZE_WALLS).toHaveLength(50);
  });

  it("normalizes diagonal movement", () => {
    const direction = getVectorMazeDirection({
      up: true,
      down: false,
      left: false,
      right: true,
    });

    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1);
    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it("allows the player to enter through the bottom opening", () => {
    const nextState = stepVectorMaze(
      createInitialVectorMazeState(),
      { x: 0, y: -1 },
      0.2,
    );

    expect(nextState.player.y).toBeLessThan(
      VECTOR_MAZE_START_POSITION.y,
    );
    expect(nextState.complete).toBe(false);
  });

  it("blocks walls while allowing movement along them", () => {
    const state: VectorMazeState = {
      player: { x: 324, y: 505 },
      complete: false,
    };
    const direction = getVectorMazeDirection({
      up: true,
      down: false,
      left: true,
      right: false,
    });
    const nextState = stepVectorMaze(state, direction, 0.1);

    expect(nextState.player.x).toBeLessThan(state.player.x);
    expect(nextState.player.y).toBeCloseTo(state.player.y);
  });

  it("keeps restarts deterministic", () => {
    const first = createInitialVectorMazeState();
    const second = createInitialVectorMazeState();

    expect(first).toEqual(second);
    expect(first.player).not.toBe(second.player);
  });

  it("keeps the complete reference route traversable", () => {
    let state = createInitialVectorMazeState();

    for (const cell of SOLUTION_CELL_PATH) {
      state = moveStateToward(state, getCellCenter(cell));
    }

    state = moveStateToward(state, VECTOR_MAZE_EXIT_POSITION);

    expect(state.complete).toBe(true);
  });
});
