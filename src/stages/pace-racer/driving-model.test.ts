import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createInitialDrivingState,
  DRIVING_AI_IDS,
  DRIVING_BOOST_DURATION_MS,
  DRIVING_BOOST_MAX_SPEED,
  DRIVING_BANANA_SLOWDOWN_MS,
  DRIVING_MAX_FORWARD_SPEED,
  DRIVING_MAX_REVERSE_SPEED,
  DRIVING_SHOULDER_LIMIT,
  DRIVING_SPIN_DURATION_MS,
  DRIVING_SECRET_TRIGGER_DISTANCE,
  DRIVING_SECRET_FINISH_DISTANCE,
  DRIVING_FINISH_DISTANCE,
  getDrivingRaceOutcome,
  getDrivingRemainingDistance,
  getDrivingRacePosition,
  isDrivingPlayerOnShoulder,
  stepDriving,
} from "./driving-model";
import type {
  DrivingCurveSampler,
  DrivingInput,
  DrivingState,
} from "./driving-model";

const NEUTRAL_INPUT: DrivingInput = {
  accelerate: false,
  brake: false,
  steer: 0,
};

function stepRepeatedly(
  state: DrivingState,
  input: DrivingInput,
  stepCount: number,
  deltaMs = 50,
  sampleCurve: DrivingCurveSampler = () => 0,
): DrivingState {
  let nextState = state;

  for (
    let step = 0;
    step < stepCount;
    step += 1
  ) {
    nextState = stepDriving(
      nextState,
      input,
      deltaMs,
      sampleCurve,
    );
  }

  return nextState;
}

function replacePlayer(
  state: DrivingState,
  player: Partial<DrivingState["player"]>,
): DrivingState {
  return {
    ...state,
    player: {
      ...state.player,
      ...player,
    },
  };
}

describe("driving model", () => {
  it("creates a stationary centered player", () => {
    const state = createInitialDrivingState();

    expect(state.elapsedMs).toBe(0);
    expect(state.player.distance).toBe(0);
    expect(state.player.lateralPosition).toBe(0);
    expect(state.player.speed).toBe(0);
  });

  it("creates exactly three AI drivers", () => {
    const state = createInitialDrivingState();

    expect(state.aiDrivers).toHaveLength(3);

    expect(
      state.aiDrivers.map((driver) => driver.id),
    ).toEqual(DRIVING_AI_IDS);
  });

  it("accelerates forward and advances distance", () => {
    const initialState = createInitialDrivingState();

    const isolatedState: DrivingState = {
      ...initialState,
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 1_000 + index * 100,
        }),
      ),
    };

    const state = stepRepeatedly(
      isolatedState,
      {
        accelerate: true,
        brake: false,
        steer: 0,
      },
      20,
    );

    expect(state.player.speed).toBeGreaterThan(70);
    expect(state.player.distance).toBeGreaterThan(30);
  });

  it("coasts toward a stop", () => {
    const movingState = replacePlayer(
      createInitialDrivingState(),
      {
        speed: 100,
      },
    );

    const state = stepRepeatedly(
      movingState,
      NEUTRAL_INPUT,
      20,
    );

    expect(state.player.speed).toBeLessThan(100);
    expect(state.player.speed).toBeGreaterThan(0);
  });

  it("brakes before beginning to reverse", () => {
    const movingState = replacePlayer(
      createInitialDrivingState(),
      {
        speed: 18,
      },
    );

    const state = stepRepeatedly(
      movingState,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      20,
    );

    expect(state.player.speed).toBeLessThan(0);
    expect(state.player.speed).toBeGreaterThanOrEqual(
      DRIVING_MAX_REVERSE_SPEED,
    );
  });

  it("does not steer while stationary", () => {
    const state = stepRepeatedly(
      createInitialDrivingState(),
      {
        accelerate: false,
        brake: false,
        steer: 1,
      },
      20,
    );

    expect(state.player.lateralPosition).toBe(0);
  });

  it("steers laterally while moving", () => {
    const movingState = replacePlayer(
      createInitialDrivingState(),
      {
        speed: 120,
      },
    );

    const state = stepRepeatedly(
      movingState,
      {
        accelerate: false,
        brake: false,
        steer: 1,
      },
      10,
    );

    expect(state.player.lateralPosition).toBeGreaterThan(0);
  });

  it("clamps the player at the shoulder boundary", () => {
    const movingState = replacePlayer(
      createInitialDrivingState(),
      {
        lateralPosition: 1.3,
        speed: DRIVING_MAX_FORWARD_SPEED,
      },
    );

    const state = stepRepeatedly(
      movingState,
      {
        accelerate: true,
        brake: false,
        steer: 1,
      },
      20,
    );

    expect(state.player.lateralPosition).toBe(
      DRIVING_SHOULDER_LIMIT,
    );
  });

  it("slows a vehicle more strongly on the shoulder", () => {
    const initialState = createInitialDrivingState();

    const roadState = replacePlayer(
      initialState,
      {
        lateralPosition: 0,
        speed: 100,
      },
    );

    const shoulderState = replacePlayer(
      initialState,
      {
        lateralPosition: 1.2,
        speed: 100,
      },
    );

    const roadResult = stepDriving(
      roadState,
      NEUTRAL_INPUT,
      50,
    );

    const shoulderResult = stepDriving(
      shoulderState,
      NEUTRAL_INPUT,
      50,
    );

    expect(
      shoulderResult.player.speed,
    ).toBeLessThan(
      roadResult.player.speed,
    );

    expect(
      isDrivingPlayerOnShoulder(
        shoulderResult.player,
      ),
    ).toBe(true);
  });

  it("reaches a very fast reverse speed from rest", () => {
    const initialState = createInitialDrivingState();

    const isolatedState: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 1_000,
      },
      aiDrivers: [],
      pickups: [],
      missiles: [],
      bananas: [],
    };

    const state = stepRepeatedly(
      isolatedState,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      20,
    );

    expect(state.route).toBe("main");
    expect(state.player.speed).toBe(
      DRIVING_MAX_REVERSE_SPEED,
    );

    expect(
      Math.abs(state.player.speed),
    ).toBeGreaterThan(
      DRIVING_MAX_FORWARD_SPEED,
    );
  });

  it("transitions rapidly from forward motion into reverse", () => {
    const movingState = replacePlayer(
      createInitialDrivingState(),
      {
        speed: 120,
      },
    );

    const state = stepRepeatedly(
      movingState,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      20,
    );

    expect(state.player.speed).toBeLessThan(-150);
  });

  it("respects forward and reverse speed limits", () => {
    const initialState = createInitialDrivingState();

    const isolatedState: DrivingState = {
      ...initialState,
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 200,
        }),
      ),
      bananas: initialState.bananas.map(
        (banana) => ({
          ...banana,
          active: false,
        }),
      ),
    };

    const forwardState = stepRepeatedly(
      isolatedState,
      {
        accelerate: true,
        brake: false,
        steer: 0,
      },
      200,
    );

    const reverseState = stepRepeatedly(
      isolatedState,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      200,
    );

    expect(forwardState.player.speed).toBe(
      DRIVING_MAX_FORWARD_SPEED,
    );

    expect(reverseState.player.speed).toBe(
      DRIVING_MAX_REVERSE_SPEED,
    );
  });

  it("advances all AI drivers", () => {
    const initialState = createInitialDrivingState();

    const state = stepRepeatedly(
      initialState,
      NEUTRAL_INPUT,
      40,
    );

    for (
      let index = 0;
      index < state.aiDrivers.length;
      index += 1
    ) {
      expect(
        state.aiDrivers[index]?.distance,
      ).toBeGreaterThan(
        initialState.aiDrivers[index]?.distance
          ?? Number.POSITIVE_INFINITY,
      );
    }
  });

  it("gives every rival a competitive straight-line target", () => {
    const state = stepDriving(
      createInitialDrivingState(),
      NEUTRAL_INPUT,
      50,
      () => 0,
    );

    const targetSpeeds = state.aiDrivers.map(
      (driver) => driver.targetSpeed,
    );

    expect(Math.min(...targetSpeeds)).toBeGreaterThanOrEqual(
      DRIVING_MAX_FORWARD_SPEED - 8,
    );

    expect(Math.max(...targetSpeeds)).toBeGreaterThan(
      DRIVING_MAX_FORWARD_SPEED,
    );
  });

  it("accelerates rivals rapidly toward racing speed", () => {
    const initialState = createInitialDrivingState();

    const isolatedState: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: -1_000,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver) => ({
          ...driver,
          decisionRemainingMs: 100_000,
        }),
      ),
      bananas: initialState.bananas.map(
        (banana) => ({
          ...banana,
          active: false,
        }),
      ),
    };

    let state = isolatedState;

    for (
      let stepIndex = 0;
      stepIndex < 80;
      stepIndex += 1
    ) {
      state = stepDriving(
        state,
        NEUTRAL_INPUT,
        50,
        () => 0,
      );
    }

    const speeds = state.aiDrivers.map(
      (driver) => driver.speed,
    );

    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(200);
    expect(Math.max(...speeds)).toBeGreaterThan(
      DRIVING_MAX_FORWARD_SPEED,
    );
  });

  it("reduces AI target speeds on strong curves", () => {
    const initialState = createInitialDrivingState();

    const straightState = stepDriving(
      initialState,
      NEUTRAL_INPUT,
      50,
      () => 0,
    );

    const curvedState = stepDriving(
      initialState,
      NEUTRAL_INPUT,
      50,
      () => 0.35,
    );

    expect(
      curvedState.aiDrivers[0]?.targetSpeed,
    ).toBeLessThan(
      straightState.aiDrivers[0]?.targetSpeed
        ?? 0,
    );
  });

  it("chooses the inside lane on a strong curve", () => {
    const state = stepDriving(
      createInitialDrivingState(),
      NEUTRAL_INPUT,
      50,
      () => 0.3,
    );

    expect(
      state.aiDrivers[0]?.targetLane,
    ).toBe(0.55);
  });

  it("applies collision penalties and cooldowns", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 100,
        lateralPosition: 0,
        speed: 150,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance: 106,
                lateralPosition: 0.05,
                speed: 120,
              }
            : {
                ...driver,
                distance:
                  400 + index * 100,
              }
        ),
      ),
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      1,
    );

    expect(result.player.speed).toBeLessThan(130);

    expect(
      result.player.collisionCooldownMs,
    ).toBeGreaterThan(0);

    expect(
      result.aiDrivers[0]?.collisionCooldownMs,
    ).toBeGreaterThan(0);

    expect(result.player.spinRemainingMs).toBe(
      DRIVING_SPIN_DURATION_MS,
    );

    expect(
      result.aiDrivers[0]?.spinRemainingMs,
    ).toBe(DRIVING_SPIN_DURATION_MS);
  });

  it("keeps spinning cars moving while draining momentum", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        speed: 100,
        spinRemainingMs:
          DRIVING_SPIN_DURATION_MS,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 1_000 + index * 100,
        }),
      ),
    };

    const result = stepRepeatedly(
      state,
      {
        accelerate: true,
        brake: false,
        steer: 1,
      },
      20,
    );

    expect(result.player.distance).toBeGreaterThan(0);
    expect(result.player.speed).toBeGreaterThan(0);
    expect(result.player.speed).toBeLessThan(100);
    expect(result.player.lateralPosition).toBe(0);
    expect(result.player.spinRemainingMs).toBe(2_000);
  });

  it("creates the authored boost and missile pickups", () => {
    const state = createInitialDrivingState();

    expect(
      state.pickups.map((pickup) => pickup.kind),
    ).toEqual([
      "boost",
      "missile",
      "boost",
      "missile",
    ]);
  });

  it("collects a pickup into the one-item inventory", () => {
    const initialState = createInitialDrivingState();
    const pickup = initialState.pickups[0];

    expect(pickup).toBeDefined();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: pickup?.distance ?? 0,
        lateralPosition:
          pickup?.lateralPosition ?? 0,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 100,
        }),
      ),
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(result.player.heldItem).toBe("boost");
    expect(result.pickups[0]?.collected).toBe(true);
  });

  it("consumes a boost and raises the speed limit", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        speed: DRIVING_MAX_FORWARD_SPEED,
        heldItem: "boost",
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 100,
        }),
      ),
    };

    const result = stepDriving(
      state,
      {
        accelerate: true,
        brake: false,
        steer: 0,
        useItemPressed: true,
      },
      50,
    );

    expect(result.player.heldItem).toBeNull();
    expect(result.player.boostRemainingMs).toBe(
      DRIVING_BOOST_DURATION_MS,
    );
    expect(result.player.speed).toBeGreaterThan(
      DRIVING_MAX_FORWARD_SPEED,
    );
    expect(result.player.speed).toBeLessThanOrEqual(
      DRIVING_BOOST_MAX_SPEED,
    );
  });

  it("preserves a missile when every rival is behind", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 500,
        heldItem: "missile",
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 100 + index * 50,
        }),
      ),
    };

    const result = stepDriving(
      state,
      {
        ...NEUTRAL_INPUT,
        useItemPressed: true,
      },
      50,
    );

    expect(result.player.heldItem).toBe("missile");
    expect(result.missiles).toHaveLength(0);
  });

  it("targets the nearest rival ahead", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        heldItem: "missile",
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: [140, 70, 240][index] ?? 300,
        }),
      ),
    };

    const result = stepDriving(
      state,
      {
        ...NEUTRAL_INPUT,
        useItemPressed: true,
      },
      50,
    );

    expect(result.player.heldItem).toBeNull();
    expect(result.missiles).toHaveLength(1);
    expect(result.missiles[0]?.targetId).toBe("ai-2");
  });

  it("spins the target when a missile hits", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance: 100,
                lateralPosition: 0,
                speed: 120,
              }
            : {
                ...driver,
                distance: 1_000 + index * 100,
              }
        ),
      ),
      missiles: [
        {
          id: "test-missile",
          targetId: "ai-1",
          distance: 90,
          lateralPosition: 0,
          speed: 340,
        },
      ],
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(result.missiles).toHaveLength(0);
    expect(
      result.aiDrivers[0]?.spinRemainingMs,
    ).toBe(DRIVING_SPIN_DURATION_MS);
    expect(result.aiDrivers[0]?.speed).toBeLessThan(120);
  });

  it("creates four active banana hazards", () => {
    const state = createInitialDrivingState();

    expect(state.bananas).toHaveLength(4);
    expect(
      state.bananas.every((banana) => banana.active),
    ).toBe(true);
  });

  it("slows the player and removes a struck banana", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 100,
        speed: 100,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 100,
        }),
      ),
      bananas: [
        {
          id: "test-banana",
          distance: 105,
          lateralPosition: 0,
          active: true,
        },
      ],
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(result.player.speed).toBeLessThan(100);
    expect(result.player.slowdownRemainingMs).toBe(
      DRIVING_BANANA_SLOWDOWN_MS,
    );
    expect(result.bananas[0]?.active).toBe(false);
  });

  it("slows an AI driver that hits a banana", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance: 100,
                lateralPosition: -0.55,
                speed: 100,
                decisionRemainingMs: 1_000,
              }
            : {
                ...driver,
                distance: 10_000 + index * 100,
              }
        ),
      ),
      bananas: [
        {
          id: "test-banana",
          distance: 105,
          lateralPosition: -0.55,
          active: true,
        },
      ],
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(
      result.aiDrivers[0]?.slowdownRemainingMs,
    ).toBe(DRIVING_BANANA_SLOWDOWN_MS);
    expect(result.bananas[0]?.active).toBe(false);
  });

  it("ignores inactive bananas", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 100,
        speed: 100,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 100,
        }),
      ),
      bananas: [
        {
          id: "inactive-banana",
          distance: 105,
          lateralPosition: 0,
          active: false,
        },
      ],
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(result.player.slowdownRemainingMs).toBe(0);
  });

  it("attempts to steer AI away from a banana", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance: 100,
                lateralPosition: -0.55,
                targetLane: -0.55,
                decisionRemainingMs: 0,
              }
            : {
                ...driver,
                distance: 10_000 + index * 100,
              }
        ),
      ),
      bananas: [
        {
          id: "avoid-banana",
          distance: 145,
          lateralPosition: -0.55,
          active: true,
        },
      ],
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(result.aiDrivers[0]?.targetLane).not.toBe(-0.55);
  });

  it("recycles pickups and cones ahead indefinitely", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: 1_800,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance: 10_000 + index * 100,
        }),
      ),
      pickups: initialState.pickups.map(
        (pickup) => ({
          ...pickup,
          collected: true,
        }),
      ),
      bananas: initialState.bananas.map(
        (banana) => ({
          ...banana,
          active: false,
        }),
      ),
    };

    const result = stepDriving(
      state,
      NEUTRAL_INPUT,
      50,
    );

    expect(
      result.pickups.map((pickup) => pickup.distance),
    ).toEqual([
      1_860,
      2_140,
      2_540,
      2_940,
    ]);

    expect(
      result.pickups.every(
        (pickup) => !pickup.collected,
      ),
    ).toBe(true);

    expect(
      result.bananas.map((banana) => banana.distance),
    ).toEqual([
      2_010,
      2_360,
      2_680,
      3_070,
    ]);

    expect(
      result.bananas.every((banana) => banana.active),
    ).toBe(true);
  });

  it("uses the requested main and secret route lengths", () => {
    expect(DRIVING_FINISH_DISTANCE).toBe(10_000);
    expect(DRIVING_SECRET_FINISH_DISTANCE).toBe(2_500);
  });

  it("reports racing before anyone reaches the finish", () => {
    const state = createInitialDrivingState();

    expect(getDrivingRaceOutcome(state)).toBe("racing");
    expect(getDrivingRemainingDistance(state)).toBe(
      DRIVING_FINISH_DISTANCE,
    );
  });

  it("reports a player victory when the player finishes first", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: DRIVING_FINISH_DISTANCE + 4,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => ({
          ...driver,
          distance:
            DRIVING_FINISH_DISTANCE
            - 20
            - index * 10,
        }),
      ),
    };

    expect(getDrivingRaceOutcome(state)).toBe(
      "player-won",
    );
    expect(getDrivingRemainingDistance(state)).toBe(0);
  });

  it("reports a loss when a rival finishes first", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: DRIVING_FINISH_DISTANCE - 10,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance:
                  DRIVING_FINISH_DISTANCE + 2,
              }
            : {
                ...driver,
                distance:
                  DRIVING_FINISH_DISTANCE - 50,
              }
        ),
      ),
    };

    expect(getDrivingRaceOutcome(state)).toBe(
      "player-lost",
    );
  });

  it("uses the leading finisher when multiple cars cross together", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: DRIVING_FINISH_DISTANCE + 1,
      },
      aiDrivers: initialState.aiDrivers.map(
        (driver, index) => (
          index === 0
            ? {
                ...driver,
                distance:
                  DRIVING_FINISH_DISTANCE + 5,
              }
            : driver
        ),
      ),
    };

    expect(getDrivingRaceOutcome(state)).toBe(
      "player-lost",
    );
  });

  it("enters the secret route by reversing behind the start", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance:
          DRIVING_SECRET_TRIGGER_DISTANCE + 1,
        speed: -200,
      },
    };

    const result = stepDriving(
      state,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      50,
    );

    expect(result.route).toBe("secret");
    expect(result.player.distance).toBe(0);
    expect(result.player.speed).toBeGreaterThan(0);
    expect(result.player.lateralPosition).toBe(0);
    expect(result.aiDrivers).toHaveLength(0);
    expect(result.pickups).toHaveLength(0);
    expect(result.missiles).toHaveLength(0);
    expect(result.bananas).toHaveLength(0);
  });

  it("does not enter the secret route before the trigger", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      player: {
        ...initialState.player,
        distance: -70,
        speed: -100,
      },
    };

    const result = stepDriving(
      state,
      {
        accelerate: false,
        brake: true,
        steer: 0,
      },
      50,
    );

    expect(result.route).toBe("main");
  });

  it("uses the shorter finish on the secret route", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      route: "secret",
      player: {
        ...initialState.player,
        distance: DRIVING_SECRET_FINISH_DISTANCE,
      },
      aiDrivers: [],
      pickups: [],
      missiles: [],
      bananas: [],
    };

    expect(getDrivingRemainingDistance(state)).toBe(0);
    expect(getDrivingRaceOutcome(state)).toBe(
      "player-won",
    );
  });

  it("does not leave the secret route during normal driving", () => {
    const initialState = createInitialDrivingState();

    const state: DrivingState = {
      ...initialState,
      route: "secret",
      player: {
        ...initialState.player,
        distance: 100,
        speed: 100,
      },
      aiDrivers: [],
      pickups: [],
      missiles: [],
      bananas: [],
    };

    const result = stepDriving(
      state,
      {
        accelerate: true,
        brake: false,
        steer: 0,
      },
      50,
    );

    expect(result.route).toBe("secret");
    expect(result.player.distance).toBeGreaterThan(100);
  });

  it("calculates the player race position", () => {
    const initialState = createInitialDrivingState();

    expect(
      getDrivingRacePosition(initialState),
    ).toBe(4);

    const leadingState = replacePlayer(
      initialState,
      {
        distance: 1_000,
      },
    );

    expect(
      getDrivingRacePosition(leadingState),
    ).toBe(1);
  });
});
