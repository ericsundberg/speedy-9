import { clamp } from "../../core/geometry";
import type { RandomSource } from "../../core/random";

export const PONG_FIELD_WIDTH = 760;
export const PONG_FIELD_HEIGHT = 480;
export const PONG_PLAYFIELD_INSET = 6;
export const PONG_PADDLE_WIDTH = 16;
export const PONG_PADDLE_HEIGHT = 96;
export const PONG_PADDLE_MARGIN = 36;
export const PONG_BALL_SIZE = 14;
export const PONG_WIN_SCORE = 3;
export const PONG_SERVE_DELAY_MS = 450;
export const PONG_PLAYER_SPEED = 430;
export const PONG_OPPONENT_SPEED = 220;
export const PONG_OPPONENT_REACTION_DEAD_ZONE = 16;
export const PONG_BALL_SPEED = 300;
export const PONG_BALL_SPEED_GAIN = 18;
export const PONG_MAX_BALL_SPEED = 470;

const MAX_BOUNCE_ANGLE = Math.PI / 3;
const MAX_STEP_MS = 8;

export type PongSide = "player" | "opponent";

export type PongOutcome =
  | "playing"
  | "player-won"
  | "player-lost";

export interface PongState {
  readonly playerY: number;
  readonly opponentY: number;
  readonly ballX: number;
  readonly ballY: number;
  readonly ballVelocityX: number;
  readonly ballVelocityY: number;
  readonly playerScore: number;
  readonly opponentScore: number;
  readonly serveRemainingMs: number;
  readonly outcome: PongOutcome;
}

export interface PongInput {
  readonly playerAxis: number;
}

export interface PongDirectionChange {
  readonly x: number;
  readonly y: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

export interface PongStepEvents {
  readonly directionChanges: readonly PongDirectionChange[];
  readonly scoredBy: PongSide | null;
}

export interface PongStepResult {
  readonly state: PongState;
  readonly events: PongStepEvents;
}

interface MutablePongState {
  playerY: number;
  opponentY: number;
  ballX: number;
  ballY: number;
  ballVelocityX: number;
  ballVelocityY: number;
  playerScore: number;
  opponentScore: number;
  serveRemainingMs: number;
  outcome: PongOutcome;
}

function paddleStartY(): number {
  return (PONG_FIELD_HEIGHT - PONG_PADDLE_HEIGHT) / 2;
}

function ballStartX(): number {
  return (PONG_FIELD_WIDTH - PONG_BALL_SIZE) / 2;
}

function ballStartY(): number {
  return (PONG_FIELD_HEIGHT - PONG_BALL_SIZE) / 2;
}

function maximumPaddleY(): number {
  return (
    PONG_FIELD_HEIGHT
    - PONG_PLAYFIELD_INSET
    - PONG_PADDLE_HEIGHT
  );
}

function maximumBallY(): number {
  return (
    PONG_FIELD_HEIGHT
    - PONG_PLAYFIELD_INSET
    - PONG_BALL_SIZE
  );
}

function centerBall(state: MutablePongState): void {
  state.ballX = ballStartX();
  state.ballY = ballStartY();
}

function randomServeVelocity(
  random: RandomSource,
  horizontalDirection: -1 | 1,
): readonly [number, number] {
  const angle = (random.next() - 0.5) * 0.7;

  return [
    Math.cos(angle) * PONG_BALL_SPEED * horizontalDirection,
    Math.sin(angle) * PONG_BALL_SPEED,
  ];
}

function resetBall(
  state: MutablePongState,
  random: RandomSource,
  horizontalDirection: -1 | 1,
): void {
  const [velocityX, velocityY] = randomServeVelocity(
    random,
    horizontalDirection,
  );

  centerBall(state);
  state.ballVelocityX = velocityX;
  state.ballVelocityY = velocityY;
  state.serveRemainingMs = PONG_SERVE_DELAY_MS;
}

function cloneMutableState(state: PongState): MutablePongState {
  return {
    ...state,
  };
}

function freezeState(state: MutablePongState): PongState {
  return {
    ...state,
  };
}

function ballCenterX(state: MutablePongState): number {
  return state.ballX + PONG_BALL_SIZE / 2;
}

function ballCenterY(state: MutablePongState): number {
  return state.ballY + PONG_BALL_SIZE / 2;
}

function recordDirectionChange(
  state: MutablePongState,
  directionChanges: PongDirectionChange[],
): void {
  directionChanges.push({
    x: ballCenterX(state),
    y: ballCenterY(state),
    velocityX: state.ballVelocityX,
    velocityY: state.ballVelocityY,
  });
}

function movePaddles(
  state: MutablePongState,
  playerAxis: number,
  deltaSeconds: number,
): void {
  state.playerY = clamp(
    state.playerY
      + clamp(playerAxis, -1, 1)
      * PONG_PLAYER_SPEED
      * deltaSeconds,
    PONG_PLAYFIELD_INSET,
    maximumPaddleY(),
  );

  const opponentCenter =
    state.opponentY + PONG_PADDLE_HEIGHT / 2;

  const targetCenter =
    state.ballVelocityX > 0
      ? ballCenterY(state)
      : PONG_FIELD_HEIGHT / 2;

  const difference = targetCenter - opponentCenter;

  const movement =
    Math.abs(difference)
      <= PONG_OPPONENT_REACTION_DEAD_ZONE
      ? 0
      : clamp(
          difference,
          -PONG_OPPONENT_SPEED * deltaSeconds,
          PONG_OPPONENT_SPEED * deltaSeconds,
        );

  state.opponentY = clamp(
    state.opponentY + movement,
    PONG_PLAYFIELD_INSET,
    maximumPaddleY(),
  );
}

function resolvePaddleBounce(
  state: MutablePongState,
  paddleY: number,
  horizontalDirection: -1 | 1,
  directionChanges: PongDirectionChange[],
): void {
  const paddleCenter = paddleY + PONG_PADDLE_HEIGHT / 2;

  const relativeImpact = clamp(
    (ballCenterY(state) - paddleCenter)
      / (PONG_PADDLE_HEIGHT / 2),
    -1,
    1,
  );

  const bounceAngle = relativeImpact * MAX_BOUNCE_ANGLE;

  const currentSpeed = Math.hypot(
    state.ballVelocityX,
    state.ballVelocityY,
  );

  const nextSpeed = Math.min(
    PONG_MAX_BALL_SPEED,
    currentSpeed + PONG_BALL_SPEED_GAIN,
  );

  state.ballVelocityX =
    Math.cos(bounceAngle)
    * nextSpeed
    * horizontalDirection;

  state.ballVelocityY = Math.sin(bounceAngle) * nextSpeed;

  recordDirectionChange(state, directionChanges);
}

function ballOverlapsPaddle(
  state: MutablePongState,
  paddleX: number,
  paddleY: number,
): boolean {
  return (
    state.ballX < paddleX + PONG_PADDLE_WIDTH
    && state.ballX + PONG_BALL_SIZE > paddleX
    && state.ballY < paddleY + PONG_PADDLE_HEIGHT
    && state.ballY + PONG_BALL_SIZE > paddleY
  );
}

function scorePoint(
  state: MutablePongState,
  scorer: PongSide,
  random: RandomSource,
): void {
  if (scorer === "player") {
    state.playerScore += 1;
  } else {
    state.opponentScore += 1;
  }

  if (state.playerScore >= PONG_WIN_SCORE) {
    centerBall(state);
    state.outcome = "player-won";
    state.ballVelocityX = 0;
    state.ballVelocityY = 0;
    state.serveRemainingMs = 0;
    return;
  }

  if (state.opponentScore >= PONG_WIN_SCORE) {
    centerBall(state);
    state.outcome = "player-lost";
    state.ballVelocityX = 0;
    state.ballVelocityY = 0;
    state.serveRemainingMs = 0;
    return;
  }

  resetBall(
    state,
    random,
    scorer === "player" ? 1 : -1,
  );
}

function advanceSubstep(
  state: MutablePongState,
  playerAxis: number,
  deltaMs: number,
  random: RandomSource,
  directionChanges: PongDirectionChange[],
): PongSide | null {
  const deltaSeconds = deltaMs / 1_000;

  movePaddles(state, playerAxis, deltaSeconds);

  if (state.serveRemainingMs > 0) {
    const previousRemainingMs = state.serveRemainingMs;

    state.serveRemainingMs = Math.max(
      0,
      state.serveRemainingMs - deltaMs,
    );

    if (
      previousRemainingMs > 0
      && state.serveRemainingMs === 0
    ) {
      recordDirectionChange(state, directionChanges);
    }

    return null;
  }

  state.ballX += state.ballVelocityX * deltaSeconds;
  state.ballY += state.ballVelocityY * deltaSeconds;

  if (
    state.ballY <= PONG_PLAYFIELD_INSET
    && state.ballVelocityY < 0
  ) {
    state.ballY = PONG_PLAYFIELD_INSET;
    state.ballVelocityY = Math.abs(state.ballVelocityY);
    recordDirectionChange(state, directionChanges);
  }

  if (
    state.ballY >= maximumBallY()
    && state.ballVelocityY > 0
  ) {
    state.ballY = maximumBallY();
    state.ballVelocityY = -Math.abs(state.ballVelocityY);
    recordDirectionChange(state, directionChanges);
  }

  const playerPaddleX = PONG_PADDLE_MARGIN;

  if (
    state.ballVelocityX < 0
    && ballOverlapsPaddle(
      state,
      playerPaddleX,
      state.playerY,
    )
  ) {
    state.ballX = playerPaddleX + PONG_PADDLE_WIDTH;

    resolvePaddleBounce(
      state,
      state.playerY,
      1,
      directionChanges,
    );
  }

  const opponentPaddleX =
    PONG_FIELD_WIDTH
    - PONG_PADDLE_MARGIN
    - PONG_PADDLE_WIDTH;

  if (
    state.ballVelocityX > 0
    && ballOverlapsPaddle(
      state,
      opponentPaddleX,
      state.opponentY,
    )
  ) {
    state.ballX = opponentPaddleX - PONG_BALL_SIZE;

    resolvePaddleBounce(
      state,
      state.opponentY,
      -1,
      directionChanges,
    );
  }

  if (
    state.ballVelocityX < 0
    && state.ballX <= PONG_PLAYFIELD_INSET
  ) {
    scorePoint(state, "opponent", random);
    return "opponent";
  }

  if (
    state.ballVelocityX > 0
    && state.ballX + PONG_BALL_SIZE
      >= PONG_FIELD_WIDTH - PONG_PLAYFIELD_INSET
  ) {
    scorePoint(state, "player", random);
    return "player";
  }

  return null;
}

export function createInitialPongState(
  random: RandomSource,
): PongState {
  const state: MutablePongState = {
    playerY: paddleStartY(),
    opponentY: paddleStartY(),
    ballX: ballStartX(),
    ballY: ballStartY(),
    ballVelocityX: 0,
    ballVelocityY: 0,
    playerScore: 0,
    opponentScore: 0,
    serveRemainingMs: PONG_SERVE_DELAY_MS,
    outcome: "playing",
  };

  resetBall(
    state,
    random,
    random.next() < 0.5 ? -1 : 1,
  );

  return freezeState(state);
}

export function stepPong(
  state: PongState,
  input: PongInput,
  deltaMs: number,
  random: RandomSource,
): PongStepResult {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(
      "Pong delta time must be finite and non-negative.",
    );
  }

  if (state.outcome !== "playing" || deltaMs === 0) {
    return {
      state: {
        ...state,
      },
      events: {
        directionChanges: [],
        scoredBy: null,
      },
    };
  }

  const nextState = cloneMutableState(state);
  const directionChanges: PongDirectionChange[] = [];
  let scoredBy: PongSide | null = null;
  let remainingMs = deltaMs;

  while (
    remainingMs > 0
    && nextState.outcome === "playing"
    && scoredBy === null
  ) {
    const stepMs = Math.min(MAX_STEP_MS, remainingMs);

    scoredBy = advanceSubstep(
      nextState,
      input.playerAxis,
      stepMs,
      random,
      directionChanges,
    );

    remainingMs -= stepMs;
  }

  return {
    state: freezeState(nextState),
    events: {
      directionChanges,
      scoredBy,
    },
  };
}
