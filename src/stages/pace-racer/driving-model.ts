export const DRIVING_VIEW_WIDTH = 960;
export const DRIVING_VIEW_HEIGHT = 720;

export const DRIVING_ROAD_EDGE = 1;
export const DRIVING_SHOULDER_LIMIT = 1.32;

export const DRIVING_MAX_FORWARD_SPEED = 210;
export const DRIVING_MAX_REVERSE_SPEED = -240;

export const DRIVING_SPIN_DURATION_MS = 3_000;
export const DRIVING_BOOST_DURATION_MS = 1_500;
export const DRIVING_BOOST_MAX_SPEED = 270;
export const DRIVING_BANANA_SLOWDOWN_MS = 1_800;
export const DRIVING_FINISH_DISTANCE = 10_000;
export const DRIVING_SECRET_TRIGGER_DISTANCE = -160;
export const DRIVING_SECRET_FINISH_DISTANCE = 2_500;

export const DRIVING_AI_IDS = [
  "ai-1",
  "ai-2",
  "ai-3",
] as const;

export type DrivingAiId =
  (typeof DRIVING_AI_IDS)[number];

export type DrivingDriverId =
  | "player"
  | DrivingAiId;

export type DrivingRoute =
  | "main"
  | "secret";

export type DrivingRaceOutcome =
  | "racing"
  | "player-won"
  | "player-lost";

export type DrivingHeldItem =
  | "boost"
  | "missile"
  | null;

export interface DrivingPickupState {
  readonly id: string;
  readonly kind: Exclude<DrivingHeldItem, null>;
  readonly distance: number;
  readonly lateralPosition: number;
  readonly collected: boolean;
}

export interface DrivingMissileState {
  readonly id: string;
  readonly targetId: DrivingAiId;
  readonly distance: number;
  readonly lateralPosition: number;
  readonly speed: number;
}

export interface DrivingBananaState {
  readonly id: string;
  readonly distance: number;
  readonly lateralPosition: number;
  readonly active: boolean;
}

const MAX_STEP_MS = 50;
const FORWARD_ACCELERATION = 72;
const REVERSE_ACCELERATION = 420;
const REVERSE_ENTRY_DECELERATION = 300;
const BRAKING_DECELERATION = 118;
const COAST_DECELERATION = 24;
const SHOULDER_DECELERATION = 72;
const STEERING_RATE = 1.58;
const SPIN_MOMENTUM_DECELERATION = 26;
const BOOST_ACCELERATION = 132;
const PICKUP_LONGITUDINAL_DISTANCE = 18;
const PICKUP_LATERAL_DISTANCE = 0.28;
const MISSILE_SPEED = 340;
const MISSILE_LATERAL_RATE = 1.8;
const MISSILE_HIT_DISTANCE = 17;
const MISSILE_HIT_LATERAL_DISTANCE = 0.3;
const MISSILE_MAX_TARGET_OVERSHOOT = 120;
const BANANA_LONGITUDINAL_DISTANCE = 17;
const BANANA_LATERAL_DISTANCE = 0.3;
const BANANA_SPEED_MULTIPLIER = 0.52;
const BANANA_MAX_SPEED = 118;
const BANANA_STEERING_MULTIPLIER = 0.58;
const AI_BANANA_LOOKAHEAD = 70;
const DRIVING_OBJECT_PATTERN_LENGTH = 1_600;
const DRIVING_OBJECT_RECYCLE_BEHIND_DISTANCE = 120;

const AI_ACCELERATION = 82;
const AI_DECELERATION = 96;
const AI_STEERING_RATE = 1.08;
const AI_CURVE_SPEED_PENALTY = 48;
const AI_MAX_SPEED =
  DRIVING_MAX_FORWARD_SPEED + 8;

const CAR_COLLISION_DISTANCE = 18;
const CAR_COLLISION_LATERAL_DISTANCE = 0.28;
const CAR_COLLISION_COOLDOWN_MS =
  DRIVING_SPIN_DURATION_MS;

const AI_LANES = [
  -0.55,
  0,
  0.55,
] as const;

interface DrivingAiProfile {
  readonly cruisingSpeed: number;
  readonly decisionPeriodMs: number;
  readonly sequenceOffset: number;
}

const AI_PROFILES: Readonly<
  Record<DrivingAiId, DrivingAiProfile>
> = {
  "ai-1": {
    cruisingSpeed: 206,
    decisionPeriodMs: 340,
    sequenceOffset: 0,
  },
  "ai-2": {
    cruisingSpeed: 216,
    decisionPeriodMs: 400,
    sequenceOffset: 1,
  },
  "ai-3": {
    cruisingSpeed: 202,
    decisionPeriodMs: 300,
    sequenceOffset: 2,
  },
};

export interface DrivingInput {
  readonly accelerate: boolean;
  readonly brake: boolean;
  readonly steer: -1 | 0 | 1;
  readonly useItemPressed?: boolean;
}

export interface DrivingPlayerState {
  readonly distance: number;
  readonly lateralPosition: number;
  readonly speed: number;
  readonly collisionCooldownMs: number;
  readonly spinRemainingMs: number;
  readonly heldItem: DrivingHeldItem;
  readonly boostRemainingMs: number;
  readonly slowdownRemainingMs: number;
}

export interface DrivingAiState {
  readonly id: DrivingAiId;
  readonly distance: number;
  readonly lateralPosition: number;
  readonly speed: number;
  readonly targetSpeed: number;
  readonly targetLane: number;
  readonly decisionRemainingMs: number;
  readonly collisionCooldownMs: number;
  readonly spinRemainingMs: number;
  readonly slowdownRemainingMs: number;
}

export interface DrivingState {
  readonly elapsedMs: number;
  readonly route: DrivingRoute;
  readonly player: DrivingPlayerState;
  readonly aiDrivers: readonly DrivingAiState[];
  readonly pickups: readonly DrivingPickupState[];
  readonly missiles: readonly DrivingMissileState[];
  readonly bananas: readonly DrivingBananaState[];
}

export interface DrivingStanding {
  readonly id: DrivingDriverId;
  readonly distance: number;
}

export type DrivingCurveSampler = (
  distance: number,
) => number;

interface DrivingDriverSnapshot {
  readonly id: DrivingDriverId;
  readonly distance: number;
  readonly lateralPosition: number;
  readonly speed: number;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function approach(
  value: number,
  target: number,
  amount: number,
): number {
  if (value < target) {
    return Math.min(value + amount, target);
  }

  if (value > target) {
    return Math.max(value - amount, target);
  }

  return value;
}

function normalizeDeltaMs(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return 0;
  }

  return Math.min(deltaMs, MAX_STEP_MS);
}

function normalizeCurve(curve: number): number {
  return Number.isFinite(curve)
    ? clamp(curve, -1, 1)
    : 0;
}

function updatePlayerSpeed(
  speed: number,
  input: DrivingInput,
  deltaSeconds: number,
  boostActive: boolean,
  slowdownActive: boolean,
): number {
  let nextSpeed = speed;

  if (input.accelerate && !input.brake) {
    if (nextSpeed < 0) {
      nextSpeed = approach(
        nextSpeed,
        0,
        BRAKING_DECELERATION * deltaSeconds,
      );
    } else {
      nextSpeed += FORWARD_ACCELERATION * deltaSeconds;
    }
  } else if (input.brake && !input.accelerate) {
    if (nextSpeed > 0) {
      nextSpeed = approach(
        nextSpeed,
        0,
        REVERSE_ENTRY_DECELERATION * deltaSeconds,
      );
    } else {
      nextSpeed -= REVERSE_ACCELERATION * deltaSeconds;
    }
  } else {
    nextSpeed = approach(
      nextSpeed,
      0,
      COAST_DECELERATION * deltaSeconds,
    );
  }

  if (boostActive) {
    nextSpeed += BOOST_ACCELERATION * deltaSeconds;
  }

  const maximumForwardSpeed =
    slowdownActive
      ? BANANA_MAX_SPEED
      : boostActive
        ? DRIVING_BOOST_MAX_SPEED
        : DRIVING_MAX_FORWARD_SPEED;

  return clamp(
    nextSpeed,
    DRIVING_MAX_REVERSE_SPEED,
    maximumForwardSpeed,
  );
}

function updatePlayerLateralPosition(
  lateralPosition: number,
  speed: number,
  steer: DrivingInput["steer"],
  deltaSeconds: number,
  steeringMultiplier = 1,
): number {
  const speedRatio = clamp(
    Math.abs(speed) / DRIVING_MAX_FORWARD_SPEED,
    0,
    1,
  );

  const steeringStrength =
    speedRatio <= 0
      ? 0
      : 0.08 + speedRatio * 0.92;

  return clamp(
    lateralPosition
      + steer
      * STEERING_RATE
      * steeringStrength
      * steeringMultiplier
      * deltaSeconds,
    -DRIVING_SHOULDER_LIMIT,
    DRIVING_SHOULDER_LIMIT,
  );
}

function applyShoulderDrag(
  speed: number,
  lateralPosition: number,
  deltaSeconds: number,
): number {
  const shoulderDepth = Math.max(
    0,
    Math.abs(lateralPosition) - DRIVING_ROAD_EDGE,
  );

  if (shoulderDepth <= 0) {
    return speed;
  }

  const dragMultiplier =
    1 + shoulderDepth * 3.5;

  return approach(
    speed,
    0,
    SHOULDER_DECELERATION
      * dragMultiplier
      * deltaSeconds,
  );
}

function createInitialPickups():
readonly DrivingPickupState[] {
  return [
    {
      id: "pickup-boost-1",
      kind: "boost",
      distance: 260,
      lateralPosition: -0.55,
      collected: false,
    },
    {
      id: "pickup-missile-1",
      kind: "missile",
      distance: 540,
      lateralPosition: 0.55,
      collected: false,
    },
    {
      id: "pickup-boost-2",
      kind: "boost",
      distance: 940,
      lateralPosition: 0,
      collected: false,
    },
    {
      id: "pickup-missile-2",
      kind: "missile",
      distance: 1_340,
      lateralPosition: -0.55,
      collected: false,
    },
  ];
}

function createInitialBananas():
readonly DrivingBananaState[] {
  return [
    {
      id: "banana-1",
      distance: 410,
      lateralPosition: 0,
      active: true,
    },
    {
      id: "banana-2",
      distance: 760,
      lateralPosition: -0.55,
      active: true,
    },
    {
      id: "banana-3",
      distance: 1_080,
      lateralPosition: 0.55,
      active: true,
    },
    {
      id: "banana-4",
      distance: 1_470,
      lateralPosition: 0,
      active: true,
    },
  ];
}

function recycleDrivingObjectDistance(
  distance: number,
  playerDistance: number,
): number {
  let nextDistance = distance;

  const recycleThreshold =
    playerDistance
    - DRIVING_OBJECT_RECYCLE_BEHIND_DISTANCE;

  while (nextDistance < recycleThreshold) {
    nextDistance += DRIVING_OBJECT_PATTERN_LENGTH;
  }

  return nextDistance;
}

function recycleDrivingPickups(
  playerDistance: number,
  pickups: readonly DrivingPickupState[],
): readonly DrivingPickupState[] {
  return pickups.map((pickup) => {
    const distance = recycleDrivingObjectDistance(
      pickup.distance,
      playerDistance,
    );

    if (distance === pickup.distance) {
      return pickup;
    }

    return {
      ...pickup,
      distance,
      collected: false,
    };
  });
}

function recycleDrivingBananas(
  playerDistance: number,
  bananas: readonly DrivingBananaState[],
): readonly DrivingBananaState[] {
  return bananas.map((banana) => {
    const distance = recycleDrivingObjectDistance(
      banana.distance,
      playerDistance,
    );

    if (distance === banana.distance) {
      return banana;
    }

    return {
      ...banana,
      distance,
      active: true,
    };
  });
}

export function getNearestDrivingMissileTarget(
  playerDistance: number,
  aiDrivers: readonly DrivingAiState[],
): DrivingAiId | null {
  let targetId: DrivingAiId | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const driver of aiDrivers) {
    const distanceAhead =
      driver.distance - playerDistance;

    if (
      distanceAhead <= 0
      || distanceAhead >= nearestDistance
    ) {
      continue;
    }

    nearestDistance = distanceAhead;
    targetId = driver.id;
  }

  return targetId;
}

function collectDrivingPickup(
  player: DrivingPlayerState,
  pickups: readonly DrivingPickupState[],
): {
  readonly player: DrivingPlayerState;
  readonly pickups: readonly DrivingPickupState[];
} {
  let heldItem = player.heldItem;
  let collectedId: string | null = null;

  for (const pickup of pickups) {
    if (pickup.collected) {
      continue;
    }

    const longitudinalDifference = Math.abs(
      player.distance - pickup.distance,
    );

    const lateralDifference = Math.abs(
      player.lateralPosition
      - pickup.lateralPosition,
    );

    if (
      longitudinalDifference
        >= PICKUP_LONGITUDINAL_DISTANCE
      || lateralDifference
        >= PICKUP_LATERAL_DISTANCE
    ) {
      continue;
    }

    heldItem = pickup.kind;
    collectedId = pickup.id;
    break;
  }

  if (collectedId === null) {
    return {
      player,
      pickups,
    };
  }

  return {
    player: {
      ...player,
      heldItem,
    },
    pickups: pickups.map((pickup) => (
      pickup.id === collectedId
        ? {
            ...pickup,
            collected: true,
          }
        : pickup
    )),
  };
}

function updateDrivingMissiles(
  missiles: readonly DrivingMissileState[],
  aiDrivers: readonly DrivingAiState[],
  deltaSeconds: number,
): {
  readonly missiles: readonly DrivingMissileState[];
  readonly aiDrivers: readonly DrivingAiState[];
} {
  const nextDrivers = aiDrivers.map((driver) => ({
    ...driver,
  }));

  const nextMissiles: DrivingMissileState[] = [];

  for (const missile of missiles) {
    const target = nextDrivers.find(
      (driver) => driver.id === missile.targetId,
    );

    if (target === undefined) {
      continue;
    }

    const nextDistance =
      missile.distance
      + missile.speed * deltaSeconds;

    const nextLateralPosition = approach(
      missile.lateralPosition,
      target.lateralPosition,
      MISSILE_LATERAL_RATE * deltaSeconds,
    );

    const crossedTarget =
      missile.distance <= target.distance
      && nextDistance >= target.distance;

    const longitudinalDifference = Math.abs(
      nextDistance - target.distance,
    );

    const lateralDifference = Math.abs(
      nextLateralPosition
      - target.lateralPosition,
    );

    const hitTarget =
      (
        crossedTarget
        || longitudinalDifference
          < MISSILE_HIT_DISTANCE
      )
      && lateralDifference
        < MISSILE_HIT_LATERAL_DISTANCE;

    if (hitTarget) {
      target.speed *= 0.62;
      target.targetSpeed = 0;
      target.spinRemainingMs =
        DRIVING_SPIN_DURATION_MS;
      target.collisionCooldownMs =
        DRIVING_SPIN_DURATION_MS;
      continue;
    }

    if (
      nextDistance - target.distance
      > MISSILE_MAX_TARGET_OVERSHOOT
    ) {
      continue;
    }

    nextMissiles.push({
      ...missile,
      distance: nextDistance,
      lateralPosition: nextLateralPosition,
    });
  }

  return {
    missiles: nextMissiles,
    aiDrivers: nextDrivers,
  };
}

function resolveBananaCollisions(
  playerState: DrivingPlayerState,
  aiStates: readonly DrivingAiState[],
  bananaStates: readonly DrivingBananaState[],
): {
  readonly player: DrivingPlayerState;
  readonly aiDrivers: readonly DrivingAiState[];
  readonly bananas: readonly DrivingBananaState[];
} {
  const player = {
    ...playerState,
  };

  const aiDrivers = aiStates.map((driver) => ({
    ...driver,
  }));

  const bananas = bananaStates.map((banana) => ({
    ...banana,
  }));

  for (const banana of bananas) {
    if (!banana.active) {
      continue;
    }

    const playerLongitudinal = Math.abs(
      player.distance - banana.distance,
    );

    const playerLateral = Math.abs(
      player.lateralPosition
      - banana.lateralPosition,
    );

    if (
      playerLongitudinal
        < BANANA_LONGITUDINAL_DISTANCE
      && playerLateral
        < BANANA_LATERAL_DISTANCE
    ) {
      banana.active = false;
      player.speed *= BANANA_SPEED_MULTIPLIER;
      player.slowdownRemainingMs =
        DRIVING_BANANA_SLOWDOWN_MS;
      continue;
    }

    for (const driver of aiDrivers) {
      const longitudinalDifference = Math.abs(
        driver.distance - banana.distance,
      );

      const lateralDifference = Math.abs(
        driver.lateralPosition
        - banana.lateralPosition,
      );

      if (
        longitudinalDifference
          >= BANANA_LONGITUDINAL_DISTANCE
        || lateralDifference
          >= BANANA_LATERAL_DISTANCE
      ) {
        continue;
      }

      banana.active = false;
      driver.speed *= BANANA_SPEED_MULTIPLIER;
      driver.targetSpeed = 0;
      driver.slowdownRemainingMs =
        DRIVING_BANANA_SLOWDOWN_MS;
      break;
    }
  }

  return {
    player,
    aiDrivers,
    bananas,
  };
}

function createInitialAiDrivers(): readonly DrivingAiState[] {
  return [
    {
      id: "ai-1",
      distance: 70,
      lateralPosition: -0.55,
      speed: 0,
      targetSpeed: AI_PROFILES["ai-1"].cruisingSpeed,
      targetLane: -0.55,
      decisionRemainingMs: 0,
      collisionCooldownMs: 0,
      spinRemainingMs: 0,
      slowdownRemainingMs: 0,
    },
    {
      id: "ai-2",
      distance: 42,
      lateralPosition: 0,
      speed: 0,
      targetSpeed: AI_PROFILES["ai-2"].cruisingSpeed,
      targetLane: 0,
      decisionRemainingMs: 0,
      collisionCooldownMs: 0,
      spinRemainingMs: 0,
      slowdownRemainingMs: 0,
    },
    {
      id: "ai-3",
      distance: 22,
      lateralPosition: 0.55,
      speed: 0,
      targetSpeed: AI_PROFILES["ai-3"].cruisingSpeed,
      targetLane: 0.55,
      decisionRemainingMs: 0,
      collisionCooldownMs: 0,
      spinRemainingMs: 0,
      slowdownRemainingMs: 0,
    },
  ];
}

function getDriverSnapshots(
  player: DrivingPlayerState,
  aiDrivers: readonly DrivingAiState[],
): readonly DrivingDriverSnapshot[] {
  return [
    {
      id: "player",
      distance: player.distance,
      lateralPosition: player.lateralPosition,
      speed: player.speed,
    },
    ...aiDrivers.map((driver) => ({
      id: driver.id,
      distance: driver.distance,
      lateralPosition: driver.lateralPosition,
      speed: driver.speed,
    })),
  ];
}

function findNearestBlocker(
  driver: DrivingAiState,
  drivers: readonly DrivingDriverSnapshot[],
): DrivingDriverSnapshot | null {
  let nearest: DrivingDriverSnapshot | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of drivers) {
    if (candidate.id === driver.id) {
      continue;
    }

    const distanceAhead =
      candidate.distance - driver.distance;

    const lateralDifference = Math.abs(
      candidate.lateralPosition
      - driver.lateralPosition,
    );

    if (
      distanceAhead <= 0
      || distanceAhead > 48
      || lateralDifference > 0.3
    ) {
      continue;
    }

    if (distanceAhead < nearestDistance) {
      nearest = candidate;
      nearestDistance = distanceAhead;
    }
  }

  return nearest;
}

function getLaneClearance(
  lane: number,
  driver: DrivingAiState,
  drivers: readonly DrivingDriverSnapshot[],
): number {
  let clearance = 2;

  for (const candidate of drivers) {
    if (candidate.id === driver.id) {
      continue;
    }

    const longitudinalDifference = Math.abs(
      candidate.distance - driver.distance,
    );

    if (longitudinalDifference > 42) {
      continue;
    }

    clearance = Math.min(
      clearance,
      Math.abs(
        candidate.lateralPosition - lane,
      ),
    );
  }

  return clearance;
}

function findNearestBananaThreat(
  driver: DrivingAiState,
  bananas: readonly DrivingBananaState[],
): DrivingBananaState | null {
  let threat: DrivingBananaState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const banana of bananas) {
    if (!banana.active) {
      continue;
    }

    const distanceAhead =
      banana.distance - driver.distance;

    const lateralDifference = Math.abs(
      banana.lateralPosition
      - driver.lateralPosition,
    );

    if (
      distanceAhead <= 0
      || distanceAhead > AI_BANANA_LOOKAHEAD
      || lateralDifference > 0.34
      || distanceAhead >= nearestDistance
    ) {
      continue;
    }

    threat = banana;
    nearestDistance = distanceAhead;
  }

  return threat;
}

function chooseAiLane(
  driver: DrivingAiState,
  drivers: readonly DrivingDriverSnapshot[],
  bananas: readonly DrivingBananaState[],
  curve: number,
  elapsedMs: number,
): number {
  const bananaThreat = findNearestBananaThreat(
    driver,
    bananas,
  );

  if (bananaThreat !== null) {
    let bestLane = driver.targetLane;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const lane of AI_LANES) {
      const hazardDistance = Math.abs(
        lane - bananaThreat.lateralPosition,
      );

      const clearance = getLaneClearance(
        lane,
        driver,
        drivers,
      );

      const score =
        hazardDistance * 2 + clearance;

      if (score > bestScore) {
        bestLane = lane;
        bestScore = score;
      }
    }

    return bestLane;
  }

  const blocker = findNearestBlocker(
    driver,
    drivers,
  );

  if (blocker !== null) {
    let bestLane = driver.targetLane;
    let bestClearance = -1;

    for (const lane of AI_LANES) {
      const clearance = getLaneClearance(
        lane,
        driver,
        drivers,
      );

      if (clearance > bestClearance) {
        bestLane = lane;
        bestClearance = clearance;
      }
    }

    return bestLane;
  }

  if (Math.abs(curve) >= 0.18) {
    return curve > 0
      ? 0.55
      : -0.55;
  }

  const profile = AI_PROFILES[driver.id];

  const sequenceIndex =
    (
      Math.floor(
        elapsedMs / profile.decisionPeriodMs,
      )
      + profile.sequenceOffset
    )
    % AI_LANES.length;

  return AI_LANES[sequenceIndex] ?? 0;
}

function updateAiDriver(
  driver: DrivingAiState,
  drivers: readonly DrivingDriverSnapshot[],
  bananas: readonly DrivingBananaState[],
  curve: number,
  elapsedMs: number,
  deltaMs: number,
  deltaSeconds: number,
): DrivingAiState {
  const profile = AI_PROFILES[driver.id];

  const collisionCooldownMs = Math.max(
    0,
    driver.collisionCooldownMs - deltaMs,
  );

  const spinRemainingMs = Math.max(
    0,
    driver.spinRemainingMs - deltaMs,
  );

  const slowdownRemainingMs = Math.max(
    0,
    driver.slowdownRemainingMs - deltaMs,
  );

  if (driver.spinRemainingMs > 0) {
    const speed = approach(
      driver.speed,
      0,
      SPIN_MOMENTUM_DECELERATION
        * deltaSeconds,
    );

    return {
      ...driver,
      distance:
        driver.distance + speed * deltaSeconds,
      speed,
      targetSpeed: 0,
      decisionRemainingMs: Math.max(
        0,
        driver.decisionRemainingMs - deltaMs,
      ),
      collisionCooldownMs,
      spinRemainingMs,
      slowdownRemainingMs,
    };
  }

  let decisionRemainingMs =
    driver.decisionRemainingMs - deltaMs;

  let targetLane = driver.targetLane;

  if (decisionRemainingMs <= 0) {
    targetLane = chooseAiLane(
      driver,
      drivers,
      bananas,
      curve,
      elapsedMs,
    );

    decisionRemainingMs =
      profile.decisionPeriodMs;
  }

  const blocker = findNearestBlocker(
    driver,
    drivers,
  );

  let targetSpeed =
    profile.cruisingSpeed
    - Math.abs(curve)
    * AI_CURVE_SPEED_PENALTY;

  if (blocker !== null) {
    const blockerDistance =
      blocker.distance - driver.distance;

    if (blockerDistance < 34) {
      targetSpeed = Math.min(
        targetSpeed,
        Math.max(
          72,
          blocker.speed - 8,
        ),
      );
    }
  }

  if (driver.slowdownRemainingMs > 0) {
    targetSpeed = Math.min(
      targetSpeed,
      BANANA_MAX_SPEED - 8,
    );
  }

  targetSpeed = clamp(
    targetSpeed,
    72,
    AI_MAX_SPEED,
  );

  const acceleration =
    driver.speed < targetSpeed
      ? AI_ACCELERATION
      : AI_DECELERATION;

  const speed = approach(
    driver.speed,
    targetSpeed,
    acceleration * deltaSeconds,
  );

  const lateralPosition = clamp(
    approach(
      driver.lateralPosition,
      targetLane,
      AI_STEERING_RATE * deltaSeconds,
    ),
    -0.82,
    0.82,
  );

  return {
    ...driver,
    distance:
      driver.distance + speed * deltaSeconds,
    lateralPosition,
    speed,
    targetSpeed,
    targetLane,
    decisionRemainingMs,
    collisionCooldownMs,
    spinRemainingMs,
    slowdownRemainingMs,
  };
}

function resolveDriverCollisions(
  playerState: DrivingPlayerState,
  aiStates: readonly DrivingAiState[],
): {
  readonly player: DrivingPlayerState;
  readonly aiDrivers: readonly DrivingAiState[];
} {
  const player = {
    ...playerState,
  };

  const aiDrivers = aiStates.map((driver) => ({
    ...driver,
  }));

  for (const driver of aiDrivers) {
    const longitudinalDifference = Math.abs(
      player.distance - driver.distance,
    );

    const lateralDifference = Math.abs(
      player.lateralPosition
      - driver.lateralPosition,
    );

    if (
      player.collisionCooldownMs > 0
      || driver.collisionCooldownMs > 0
      || longitudinalDifference
        >= CAR_COLLISION_DISTANCE
      || lateralDifference
        >= CAR_COLLISION_LATERAL_DISTANCE
    ) {
      continue;
    }

    const separationDirection =
      player.lateralPosition
        <= driver.lateralPosition
        ? -1
        : 1;

    player.speed *= 0.76;
    driver.speed *= 0.8;

    player.lateralPosition = clamp(
      player.lateralPosition
        + separationDirection * 0.1,
      -DRIVING_SHOULDER_LIMIT,
      DRIVING_SHOULDER_LIMIT,
    );

    driver.lateralPosition = clamp(
      driver.lateralPosition
        - separationDirection * 0.1,
      -0.86,
      0.86,
    );

    player.collisionCooldownMs =
      CAR_COLLISION_COOLDOWN_MS;

    driver.collisionCooldownMs =
      CAR_COLLISION_COOLDOWN_MS;

    player.spinRemainingMs =
      DRIVING_SPIN_DURATION_MS;

    driver.spinRemainingMs =
      DRIVING_SPIN_DURATION_MS;
  }

  for (
    let leftIndex = 0;
    leftIndex < aiDrivers.length;
    leftIndex += 1
  ) {
    const left = aiDrivers[leftIndex];

    if (left === undefined) {
      continue;
    }

    for (
      let rightIndex = leftIndex + 1;
      rightIndex < aiDrivers.length;
      rightIndex += 1
    ) {
      const right = aiDrivers[rightIndex];

      if (right === undefined) {
        continue;
      }

      const longitudinalDifference = Math.abs(
        left.distance - right.distance,
      );

      const lateralDifference = Math.abs(
        left.lateralPosition
        - right.lateralPosition,
      );

      if (
        left.collisionCooldownMs > 0
        || right.collisionCooldownMs > 0
        || longitudinalDifference
          >= CAR_COLLISION_DISTANCE
        || lateralDifference
          >= CAR_COLLISION_LATERAL_DISTANCE
      ) {
        continue;
      }

      const separationDirection =
        left.lateralPosition
          <= right.lateralPosition
          ? -1
          : 1;

      left.speed *= 0.84;
      right.speed *= 0.84;

      left.lateralPosition = clamp(
        left.lateralPosition
          + separationDirection * 0.07,
        -0.86,
        0.86,
      );

      right.lateralPosition = clamp(
        right.lateralPosition
          - separationDirection * 0.07,
        -0.86,
        0.86,
      );

      left.collisionCooldownMs =
        CAR_COLLISION_COOLDOWN_MS;

      right.collisionCooldownMs =
        CAR_COLLISION_COOLDOWN_MS;

      left.spinRemainingMs =
        DRIVING_SPIN_DURATION_MS;

      right.spinRemainingMs =
        DRIVING_SPIN_DURATION_MS;
    }
  }

  return {
    player,
    aiDrivers,
  };
}

export function createInitialDrivingState(): DrivingState {
  return {
    elapsedMs: 0,
    route: "main",
    player: {
      distance: 0,
      lateralPosition: 0,
      speed: 0,
      collisionCooldownMs: 0,
      spinRemainingMs: 0,
      heldItem: null,
      boostRemainingMs: 0,
      slowdownRemainingMs: 0,
    },
    aiDrivers: createInitialAiDrivers(),
    pickups: createInitialPickups(),
    missiles: [],
    bananas: createInitialBananas(),
  };
}

function stepDrivingCore(
  state: DrivingState,
  input: DrivingInput,
  deltaMs: number,
  sampleCurve: DrivingCurveSampler = () => 0,
): DrivingState {
  const normalizedDeltaMs =
    normalizeDeltaMs(deltaMs);

  if (normalizedDeltaMs <= 0) {
    return state;
  }

  const deltaSeconds =
    normalizedDeltaMs / 1_000;

  const recycledPickups = recycleDrivingPickups(
    state.player.distance,
    state.pickups,
  );

  const recycledBananas = recycleDrivingBananas(
    state.player.distance,
    state.bananas,
  );

  const playerIsSpinning =
    state.player.spinRemainingMs > 0;

  const playerIsSlowed =
    state.player.slowdownRemainingMs > 0;

  let heldItem = state.player.heldItem;
  let boostRemainingMs = Math.max(
    0,
    state.player.boostRemainingMs
      - normalizedDeltaMs,
  );

  let missiles = state.missiles;

  if (
    input.useItemPressed === true
    && !playerIsSpinning
  ) {
    if (heldItem === "boost") {
      heldItem = null;
      boostRemainingMs =
        DRIVING_BOOST_DURATION_MS;
    } else if (heldItem === "missile") {
      const targetId =
        getNearestDrivingMissileTarget(
          state.player.distance,
          state.aiDrivers,
        );

      if (targetId !== null) {
        heldItem = null;

        missiles = [
          ...missiles,
          {
            id:
              `missile-${state.elapsedMs}`
              + `-${missiles.length}`,
            targetId,
            distance: state.player.distance + 8,
            lateralPosition:
              state.player.lateralPosition,
            speed: MISSILE_SPEED,
          },
        ];
      }
    }
  }

  const boostActive = boostRemainingMs > 0;

  let playerSpeed =
    playerIsSpinning
      ? approach(
          state.player.speed,
          0,
          SPIN_MOMENTUM_DECELERATION
            * deltaSeconds,
        )
      : updatePlayerSpeed(
          state.player.speed,
          input,
          deltaSeconds,
          boostActive,
          playerIsSlowed,
        );

  const playerLateralPosition =
    playerIsSpinning
      ? state.player.lateralPosition
      : updatePlayerLateralPosition(
          state.player.lateralPosition,
          playerSpeed,
          input.steer,
          deltaSeconds,
          playerIsSlowed
            ? BANANA_STEERING_MULTIPLIER
            : 1,
        );

  playerSpeed = applyShoulderDrag(
    playerSpeed,
    playerLateralPosition,
    deltaSeconds,
  );

  const player: DrivingPlayerState = {
    distance:
      state.player.distance
      + playerSpeed * deltaSeconds,
    lateralPosition: playerLateralPosition,
    speed: playerSpeed,
    collisionCooldownMs: Math.max(
      0,
      state.player.collisionCooldownMs
        - normalizedDeltaMs,
    ),
    spinRemainingMs: Math.max(
      0,
      state.player.spinRemainingMs
        - normalizedDeltaMs,
    ),
    heldItem,
    boostRemainingMs,
    slowdownRemainingMs: Math.max(
      0,
      state.player.slowdownRemainingMs
        - normalizedDeltaMs,
    ),
  };

  const snapshots = getDriverSnapshots(
    player,
    state.aiDrivers,
  );

  const nextElapsedMs =
    state.elapsedMs + normalizedDeltaMs;

  const aiDrivers = state.aiDrivers.map(
    (driver) => updateAiDriver(
      driver,
      snapshots,
      recycledBananas,
      normalizeCurve(
        sampleCurve(driver.distance),
      ),
      nextElapsedMs,
      normalizedDeltaMs,
      deltaSeconds,
    ),
  );

  const collisionResult =
    resolveDriverCollisions(
      player,
      aiDrivers,
    );

  const missileResult = updateDrivingMissiles(
    missiles,
    collisionResult.aiDrivers,
    deltaSeconds,
  );

  const bananaResult = resolveBananaCollisions(
    collisionResult.player,
    missileResult.aiDrivers,
    recycledBananas,
  );

  const pickupResult = collectDrivingPickup(
    bananaResult.player,
    recycledPickups,
  );

  return {
    elapsedMs: nextElapsedMs,
    route: state.route,
    player: pickupResult.player,
    aiDrivers: bananaResult.aiDrivers,
    pickups: pickupResult.pickups,
    missiles: missileResult.missiles,
    bananas: bananaResult.bananas,
  };
}

function enterDrivingSecretRoute(
  state: DrivingState,
): DrivingState {
  const secretEntrySpeed = clamp(
    Math.abs(state.player.speed) * 0.88,
    170,
    DRIVING_MAX_FORWARD_SPEED,
  );

  return {
    ...state,
    route: "secret",
    player: {
      ...state.player,
      distance: 0,
      lateralPosition: 0,
      speed: secretEntrySpeed,
      collisionCooldownMs: 0,
      spinRemainingMs: 0,
      heldItem: null,
      boostRemainingMs: 0,
      slowdownRemainingMs: 0,
    },
    aiDrivers: [],
    pickups: [],
    missiles: [],
    bananas: [],
  };
}

export function stepDriving(
  state: DrivingState,
  input: DrivingInput,
  deltaMs: number,
  sampleCurve: DrivingCurveSampler = () => 0,
): DrivingState {
  const nextState = stepDrivingCore(
    state,
    input,
    deltaMs,
    sampleCurve,
  );

  const enteredSecretRoute =
    state.route === "main"
    && nextState.player.distance
      <= DRIVING_SECRET_TRIGGER_DISTANCE
    && nextState.player.speed < 0;

  return enteredSecretRoute
    ? enterDrivingSecretRoute(nextState)
    : nextState;
}

export function isDrivingPlayerOnShoulder(
  player: DrivingPlayerState,
): boolean {
  return (
    Math.abs(player.lateralPosition)
    > DRIVING_ROAD_EDGE
  );
}

export function getDrivingStandings(
  state: DrivingState,
): readonly DrivingStanding[] {
  const standings: DrivingStanding[] = [
    {
      id: "player",
      distance: state.player.distance,
    },
    ...state.aiDrivers.map(
      (driver): DrivingStanding => ({
        id: driver.id,
        distance: driver.distance,
      }),
    ),
  ];

  standings.sort(
    (left, right) =>
      right.distance - left.distance,
  );

  return standings;
}

export function getDrivingRacePosition(
  state: DrivingState,
): number {
  const standings = getDrivingStandings(state);

  const playerIndex = standings.findIndex(
    (standing) => standing.id === "player",
  );

  return playerIndex < 0
    ? standings.length
    : playerIndex + 1;
}

export function getDrivingRemainingDistance(
  state: DrivingState,
  finishDistance = DRIVING_FINISH_DISTANCE,
): number {
  const mainFinishDistance =
    Number.isFinite(finishDistance)
      ? finishDistance
      : DRIVING_FINISH_DISTANCE;

  const activeFinishDistance =
    state.route === "secret"
      ? DRIVING_SECRET_FINISH_DISTANCE
      : mainFinishDistance;

  return Math.max(
    0,
    activeFinishDistance - state.player.distance,
  );
}

export function getDrivingRaceOutcome(
  state: DrivingState,
  finishDistance = DRIVING_FINISH_DISTANCE,
): DrivingRaceOutcome {
  const mainFinishDistance =
    Number.isFinite(finishDistance)
      ? finishDistance
      : DRIVING_FINISH_DISTANCE;

  const activeFinishDistance =
    state.route === "secret"
      ? DRIVING_SECRET_FINISH_DISTANCE
      : mainFinishDistance;

  const firstFinisher = getDrivingStandings(
    state,
  ).find(
    (standing) =>
      standing.distance >= activeFinishDistance,
  );

  if (firstFinisher === undefined) {
    return "racing";
  }

  return firstFinisher.id === "player"
    ? "player-won"
    : "player-lost";
}
