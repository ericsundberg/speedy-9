import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  RandomSource,
} from "../../core/random";
import {
  DEADEYE_BULLSEYE_GOAL,
  DEADEYE_BULLSEYE_RADIUS,
  DEADEYE_TARGET_AREA,
  DEADEYE_TARGET_RADIUS,
  classifyDeadeyeShot,
  createDeadeyeTargetPosition,
  resolveDeadeyeShot,
} from "./deadeye-model";

const TARGET_CENTER = {
  x: 100,
  y: 100,
} as const;

function createFixedRandom(
  values: readonly number[],
): RandomSource {
  let index = 0;

  return {
    next(): number {
      const value = values[index];

      index += 1;

      if (value === undefined) {
        throw new Error(
          "Fixed random source exhausted.",
        );
      }

      return value;
    },
  };
}

describe("classifyDeadeyeShot", () => {
  it("classifies the center and bullseye edge", () => {
    expect(
      classifyDeadeyeShot(
        TARGET_CENTER,
        TARGET_CENTER,
      ),
    ).toBe("bullseye");

    expect(
      classifyDeadeyeShot(
        {
          x:
            TARGET_CENTER.x
            + DEADEYE_BULLSEYE_RADIUS,
          y: TARGET_CENTER.y,
        },
        TARGET_CENTER,
      ),
    ).toBe("bullseye");
  });

  it("classifies a non-center target hit", () => {
    expect(
      classifyDeadeyeShot(
        {
          x:
            TARGET_CENTER.x
            + DEADEYE_BULLSEYE_RADIUS
            + 0.01,
          y: TARGET_CENTER.y,
        },
        TARGET_CENTER,
      ),
    ).toBe("target-hit");

    expect(
      classifyDeadeyeShot(
        {
          x:
            TARGET_CENTER.x
            + DEADEYE_TARGET_RADIUS,
          y: TARGET_CENTER.y,
        },
        TARGET_CENTER,
      ),
    ).toBe("target-hit");
  });

  it("classifies a shot outside the target as a miss", () => {
    expect(
      classifyDeadeyeShot(
        {
          x:
            TARGET_CENTER.x
            + DEADEYE_TARGET_RADIUS
            + 0.01,
          y: TARGET_CENTER.y,
        },
        TARGET_CENTER,
      ),
    ).toBe("miss");
  });
});

describe("createDeadeyeTargetPosition", () => {
  it("places the target at the minimum safe coordinates", () => {
    const position =
      createDeadeyeTargetPosition(
        createFixedRandom([0, 0]),
      );

    expect(position).toEqual({
      x:
        DEADEYE_TARGET_AREA.x
        + DEADEYE_TARGET_RADIUS,

      y:
        DEADEYE_TARGET_AREA.y
        + DEADEYE_TARGET_RADIUS,
    });
  });

  it("keeps the complete target inside the safe area", () => {
    const position =
      createDeadeyeTargetPosition(
        createFixedRandom([
          1 - Number.EPSILON,
          1 - Number.EPSILON,
        ]),
      );

    const maximumX =
      DEADEYE_TARGET_AREA.x
      + DEADEYE_TARGET_AREA.width
      - DEADEYE_TARGET_RADIUS;

    const maximumY =
      DEADEYE_TARGET_AREA.y
      + DEADEYE_TARGET_AREA.height
      - DEADEYE_TARGET_RADIUS;

    expect(position.x).toBeLessThanOrEqual(
      maximumX,
    );

    expect(position.y).toBeLessThanOrEqual(
      maximumY,
    );
  });
});

describe("resolveDeadeyeShot", () => {
  it("increments the streak after a bullseye", () => {
    expect(
      resolveDeadeyeShot(
        2,
        "bullseye",
      ),
    ).toEqual({
      streak: 3,
      won: false,
    });
  });

  it("resets the streak after a target hit", () => {
    expect(
      resolveDeadeyeShot(
        4,
        "target-hit",
      ),
    ).toEqual({
      streak: 0,
      won: false,
    });
  });

  it("resets the streak after a complete miss", () => {
    expect(
      resolveDeadeyeShot(
        4,
        "miss",
      ),
    ).toEqual({
      streak: 0,
      won: false,
    });
  });

  it("wins on the fifth consecutive bullseye", () => {
    expect(
      resolveDeadeyeShot(
        DEADEYE_BULLSEYE_GOAL - 1,
        "bullseye",
      ),
    ).toEqual({
      streak: DEADEYE_BULLSEYE_GOAL,
      won: true,
    });
  });

  it("does not increase beyond the five-hit goal", () => {
    expect(
      resolveDeadeyeShot(
        DEADEYE_BULLSEYE_GOAL,
        "bullseye",
      ),
    ).toEqual({
      streak: DEADEYE_BULLSEYE_GOAL,
      won: true,
    });
  });
});