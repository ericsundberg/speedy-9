import {
  Mulberry32Random,
} from "../../core/random";
import {
  clientPointToSvg,
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  PongAudio,
} from "../pong-blitz/pong-audio";
import {
  DeadeyeAudio,
} from "./deadeye-audio";
import {
  DEADEYE_BULLSEYE_GOAL,
  DEADEYE_TARGET_AREA,
  classifyDeadeyeShot,
  createDeadeyeTargetPosition,
  resolveDeadeyeShot,
} from "./deadeye-model";
import type {
  DeadeyePoint,
  DeadeyeShotResult,
} from "./deadeye-model";

const DEADEYE_VIEW_WIDTH = 760;
const DEADEYE_VIEW_HEIGHT = 460;

const TARGET_RESPAWN_DELAY_MS = 150;

const TARGET_RING_RADII = [28, 21, 14, 7] as const;
const TARGET_HATCH_PATTERN_ID = "deadeye-target-hatch";

const TARGET_POINT_COUNT = 12;

function createPolygonPoints(
  radius: number,
): string {
  const points: string[] = [];

  for (
    let index = 0;
    index < TARGET_POINT_COUNT;
    index += 1
  ) {
    const angle =
      -Math.PI / 2
      + index
        * Math.PI
        * 2
        / TARGET_POINT_COUNT;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    points.push(`${x},${y}`);
  }

  return points.join(" ");
}

function createPolygonPath(
  radius: number,
  reverse = false,
): string {
  const points: string[] = [];

  for (
    let index = 0;
    index < TARGET_POINT_COUNT;
    index += 1
  ) {
    const pointIndex = reverse
      ? TARGET_POINT_COUNT - 1 - index
      : index;

    const angle =
      -Math.PI / 2
      + pointIndex
        * Math.PI
        * 2
        / TARGET_POINT_COUNT;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    points.push(
      `${index === 0 ? "M" : "L"} ${x} ${y}`,
    );
  }

  points.push("Z");

  return points.join(" ");
}

function createAnnulusPath(
  outerRadius: number,
  innerRadius: number,
): string {
  return [
    createPolygonPath(outerRadius),
    createPolygonPath(innerRadius, true),
  ].join(" ");
}

export class DeadeyeStage implements Stage {
  public readonly id = "deadeye" as const;

  private context: StageContext | null = null;
  private random: Mulberry32Random | null = null;
  private audio: DeadeyeAudio | null = null;

  private status: HTMLElement | null = null;
  private bullseyeCounter: HTMLElement | null = null;
  private bullseyeSlots: HTMLElement[] = [];
  private playfield: SVGSVGElement | null = null;
  private targetElement: SVGGElement | null = null;
  private targetPosition: DeadeyePoint | null = null;
  private abortController: AbortController | null = null;
  private targetSpawnTimeoutId: number | null = null;

  private bullseyeStreak = 0;
  private active = false;
  private paused = false;
  private targetSpawnPending = false;
  private shotLocked = false;
  private won = false;
  private completionSent = false;

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.random = new Mulberry32Random(
      context.stageSeed,
    );
    this.audio = new DeadeyeAudio();

    this.bullseyeStreak = 0;
    this.active = false;
    this.paused = false;
    this.targetSpawnPending = false;
    this.shotLocked = false;
    this.won = false;
    this.completionSent = false;

    const scene = document.createElement("section");
    scene.className = "placeholder-stage deadeye-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-labelledby",
      "deadeye-stage-title",
    );

    const title = document.createElement("h1");
    title.id = "deadeye-stage-title";
    title.className = "placeholder-stage__title";
    title.textContent = "DEAD EYE";

    const instruction = document.createElement("p");
    instruction.className =
      "placeholder-stage__description deadeye-stage__instruction";
    instruction.textContent =
      "HIT FIVE BULLSEYES IN A ROW TO WIN";

    const bullseyeCounter = document.createElement("div");
    bullseyeCounter.className =
      "deadeye-stage__bullseye-counter";

    const bullseyeSlots: HTMLElement[] = [];

    for (
      let index = 0;
      index < DEADEYE_BULLSEYE_GOAL;
      index += 1
    ) {
      const slot = document.createElement("span");
      slot.className = "deadeye-stage__bullseye-slot";
      slot.textContent = "B";
      slot.setAttribute("aria-hidden", "true");

      bullseyeSlots.push(slot);
      bullseyeCounter.append(slot);
    }

    const playfield = createSvgElement("svg", {
      class: "deadeye-stage__playfield",
      viewBox:
        `0 0 ${DEADEYE_VIEW_WIDTH} ${DEADEYE_VIEW_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "Dead Eye target field",
    });

    const definitions = createSvgElement("defs");

    const hatchPattern = createSvgElement("pattern", {
      id: TARGET_HATCH_PATTERN_ID,
      width: 7,
      height: 7,
      patternUnits: "userSpaceOnUse",
    });

    const hatchLine = createSvgElement("line", {
      class: "deadeye-stage__target-hatch-line",
      x1: 0,
      y1: 7,
      x2: 7,
      y2: 0,
    });

    hatchPattern.append(hatchLine);
    definitions.append(hatchPattern);

    const fieldBoundary = createSvgElement("rect", {
      class: "deadeye-stage__field-boundary",
      x: 2,
      y: 2,
      width: DEADEYE_VIEW_WIDTH - 4,
      height: DEADEYE_VIEW_HEIGHT - 4,
    });

    const safeTargetArea = createSvgElement("rect", {
      class: "deadeye-stage__safe-area",
      x: DEADEYE_TARGET_AREA.x,
      y: DEADEYE_TARGET_AREA.y,
      width: DEADEYE_TARGET_AREA.width,
      height: DEADEYE_TARGET_AREA.height,
      "aria-hidden": true,
    });

    const target = createSvgElement("g", {
      class: "deadeye-stage__target",
      visibility: "hidden",
      "aria-hidden": true,
    });

    const outerShading = createSvgElement("path", {
      class: "deadeye-stage__target-shading",
      d: createAnnulusPath(28, 21),
      fill: `url(#${TARGET_HATCH_PATTERN_ID})`,
      "fill-rule": "evenodd",
    });

    const innerShading = createSvgElement("path", {
      class: "deadeye-stage__target-shading",
      d: createAnnulusPath(14, 7),
      fill: `url(#${TARGET_HATCH_PATTERN_ID})`,
      "fill-rule": "evenodd",
    });

    target.append(
      outerShading,
      innerShading,
    );

    for (
      let index = 0;
      index < TARGET_RING_RADII.length;
      index += 1
    ) {
      const radius = TARGET_RING_RADII[index];

      if (radius === undefined) {
        continue;
      }

      const ring = createSvgElement("polygon", {
        class:
          index % 2 === 1
            ? "deadeye-stage__target-ring deadeye-stage__target-ring--alternate"
            : "deadeye-stage__target-ring",
        points: createPolygonPoints(radius),
      });

      target.append(ring);
    }

    playfield.append(
      definitions,
      fieldBoundary,
      safeTargetArea,
      target,
    );

    const status = document.createElement("p");
    status.className = "placeholder-stage__status";
    status.textContent = "READY";

    scene.append(
      title,
      instruction,
      bullseyeCounter,
      playfield,
      status,
    );

    context.root.replaceChildren(scene);

    this.status = status;
    this.bullseyeCounter = bullseyeCounter;
    this.bullseyeSlots = bullseyeSlots;
    this.playfield = playfield;
    this.targetElement = target;

    const abortController = new AbortController();
    this.abortController = abortController;

    playfield.addEventListener(
      "click",
      this.handlePlayfieldClick,
      { signal: abortController.signal },
    );

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
      { signal: abortController.signal },
    );

    this.renderBullseyeCounter();
    this.spawnTarget();
  }

  public start(): void {
    if (this.context === null || this.won) {
      return;
    }

    this.active = true;
    this.paused = false;
    this.setStatus("ACTIVE");
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.clearTargetSpawnTimeout();

    this.bullseyeStreak = 0;
    this.active = true;
    this.paused = false;
    this.targetSpawnPending = false;
    this.shotLocked = false;
    this.won = false;
    this.completionSent = false;

    this.renderBullseyeCounter();
    this.spawnTarget();
    this.setStatus("ACTIVE");
  }

  public pause(): void {
    if (
      !this.active
      || this.paused
      || this.won
    ) {
      return;
    }

    this.paused = true;
    this.clearTargetSpawnTimeout();
    this.setStatus("PAUSED");
  }

  public resume(): void {
    if (
      this.context === null
      || !this.active
      || !this.paused
      || this.won
    ) {
      return;
    }

    this.paused = false;
    this.setStatus("ACTIVE");

    if (
      this.targetSpawnPending
      && this.targetPosition === null
    ) {
      this.scheduleTargetSpawn();
    }
  }

  public destroy(): void {
    this.abortController?.abort();
    this.abortController = null;

    this.clearTargetSpawnTimeout();

    this.audio?.destroy();
    this.audio = null;

    this.context = null;
    this.random = null;
    this.status = null;
    this.bullseyeCounter = null;
    this.bullseyeSlots = [];
    this.playfield = null;
    this.targetElement = null;
    this.targetPosition = null;

    this.bullseyeStreak = 0;
    this.active = false;
    this.paused = false;
    this.targetSpawnPending = false;
    this.shotLocked = false;
    this.won = false;
    this.completionSent = false;
  }

  private createTargetPosition(): DeadeyePoint | null {
    if (this.random === null) {
      return null;
    }

    return createDeadeyeTargetPosition(
      this.random,
    );
  }

  private spawnTarget(): void {
    if (this.won) {
      return;
    }

    const position = this.createTargetPosition();

    if (
      position === null
      || this.targetElement === null
    ) {
      return;
    }

    this.targetPosition = position;
    this.targetSpawnPending = false;
    this.shotLocked = false;

    setSvgAttributes(
      this.targetElement,
      {
        transform:
          `translate(${position.x} ${position.y})`,
        visibility: "visible",
      },
    );
  }

  private removeTarget(): void {
    this.targetPosition = null;

    if (this.targetElement !== null) {
      setSvgAttributes(
        this.targetElement,
        {
          visibility: "hidden",
        },
      );
    }
  }

  private scheduleTargetSpawn(): void {
    this.clearTargetSpawnTimeout();
    this.targetSpawnPending = true;

    if (
      !this.active
      || this.paused
      || this.won
    ) {
      return;
    }

    this.targetSpawnTimeoutId = window.setTimeout(
      () => {
        this.targetSpawnTimeoutId = null;

        if (
          !this.active
          || this.paused
          || this.won
        ) {
          return;
        }

        this.spawnTarget();
      },
      TARGET_RESPAWN_DELAY_MS,
    );
  }

  private clearTargetSpawnTimeout(): void {
    if (this.targetSpawnTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.targetSpawnTimeoutId);
    this.targetSpawnTimeoutId = null;
  }

  private renderBullseyeCounter(): void {
    for (
      let index = 0;
      index < this.bullseyeSlots.length;
      index += 1
    ) {
      const slot = this.bullseyeSlots[index];

      if (slot === undefined) {
        continue;
      }

      const earned = index < this.bullseyeStreak;

      slot.classList.toggle(
        "deadeye-stage__bullseye-slot--earned",
        earned,
      );
    }

    this.bullseyeCounter?.setAttribute(
      "aria-label",
      `Bullseye streak: ${this.bullseyeStreak} of ${DEADEYE_BULLSEYE_GOAL}`,
    );
  }

  private setStatus(value: string): void {
    if (this.status !== null) {
      this.status.textContent = value;
    }
  }

  private playShotResultSound(
    result: DeadeyeShotResult,
  ): void {
    switch (result) {
      case "bullseye":
        this.audio?.playBullseye();
        break;

      case "target-hit":
        this.audio?.playTargetHit();
        break;

      case "miss":
        this.audio?.playMiss();
        break;
    }
  }

  private applyShotResult(
    result: DeadeyeShotResult,
  ): void {
    const progress = resolveDeadeyeShot(
      this.bullseyeStreak,
      result,
    );

    this.bullseyeStreak = progress.streak;

    switch (result) {
      case "bullseye":
        this.setStatus(
          `BULLSEYE: ${this.bullseyeStreak} / ${DEADEYE_BULLSEYE_GOAL}`,
        );
        break;

      case "target-hit":
        this.setStatus(
          "TARGET HIT — STREAK RESET",
        );
        break;

      case "miss":
        this.setStatus(
          "MISS — STREAK RESET",
        );
        break;
    }

    this.renderBullseyeCounter();
  }

  private endGame(): void {
    if (
      this.won
      || this.completionSent
      || this.context === null
    ) {
      return;
    }

    const complete = this.context.complete;

    this.clearTargetSpawnTimeout();

    this.won = true;
    this.active = false;
    this.paused = false;
    this.targetSpawnPending = false;
    this.shotLocked = true;

    this.removeTarget();
    this.setStatus("FIVE BULLSEYES");

    /*
     * PongAudio releases its victory AudioContext after the
     * sound finishes, so stage teardown will not cut it off.
     */
    const victoryAudio = new PongAudio();
    victoryAudio.playWinBuzz();

    this.completionSent = true;
    complete();
  }

  private readonly handlePlayfieldClick = (
    event: MouseEvent,
  ): void => {
    if (
      !this.active
      || this.paused
      || this.won
      || this.shotLocked
      || this.playfield === null
      || this.targetPosition === null
    ) {
      return;
    }

    const shotPosition = clientPointToSvg(
      this.playfield,
      {
        x: event.clientX,
        y: event.clientY,
      },
    );

    if (shotPosition === null) {
      return;
    }

    this.shotLocked = true;
    this.audio?.playShot();

    const result = classifyDeadeyeShot(
      shotPosition,
      this.targetPosition,
    );

    this.playShotResultSound(result);
    this.applyShotResult(result);

    if (this.bullseyeStreak >= DEADEYE_BULLSEYE_GOAL) {
      this.endGame();
      return;
    }

    this.removeTarget();
    this.scheduleTargetSpawn();
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (
      event.code !== "KeyR"
      || event.repeat
      || this.paused
    ) {
      return;
    }

    event.preventDefault();
    this.restart();
  };
}

export function createDeadeyeStage(): Stage {
  return new DeadeyeStage();
}