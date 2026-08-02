import { describe, expect, it } from "vitest";
import type { RandomSource } from "../../core/random";
import {
  createInitialPongState,
  PONG_BALL_SIZE,
  PONG_FIELD_HEIGHT,
  PONG_FIELD_WIDTH,
  PONG_OPPONENT_SPEED,
  PONG_PADDLE_HEIGHT,
  PONG_PLAYFIELD_INSET,
  PONG_WIN_SCORE,
  stepPong,
} from "./pong-model";
import type { PongState } from "./pong-model";

class SequenceRandom implements RandomSource {
  private index = 0;
  private readonly values: readonly number[];

  public constructor(values: readonly number[]) {
    this.values = values;
  }

  public next(): number {
    const value =
      this.values[this.index % this.values.length];

    this.index += 1;
    return value ?? 0.5;
  }
}

function createState(
  overrides: Partial<PongState> = {},
): PongState {
  return {
    playerY: 192,
    opponentY: 192,
    ballX: 373,
    ballY: 233,
    ballVelocityX: 300,
    ballVelocityY: 0,
    playerScore: 0,
    opponentScore: 0,
    serveRemainingMs: 0,
    outcome: "playing",
    ...overrides,
  };
}

function expectGeometryInsidePlayfield(state: PongState): void {
  expect(state.playerY).toBeGreaterThanOrEqual(
    PONG_PLAYFIELD_INSET,
  );

  expect(
    state.playerY + PONG_PADDLE_HEIGHT,
  ).toBeLessThanOrEqual(
    PONG_FIELD_HEIGHT - PONG_PLAYFIELD_INSET,
  );

  expect(state.opponentY).toBeGreaterThanOrEqual(
    PONG_PLAYFIELD_INSET,
  );

  expect(
    state.opponentY + PONG_PADDLE_HEIGHT,
  ).toBeLessThanOrEqual(
    PONG_FIELD_HEIGHT - PONG_PLAYFIELD_INSET,
  );

  expect(state.ballX).toBeGreaterThanOrEqual(
    PONG_PLAYFIELD_INSET,
  );

  expect(
    state.ballX + PONG_BALL_SIZE,
  ).toBeLessThanOrEqual(
    PONG_FIELD_WIDTH - PONG_PLAYFIELD_INSET,
  );

  expect(state.ballY).toBeGreaterThanOrEqual(
    PONG_PLAYFIELD_INSET,
  );

  expect(
    state.ballY + PONG_BALL_SIZE,
  ).toBeLessThanOrEqual(
    PONG_FIELD_HEIGHT - PONG_PLAYFIELD_INSET,
  );
}

describe("Pong model", () => {
  it("creates a centered zero-zero match", () => {
    const random = new SequenceRandom([0.8, 0.5]);
    const state = createInitialPongState(random);

    expect(state.playerScore).toBe(0);
    expect(state.opponentScore).toBe(0);

    expect(state.playerY).toBe(
      (PONG_FIELD_HEIGHT - PONG_PADDLE_HEIGHT) / 2,
    );

    expect(state.ballX).toBe(
      (PONG_FIELD_WIDTH - PONG_BALL_SIZE) / 2,
    );

    expect(state.outcome).toBe("playing");
    expectGeometryInsidePlayfield(state);
  });

  it("clamps the player paddle to the field inset", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        playerY: PONG_PLAYFIELD_INSET + 1,
        serveRemainingMs: 1_000,
      }),
      {
        playerAxis: -1,
      },
      500,
      random,
    );

    expect(result.state.playerY).toBe(PONG_PLAYFIELD_INSET);
    expectGeometryInsidePlayfield(result.state);
  });

  it("limits the opponent tracking speed", () => {
    const random = new SequenceRandom([0.5]);
    const startingOpponentY = 100;
    const deltaMs = 100;

    const result = stepPong(
      createState({
        opponentY: startingOpponentY,
        ballY: 400,
        ballVelocityX: 300,
        serveRemainingMs: 1_000,
      }),
      {
        playerAxis: 0,
      },
      deltaMs,
      random,
    );

    expect(result.state.opponentY).toBeCloseTo(
      startingOpponentY
        + PONG_OPPONENT_SPEED * (deltaMs / 1_000),
      6,
    );
  });

  it("bounces from the upper wall without leaving the field", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        ballY: PONG_PLAYFIELD_INSET + 1,
        ballVelocityY: -240,
      }),
      {
        playerAxis: 0,
      },
      16,
      random,
    );

    expect(result.state.ballY).toBeGreaterThanOrEqual(
      PONG_PLAYFIELD_INSET,
    );
    expect(result.state.ballVelocityY).toBeGreaterThan(0);
    expect(result.events.directionChanges).toHaveLength(1);
    expectGeometryInsidePlayfield(result.state);
  });

  it("bounces from the player paddle", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        playerY: 190,
        ballX: 51,
        ballY: 220,
        ballVelocityX: -300,
      }),
      {
        playerAxis: 0,
      },
      16,
      random,
    );

    expect(result.state.ballVelocityX).toBeGreaterThan(0);
    expect(result.events.directionChanges).toHaveLength(1);
    expectGeometryInsidePlayfield(result.state);
  });

  it("awards a point before returning out-of-bounds geometry", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        ballX: PONG_FIELD_WIDTH - PONG_PLAYFIELD_INSET - 2,
      }),
      {
        playerAxis: 0,
      },
      8,
      random,
    );

    expect(result.state.playerScore).toBe(1);
    expect(result.state.opponentScore).toBe(0);
    expect(result.events.scoredBy).toBe("player");
    expect(result.state.serveRemainingMs).toBeGreaterThan(0);
    expectGeometryInsidePlayfield(result.state);
  });

  it("ends the match when the player reaches nine", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        playerScore: PONG_WIN_SCORE - 1,
        ballX: PONG_FIELD_WIDTH - PONG_PLAYFIELD_INSET - 2,
      }),
      {
        playerAxis: 0,
      },
      8,
      random,
    );

    expect(result.state.playerScore).toBe(PONG_WIN_SCORE);
    expect(result.state.outcome).toBe("player-won");
    expectGeometryInsidePlayfield(result.state);
  });

  it("ends the match when the opponent reaches nine", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        opponentScore: PONG_WIN_SCORE - 1,
        ballX: PONG_PLAYFIELD_INSET + 1,
        ballVelocityX: -300,
      }),
      {
        playerAxis: 0,
      },
      8,
      random,
    );

    expect(result.state.opponentScore).toBe(PONG_WIN_SCORE);
    expect(result.state.outcome).toBe("player-lost");
    expectGeometryInsidePlayfield(result.state);
  });

  it("keeps both paddles and the ball inside after a long step", () => {
    const random = new SequenceRandom([0.5]);

    const result = stepPong(
      createState({
        playerY: PONG_FIELD_HEIGHT,
        opponentY: -PONG_PADDLE_HEIGHT,
        ballY: PONG_PLAYFIELD_INSET + 2,
        ballVelocityY: -420,
      }),
      {
        playerAxis: 1,
      },
      50,
      random,
    );

    expectGeometryInsidePlayfield(result.state);
  });
});
