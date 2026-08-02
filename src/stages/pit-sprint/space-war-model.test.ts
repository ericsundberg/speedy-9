import { describe, expect, it } from "vitest";
import {
  createInitialSpaceWarState,
  SPACE_WAR_STAR_X,
  SPACE_WAR_STAR_Y,
  SPACE_WAR_WIN_SCORE,
  stepSpaceWar,
  wrapSpaceWarCoordinate,
} from "./space-war-model";
import type {
  SpaceWarState,
} from "./space-war-model";

const NO_INPUT = {
  player: {
    turn: 0,
    thrust: false,
    fire: false,
  },
  opponent: {
    turn: 0,
    thrust: false,
    fire: false,
  },
} as const;

function createPlayingState(
  overrides: Partial<SpaceWarState> = {},
): SpaceWarState {
  return {
    ...createInitialSpaceWarState(),
    phase: "playing",
    phaseRemainingMs: 0,
    ...overrides,
  };
}

describe("Space War model", () => {
  it("starts a first-to-three match", () => {
    const state = createInitialSpaceWarState();

    expect(state.playerScore).toBe(0);
    expect(state.opponentScore).toBe(0);
    expect(state.phase).toBe("countdown");
    expect(SPACE_WAR_WIN_SCORE).toBe(3);
  });

  it("wraps coordinates across either edge", () => {
    expect(wrapSpaceWarCoordinate(-5, 100)).toBe(95);
    expect(wrapSpaceWarCoordinate(105, 100)).toBe(5);
  });

  it("pulls ships toward the center while missiles ignore gravity", () => {
    const state = createPlayingState({
      player: {
        x: 90,
        y: SPACE_WAR_STAR_Y,
        velocityX: 0,
        velocityY: 0,
        angleRadians: 0,
        alive: true,
        fireCooldownMs: 0,
      },
      missiles: [
        {
          id: 1,
          owner: "player",
          x: 90,
          y: 80,
          velocityX: 100,
          velocityY: 0,
          ageMs: 100,
          remainingMs: 1_000,
        },
      ],
      nextMissileId: 2,
    });

    const result = stepSpaceWar(state, NO_INPUT, 40);
    const missile = result.state.missiles[0];

    expect(result.state.player.velocityX).toBeGreaterThan(0);
    expect(missile).toBeDefined();
    expect(missile?.velocityX).toBe(100);
    expect(missile?.velocityY).toBe(0);
  });

  it("fires a torpedo with a cooldown", () => {
    const result = stepSpaceWar(
      createPlayingState(),
      {
        ...NO_INPUT,
        player: {
          turn: 0,
          thrust: false,
          fire: true,
        },
      },
      16,
    );

    expect(result.events.firedBy).toContain("player");
    expect(result.state.missiles).toHaveLength(1);
    expect(result.state.player.fireCooldownMs).toBeGreaterThan(0);
  });

  it("awards the opponent a point when the player hits the star", () => {
    const result = stepSpaceWar(
      createPlayingState({
        player: {
          x: SPACE_WAR_STAR_X + 4,
          y: SPACE_WAR_STAR_Y,
          velocityX: 0,
          velocityY: 0,
          angleRadians: 0,
          alive: true,
          fireCooldownMs: 0,
        },
      }),
      NO_INPUT,
      16,
    );

    expect(result.events.roundResolved).toBe(true);
    expect(result.events.roundWinner).toBe("opponent");
    expect(result.state.opponentScore).toBe(1);
  });

  it("ends the match when the player reaches three", () => {
    const opponent = {
      x: 620,
      y: 240,
      velocityX: 0,
      velocityY: 0,
      angleRadians: 0,
      alive: true,
      fireCooldownMs: 0,
    };
    const result = stepSpaceWar(
      createPlayingState({
        playerScore: SPACE_WAR_WIN_SCORE - 1,
        opponent,
        missiles: [
          {
            id: 1,
            owner: "player",
            x: opponent.x,
            y: opponent.y,
            velocityX: 0,
            velocityY: 0,
            ageMs: 100,
            remainingMs: 1_000,
          },
        ],
        nextMissileId: 2,
      }),
      NO_INPUT,
      8,
    );

    expect(result.state.playerScore).toBe(SPACE_WAR_WIN_SCORE);
    expect(result.state.outcome).toBe("player-won");
    expect(result.state.phase).toBe("match-over");
  });

  it("does not award a point for mutual destruction", () => {
    const result = stepSpaceWar(
      createPlayingState({
        player: {
          x: SPACE_WAR_STAR_X - 2,
          y: SPACE_WAR_STAR_Y,
          velocityX: 0,
          velocityY: 0,
          angleRadians: 0,
          alive: true,
          fireCooldownMs: 0,
        },
        opponent: {
          x: SPACE_WAR_STAR_X + 2,
          y: SPACE_WAR_STAR_Y,
          velocityX: 0,
          velocityY: 0,
          angleRadians: 0,
          alive: true,
          fireCooldownMs: 0,
        },
      }),
      NO_INPUT,
      16,
    );

    expect(result.events.roundResolved).toBe(true);
    expect(result.events.roundWinner).toBeNull();
    expect(result.state.playerScore).toBe(0);
    expect(result.state.opponentScore).toBe(0);
  });
});
