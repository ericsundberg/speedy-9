import type {
  RandomSource,
} from "../../core/random";

export const DEADEYE_BULLSEYE_GOAL = 5;

export const DEADEYE_TARGET_RADIUS = 28;
export const DEADEYE_BULLSEYE_RADIUS = 7;

/*
 * The HUD sits above the SVG playfield. Targets may use the
 * complete playfield below it, with their radius automatically
 * reserved by createDeadeyeTargetPosition().
 */
export const DEADEYE_TARGET_AREA = {
  x: 0,
  y: 0,
  width: 760,
  height: 460,
} as const;

export interface DeadeyePoint {
  readonly x: number;
  readonly y: number;
}

export type DeadeyeShotResult =
  | "bullseye"
  | "target-hit"
  | "miss";

export interface DeadeyeProgress {
  readonly streak: number;
  readonly won: boolean;
}

export function classifyDeadeyeShot(
  shotPosition: DeadeyePoint,
  targetPosition: DeadeyePoint,
): DeadeyeShotResult {
  const distanceFromCenter = Math.hypot(
    shotPosition.x - targetPosition.x,
    shotPosition.y - targetPosition.y,
  );

  if (
    distanceFromCenter
    <= DEADEYE_BULLSEYE_RADIUS
  ) {
    return "bullseye";
  }

  if (
    distanceFromCenter
    <= DEADEYE_TARGET_RADIUS
  ) {
    return "target-hit";
  }

  return "miss";
}

export function resolveDeadeyeShot(
  currentStreak: number,
  result: DeadeyeShotResult,
): DeadeyeProgress {
  const streak =
    result === "bullseye"
      ? Math.min(
          currentStreak + 1,
          DEADEYE_BULLSEYE_GOAL,
        )
      : 0;

  return {
    streak,
    won:
      streak >= DEADEYE_BULLSEYE_GOAL,
  };
}

export function createDeadeyeTargetPosition(
  random: RandomSource,
): DeadeyePoint {
  const minimumX =
    DEADEYE_TARGET_AREA.x
    + DEADEYE_TARGET_RADIUS;

  const maximumX =
    DEADEYE_TARGET_AREA.x
    + DEADEYE_TARGET_AREA.width
    - DEADEYE_TARGET_RADIUS;

  const minimumY =
    DEADEYE_TARGET_AREA.y
    + DEADEYE_TARGET_RADIUS;

  const maximumY =
    DEADEYE_TARGET_AREA.y
    + DEADEYE_TARGET_AREA.height
    - DEADEYE_TARGET_RADIUS;

  return {
    x:
      minimumX
      + random.next()
        * (maximumX - minimumX),

    y:
      minimumY
      + random.next()
        * (maximumY - minimumY),
  };
}