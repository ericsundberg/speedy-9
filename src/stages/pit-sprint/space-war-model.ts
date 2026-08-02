export type SpaceWarSide = "player" | "opponent";

export type SpaceWarPhase =
  | "countdown"
  | "playing"
  | "round-over"
  | "match-over";

export type SpaceWarOutcome =
  | "playing"
  | "player-won"
  | "player-lost";

export interface SpaceWarShip {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly angleRadians: number;
  readonly alive: boolean;
  readonly fireCooldownMs: number;
}

export interface SpaceWarMissile {
  readonly id: number;
  readonly owner: SpaceWarSide;
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly ageMs: number;
  readonly remainingMs: number;
}

export interface SpaceWarState {
  readonly player: SpaceWarShip;
  readonly opponent: SpaceWarShip;
  readonly missiles: readonly SpaceWarMissile[];
  readonly playerScore: number;
  readonly opponentScore: number;
  readonly phase: SpaceWarPhase;
  readonly phaseRemainingMs: number;
  readonly outcome: SpaceWarOutcome;
  readonly nextMissileId: number;
}

export interface SpaceWarControl {
  readonly turn: number;
  readonly thrust: boolean;
  readonly fire: boolean;
}

export interface SpaceWarInput {
  readonly player: SpaceWarControl;
  readonly opponent: SpaceWarControl;
}

export interface SpaceWarDestruction {
  readonly side: SpaceWarSide;
  readonly x: number;
  readonly y: number;
}

export interface SpaceWarEvents {
  readonly firedBy: readonly SpaceWarSide[];
  readonly destroyed: readonly SpaceWarDestruction[];
  readonly roundResolved: boolean;
  readonly roundWinner: SpaceWarSide | null;
  readonly matchOutcome: SpaceWarOutcome | null;
}

export interface SpaceWarStepResult {
  readonly state: SpaceWarState;
  readonly events: SpaceWarEvents;
}

export const SPACE_WAR_WIDTH = 760;
export const SPACE_WAR_HEIGHT = 480;
export const SPACE_WAR_STAR_X = SPACE_WAR_WIDTH / 2;
export const SPACE_WAR_STAR_Y = SPACE_WAR_HEIGHT / 2;
export const SPACE_WAR_STAR_RADIUS = 24;
export const SPACE_WAR_SHIP_RADIUS = 8;
export const SPACE_WAR_MISSILE_RADIUS = 2;
export const SPACE_WAR_WIN_SCORE = 3;
export const SPACE_WAR_COUNTDOWN_MS = 650;
export const SPACE_WAR_ROUND_OVER_MS = 900;
export const SPACE_WAR_MATCH_OVER_MS = 1_300;

const ROTATION_SPEED_RADIANS = 3.35;
const THRUST_ACCELERATION = 155;
const GRAVITY_STRENGTH = 825_000;
const MAX_GRAVITY_ACCELERATION = 225;
const MIN_GRAVITY_DISTANCE_SQUARED = 2_500;
const MAX_SHIP_SPEED = 315;
const MISSILE_SPEED = 335;
const MISSILE_LIFETIME_MS = 1_050;
const MISSILE_ARMING_MS = 85;
const FIRE_COOLDOWN_MS = 650;
const MAX_SIMULATION_STEP_MS = 12;
const AI_STAR_DANGER_RADIUS = 142;

const NO_CONTROL: SpaceWarControl = {
  turn: 0,
  thrust: false,
  fire: false,
};

function createEmptyEvents(): SpaceWarEvents {
  return {
    firedBy: [],
    destroyed: [],
    roundResolved: false,
    roundWinner: null,
    matchOutcome: null,
  };
}

function createShip(
  x: number,
  y: number,
  angleRadians: number,
): SpaceWarShip {
  return {
    x,
    y,
    velocityX: 0,
    velocityY: 0,
    angleRadians,
    alive: true,
    fireCooldownMs: 0,
  };
}

function createRoundState(
  playerScore: number,
  opponentScore: number,
  nextMissileId: number,
): SpaceWarState {
  return {
    player: createShip(146, SPACE_WAR_STAR_Y, Math.PI / 2),
    opponent: createShip(
      SPACE_WAR_WIDTH - 146,
      SPACE_WAR_STAR_Y,
      -Math.PI / 2,
    ),
    missiles: [],
    playerScore,
    opponentScore,
    phase: "countdown",
    phaseRemainingMs: SPACE_WAR_COUNTDOWN_MS,
    outcome: "playing",
    nextMissileId,
  };
}

export function createInitialSpaceWarState(): SpaceWarState {
  return createRoundState(0, 0, 1);
}

export function wrapSpaceWarCoordinate(
  value: number,
  extent: number,
): number {
  return ((value % extent) + extent) % extent;
}

function shortestWrappedDelta(
  from: number,
  to: number,
  extent: number,
): number {
  const direct = to - from;

  if (direct > extent / 2) {
    return direct - extent;
  }

  if (direct < -extent / 2) {
    return direct + extent;
  }

  return direct;
}

function distanceSquaredWrapped(
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
): number {
  const deltaX = shortestWrappedDelta(
    firstX,
    secondX,
    SPACE_WAR_WIDTH,
  );
  const deltaY = shortestWrappedDelta(
    firstY,
    secondY,
    SPACE_WAR_HEIGHT,
  );

  return deltaX * deltaX + deltaY * deltaY;
}

function normalizeAngle(angleRadians: number): number {
  const fullTurn = Math.PI * 2;
  return ((angleRadians + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function clampMagnitude(
  velocityX: number,
  velocityY: number,
  maximum: number,
): readonly [number, number] {
  const speed = Math.hypot(velocityX, velocityY);

  if (speed <= maximum || speed === 0) {
    return [velocityX, velocityY];
  }

  const scale = maximum / speed;
  return [velocityX * scale, velocityY * scale];
}

function getGravityAcceleration(
  x: number,
  y: number,
): readonly [number, number] {
  const deltaX = SPACE_WAR_STAR_X - x;
  const deltaY = SPACE_WAR_STAR_Y - y;
  const distanceSquared = Math.max(
    MIN_GRAVITY_DISTANCE_SQUARED,
    deltaX * deltaX + deltaY * deltaY,
  );
  const distance = Math.sqrt(distanceSquared);
  const acceleration = Math.min(
    MAX_GRAVITY_ACCELERATION,
    GRAVITY_STRENGTH / distanceSquared,
  );

  return [
    deltaX / distance * acceleration,
    deltaY / distance * acceleration,
  ];
}

function advanceShip(
  ship: SpaceWarShip,
  control: SpaceWarControl,
  deltaSeconds: number,
  deltaMs: number,
): SpaceWarShip {
  if (!ship.alive) {
    return ship;
  }

  const turn = Math.max(-1, Math.min(1, control.turn));
  const angleRadians = normalizeAngle(
    ship.angleRadians
      + turn * ROTATION_SPEED_RADIANS * deltaSeconds,
  );
  const thrust = control.thrust ? THRUST_ACCELERATION : 0;
  const thrustX = Math.sin(angleRadians) * thrust;
  const thrustY = -Math.cos(angleRadians) * thrust;
  const [gravityX, gravityY] = getGravityAcceleration(
    ship.x,
    ship.y,
  );
  const [velocityX, velocityY] = clampMagnitude(
    ship.velocityX + (thrustX + gravityX) * deltaSeconds,
    ship.velocityY + (thrustY + gravityY) * deltaSeconds,
    MAX_SHIP_SPEED,
  );

  return {
    x: wrapSpaceWarCoordinate(
      ship.x + velocityX * deltaSeconds,
      SPACE_WAR_WIDTH,
    ),
    y: wrapSpaceWarCoordinate(
      ship.y + velocityY * deltaSeconds,
      SPACE_WAR_HEIGHT,
    ),
    velocityX,
    velocityY,
    angleRadians,
    alive: true,
    fireCooldownMs: Math.max(
      0,
      ship.fireCooldownMs - deltaMs,
    ),
  };
}

function createMissile(
  ship: SpaceWarShip,
  owner: SpaceWarSide,
  id: number,
): SpaceWarMissile {
  const directionX = Math.sin(ship.angleRadians);
  const directionY = -Math.cos(ship.angleRadians);

  return {
    id,
    owner,
    x: wrapSpaceWarCoordinate(
      ship.x + directionX * (SPACE_WAR_SHIP_RADIUS + 5),
      SPACE_WAR_WIDTH,
    ),
    y: wrapSpaceWarCoordinate(
      ship.y + directionY * (SPACE_WAR_SHIP_RADIUS + 5),
      SPACE_WAR_HEIGHT,
    ),
    velocityX: ship.velocityX + directionX * MISSILE_SPEED,
    velocityY: ship.velocityY + directionY * MISSILE_SPEED,
    ageMs: 0,
    remainingMs: MISSILE_LIFETIME_MS,
  };
}

function fireIfReady(
  ship: SpaceWarShip,
  control: SpaceWarControl,
  owner: SpaceWarSide,
  nextMissileId: number,
): {
  readonly ship: SpaceWarShip;
  readonly missile: SpaceWarMissile | null;
  readonly nextMissileId: number;
} {
  if (!ship.alive || !control.fire || ship.fireCooldownMs > 0) {
    return {
      ship,
      missile: null,
      nextMissileId,
    };
  }

  return {
    ship: {
      ...ship,
      fireCooldownMs: FIRE_COOLDOWN_MS,
    },
    missile: createMissile(ship, owner, nextMissileId),
    nextMissileId: nextMissileId + 1,
  };
}

function advanceMissiles(
  missiles: readonly SpaceWarMissile[],
  deltaSeconds: number,
  deltaMs: number,
): SpaceWarMissile[] {
  const advanced: SpaceWarMissile[] = [];

  for (const missile of missiles) {
    const remainingMs = missile.remainingMs - deltaMs;

    if (remainingMs <= 0) {
      continue;
    }

    advanced.push({
      ...missile,
      x: wrapSpaceWarCoordinate(
        missile.x + missile.velocityX * deltaSeconds,
        SPACE_WAR_WIDTH,
      ),
      y: wrapSpaceWarCoordinate(
        missile.y + missile.velocityY * deltaSeconds,
        SPACE_WAR_HEIGHT,
      ),
      ageMs: missile.ageMs + deltaMs,
      remainingMs,
    });
  }

  return advanced;
}

function shipHitsStar(ship: SpaceWarShip): boolean {
  if (!ship.alive) {
    return false;
  }

  const deltaX = ship.x - SPACE_WAR_STAR_X;
  const deltaY = ship.y - SPACE_WAR_STAR_Y;
  const collisionRadius =
    SPACE_WAR_STAR_RADIUS + SPACE_WAR_SHIP_RADIUS * 0.72;

  return deltaX * deltaX + deltaY * deltaY
    <= collisionRadius * collisionRadius;
}

function shipsCollide(
  player: SpaceWarShip,
  opponent: SpaceWarShip,
): boolean {
  if (!player.alive || !opponent.alive) {
    return false;
  }

  const collisionRadius = SPACE_WAR_SHIP_RADIUS * 1.6;

  return distanceSquaredWrapped(
    player.x,
    player.y,
    opponent.x,
    opponent.y,
  ) <= collisionRadius * collisionRadius;
}

function missileHitsShip(
  missile: SpaceWarMissile,
  ship: SpaceWarShip,
): boolean {
  if (!ship.alive || missile.ageMs < MISSILE_ARMING_MS) {
    return false;
  }

  const collisionRadius =
    SPACE_WAR_SHIP_RADIUS * 0.78 + SPACE_WAR_MISSILE_RADIUS;

  return distanceSquaredWrapped(
    missile.x,
    missile.y,
    ship.x,
    ship.y,
  ) <= collisionRadius * collisionRadius;
}

function destroyShip(ship: SpaceWarShip): SpaceWarShip {
  return ship.alive
    ? {
        ...ship,
        alive: false,
      }
    : ship;
}

function resolveActiveStep(
  state: SpaceWarState,
  input: SpaceWarInput,
  deltaMs: number,
): SpaceWarStepResult {
  const deltaSeconds = deltaMs / 1000;
  let player = advanceShip(
    state.player,
    input.player,
    deltaSeconds,
    deltaMs,
  );
  let opponent = advanceShip(
    state.opponent,
    input.opponent,
    deltaSeconds,
    deltaMs,
  );
  let nextMissileId = state.nextMissileId;
  const firedBy: SpaceWarSide[] = [];
  let missiles = advanceMissiles(
    state.missiles,
    deltaSeconds,
    deltaMs,
  );

  const playerShot = fireIfReady(
    player,
    input.player,
    "player",
    nextMissileId,
  );
  player = playerShot.ship;
  nextMissileId = playerShot.nextMissileId;

  if (playerShot.missile !== null) {
    missiles.push(playerShot.missile);
    firedBy.push("player");
  }

  const opponentShot = fireIfReady(
    opponent,
    input.opponent,
    "opponent",
    nextMissileId,
  );
  opponent = opponentShot.ship;
  nextMissileId = opponentShot.nextMissileId;

  if (opponentShot.missile !== null) {
    missiles.push(opponentShot.missile);
    firedBy.push("opponent");
  }

  let playerDestroyed = shipHitsStar(player);
  let opponentDestroyed = shipHitsStar(opponent);

  if (shipsCollide(player, opponent)) {
    playerDestroyed = true;
    opponentDestroyed = true;
  }

  const survivingMissiles: SpaceWarMissile[] = [];

  for (const missile of missiles) {
    if (
      missile.owner === "player"
      && missileHitsShip(missile, opponent)
    ) {
      opponentDestroyed = true;
      continue;
    }

    if (
      missile.owner === "opponent"
      && missileHitsShip(missile, player)
    ) {
      playerDestroyed = true;
      continue;
    }

    survivingMissiles.push(missile);
  }

  if (playerDestroyed) {
    player = destroyShip(player);
  }

  if (opponentDestroyed) {
    opponent = destroyShip(opponent);
  }

  if (!playerDestroyed && !opponentDestroyed) {
    return {
      state: {
        ...state,
        player,
        opponent,
        missiles: survivingMissiles,
        nextMissileId,
      },
      events: {
        ...createEmptyEvents(),
        firedBy,
      },
    };
  }

  const destroyed: SpaceWarDestruction[] = [];

  if (playerDestroyed) {
    destroyed.push({
      side: "player",
      x: player.x,
      y: player.y,
    });
  }

  if (opponentDestroyed) {
    destroyed.push({
      side: "opponent",
      x: opponent.x,
      y: opponent.y,
    });
  }

  const roundWinner =
    playerDestroyed === opponentDestroyed
      ? null
      : playerDestroyed
        ? "opponent"
        : "player";
  const playerScore =
    state.playerScore + Number(roundWinner === "player");
  const opponentScore =
    state.opponentScore + Number(roundWinner === "opponent");
  const outcome: SpaceWarOutcome =
    playerScore >= SPACE_WAR_WIN_SCORE
      ? "player-won"
      : opponentScore >= SPACE_WAR_WIN_SCORE
        ? "player-lost"
        : "playing";
  const matchOutcome = outcome === "playing" ? null : outcome;

  return {
    state: {
      player,
      opponent,
      missiles: [],
      playerScore,
      opponentScore,
      phase: matchOutcome === null ? "round-over" : "match-over",
      phaseRemainingMs:
        matchOutcome === null
          ? SPACE_WAR_ROUND_OVER_MS
          : SPACE_WAR_MATCH_OVER_MS,
      outcome,
      nextMissileId,
    },
    events: {
      firedBy,
      destroyed,
      roundResolved: true,
      roundWinner,
      matchOutcome,
    },
  };
}

function advanceNonPlayingPhase(
  state: SpaceWarState,
  deltaMs: number,
): SpaceWarStepResult {
  const phaseRemainingMs = Math.max(
    0,
    state.phaseRemainingMs - deltaMs,
  );

  if (phaseRemainingMs > 0 || state.phase === "match-over") {
    return {
      state: {
        ...state,
        phaseRemainingMs,
      },
      events: createEmptyEvents(),
    };
  }

  if (state.phase === "countdown") {
    return {
      state: {
        ...state,
        phase: "playing",
        phaseRemainingMs: 0,
      },
      events: createEmptyEvents(),
    };
  }

  return {
    state: createRoundState(
      state.playerScore,
      state.opponentScore,
      state.nextMissileId,
    ),
    events: createEmptyEvents(),
  };
}

function stepOnce(
  state: SpaceWarState,
  input: SpaceWarInput,
  deltaMs: number,
): SpaceWarStepResult {
  if (state.phase !== "playing") {
    return advanceNonPlayingPhase(state, deltaMs);
  }

  return resolveActiveStep(state, input, deltaMs);
}

export function stepSpaceWar(
  state: SpaceWarState,
  input: SpaceWarInput,
  deltaMs: number,
): SpaceWarStepResult {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return {
      state,
      events: createEmptyEvents(),
    };
  }

  let workingState = state;
  let remainingMs = Math.min(deltaMs, 50);
  const firedBy: SpaceWarSide[] = [];
  const destroyed: SpaceWarDestruction[] = [];
  let roundResolved = false;
  let roundWinner: SpaceWarSide | null = null;
  let matchOutcome: SpaceWarOutcome | null = null;

  while (remainingMs > 0) {
    const stepMs = Math.min(MAX_SIMULATION_STEP_MS, remainingMs);
    const result = stepOnce(workingState, input, stepMs);

    workingState = result.state;
    firedBy.push(...result.events.firedBy);
    destroyed.push(...result.events.destroyed);

    if (result.events.roundResolved) {
      roundResolved = true;
      roundWinner = result.events.roundWinner;
      matchOutcome = result.events.matchOutcome;
      break;
    }

    remainingMs -= stepMs;
  }

  return {
    state: workingState,
    events: {
      firedBy,
      destroyed,
      roundResolved,
      roundWinner,
      matchOutcome,
    },
  };
}

function angleToTarget(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
): number {
  const deltaX = shortestWrappedDelta(
    fromX,
    targetX,
    SPACE_WAR_WIDTH,
  );
  const deltaY = shortestWrappedDelta(
    fromY,
    targetY,
    SPACE_WAR_HEIGHT,
  );

  return Math.atan2(deltaX, -deltaY);
}

export function getSpaceWarAiControl(
  state: SpaceWarState,
): SpaceWarControl {
  if (
    state.phase !== "playing"
    || !state.opponent.alive
    || !state.player.alive
  ) {
    return NO_CONTROL;
  }

  const opponent = state.opponent;
  const player = state.player;
  const starDeltaX = opponent.x - SPACE_WAR_STAR_X;
  const starDeltaY = opponent.y - SPACE_WAR_STAR_Y;
  const starDistance = Math.hypot(starDeltaX, starDeltaY);
  let targetX = player.x + player.velocityX * 0.24;
  let targetY = player.y + player.velocityY * 0.24;

  if (starDistance < AI_STAR_DANGER_RADIUS) {
    const safeDistance = Math.max(1, starDistance);
    targetX = opponent.x + starDeltaX / safeDistance * 220;
    targetY = opponent.y + starDeltaY / safeDistance * 220;
  }

  const desiredAngle = angleToTarget(
    opponent.x,
    opponent.y,
    targetX,
    targetY,
  );
  const angleDifference = normalizeAngle(
    desiredAngle - opponent.angleRadians,
  );
  const playerDistance = Math.sqrt(
    distanceSquaredWrapped(
      opponent.x,
      opponent.y,
      player.x,
      player.y,
    ),
  );
  const speed = Math.hypot(
    opponent.velocityX,
    opponent.velocityY,
  );

  return {
    turn:
      Math.abs(angleDifference) < 0.055
        ? 0
        : Math.sign(angleDifference),
    thrust:
      starDistance < AI_STAR_DANGER_RADIUS + 35
      || speed < 58
      || playerDistance > 330,
    fire:
      Math.abs(angleDifference) < 0.13
      && playerDistance < 440
      && opponent.fireCooldownMs <= 0,
  };
}
