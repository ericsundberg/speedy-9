import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createInitialPitfallState,
  getPitfallRollingLogs,
  getPitfallSinkingPlatform,
  getPitfallVineGrip,
  PITFALL_GROUND_Y,
  PITFALL_PLAYER_HEIGHT,
  PITFALL_TREASURE_RECT,
  stepPitfall,
} from "./pitfall-model";

const NO_INPUT = {
  left: false,
  right: false,
  jumpPressed: false,
} as const;

describe("Pitfall model", () => {
  it("creates a deterministic initial state", () => {
    expect(createInitialPitfallState()).toEqual(
      createInitialPitfallState(),
    );

    expect(
      createInitialPitfallState().lives,
    ).toBe(3);
  });

  it("moves and jumps with fixed controls", () => {
    const result = stepPitfall(
      createInitialPitfallState(),
      {
        left: false,
        right: true,
        jumpPressed: true,
      },
      80,
    );

    expect(result.state.player.x).toBeGreaterThan(42);
    expect(result.state.player.y).toBeLessThan(
      PITFALL_GROUND_Y - PITFALL_PLAYER_HEIGHT,
    );
    expect(result.events.jumped).toBe(true);
  });

  it("moves to the next room at the right edge", () => {
    const initial = createInitialPitfallState();

    const result = stepPitfall(
      {
        ...initial,
        player: {
          ...initial.player,
          x: 744,
        },
      },
      {
        left: false,
        right: true,
        jumpPressed: false,
      },
      20,
    );

    expect(result.state.roomIndex).toBe(1);
    expect(result.events.roomChanged).toBe(true);
  });

  it("uses a deterministic and reachable swinging vine", () => {
    expect(getPitfallVineGrip(1_000)).toEqual(
      getPitfallVineGrip(1_000),
    );

    expect(getPitfallVineGrip(0)).not.toEqual(
      getPitfallVineGrip(1_000),
    );

    const lowestGrip = getPitfallVineGrip(0);

    expect(lowestGrip.y).toBeGreaterThan(320);
    expect(lowestGrip.y).toBeLessThan(
      PITFALL_GROUND_Y,
    );
  });

  it("warns, sinks, and hides the middle platform", () => {
    const stable =
      getPitfallSinkingPlatform(0);

    const warning =
      getPitfallSinkingPlatform(800);

    const sinking =
      getPitfallSinkingPlatform(1_200);

    const resetting =
      getPitfallSinkingPlatform(1_600);

    expect(stable.visible).toBe(true);
    expect(stable.warning).toBe(false);
    expect(stable.topY).toBe(PITFALL_GROUND_Y);

    expect(warning.visible).toBe(true);
    expect(warning.warning).toBe(true);

    expect(sinking.visible).toBe(true);
    expect(sinking.sinking).toBe(true);
    expect(sinking.topY).toBeGreaterThan(
      PITFALL_GROUND_Y,
    );

    expect(resetting.visible).toBe(false);
  });

  it("releases cleanly from the swinging vine", () => {
    const initial = createInitialPitfallState();
    const roomTimeMs = 1_000;
    const grip = getPitfallVineGrip(roomTimeMs);

    const result = stepPitfall(
      {
        ...initial,
        roomIndex: 1,
        roomTimeMs,
        player: {
          ...initial.player,
          x: grip.x - 9,
          y: grip.y - 17,
          velocityX: 0,
          velocityY: 0,
          grounded: false,
          attachedToVine: true,
        },
      },
      {
        left: false,
        right: true,
        jumpPressed: true,
      },
      16,
    );

    expect(
      result.state.player.attachedToVine,
    ).toBe(false);

    expect(
      result.state.player.vineLockoutMs,
    ).toBeGreaterThan(400);

    expect(
      result.state.player.velocityY,
    ).toBeLessThan(-120);

    expect(result.events.jumped).toBe(true);
  });

  it("collects the required treasure", () => {
    const initial = createInitialPitfallState();

    const result = stepPitfall(
      {
        ...initial,
        roomIndex: 3,
        player: {
          ...initial.player,
          x: PITFALL_TREASURE_RECT.x,
        },
      },
      NO_INPUT,
      16,
    );

    expect(
      result.state.treasureCollected,
    ).toBe(true);

    expect(
      result.events.treasureCollected,
    ).toBe(true);
  });

  it("wins only after collecting treasure", () => {
    const initial = createInitialPitfallState();

    const result = stepPitfall(
      {
        ...initial,
        roomIndex: 3,
        treasureCollected: true,
        player: {
          ...initial.player,
          x: 744,
        },
      },
      {
        left: false,
        right: true,
        jumpPressed: false,
      },
      20,
    );

    expect(result.state.phase).toBe("won");
    expect(result.events.won).toBe(true);
  });

  it("loses a life when touching a log", () => {
    const initial = createInitialPitfallState();
    const log = getPitfallRollingLogs(0)[1];

    expect(log).toBeDefined();

    const result = stepPitfall(
      {
        ...initial,
        player: {
          ...initial.player,
          x: (log?.x ?? 0) - 9,
        },
      },
      NO_INPUT,
      1,
    );

    expect(result.state.lives).toBe(2);
    expect(result.events.died).toBe(true);
  });

  it("fails after the final life and message delay", () => {
    const initial = createInitialPitfallState();
    const log = getPitfallRollingLogs(0)[1];

    const death = stepPitfall(
      {
        ...initial,
        lives: 1,
        player: {
          ...initial.player,
          x: (log?.x ?? 0) - 9,
        },
      },
      NO_INPUT,
      1,
    );

    expect(death.state.phase).toBe("lost");
    expect(death.events.lost).toBe(true);

    const finished = stepPitfall(
      death.state,
      NO_INPUT,
      1_200,
    );

    expect(finished.state.failed).toBe(true);
  });
});
