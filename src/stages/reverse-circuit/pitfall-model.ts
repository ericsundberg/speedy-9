export const PITFALL_VIEW_WIDTH = 760;
export const PITFALL_VIEW_HEIGHT = 480;
export const PITFALL_GROUND_Y = 390;
export const PITFALL_PLAYER_WIDTH = 18;
export const PITFALL_PLAYER_HEIGHT = 34;
export const PITFALL_ROOM_COUNT = 4;
export const PITFALL_INITIAL_LIVES = 3;
export const PITFALL_DEATH_PENALTY_MS = 2_000;

const PLAYER_SPEED = 190;
const JUMP_VELOCITY = 405;
const GRAVITY_ACCELERATION = 980;
const MAX_FALL_SPEED = 620;
const MAX_SIMULATION_STEP_MS = 8;
const DEATH_DISPLAY_MS = 620;
const MATCH_DISPLAY_MS = 1_100;
const VINE_GRAB_RADIUS = 36;
const VINE_RELEASE_LOCKOUT_MS = 520;

const ROOM_START_X = 42;
const VINE_ANCHOR_X = 390;
const VINE_ANCHOR_Y = 82;
const VINE_LENGTH = 255;

export const PITFALL_PLATFORM_X = 344;
export const PITFALL_PLATFORM_WIDTH = 72;
export const PITFALL_PLATFORM_STABLE_MS = 700;
export const PITFALL_PLATFORM_WARNING_MS = 350;

const PITFALL_PLATFORM_SINK_MS = 450;
const PITFALL_PLATFORM_RESET_MS = 500;
const PITFALL_PLATFORM_MAX_SINK = 68;

export type PitfallPhase =
  | "playing"
  | "death"
  | "won"
  | "lost";

export interface PitfallPoint {
  readonly x: number;
  readonly y: number;
}

export interface PitfallRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PitfallGroundSegment {
  readonly left: number;
  readonly right: number;
}

export interface PitfallLog {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface PitfallCrocodile {
  readonly x: number;
  readonly width: number;
  readonly closed: boolean;
}

export interface PitfallSinkingPlatform {
  readonly x: number;
  readonly width: number;
  readonly topY: number;
  readonly visible: boolean;
  readonly warning: boolean;
  readonly sinking: boolean;
}

export interface PitfallPlayer {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly grounded: boolean;
  readonly attachedToVine: boolean;
  readonly vineLockoutMs: number;
  readonly facing: -1 | 1;
}

export interface PitfallState {
  readonly player: PitfallPlayer;
  readonly roomIndex: number;
  readonly roomTimeMs: number;
  readonly platformTimerMs: number;
  readonly lives: number;
  readonly treasureCollected: boolean;
  readonly phase: PitfallPhase;
  readonly phaseRemainingMs: number;
  readonly complete: boolean;
  readonly failed: boolean;
}

export interface PitfallInput {
  readonly left: boolean;
  readonly right: boolean;
  readonly jumpPressed: boolean;
}

export interface PitfallEvents {
  readonly jumped: boolean;
  readonly landed: boolean;
  readonly vineGrabbed: boolean;
  readonly treasureCollected: boolean;
  readonly roomChanged: boolean;
  readonly died: boolean;
  readonly won: boolean;
  readonly lost: boolean;
}

export interface PitfallStepResult {
  readonly state: PitfallState;
  readonly events: PitfallEvents;
}

export const PITFALL_TREASURE_RECT: PitfallRect = {
  x: 586,
  y: PITFALL_GROUND_Y - 42,
  width: 30,
  height: 42,
};

function createEvents(): PitfallEvents {
  return {
    jumped: false,
    landed: false,
    vineGrabbed: false,
    treasureCollected: false,
    roomChanged: false,
    died: false,
    won: false,
    lost: false,
  };
}

function mergeEvents(
  first: PitfallEvents,
  second: PitfallEvents,
): PitfallEvents {
  return {
    jumped: first.jumped || second.jumped,
    landed: first.landed || second.landed,
    vineGrabbed:
      first.vineGrabbed || second.vineGrabbed,
    treasureCollected:
      first.treasureCollected
      || second.treasureCollected,
    roomChanged:
      first.roomChanged || second.roomChanged,
    died: first.died || second.died,
    won: first.won || second.won,
    lost: first.lost || second.lost,
  };
}

function createPlayer(): PitfallPlayer {
  return {
    x: ROOM_START_X,
    y: PITFALL_GROUND_Y - PITFALL_PLAYER_HEIGHT,
    velocityX: 0,
    velocityY: 0,
    grounded: true,
    attachedToVine: false,
    vineLockoutMs: 0,
    facing: 1,
  };
}

export function createInitialPitfallState(): PitfallState {
  return {
    player: createPlayer(),
    roomIndex: 0,
    roomTimeMs: 0,
    platformTimerMs: 0,
    lives: PITFALL_INITIAL_LIVES,
    treasureCollected: false,
    phase: "playing",
    phaseRemainingMs: 0,
    complete: false,
    failed: false,
  };
}

function playerRect(
  player: PitfallPlayer,
): PitfallRect {
  return {
    x: player.x,
    y: player.y,
    width: PITFALL_PLAYER_WIDTH,
    height: PITFALL_PLAYER_HEIGHT,
  };
}

function rectsIntersect(
  first: PitfallRect,
  second: PitfallRect,
): boolean {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
}

function circleIntersectsRect(
  x: number,
  y: number,
  radius: number,
  rect: PitfallRect,
): boolean {
  const nearestX = Math.max(
    rect.x,
    Math.min(x, rect.x + rect.width),
  );

  const nearestY = Math.max(
    rect.y,
    Math.min(y, rect.y + rect.height),
  );

  const deltaX = x - nearestX;
  const deltaY = y - nearestY;

  return (
    deltaX * deltaX + deltaY * deltaY
    <= radius * radius
  );
}

export function getPitfallVineGrip(
  roomTimeMs: number,
): PitfallPoint {
  const angle =
    Math.sin(roomTimeMs / 880) * 0.87;

  return {
    x:
      VINE_ANCHOR_X
      + Math.sin(angle) * VINE_LENGTH,
    y:
      VINE_ANCHOR_Y
      + Math.cos(angle) * VINE_LENGTH,
  };
}

export function getPitfallRollingLogs(
  roomTimeMs: number,
): readonly PitfallLog[] {
  const travel =
    roomTimeMs * 0.115 % 900;

  return [0, 300, 600].map((offset) => ({
    x:
      PITFALL_VIEW_WIDTH + 70
      - ((travel + offset) % 900),
    y: PITFALL_GROUND_Y - 14,
    radius: 14,
  }));
}

export function getPitfallCrocodiles(
  roomTimeMs: number,
): readonly PitfallCrocodile[] {
  return [242, 446].map(
    (x, index) => ({
      x,
      width: 72,
      closed:
        Math.floor(
          (roomTimeMs + index * 420) / 760,
        ) % 2 === 0,
    }),
  );
}

export function getPitfallSinkingPlatform(
  timerMs: number,
): PitfallSinkingPlatform {
  const warningStart =
    PITFALL_PLATFORM_STABLE_MS;

  const sinkStart =
    warningStart
    + PITFALL_PLATFORM_WARNING_MS;

  const sinkEnd =
    sinkStart
    + PITFALL_PLATFORM_SINK_MS;

  const resetEnd =
    sinkEnd
    + PITFALL_PLATFORM_RESET_MS;

  let topY = PITFALL_GROUND_Y;

  if (
    timerMs >= sinkStart
    && timerMs < sinkEnd
  ) {
    const progress =
      (timerMs - sinkStart)
      / PITFALL_PLATFORM_SINK_MS;

    topY +=
      progress * PITFALL_PLATFORM_MAX_SINK;
  } else if (timerMs >= sinkEnd) {
    topY += PITFALL_PLATFORM_MAX_SINK;
  }

  return {
    x: PITFALL_PLATFORM_X,
    width: PITFALL_PLATFORM_WIDTH,
    topY,
    visible:
      timerMs < sinkEnd
      || timerMs >= resetEnd,
    warning:
      timerMs >= warningStart
      && timerMs < sinkStart,
    sinking:
      timerMs >= sinkStart
      && timerMs < sinkEnd,
  };
}

export function getPitfallScorpionX(
  roomTimeMs: number,
): number {
  const travel = roomTimeMs * 0.14 % 440;
  const offset =
    travel <= 220
      ? travel
      : 440 - travel;

  return 260 + offset;
}

export function getPitfallGroundSegments(
  roomIndex: number,
  roomTimeMs: number,
): readonly PitfallGroundSegment[] {
  if (roomIndex === 1) {
    return [
      { left: 0, right: 242 },
      { left: 518, right: PITFALL_VIEW_WIDTH },
    ];
  }

  if (roomIndex === 2) {
    const crocodileSegments =
      getPitfallCrocodiles(roomTimeMs)
        .filter((crocodile) => crocodile.closed)
        .map((crocodile) => ({
          left: crocodile.x,
          right: crocodile.x + crocodile.width,
        }));

    return [
      { left: 0, right: 222 },
      ...crocodileSegments,
      { left: 538, right: PITFALL_VIEW_WIDTH },
    ];
  }

  return [
    {
      left: 0,
      right: PITFALL_VIEW_WIDTH,
    },
  ];
}

function getSupportSurfaceY(
  roomIndex: number,
  roomTimeMs: number,
  platformTimerMs: number,
  centerX: number,
): number | null {
  const regularGround =
    getPitfallGroundSegments(
      roomIndex,
      roomTimeMs,
    ).some(
      (segment) =>
        centerX >= segment.left
        && centerX <= segment.right,
    );

  if (regularGround) {
    return PITFALL_GROUND_Y;
  }

  if (roomIndex !== 2) {
    return null;
  }

  const platform =
    getPitfallSinkingPlatform(
      platformTimerMs,
    );

  if (
    !platform.visible
    || centerX < platform.x
    || centerX > platform.x + platform.width
  ) {
    return null;
  }

  return platform.topY;
}

function playerStandsOnSinkingPlatform(
  state: PitfallState,
): boolean {
  if (
    state.roomIndex !== 2
    || !state.player.grounded
  ) {
    return false;
  }

  const platform =
    getPitfallSinkingPlatform(
      state.platformTimerMs,
    );

  if (!platform.visible) {
    return false;
  }

  const centerX =
    state.player.x
    + PITFALL_PLAYER_WIDTH / 2;

  const playerBottom =
    state.player.y
    + PITFALL_PLAYER_HEIGHT;

  return (
    centerX >= platform.x
    && centerX <= platform.x + platform.width
    && Math.abs(
      playerBottom - platform.topY,
    ) <= 5
  );
}

function advancePlatformTimer(
  state: PitfallState,
  deltaMs: number,
): number {
  const sinkStart =
    PITFALL_PLATFORM_STABLE_MS
    + PITFALL_PLATFORM_WARNING_MS;

  const fullCycle =
    sinkStart
    + PITFALL_PLATFORM_SINK_MS
    + PITFALL_PLATFORM_RESET_MS;

  let timerMs = state.platformTimerMs;

  if (timerMs >= sinkStart) {
    timerMs += deltaMs;
  } else if (
    playerStandsOnSinkingPlatform(state)
  ) {
    timerMs += deltaMs;
  } else {
    timerMs = 0;
  }

  if (timerMs >= fullCycle) {
    return 0;
  }

  return timerMs;
}

function resetCurrentRoom(
  state: PitfallState,
): PitfallState {
  return {
    ...state,
    player: createPlayer(),
    roomTimeMs: 0,
    platformTimerMs: 0,
    phase: "playing",
    phaseRemainingMs: 0,
  };
}

function advanceNonPlayingPhase(
  state: PitfallState,
  deltaMs: number,
): PitfallStepResult {
  const remainingMs = Math.max(
    0,
    state.phaseRemainingMs - deltaMs,
  );

  if (remainingMs > 0) {
    return {
      state: {
        ...state,
        phaseRemainingMs: remainingMs,
      },
      events: createEvents(),
    };
  }

  if (state.phase === "death") {
    return {
      state: resetCurrentRoom(state),
      events: createEvents(),
    };
  }

  if (state.phase === "won") {
    return {
      state: {
        ...state,
        phaseRemainingMs: 0,
        complete: true,
      },
      events: createEvents(),
    };
  }

  if (state.phase === "lost") {
    return {
      state: {
        ...state,
        phaseRemainingMs: 0,
        failed: true,
      },
      events: createEvents(),
    };
  }

  return {
    state,
    events: createEvents(),
  };
}

function killPlayer(
  state: PitfallState,
): PitfallStepResult {
  const lives = Math.max(0, state.lives - 1);
  const lost = lives === 0;

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        velocityX: 0,
        velocityY: 0,
        grounded: false,
        attachedToVine: false,
      },
      lives,
      phase: lost ? "lost" : "death",
      phaseRemainingMs:
        lost
          ? MATCH_DISPLAY_MS
          : DEATH_DISPLAY_MS,
    },
    events: {
      ...createEvents(),
      died: true,
      lost,
    },
  };
}

function playerHitsHazard(
  state: PitfallState,
): boolean {
  const rect = playerRect(state.player);

  if (
    state.player.y
    > PITFALL_VIEW_HEIGHT + PITFALL_PLAYER_HEIGHT
  ) {
    return true;
  }

  if (state.roomIndex === 0) {
    return getPitfallRollingLogs(
      state.roomTimeMs,
    ).some((log) =>
      circleIntersectsRect(
        log.x,
        log.y,
        log.radius,
        rect,
      ),
    );
  }

  if (state.roomIndex === 2) {
    return getPitfallCrocodiles(
      state.roomTimeMs,
    ).some((crocodile) => {
      if (crocodile.closed) {
        return false;
      }

      return rectsIntersect(
        rect,
        {
          x: crocodile.x,
          y: PITFALL_GROUND_Y - 24,
          width: crocodile.width,
          height: 40,
        },
      );
    });
  }

  if (state.roomIndex === 3) {
    return rectsIntersect(
      rect,
      {
        x: getPitfallScorpionX(
          state.roomTimeMs,
        ),
        y: PITFALL_GROUND_Y - 18,
        width: 38,
        height: 18,
      },
    );
  }

  return false;
}

function advancePlayingSubstep(
  state: PitfallState,
  input: PitfallInput,
  deltaMs: number,
): PitfallStepResult {
  const deltaSeconds = deltaMs / 1000;
  const nextRoomTimeMs =
    state.roomTimeMs + deltaMs;

  const nextPlatformTimerMs =
    advancePlatformTimer(
      state,
      deltaMs,
    );

  const direction =
    Number(input.right) - Number(input.left);

  const facing: -1 | 1 =
    direction < 0
      ? -1
      : direction > 0
        ? 1
        : state.player.facing;

  let player: PitfallPlayer = {
    ...state.player,
    facing,
    vineLockoutMs: Math.max(
      0,
      state.player.vineLockoutMs - deltaMs,
    ),
  };

  let events = createEvents();

  if (player.attachedToVine) {
    const grip = getPitfallVineGrip(
      nextRoomTimeMs,
    );

    if (input.jumpPressed) {
      const futureGrip = getPitfallVineGrip(
        nextRoomTimeMs + 16,
      );

      const tangentVelocityX =
        (futureGrip.x - grip.x) / 0.016;

      const tangentVelocityY =
        (futureGrip.y - grip.y) / 0.016;

      const releaseDirection: -1 | 1 =
        direction < 0
          ? -1
          : direction > 0
            ? 1
            : tangentVelocityX < 0
              ? -1
              : 1;

      player = {
        ...player,
        x:
          grip.x
          - PITFALL_PLAYER_WIDTH / 2
          + releaseDirection * 10,
        y:
          grip.y
          - PITFALL_PLAYER_HEIGHT / 2
          - 6,
        velocityX:
          tangentVelocityX
          + releaseDirection * 95,
        velocityY: Math.max(
          -360,
          tangentVelocityY - 210,
        ),
        grounded: false,
        attachedToVine: false,
        vineLockoutMs: VINE_RELEASE_LOCKOUT_MS,
        facing: releaseDirection,
      };

      events = {
        ...events,
        jumped: true,
      };
    } else {
      const futureGrip = getPitfallVineGrip(
        nextRoomTimeMs + 16,
      );

      player = {
        ...player,
        x: grip.x - PITFALL_PLAYER_WIDTH / 2,
        y: grip.y - PITFALL_PLAYER_HEIGHT / 2,
        velocityX:
          (futureGrip.x - grip.x) / 0.016,
        velocityY:
          (futureGrip.y - grip.y) / 0.016,
        grounded: false,
      };
    }
  } else {
    const wasGrounded = player.grounded;
    let velocityY = player.velocityY;

    if (input.jumpPressed && wasGrounded) {
      velocityY = -JUMP_VELOCITY;
      events = {
        ...events,
        jumped: true,
      };
    }

    velocityY = Math.min(
      MAX_FALL_SPEED,
      velocityY
      + GRAVITY_ACCELERATION * deltaSeconds,
    );

    const velocityX = direction * PLAYER_SPEED;
    const proposedX =
      player.x + velocityX * deltaSeconds;
    let proposedY =
      player.y + velocityY * deltaSeconds;

    const previousBottom =
      player.y + PITFALL_PLAYER_HEIGHT;

    const nextBottom =
      proposedY + PITFALL_PLAYER_HEIGHT;

    const centerX =
      proposedX + PITFALL_PLAYER_WIDTH / 2;

    const supportY =
      getSupportSurfaceY(
        state.roomIndex,
        nextRoomTimeMs,
        nextPlatformTimerMs,
        centerX,
      );

    let grounded = false;
    let resolvedVelocityY = velocityY;

    if (
      supportY !== null
      && velocityY >= 0
      && previousBottom <= supportY + 3
      && nextBottom >= supportY
    ) {
      proposedY =
        supportY - PITFALL_PLAYER_HEIGHT;

      resolvedVelocityY = 0;
      grounded = true;

      if (!wasGrounded) {
        events = {
          ...events,
          landed: true,
        };
      }
    }

    player = {
      ...player,
      x: proposedX,
      y: proposedY,
      velocityX,
      velocityY: resolvedVelocityY,
      grounded,
    };
  }

  let nextState: PitfallState = {
    ...state,
    player,
    roomTimeMs: nextRoomTimeMs,
    platformTimerMs: nextPlatformTimerMs,
  };

  if (
    nextState.roomIndex === 1
    && !player.grounded
    && !player.attachedToVine
    && player.vineLockoutMs <= 0
  ) {
    const grip = getPitfallVineGrip(
      nextRoomTimeMs,
    );

    const playerCenterX =
      player.x + PITFALL_PLAYER_WIDTH / 2;

    const playerCenterY =
      player.y + PITFALL_PLAYER_HEIGHT / 2;

    if (
      Math.hypot(
        playerCenterX - grip.x,
        playerCenterY - grip.y,
      ) <= VINE_GRAB_RADIUS
    ) {
      nextState = {
        ...nextState,
        player: {
          ...player,
          x: grip.x - PITFALL_PLAYER_WIDTH / 2,
          y: grip.y - PITFALL_PLAYER_HEIGHT / 2,
          velocityX: 0,
          velocityY: 0,
          attachedToVine: true,
          grounded: false,
        },
      };

      events = {
        ...events,
        vineGrabbed: true,
      };
    }
  }

  if (
    nextState.roomIndex === 3
    && !nextState.treasureCollected
    && rectsIntersect(
      playerRect(nextState.player),
      PITFALL_TREASURE_RECT,
    )
  ) {
    nextState = {
      ...nextState,
      treasureCollected: true,
    };

    events = {
      ...events,
      treasureCollected: true,
    };
  }

  if (playerHitsHazard(nextState)) {
    return killPlayer(nextState);
  }

  if (
    nextState.player.x + PITFALL_PLAYER_WIDTH
    >= PITFALL_VIEW_WIDTH - 4
  ) {
    if (
      nextState.roomIndex
      === PITFALL_ROOM_COUNT - 1
    ) {
      if (nextState.treasureCollected) {
        return {
          state: {
            ...nextState,
            player: {
              ...nextState.player,
              velocityX: 0,
              velocityY: 0,
            },
            phase: "won",
            phaseRemainingMs: MATCH_DISPLAY_MS,
          },
          events: {
            ...events,
            won: true,
          },
        };
      }
    } else {
      return {
        state: {
          ...nextState,
          roomIndex: nextState.roomIndex + 1,
          roomTimeMs: 0,
          platformTimerMs: 0,
          player: createPlayer(),
        },
        events: {
          ...events,
          roomChanged: true,
        },
      };
    }
  }

  if (
    nextState.player.x <= 0
    && nextState.roomIndex > 0
  ) {
    return {
      state: {
        ...nextState,
        roomIndex: nextState.roomIndex - 1,
        roomTimeMs: 0,
        platformTimerMs: 0,
        player: {
          ...createPlayer(),
          x:
            PITFALL_VIEW_WIDTH
            - PITFALL_PLAYER_WIDTH
            - 42,
          facing: -1,
        },
      },
      events: {
        ...events,
        roomChanged: true,
      },
    };
  }

  return {
    state: {
      ...nextState,
      player: {
        ...nextState.player,
        x: Math.max(
          -PITFALL_PLAYER_WIDTH,
          Math.min(
            PITFALL_VIEW_WIDTH,
            nextState.player.x,
          ),
        ),
      },
    },
    events,
  };
}

export function stepPitfall(
  state: PitfallState,
  input: PitfallInput,
  deltaMs: number,
): PitfallStepResult {
  if (
    !Number.isFinite(deltaMs)
    || deltaMs < 0
  ) {
    throw new RangeError(
      "Pitfall delta time must be finite and non-negative.",
    );
  }

  if (deltaMs === 0) {
    return {
      state,
      events: createEvents(),
    };
  }

  if (state.complete || state.failed) {
    return {
      state,
      events: createEvents(),
    };
  }

  if (state.phase !== "playing") {
    return advanceNonPlayingPhase(
      state,
      deltaMs,
    );
  }

  let nextState = state;
  let events = createEvents();
  let remainingMs = deltaMs;
  let jumpPressed = input.jumpPressed;

  while (
    remainingMs > 0
    && nextState.phase === "playing"
  ) {
    const stepMs = Math.min(
      MAX_SIMULATION_STEP_MS,
      remainingMs,
    );

    const result = advancePlayingSubstep(
      nextState,
      {
        ...input,
        jumpPressed,
      },
      stepMs,
    );

    nextState = result.state;
    events = mergeEvents(
      events,
      result.events,
    );

    jumpPressed = false;
    remainingMs -= stepMs;
  }

  return {
    state: nextState,
    events,
  };
}
