import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import { PitfallAudio } from "./pitfall-audio";
import {
  createInitialPitfallState,
  getPitfallCrocodiles,
  getPitfallGroundSegments,
  getPitfallRollingLogs,
  getPitfallScorpionX,
  getPitfallSinkingPlatform,
  getPitfallVineGrip,
  PITFALL_DEATH_PENALTY_MS,
  PITFALL_GROUND_Y,
  PITFALL_PLAYER_WIDTH,
  PITFALL_ROOM_COUNT,
  PITFALL_TREASURE_RECT,
  PITFALL_VIEW_HEIGHT,
  PITFALL_VIEW_WIDTH,
  stepPitfall,
} from "./pitfall-model";
import type {
  PitfallEvents,
  PitfallInput,
  PitfallState,
} from "./pitfall-model";

const MAX_FRAME_DELTA_MS = 50;

const MOVEMENT_KEYS = new Set([
  "KeyA",
  "KeyD",
  "ArrowLeft",
  "ArrowRight",
]);

const JUMP_KEYS = new Set([
  "KeyW",
  "ArrowUp",
  "Space",
]);

export class PitfallRunStage implements Stage {
  public readonly id = "reverse-circuit" as const;

  private context: StageContext | null = null;
  private state: PitfallState | null = null;
  private audio: PitfallAudio | null = null;
  private abortController: AbortController | null = null;

  private worldLayer: SVGGElement | null = null;
  private playerGroup: SVGGElement | null = null;
  private playerBody: SVGPathElement | null = null;
  private statusText: SVGTextElement | null = null;
  private messageGroup: SVGGElement | null = null;
  private messageTitle: SVGTextElement | null = null;
  private messageSubtitle: SVGTextElement | null = null;

  private readonly pressedKeys =
    new Set<string>();

  private frameRequestId: number | null = null;
  private lastFrameAtMs: number | null = null;
  private jumpQueued = false;
  private active = false;
  private paused = false;
  private transitionSent = false;

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.state = createInitialPitfallState();
    this.audio = new PitfallAudio();
    this.abortController = new AbortController();

    const scene = document.createElement("section");
    scene.className = "pitfall-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Pitfall Run. Cross four jungle screens, collect the treasure, and reach the exit.",
    );

    const board = createSvgElement("svg", {
      class: "pitfall-stage__board",
      viewBox:
        `0 0 ${PITFALL_VIEW_WIDTH} ${PITFALL_VIEW_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label":
        "Vector jungle platforming course",
    });

    const worldLayer = createSvgElement("g", {
      class: "pitfall-stage__world",
      "aria-hidden": true,
    });

    const playerGroup = createSvgElement("g", {
      class: "pitfall-stage__player",
      "aria-hidden": true,
    });

    const playerHead = createSvgElement("circle", {
      class: "pitfall-stage__player-head",
      cx: 9,
      cy: 5,
      r: 4,
    });

    const playerBody = createSvgElement("path", {
      class: "pitfall-stage__player-body",
      d:
        "M9 9 V21 "
        + "M9 13 L2 18 "
        + "M9 13 L16 18 "
        + "M9 21 L3 32 "
        + "M9 21 L15 32",
    });

    playerGroup.append(
      playerHead,
      playerBody,
    );

    const statusText = createSvgElement("text", {
      class: "pitfall-stage__status",
      x: 24,
      y: 34,
    });

    const messageGroup = createSvgElement("g", {
      class: "pitfall-stage__message",
    });

    const backdrop = createSvgElement("rect", {
      class: "pitfall-stage__message-backdrop",
      x: 205,
      y: 184,
      width: 350,
      height: 112,
      rx: 8,
    });

    const messageTitle = createSvgElement("text", {
      class: "pitfall-stage__message-title",
      x: PITFALL_VIEW_WIDTH / 2,
      y: 232,
      "text-anchor": "middle",
    });

    const messageSubtitle =
      createSvgElement("text", {
        class:
          "pitfall-stage__message-subtitle",
        x: PITFALL_VIEW_WIDTH / 2,
        y: 265,
        "text-anchor": "middle",
      });

    messageGroup.append(
      backdrop,
      messageTitle,
      messageSubtitle,
    );

    board.append(
      worldLayer,
      playerGroup,
      statusText,
      messageGroup,
    );

    const instruction =
      document.createElement("p");

    instruction.className =
      "pitfall-stage__instruction";

    instruction.textContent =
      "A/D OR ←/→ MOVE · W/↑/SPACE JUMP OR RELEASE VINE · COLLECT TREASURE";

    scene.append(
      board,
      instruction,
    );

    context.root.replaceChildren(scene);

    this.worldLayer = worldLayer;
    this.playerGroup = playerGroup;
    this.playerBody = playerBody;
    this.statusText = statusText;
    this.messageGroup = messageGroup;
    this.messageTitle = messageTitle;
    this.messageSubtitle = messageSubtitle;

    const signal = this.abortController.signal;

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
      { signal },
    );

    window.addEventListener(
      "keyup",
      this.handleKeyUp,
      { signal },
    );

    window.addEventListener(
      "blur",
      this.handleBlur,
      { signal },
    );

    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
      { signal },
    );

    this.render();
  }

  public start(): void {
    if (
      this.context === null
      || this.state === null
    ) {
      throw new Error(
        "Pitfall Run must be mounted before it starts.",
      );
    }

    this.active = true;
    this.paused = false;
    this.transitionSent = false;
    this.jumpQueued = false;
    this.lastFrameAtMs = performance.now();

    this.audio?.playStart();
    this.scheduleFrame();
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.state = createInitialPitfallState();
    this.pressedKeys.clear();
    this.jumpQueued = false;
    this.active = true;
    this.paused = false;
    this.transitionSent = false;
    this.lastFrameAtMs = performance.now();

    this.audio?.playStart();
    this.render();
    this.scheduleFrame();
  }

  public pause(): void {
    if (!this.active || this.paused) {
      return;
    }

    this.paused = true;
    this.pressedKeys.clear();
    this.jumpQueued = false;
    this.lastFrameAtMs = null;
    this.cancelFrame();
  }

  public resume(): void {
    if (
      !this.active
      || !this.paused
    ) {
      return;
    }

    this.paused = false;
    this.lastFrameAtMs = performance.now();
    this.scheduleFrame();
  }

  public destroy(): void {
    this.active = false;
    this.paused = false;
    this.transitionSent = false;
    this.jumpQueued = false;
    this.pressedKeys.clear();

    this.cancelFrame();

    this.abortController?.abort();
    this.abortController = null;

    this.audio?.destroy();
    this.audio = null;

    this.context = null;
    this.state = null;
    this.worldLayer = null;
    this.playerGroup = null;
    this.playerBody = null;
    this.statusText = null;
    this.messageGroup = null;
    this.messageTitle = null;
    this.messageSubtitle = null;
    this.lastFrameAtMs = null;
  }

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (event.code === "KeyR") {
      if (
        !event.repeat
        && !this.paused
      ) {
        event.preventDefault();
        this.restart();
      }

      return;
    }

    if (JUMP_KEYS.has(event.code)) {
      event.preventDefault();

      if (
        !event.repeat
        && !this.paused
      ) {
        this.jumpQueued = true;
      }

      return;
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();

    if (!this.paused) {
      this.pressedKeys.add(event.code);
    }
  };

  private readonly handleKeyUp = (
    event: KeyboardEvent,
  ): void => {
    if (JUMP_KEYS.has(event.code)) {
      event.preventDefault();

      /*
       * The player commonly reaches the vine while still
       * holding the jump key. Releasing that held key should
       * release the vine without requiring another full press.
       */
      if (
        !this.paused
        && this.state?.player.attachedToVine
      ) {
        this.jumpQueued = true;
      }

      return;
    }

    if (!MOVEMENT_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
    this.jumpQueued = false;
  };

  private readonly handleVisibilityChange =
    (): void => {
      this.pressedKeys.clear();
      this.jumpQueued = false;
      this.lastFrameAtMs = null;

      if (document.hidden) {
        this.cancelFrame();
        return;
      }

      if (this.active && !this.paused) {
        this.lastFrameAtMs =
          performance.now();

        this.scheduleFrame();
      }
    };

  private readonly handleFrame = (
    nowMs: number,
  ): void => {
    this.frameRequestId = null;

    if (
      !this.active
      || this.paused
      || document.hidden
      || this.state === null
    ) {
      return;
    }

    const previousFrameAtMs =
      this.lastFrameAtMs ?? nowMs;

    const deltaMs = Math.min(
      MAX_FRAME_DELTA_MS,
      Math.max(
        0,
        nowMs - previousFrameAtMs,
      ),
    );

    this.lastFrameAtMs = nowMs;

    if (deltaMs > 0) {
      const result = stepPitfall(
        this.state,
        this.readInput(),
        deltaMs,
      );

      this.state = result.state;
      this.processEvents(result.events);
      this.render();
    }

    if (
      this.state.complete
      || this.state.failed
    ) {
      this.finishStage();
      return;
    }

    this.scheduleFrame();
  };

  private readInput(): PitfallInput {
    const jumpPressed = this.jumpQueued;
    this.jumpQueued = false;

    return {
      left:
        this.pressedKeys.has("KeyA")
        || this.pressedKeys.has("ArrowLeft"),
      right:
        this.pressedKeys.has("KeyD")
        || this.pressedKeys.has("ArrowRight"),
      jumpPressed,
    };
  }

  private processEvents(
    events: PitfallEvents,
  ): void {
    if (events.jumped) {
      this.audio?.playJump();
    }

    if (events.landed) {
      this.audio?.playLand();
    }

    if (events.vineGrabbed) {
      this.audio?.playVine();
    }

    if (events.roomChanged) {
      this.audio?.playRoom();
    }

    if (events.treasureCollected) {
      this.audio?.playTreasure();
    }

    if (events.died) {
      this.context?.addPenalty(
        PITFALL_DEATH_PENALTY_MS,
        "Pitfall life lost",
      );

      this.audio?.playDeath();
    }

    if (events.won) {
      this.audio?.playWin();
    }

    if (events.lost) {
      this.audio?.playLose();
    }
  }

  private finishStage(): void {
    if (
      this.transitionSent
      || this.context === null
      || this.state === null
    ) {
      return;
    }

    this.transitionSent = true;
    this.active = false;
    this.cancelFrame();

    if (this.state.complete) {
      this.context.complete();
    } else {
      this.context.fail();
    }
  }

  private render(): void {
    if (
      this.state === null
      || this.worldLayer === null
      || this.playerGroup === null
      || this.playerBody === null
    ) {
      return;
    }

    this.renderWorld();
    this.renderPlayer();
    this.renderStatus();
    this.renderMessage();
  }

  private renderWorld(): void {
    if (
      this.state === null
      || this.worldLayer === null
    ) {
      return;
    }

    const elements: SVGElement[] = [];

    elements.push(
      this.path(
        "M0 82 "
        + "L52 58 "
        + "L108 72 "
        + "L160 82 "
        + "L214 60 "
        + "L268 70 "
        + "L320 82 "
        + "L374 58 "
        + "L428 72 "
        + "L480 82 "
        + "L534 60 "
        + "L588 70 "
        + "L640 82 "
        + "L700 58 "
        + "L760 70 "
        + "L800 82",
        "pitfall-stage__canopy",
      ),
    );

    for (
      const trunkX
      of [35, 178, 610, 735]
    ) {
      elements.push(
        this.path(
          `M${trunkX} 82 `
          + `L${trunkX - 8} 145 `
          + `L${trunkX + 5} 210 `
          + `L${trunkX - 5} 275 `
          + `L${trunkX + 6} 335 `
          + `L${trunkX} 390`,
          "pitfall-stage__tree",
        ),
      );
    }

    for (
      const segment
      of getPitfallGroundSegments(
        this.state.roomIndex,
        this.state.roomTimeMs,
      )
    ) {
      elements.push(
        this.line(
          segment.left,
          PITFALL_GROUND_Y,
          segment.right,
          PITFALL_GROUND_Y,
          "pitfall-stage__ground",
        ),
      );
    }

    if (this.state.roomIndex === 0) {
      const logFrame =
        Math.floor(
          this.state.roomTimeMs / 140,
        ) % 2;

      for (
        const log
        of getPitfallRollingLogs(
          this.state.roomTimeMs,
        )
      ) {
        const x = log.x;
        const y = log.y;
        const radius = log.radius;
        const corner = radius * 0.7;

        const outline =
          `M${x - radius} ${y} `
          + `L${x - corner} ${y - corner} `
          + `L${x} ${y - radius} `
          + `L${x + corner} ${y - corner} `
          + `L${x + radius} ${y} `
          + `L${x + corner} ${y + corner} `
          + `L${x} ${y + radius} `
          + `L${x - corner} ${y + corner} Z`;

        const spokes =
          logFrame === 0
            ? (
              `M${x - radius + 4} ${y} `
              + `L${x + radius - 4} ${y} `
              + `M${x} ${y - radius + 4} `
              + `L${x} ${y + radius - 4}`
            )
            : (
              `M${x - corner + 3} ${y - corner + 3} `
              + `L${x + corner - 3} ${y + corner - 3} `
              + `M${x + corner - 3} ${y - corner + 3} `
              + `L${x - corner + 3} ${y + corner - 3}`
            );

        elements.push(
          this.path(
            outline,
            "pitfall-stage__log",
          ),
          this.path(
            spokes,
            "pitfall-stage__log-spoke",
          ),
        );
      }
    }

    if (this.state.roomIndex === 1) {
      const grip = getPitfallVineGrip(
        this.state.roomTimeMs,
      );

      elements.push(
        this.path(
          "M290 84 Q390 44 488 84",
          "pitfall-stage__branch",
        ),
        this.line(
          390,
          82,
          grip.x,
          grip.y,
          "pitfall-stage__vine",
        ),
        createSvgElement("circle", {
          class: "pitfall-stage__vine-grip",
          cx: grip.x,
          cy: grip.y,
          r: 5,
        }),
        this.path(
          "M242 390 Q380 442 518 390",
          "pitfall-stage__pit",
        ),
      );
    }

    if (this.state.roomIndex === 2) {
      elements.push(
        this.path(
          "M222 401 "
          + "Q242 391 262 401 "
          + "T302 401 T342 401 "
          + "T382 401 T422 401 "
          + "T462 401 T502 401 "
          + "T542 401",
          "pitfall-stage__water",
        ),
      );

      for (
        const crocodile
        of getPitfallCrocodiles(
          this.state.roomTimeMs,
        )
      ) {
        const x = crocodile.x;
        const right =
          crocodile.x + crocodile.width;
        const center =
          crocodile.x + crocodile.width / 2;

        if (crocodile.closed) {
          elements.push(
            this.path(
              `M${x} ${PITFALL_GROUND_Y} `
              + `L${x + 12} ${PITFALL_GROUND_Y - 10} `
              + `L${center} ${PITFALL_GROUND_Y - 15} `
              + `L${right - 12} ${PITFALL_GROUND_Y - 10} `
              + `L${right} ${PITFALL_GROUND_Y} `
              + `L${right - 12} ${PITFALL_GROUND_Y + 10} `
              + `L${center} ${PITFALL_GROUND_Y + 15} `
              + `L${x + 12} ${PITFALL_GROUND_Y + 10} Z`,
              "pitfall-stage__crocodile",
            ),
            this.path(
              `M${x + 10} ${PITFALL_GROUND_Y} `
              + `L${x + 20} ${PITFALL_GROUND_Y - 5} `
              + `L${x + 30} ${PITFALL_GROUND_Y} `
              + `L${x + 40} ${PITFALL_GROUND_Y - 5} `
              + `L${x + 50} ${PITFALL_GROUND_Y} `
              + `L${x + 60} ${PITFALL_GROUND_Y - 5}`,
              "pitfall-stage__crocodile-teeth",
            ),
          );
        } else {
          elements.push(
            this.path(
              `M${x} ${PITFALL_GROUND_Y - 5} `
              + `L${x + 12} ${PITFALL_GROUND_Y - 18} `
              + `L${center} ${PITFALL_GROUND_Y - 25} `
              + `L${right - 12} ${PITFALL_GROUND_Y - 18} `
              + `L${right} ${PITFALL_GROUND_Y - 5}`,
              "pitfall-stage__crocodile",
            ),
            this.path(
              `M${x} ${PITFALL_GROUND_Y + 5} `
              + `L${x + 12} ${PITFALL_GROUND_Y + 18} `
              + `L${center} ${PITFALL_GROUND_Y + 25} `
              + `L${right - 12} ${PITFALL_GROUND_Y + 18} `
              + `L${right} ${PITFALL_GROUND_Y + 5}`,
              "pitfall-stage__crocodile",
            ),
          );
        }
      }

      const platform =
        getPitfallSinkingPlatform(
          this.state.platformTimerMs,
        );

      if (platform.visible) {
        const platformGroup =
          createSvgElement("g", {
            class:
              "pitfall-stage__platform"
              + (
                platform.warning
                  ? " pitfall-stage__platform--warning"
                  : ""
              )
              + (
                platform.sinking
                  ? " pitfall-stage__platform--sinking"
                  : ""
              ),
          });

        const left = platform.x;
        const right =
          platform.x + platform.width;
        const top = platform.topY;

        platformGroup.append(
          this.path(
            `M${left} ${top} `
            + `L${right} ${top} `
            + `L${right - 10} ${top + 13} `
            + `L${left + 10} ${top + 13} Z`,
            "pitfall-stage__platform-outline",
          ),
          this.path(
            `M${left + 10} ${top} `
            + `L${left + 24} ${top + 13} `
            + `M${right - 10} ${top} `
            + `L${right - 24} ${top + 13}`,
            "pitfall-stage__platform-brace",
          ),
        );

        elements.push(platformGroup);
      }
    }

    if (this.state.roomIndex === 3) {
      const scorpionX =
        getPitfallScorpionX(
          this.state.roomTimeMs,
        );

      elements.push(
        this.path(
          `M${scorpionX} 382 `
          + `L${scorpionX + 5} 373 `
          + `L${scorpionX + 10} 380 `
          + `L${scorpionX + 14} 369 `
          + `L${scorpionX + 19} 380 `
          + `L${scorpionX + 24} 369 `
          + `L${scorpionX + 29} 380 `
          + `L${scorpionX + 34} 373 `
          + `L${scorpionX + 38} 382 `
          + `M${scorpionX + 6} 379 `
          + `L${scorpionX + 2} 388 `
          + `M${scorpionX + 13} 379 `
          + `L${scorpionX + 10} 389 `
          + `M${scorpionX + 25} 379 `
          + `L${scorpionX + 28} 389 `
          + `M${scorpionX + 32} 379 `
          + `L${scorpionX + 36} 388 `
          + `M${scorpionX + 30} 374 `
          + `L${scorpionX + 39} 367 `
          + `L${scorpionX + 44} 358 `
          + `L${scorpionX + 42} 350 `
          + `L${scorpionX + 35} 344 `
          + `L${scorpionX + 31} 348`,
          "pitfall-stage__scorpion",
        ),
      );

      if (!this.state.treasureCollected) {
        elements.push(
          createSvgElement("polygon", {
            class: "pitfall-stage__treasure",
            points: [
              `${PITFALL_TREASURE_RECT.x + 15},${PITFALL_TREASURE_RECT.y}`,
              `${PITFALL_TREASURE_RECT.x + 30},${PITFALL_TREASURE_RECT.y + 21}`,
              `${PITFALL_TREASURE_RECT.x + 15},${PITFALL_TREASURE_RECT.y + 42}`,
              `${PITFALL_TREASURE_RECT.x},${PITFALL_TREASURE_RECT.y + 21}`,
            ].join(" "),
          }),
        );
      }

      elements.push(
        this.path(
          "M706 390 V315 H744 V390 "
          + "M706 335 H744",
          "pitfall-stage__exit",
        ),
      );
    }

    const roomTitle = createSvgElement("text", {
      class: "pitfall-stage__room-title",
      x: PITFALL_VIEW_WIDTH / 2,
      y: 66,
      "text-anchor": "middle",
    });

    roomTitle.textContent =
      [
        "ROLLING LOGS",
        "VINE PIT",
        "CROCODILE CROSSING",
        "TREASURE AND EXIT",
      ][this.state.roomIndex] ?? "";

    elements.push(roomTitle);

    this.worldLayer.replaceChildren(
      ...elements,
    );
  }

  private renderPlayer(): void {
    if (
      this.state === null
      || this.playerGroup === null
      || this.playerBody === null
    ) {
      return;
    }

    const player = this.state.player;

    const facingTransform =
      player.facing < 0
        ? `translate(${PITFALL_PLAYER_WIDTH} 0) scale(-1 1)`
        : "";

    setSvgAttributes(
      this.playerGroup,
      {
        transform:
          `translate(${player.x} ${player.y}) `
          + facingTransform,
        opacity:
          this.state.phase === "lost"
            ? 0
            : 1,
      },
    );

    if (!player.grounded) {
      this.playerBody.setAttribute(
        "d",
        "M9 9 V21 "
        + "M9 13 L1 10 "
        + "M9 13 L17 10 "
        + "M9 21 L2 27 "
        + "M9 21 L16 27",
      );

      return;
    }

    const running =
      Math.abs(player.velocityX) > 0;

    const alternate =
      Math.floor(
        this.state.roomTimeMs / 110,
      ) % 2 === 0;

    this.playerBody.setAttribute(
      "d",
      running
        ? (
          alternate
            ? "M9 9 V21 M9 13 L2 18 M9 13 L16 15 M9 21 L1 31 M9 21 L17 26"
            : "M9 9 V21 M9 13 L2 15 M9 13 L16 18 M9 21 L1 26 M9 21 L17 31"
        )
        : "M9 9 V21 M9 13 L2 18 M9 13 L16 18 M9 21 L3 32 M9 21 L15 32",
    );
  }

  private renderStatus(): void {
    if (
      this.state === null
      || this.statusText === null
    ) {
      return;
    }

    this.statusText.textContent =
      `LIVES ${this.state.lives}`
      + `   TREASURE ${this.state.treasureCollected ? "1/1" : "0/1"}`
      + `   ROOM ${this.state.roomIndex + 1}/${PITFALL_ROOM_COUNT}`;
  }

  private renderMessage(): void {
    if (
      this.state === null
      || this.messageGroup === null
      || this.messageTitle === null
      || this.messageSubtitle === null
    ) {
      return;
    }

    let title = "";
    let subtitle = "";

    if (this.state.phase === "death") {
      title = "OUCH";
      subtitle =
        `${this.state.lives} LIVES REMAINING · +2.00`;
    } else if (this.state.phase === "won") {
      title = "YOU WIN";
      subtitle = "STAGE CLEARED";
    } else if (this.state.phase === "lost") {
      title = "YOU LOSE";
      subtitle =
        "RETURNING TO STAGE SELECT";
    }

    this.messageTitle.textContent = title;
    this.messageSubtitle.textContent =
      subtitle;

    this.messageGroup.classList.toggle(
      "pitfall-stage__message--visible",
      title.length > 0,
    );
  }

  private path(
    d: string,
    className: string,
  ): SVGPathElement {
    return createSvgElement("path", {
      class: className,
      d,
    });
  }

  private line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    className: string,
  ): SVGLineElement {
    return createSvgElement("line", {
      class: className,
      x1,
      y1,
      x2,
      y2,
    });
  }

  private cancelFrame(): void {
    if (this.frameRequestId === null) {
      return;
    }

    cancelAnimationFrame(
      this.frameRequestId,
    );

    this.frameRequestId = null;
  }

  private scheduleFrame(): void {
    if (
      !this.active
      || this.paused
      || document.hidden
      || this.frameRequestId !== null
    ) {
      return;
    }

    this.frameRequestId =
      requestAnimationFrame(
        this.handleFrame,
      );
  }
}

export function createPitfallRunStage(): Stage {
  return new PitfallRunStage();
}
