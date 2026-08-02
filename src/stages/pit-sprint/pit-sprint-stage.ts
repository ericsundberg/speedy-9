import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import { SpaceWarBuzzAudio } from "./space-war-audio";
import {
  createInitialSpaceWarState,
  getSpaceWarAiControl,
  SPACE_WAR_HEIGHT,
  SPACE_WAR_MISSILE_RADIUS,
  SPACE_WAR_STAR_X,
  SPACE_WAR_STAR_Y,
  SPACE_WAR_WIDTH,
  stepSpaceWar,
} from "./space-war-model";
import type {
  SpaceWarControl,
  SpaceWarDestruction,
  SpaceWarMissile,
  SpaceWarSide,
  SpaceWarState,
} from "./space-war-model";

const MAX_FRAME_DELTA_MS = 50;
const EXPLOSION_DURATION_MS = 540;

const CONTROL_KEYS = new Set([
  "KeyA",
  "KeyD",
  "KeyW",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
]);

const STARFIELD = [
  [44, 38], [92, 104], [132, 55], [168, 151], [206, 87],
  [247, 31], [291, 132], [329, 69], [371, 111], [414, 47],
  [459, 126], [506, 76], [553, 35], [598, 116], [646, 63],
  [704, 142], [735, 84], [57, 229], [119, 282], [179, 207],
  [232, 303], [302, 241], [445, 305], [512, 220], [577, 294],
  [651, 226], [718, 321], [76, 408], [145, 352], [219, 431],
  [278, 377], [349, 446], [427, 390], [491, 438], [560, 364],
  [624, 421], [690, 374], [742, 444],
] as const;

interface ShipElements {
  readonly group: SVGGElement;
  readonly thrust: SVGPathElement;
}

export class PitSprintStage implements Stage {
  public readonly id = "pit-sprint" as const;

  private context: StageContext | null = null;
  private root: HTMLElement | null = null;
  private playerElements: ShipElements | null = null;
  private opponentElements: ShipElements | null = null;
  private missileLayer: SVGGElement | null = null;
  private explosionLayer: SVGGElement | null = null;
  private scoreText: SVGTextElement | null = null;
  private messageGroup: SVGGElement | null = null;
  private messageText: SVGTextElement | null = null;
  private messageSubtext: SVGTextElement | null = null;
  private state: SpaceWarState | null = null;
  private audio: SpaceWarBuzzAudio | null = null;
  private abortController: AbortController | null = null;
  private readonly pressedKeys = new Set<string>();
  private readonly missileElements = new Map<number, SVGCircleElement>();
  private readonly explosionTimeouts = new Set<number>();
  private frameRequestId: number | null = null;
  private lastFrameAtMs: number | null = null;
  private active = false;
  private paused = false;
  private transitionSent = false;
  private fireQueued = false;
  private roundMessage = "";
  private lastPlayerControl: SpaceWarControl = {
    turn: 0,
    thrust: false,
    fire: false,
  };
  private lastOpponentControl: SpaceWarControl = {
    turn: 0,
    thrust: false,
    fire: false,
  };

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.state = createInitialSpaceWarState();
    this.audio = new SpaceWarBuzzAudio();
    this.abortController = new AbortController();

    const scene = document.createElement("section");
    scene.className = "space-war-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Space War. Destroy the opposing ship three times before it destroys you three times.",
    );

    const board = createSvgElement("svg", {
      class: "space-war-stage__board",
      viewBox: `0 0 ${SPACE_WAR_WIDTH} ${SPACE_WAR_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "Space combat arena with a gravity star",
    });

    const starfield = createSvgElement("g", {
      class: "space-war-stage__starfield",
      "aria-hidden": true,
    });

    for (const [x, y] of STARFIELD) {
      starfield.append(
        createSvgElement("circle", {
          cx: x,
          cy: y,
          r: (x + y) % 3 === 0 ? 1.2 : 0.75,
        }),
      );
    }

    const star = this.createGravityStar();
    const missileLayer = createSvgElement("g", {
      class: "space-war-stage__missiles",
      "aria-hidden": true,
    });
    const playerElements = this.createWedgeShip("player");
    const opponentElements = this.createNeedleShip("opponent");
    const explosionLayer = createSvgElement("g", {
      class: "space-war-stage__explosions",
      "aria-hidden": true,
    });

    const scoreText = createSvgElement("text", {
      class: "space-war-stage__score",
      x: SPACE_WAR_WIDTH / 2,
      y: 38,
      "text-anchor": "middle",
    });

    const messageGroup = createSvgElement("g", {
      class: "space-war-stage__message",
    });
    const messageBackdrop = createSvgElement("rect", {
      class: "space-war-stage__message-backdrop",
      x: 205,
      y: 185,
      width: 350,
      height: 110,
      rx: 8,
    });
    const messageText = createSvgElement("text", {
      class: "space-war-stage__message-title",
      x: SPACE_WAR_WIDTH / 2,
      y: 232,
      "text-anchor": "middle",
    });
    const messageSubtext = createSvgElement("text", {
      class: "space-war-stage__message-subtitle",
      x: SPACE_WAR_WIDTH / 2,
      y: 265,
      "text-anchor": "middle",
    });

    messageGroup.append(
      messageBackdrop,
      messageText,
      messageSubtext,
    );

    board.append(
      starfield,
      star,
      missileLayer,
      playerElements.group,
      opponentElements.group,
      explosionLayer,
      scoreText,
      messageGroup,
    );

    const instruction = document.createElement("p");
    instruction.className = "space-war-stage__instruction";
    instruction.textContent =
      "A/D OR ←/→ ROTATE · W OR ↑ THRUST · SPACE FIRE · FIRST TO 3";

    scene.append(board, instruction);
    context.root.replaceChildren(scene);

    this.root = scene;
    this.playerElements = playerElements;
    this.opponentElements = opponentElements;
    this.missileLayer = missileLayer;
    this.explosionLayer = explosionLayer;
    this.scoreText = scoreText;
    this.messageGroup = messageGroup;
    this.messageText = messageText;
    this.messageSubtext = messageSubtext;

    const signal = this.abortController.signal;

    window.addEventListener("keydown", this.handleKeyDown, { signal });
    window.addEventListener("keyup", this.handleKeyUp, { signal });
    window.addEventListener("blur", this.handleBlur, { signal });
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
      { signal },
    );

    this.render();
  }

  public start(): void {
    if (this.context === null || this.state === null) {
      throw new Error("Space War must be mounted before it starts.");
    }

    this.active = true;
    this.paused = false;
    this.transitionSent = false;
    this.fireQueued = false;
    this.lastFrameAtMs = performance.now();
    this.audio?.playStart();
    this.scheduleFrame();
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.clearTemporaryEffects();
    this.state = createInitialSpaceWarState();
    this.roundMessage = "";
    this.pressedKeys.clear();
    this.active = true;
    this.paused = false;
    this.transitionSent = false;
    this.fireQueued = false;
    this.lastFrameAtMs = performance.now();
    this.audio?.stopAllThrust();
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
    this.lastFrameAtMs = null;
    this.audio?.stopAllThrust();

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }

  public resume(): void {
    if (!this.active || !this.paused) {
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
    this.fireQueued = false;
    this.pressedKeys.clear();

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    this.abortController?.abort();
    this.abortController = null;
    this.clearTemporaryEffects();
    this.audio?.destroy();
    this.audio = null;
    this.root?.remove();

    this.context = null;
    this.root = null;
    this.playerElements = null;
    this.opponentElements = null;
    this.missileLayer = null;
    this.explosionLayer = null;
    this.scoreText = null;
    this.messageGroup = null;
    this.messageText = null;
    this.messageSubtext = null;
    this.state = null;
    this.lastFrameAtMs = null;
    this.roundMessage = "";
  }

  private createGravityStar(): SVGGElement {
    const group = createSvgElement("g", {
      class: "space-war-stage__gravity-star",
      transform: `translate(${SPACE_WAR_STAR_X} ${SPACE_WAR_STAR_Y})`,
      "aria-hidden": true,
    });

    const rotor = createSvgElement("g", {
      class: "space-war-stage__gravity-star-rotor",
    });

    /*
     * A multiline vector star in the style of early
     * Spacewar-derived arcade displays.
     *
     * The outer group remains permanently translated to the
     * physical gravity center. Only this inner rotor turns.
     */
    const starLines = [
      [0, 36],
      [Math.PI / 14, 27],
      [Math.PI / 7, 32],
      [Math.PI / 4, 25],
      [Math.PI / 2.8, 35],
      [Math.PI / 2.15, 29],
      [Math.PI / 1.72, 33],
      [Math.PI / 1.38, 26],
      [Math.PI / 1.12, 31],
    ] as const;

    for (const [angle, length] of starLines) {
      const x = Math.cos(angle) * length;
      const y = Math.sin(angle) * length;

      rotor.append(
        createSvgElement("line", {
          class: "space-war-stage__gravity-star-ray",
          x1: -x,
          y1: -y,
          x2: x,
          y2: y,
        }),
      );
    }

    group.append(rotor);

    return group;
  }

  private createWedgeShip(side: SpaceWarSide): ShipElements {
    const group = createSvgElement("g", {
      class: `space-war-stage__ship space-war-stage__ship--${side}`,
      "aria-hidden": true,
    });
    const body = createSvgElement("path", {
      class: "space-war-stage__ship-body",
      d: "M0 -11 L9 9 L0 5.5 L-9 9 Z M0 -11 L0 5.5",
    });
    const thrust = createSvgElement("path", {
      class: "space-war-stage__thrust",
      d: "M-4.5 8 L0 17 L4.5 8 M-2 9 L0 14 L2 9",
    });

    group.append(thrust, body);
    return { group, thrust };
  }

  private createNeedleShip(side: SpaceWarSide): ShipElements {
    const group = createSvgElement("g", {
      class: `space-war-stage__ship space-war-stage__ship--${side}`,
      "aria-hidden": true,
    });
    const body = createSvgElement("path", {
      class: "space-war-stage__ship-body",
      d: "M0 -13 L4.5 7.5 L2 10 L0 6.5 L-2 10 L-4.5 7.5 Z M0 -13 L0 6.5",
    });
    const thrust = createSvgElement("path", {
      class: "space-war-stage__thrust",
      d: "M-2.7 9 L0 18 L2.7 9 M-1.4 10 L0 15 L1.4 10",
    });

    group.append(thrust, body);
    return { group, thrust };
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

    if (!CONTROL_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();

    if (event.code === "Space" && !event.repeat) {
      this.fireQueued = true;
    }

    this.pressedKeys.add(event.code);
  };

  private readonly handleKeyUp = (
    event: KeyboardEvent,
  ): void => {
    if (!CONTROL_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.pressedKeys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.pressedKeys.clear();
    this.audio?.stopAllThrust();
  };

  private readonly handleVisibilityChange = (): void => {
    this.pressedKeys.clear();
    this.audio?.stopAllThrust();
    this.lastFrameAtMs = null;

    if (document.hidden) {
      if (this.frameRequestId !== null) {
        cancelAnimationFrame(this.frameRequestId);
        this.frameRequestId = null;
      }

      return;
    }

    if (this.active && !this.paused) {
      this.lastFrameAtMs = performance.now();
      this.scheduleFrame();
    }
  };

  private readonly handleFrame = (nowMs: number): void => {
    this.frameRequestId = null;

    if (
      !this.active
      || this.paused
      || document.hidden
      || this.state === null
    ) {
      return;
    }

    const previousFrameAtMs = this.lastFrameAtMs ?? nowMs;
    const deltaMs = Math.min(
      MAX_FRAME_DELTA_MS,
      Math.max(0, nowMs - previousFrameAtMs),
    );

    this.lastFrameAtMs = nowMs;
    this.lastPlayerControl = this.readPlayerControl();
    this.lastOpponentControl = getSpaceWarAiControl(this.state);

    const result = stepSpaceWar(
      this.state,
      {
        player: this.lastPlayerControl,
        opponent: this.lastOpponentControl,
      },
      deltaMs,
    );

    this.state = result.state;
    this.processEvents(
      result.events.firedBy,
      result.events.destroyed,
      result.events.roundResolved,
      result.events.roundWinner,
      result.events.matchOutcome,
    );
    this.render();

    if (
      this.state.phase === "match-over"
      && this.state.phaseRemainingMs <= 0
    ) {
      this.finishMatch();
      return;
    }

    this.scheduleFrame();
  };

  private readPlayerControl(): SpaceWarControl {
    const left =
      this.pressedKeys.has("KeyA")
      || this.pressedKeys.has("ArrowLeft");
    const right =
      this.pressedKeys.has("KeyD")
      || this.pressedKeys.has("ArrowRight");

    const fire = this.fireQueued;
    this.fireQueued = false;

    return {
      turn: Number(right) - Number(left),
      thrust:
        this.pressedKeys.has("KeyW")
        || this.pressedKeys.has("ArrowUp"),
      fire,
    };
  }

  private processEvents(
    firedBy: readonly SpaceWarSide[],
    destroyed: readonly SpaceWarDestruction[],
    roundResolved: boolean,
    roundWinner: SpaceWarSide | null,
    matchOutcome: SpaceWarState["outcome"] | null,
  ): void {
    for (const side of firedBy) {
      this.audio?.playFire(side);
    }

    for (const destruction of destroyed) {
      this.audio?.playExplosion(destruction.side);
      this.createExplosion(destruction);
    }

    if (!roundResolved) {
      return;
    }

    if (roundWinner === "player") {
      this.roundMessage = "PLAYER SCORES";
    } else if (roundWinner === "opponent") {
      this.roundMessage = "OPPONENT SCORES";
    } else {
      this.roundMessage = "MUTUAL DESTRUCTION";
    }

    if (matchOutcome === "player-won") {
      this.audio?.playWin();
    } else if (matchOutcome === "player-lost") {
      this.audio?.playLose();
    } else {
      this.audio?.playPoint();
    }
  }

  private render(): void {
    if (
      this.state === null
      || this.playerElements === null
      || this.opponentElements === null
    ) {
      return;
    }

    this.renderShip(
      this.playerElements,
      this.state.player,
      this.lastPlayerControl.thrust,
    );
    this.renderShip(
      this.opponentElements,
      this.state.opponent,
      this.lastOpponentControl.thrust,
    );
    this.renderMissiles(this.state.missiles);

    if (this.scoreText !== null) {
      this.scoreText.textContent =
        `${this.state.playerScore}     ${this.state.opponentScore}`;
    }

    this.audio?.setThrusting(
      "player",
      this.state.phase === "playing"
      && this.state.player.alive
      && this.lastPlayerControl.thrust
      && !this.paused,
    );
    this.audio?.setThrusting(
      "opponent",
      this.state.phase === "playing"
      && this.state.opponent.alive
      && this.lastOpponentControl.thrust
      && !this.paused,
    );

    this.renderMessage();
  }

  private renderShip(
    elements: ShipElements,
    ship: SpaceWarState["player"],
    thrusting: boolean,
  ): void {
    const angleDegrees = ship.angleRadians * 180 / Math.PI;

    setSvgAttributes(elements.group, {
      transform: `translate(${ship.x} ${ship.y}) rotate(${angleDegrees})`,
      opacity: ship.alive ? 1 : 0,
    });
    elements.thrust.classList.toggle(
      "space-war-stage__thrust--visible",
      ship.alive && thrusting,
    );
  }

  private renderMissiles(
    missiles: readonly SpaceWarMissile[],
  ): void {
    if (this.missileLayer === null) {
      return;
    }

    const activeIds = new Set<number>();

    for (const missile of missiles) {
      activeIds.add(missile.id);

      let element = this.missileElements.get(missile.id);

      if (element === undefined) {
        element = createSvgElement("circle", {
          class:
            `space-war-stage__missile space-war-stage__missile--${missile.owner}`,
          r: SPACE_WAR_MISSILE_RADIUS,
        });
        this.missileElements.set(missile.id, element);
        this.missileLayer.append(element);
      }

      setSvgAttributes(element, {
        cx: missile.x,
        cy: missile.y,
      });
    }

    for (const [id, element] of this.missileElements) {
      if (activeIds.has(id)) {
        continue;
      }

      element.remove();
      this.missileElements.delete(id);
    }
  }

  private renderMessage(): void {
    if (
      this.state === null
      || this.messageGroup === null
      || this.messageText === null
      || this.messageSubtext === null
    ) {
      return;
    }

    let title = "";
    let subtitle = "";

    if (this.state.phase === "countdown") {
      title = "GET READY";
      subtitle = "FIRST TO 3";
    } else if (this.state.phase === "round-over") {
      title = this.roundMessage;
      subtitle = "NEXT ROUND";
    } else if (this.state.phase === "match-over") {
      title =
        this.state.outcome === "player-won"
          ? "YOU WIN"
          : "YOU LOSE";
      subtitle =
        this.state.outcome === "player-won"
          ? "STAGE CLEARED"
          : "RETURNING TO STAGE SELECT";
    }

    this.messageText.textContent = title;
    this.messageSubtext.textContent = subtitle;
    this.messageGroup.classList.toggle(
      "space-war-stage__message--visible",
      title.length > 0,
    );
  }

  private createExplosion(
    destruction: SpaceWarDestruction,
  ): void {
    if (this.explosionLayer === null) {
      return;
    }

    const group = createSvgElement("g", {
      class:
        `space-war-stage__explosion space-war-stage__explosion--${destruction.side}`,
      transform: `translate(${destruction.x} ${destruction.y})`,
    });

    for (let index = 0; index < 14; index += 1) {
      const angle = index / 14 * Math.PI * 2;
      const inner = 4 + index % 3;
      const outer = 21 + index % 4 * 5;

      group.append(
        createSvgElement("line", {
          x1: Math.cos(angle) * inner,
          y1: Math.sin(angle) * inner,
          x2: Math.cos(angle) * outer,
          y2: Math.sin(angle) * outer,
        }),
      );
    }

    this.explosionLayer.append(group);

    const timeoutId = window.setTimeout(
      () => {
        group.remove();
        this.explosionTimeouts.delete(timeoutId);
      },
      EXPLOSION_DURATION_MS,
    );

    this.explosionTimeouts.add(timeoutId);
  }

  private finishMatch(): void {
    if (
      this.transitionSent
      || this.context === null
      || this.state === null
    ) {
      return;
    }

    this.transitionSent = true;
    this.active = false;
    this.audio?.stopAllThrust();

    if (this.state.outcome === "player-won") {
      this.context.complete();
    } else {
      this.context.fail();
    }
  }

  private clearTemporaryEffects(): void {
    for (const timeoutId of this.explosionTimeouts) {
      window.clearTimeout(timeoutId);
    }

    this.explosionTimeouts.clear();
    this.explosionLayer?.replaceChildren();

    for (const element of this.missileElements.values()) {
      element.remove();
    }

    this.missileElements.clear();
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

    this.frameRequestId = requestAnimationFrame(
      this.handleFrame,
    );
  }
}

export function createPitSprintStage(): Stage {
  return new PitSprintStage();
}
