import {
  Mulberry32Random,
} from "../../core/random";
import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import { PongAudio } from "./pong-audio";
import {
  createInitialPongState,
  PONG_BALL_SIZE,
  PONG_FIELD_HEIGHT,
  PONG_FIELD_WIDTH,
  PONG_PADDLE_HEIGHT,
  PONG_PADDLE_MARGIN,
  PONG_PADDLE_WIDTH,
  PONG_PLAYFIELD_INSET,
  stepPong,
} from "./pong-model";
import type {
  PongDirectionChange,
  PongState,
} from "./pong-model";

const MAX_FRAME_DELTA_MS = 50;
const TRAIL_DURATION_MS = 360;
const TRAIL_MAX_LENGTH = 112;
const FAILURE_RESTART_DELAY_MS = 900;
const PLAYFIELD_CLIP_INSET = 2;
const PLAYFIELD_CLIP_ID = "pong-playfield-clip";
const SOUND_CONTACT_TOLERANCE = 4;

const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyS",
  "ArrowUp",
  "ArrowDown",
]);

interface PongTrail {
  readonly directionX: number;
  readonly directionY: number;
  readonly startedAtMs: number;
}

export class PongBlitzStage implements Stage {
  public readonly id = "pong-blitz" as const;

  private context: StageContext | null = null;
  private random: Mulberry32Random | null = null;
  private state: PongState | null = null;
  private audio: PongAudio | null = null;

  private scoreText: SVGTextElement | null = null;
  private playerPaddle: SVGRectElement | null = null;
  private opponentPaddle: SVGRectElement | null = null;
  private ball: SVGRectElement | null = null;
  private trailLine: SVGLineElement | null = null;
  private messageGroup: SVGGElement | null = null;
  private messageText: SVGTextElement | null = null;
  private messageSubtext: SVGTextElement | null = null;

  private readonly pressedKeys = new Set<string>();
  private frameRequestId: number | null = null;
  private lastFrameAtMs: number | null = null;
  private pausedAtMs: number | null = null;
  private failureRestartAtMs: number | null = null;
  private trail: PongTrail | null = null;
  private active = false;

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.resetModel();
    this.audio = new PongAudio();

    const scene = document.createElement("section");
    scene.className = "pong-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Pong Blitz. First player to nine points wins.",
    );

    const svg = createSvgElement("svg", {
      class: "pong-stage__board",
      viewBox: `0 0 ${PONG_FIELD_WIDTH} ${PONG_FIELD_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "Pong playing field",
    });

    const definitions = createSvgElement("defs");

    const playfieldClip = createSvgElement("clipPath", {
      id: PLAYFIELD_CLIP_ID,
      clipPathUnits: "userSpaceOnUse",
    });

    const playfieldClipRect = createSvgElement("rect", {
      x: PLAYFIELD_CLIP_INSET,
      y: PLAYFIELD_CLIP_INSET,
      width: PONG_FIELD_WIDTH - PLAYFIELD_CLIP_INSET * 2,
      height: PONG_FIELD_HEIGHT - PLAYFIELD_CLIP_INSET * 2,
      rx: 2,
    });

    playfieldClip.append(playfieldClipRect);
    definitions.append(playfieldClip);

    const field = createSvgElement("rect", {
      class: "pong-stage__field",
      x: PLAYFIELD_CLIP_INSET,
      y: PLAYFIELD_CLIP_INSET,
      width: PONG_FIELD_WIDTH - PLAYFIELD_CLIP_INSET * 2,
      height: PONG_FIELD_HEIGHT - PLAYFIELD_CLIP_INSET * 2,
      rx: 2,
    });

    const centerLine = createSvgElement("line", {
      class: "pong-stage__center-line",
      x1: PONG_FIELD_WIDTH / 2,
      y1: 76,
      x2: PONG_FIELD_WIDTH / 2,
      y2: PONG_FIELD_HEIGHT - 18,
    });

    const scoreText = createSvgElement("text", {
      class: "pong-stage__score",
      x: PONG_FIELD_WIDTH / 2,
      y: 55,
      "text-anchor": "middle",
      "aria-hidden": "true",
    });
    scoreText.textContent = "0 - 0";

    const movingLayer = createSvgElement("g", {
      class: "pong-stage__moving-layer",
      "clip-path": `url(#${PLAYFIELD_CLIP_ID})`,
    });

    const trailLine = createSvgElement("line", {
      class: "pong-stage__trail",
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      opacity: 0,
    });

    const playerPaddle = createSvgElement("rect", {
      class: "pong-stage__paddle pong-stage__paddle--player",
    });

    const opponentPaddle = createSvgElement("rect", {
      class: "pong-stage__paddle pong-stage__paddle--opponent",
    });

    const ball = createSvgElement("rect", {
      class: "pong-stage__ball",
    });

    movingLayer.append(
      trailLine,
      playerPaddle,
      opponentPaddle,
      ball,
    );

    const messageGroup = createSvgElement("g", {
      class: "pong-stage__message",
      "aria-hidden": "true",
    });

    const messageText = createSvgElement("text", {
      class: "pong-stage__message-title",
      x: PONG_FIELD_WIDTH / 2,
      y: PONG_FIELD_HEIGHT / 2 - 6,
      "text-anchor": "middle",
    });

    const messageSubtext = createSvgElement("text", {
      class: "pong-stage__message-subtitle",
      x: PONG_FIELD_WIDTH / 2,
      y: PONG_FIELD_HEIGHT / 2 + 31,
      "text-anchor": "middle",
    });

    messageGroup.append(messageText, messageSubtext);

    svg.append(
      definitions,
      field,
      centerLine,
      scoreText,
      movingLayer,
      messageGroup,
    );

    const controls = document.createElement("p");
    controls.className = "pong-stage__controls";
    controls.textContent = "W / S OR ↑ / ↓   ·   R RESTART";

    scene.append(svg, controls);
    context.root.replaceChildren(scene);

    this.scoreText = scoreText;
    this.playerPaddle = playerPaddle;
    this.opponentPaddle = opponentPaddle;
    this.ball = ball;
    this.trailLine = trailLine;
    this.messageGroup = messageGroup;
    this.messageText = messageText;
    this.messageSubtext = messageSubtext;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    this.render(performance.now());
  }

  public start(): void {
    if (
      this.context === null
      || this.state === null
      || this.active
    ) {
      return;
    }

    this.active = true;
    this.lastFrameAtMs = performance.now();
    this.audio?.playBuzz();
    this.scheduleFrame();
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.resetModel();
    this.pressedKeys.clear();
    this.hideMessage();
    this.audio?.playBuzz();

    this.active = true;
    this.lastFrameAtMs = performance.now();

    this.render(this.lastFrameAtMs);
    this.scheduleFrame();
  }

  public pause(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.pausedAtMs = performance.now();
    this.pressedKeys.clear();
    this.lastFrameAtMs = null;

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }

  public resume(): void {
    if (
      this.context === null
      || this.state === null
      || this.active
    ) {
      return;
    }

    const resumedAtMs = performance.now();

    const pausedDurationMs =
      this.pausedAtMs === null
        ? 0
        : Math.max(
            0,
            resumedAtMs - this.pausedAtMs,
          );

    if (this.failureRestartAtMs !== null) {
      this.failureRestartAtMs += pausedDurationMs;
    }

    if (this.trail !== null) {
      this.trail = {
        ...this.trail,
        startedAtMs:
          this.trail.startedAtMs + pausedDurationMs,
      };
    }

    this.pausedAtMs = null;
    this.active = true;
    this.lastFrameAtMs = resumedAtMs;

    this.scheduleFrame();
  }

  public destroy(): void {
    this.active = false;

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    this.audio?.destroy();
    this.audio = null;

    this.pressedKeys.clear();
    this.context = null;
    this.random = null;
    this.state = null;
    this.scoreText = null;
    this.playerPaddle = null;
    this.opponentPaddle = null;
    this.ball = null;
    this.trailLine = null;
    this.messageGroup = null;
    this.messageText = null;
    this.messageSubtext = null;
    this.lastFrameAtMs = null;
    this.pausedAtMs = null;
    this.failureRestartAtMs = null;
    this.trail = null;
  }

  private resetModel(): void {
    if (this.context === null) {
      return;
    }

    this.random = new Mulberry32Random(
      this.context.stageSeed,
    );

    this.state = createInitialPongState(this.random);
    this.failureRestartAtMs = null;
    this.trail = null;
    this.pausedAtMs = null;
  }

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (event.code === "KeyR") {
      event.preventDefault();

      if (!event.repeat) {
        this.restart();
      }

      return;
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.add(event.code);
  };

  private readonly handleKeyUp = (
    event: KeyboardEvent,
  ): void => {
    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
  };

  private readonly handleVisibilityChange = (): void => {
    this.pressedKeys.clear();
    this.lastFrameAtMs = null;

    if (document.hidden) {
      if (this.frameRequestId !== null) {
        cancelAnimationFrame(this.frameRequestId);
        this.frameRequestId = null;
      }

      return;
    }

    if (this.active) {
      this.lastFrameAtMs = performance.now();
      this.scheduleFrame();
    }
  };

  private readonly handleFrame = (nowMs: number): void => {
    this.frameRequestId = null;

    if (
      !this.active
      || this.context === null
      || this.state === null
      || this.random === null
    ) {
      return;
    }

    if (document.hidden) {
      this.lastFrameAtMs = null;
      return;
    }

    if (this.failureRestartAtMs !== null) {
      this.render(nowMs);

      if (nowMs >= this.failureRestartAtMs) {
        this.restart();
        return;
      }

      this.scheduleFrame();
      return;
    }

    const previousFrameAtMs = this.lastFrameAtMs ?? nowMs;

    const deltaMs = Math.min(
      MAX_FRAME_DELTA_MS,
      Math.max(0, nowMs - previousFrameAtMs),
    );

    this.lastFrameAtMs = nowMs;

    const result = stepPong(
      this.state,
      {
        playerAxis: this.getPlayerAxis(),
      },
      deltaMs,
      this.random,
    );

    this.state = result.state;

    if (result.events.scoredBy !== null) {
      this.trail = null;

      if (this.state.outcome === "player-won") {
        this.audio?.playWinBuzz();

        /*
         * The stage is destroyed immediately after completion.
         * Relinquish ownership so destroy() does not cut off
         * the short victory sound.
         */
        this.audio = null;
      } else {
        this.audio?.playBuzz();
      }
    }

    for (
      const directionChange
      of result.events.directionChanges
    ) {
      this.playDirectionSound(directionChange);
    }

    const latestDirectionChange =
      result.events.directionChanges.at(-1);

    if (latestDirectionChange !== undefined) {
      this.startTrail(latestDirectionChange, nowMs);
    }

    if (this.state.outcome === "player-won") {
      const complete = this.context.complete;

      this.active = false;
      this.render(nowMs);
      complete();
      return;
    }

    if (this.state.outcome === "player-lost") {
      this.failureRestartAtMs =
        nowMs + FAILURE_RESTART_DELAY_MS;

      this.showMessage("YOU LOSE", "RESTARTING");
    }

    this.render(nowMs);
    this.scheduleFrame();
  };

  private getPlayerAxis(): number {
    const movingUp =
      this.pressedKeys.has("KeyW")
      || this.pressedKeys.has("ArrowUp");

    const movingDown =
      this.pressedKeys.has("KeyS")
      || this.pressedKeys.has("ArrowDown");

    return Number(movingDown) - Number(movingUp);
  }

  private playDirectionSound(
    directionChange: PongDirectionChange,
  ): void {
    const halfBall = PONG_BALL_SIZE / 2;

    const playerContactX =
      PONG_PADDLE_MARGIN
      + PONG_PADDLE_WIDTH
      + halfBall;

    const opponentPaddleX =
      PONG_FIELD_WIDTH
      - PONG_PADDLE_MARGIN
      - PONG_PADDLE_WIDTH;

    const opponentContactX =
      opponentPaddleX - halfBall;

    const touchedPaddle =
      Math.abs(
        directionChange.x - playerContactX,
      ) <= SOUND_CONTACT_TOLERANCE
      || Math.abs(
        directionChange.x - opponentContactX,
      ) <= SOUND_CONTACT_TOLERANCE;

    if (touchedPaddle) {
      this.audio?.playPlop();
      return;
    }

    const topWallContactY =
      PONG_PLAYFIELD_INSET + halfBall;

    const bottomWallContactY =
      PONG_FIELD_HEIGHT
      - PONG_PLAYFIELD_INSET
      - halfBall;

    const touchedHorizontalWall =
      Math.abs(
        directionChange.y - topWallContactY,
      ) <= SOUND_CONTACT_TOLERANCE
      || Math.abs(
        directionChange.y - bottomWallContactY,
      ) <= SOUND_CONTACT_TOLERANCE;

    if (touchedHorizontalWall) {
      this.audio?.playPing();
    }
  }

  private startTrail(
    directionChange: PongDirectionChange,
    nowMs: number,
  ): void {
    const magnitude = Math.hypot(
      directionChange.velocityX,
      directionChange.velocityY,
    );

    if (magnitude === 0) {
      this.trail = null;
      return;
    }

    this.trail = {
      directionX: directionChange.velocityX / magnitude,
      directionY: directionChange.velocityY / magnitude,
      startedAtMs: nowMs,
    };
  }

  private render(nowMs: number): void {
    const state = this.state;

    if (state === null) {
      return;
    }

    if (this.scoreText !== null) {
      this.scoreText.textContent =
        `${state.playerScore} - ${state.opponentScore}`;
    }

    if (this.playerPaddle !== null) {
      setSvgAttributes(this.playerPaddle, {
        x: PONG_PADDLE_MARGIN,
        y: state.playerY,
        width: PONG_PADDLE_WIDTH,
        height: PONG_PADDLE_HEIGHT,
      });
    }

    if (this.opponentPaddle !== null) {
      setSvgAttributes(this.opponentPaddle, {
        x:
          PONG_FIELD_WIDTH
          - PONG_PADDLE_MARGIN
          - PONG_PADDLE_WIDTH,
        y: state.opponentY,
        width: PONG_PADDLE_WIDTH,
        height: PONG_PADDLE_HEIGHT,
      });
    }

    if (this.ball !== null) {
      setSvgAttributes(this.ball, {
        x: state.ballX,
        y: state.ballY,
        width: PONG_BALL_SIZE,
        height: PONG_BALL_SIZE,
      });
    }

    this.renderTrail(nowMs);
  }

  private renderTrail(nowMs: number): void {
    if (
      this.trailLine === null
      || this.trail === null
      || this.state === null
    ) {
      this.hideTrailLine();
      return;
    }

    const ageMs = Math.max(
      0,
      nowMs - this.trail.startedAtMs,
    );

    const progress = ageMs / TRAIL_DURATION_MS;

    if (progress >= 1) {
      this.trail = null;
      this.hideTrailLine();
      return;
    }

    const remaining = 1 - progress;
    const length = TRAIL_MAX_LENGTH * remaining;

    const headX =
      this.state.ballX + PONG_BALL_SIZE / 2;

    const headY =
      this.state.ballY + PONG_BALL_SIZE / 2;

    const tailX =
      headX - this.trail.directionX * length;

    const tailY =
      headY - this.trail.directionY * length;

    setSvgAttributes(this.trailLine, {
      x1: tailX,
      y1: tailY,
      x2: headX,
      y2: headY,
      opacity: 0.18 + remaining * 0.82,
    });
  }

  private hideTrailLine(): void {
    if (this.trailLine !== null) {
      this.trailLine.setAttribute("opacity", "0");
    }
  }

  private showMessage(
    title: string,
    subtitle: string,
  ): void {
    if (
      this.messageGroup === null
      || this.messageText === null
      || this.messageSubtext === null
    ) {
      return;
    }

    this.messageText.textContent = title;
    this.messageSubtext.textContent = subtitle;

    this.messageGroup.classList.add(
      "pong-stage__message--visible",
    );
  }

  private hideMessage(): void {
    this.messageGroup?.classList.remove(
      "pong-stage__message--visible",
    );
  }

  private scheduleFrame(): void {
    if (
      !this.active
      || document.hidden
      || this.frameRequestId !== null
    ) {
      return;
    }

    this.frameRequestId = requestAnimationFrame(
      this.handleFrame,
    );
  }
}

export function createPongBlitzStage(): Stage {
  return new PongBlitzStage();
}
