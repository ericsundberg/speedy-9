import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  createInitialVectorMazeState,
  getVectorMazeDirection,
  stepVectorMaze,
  VECTOR_MAZE_EXIT_POSITION,
  VECTOR_MAZE_EXIT_RECT,
  VECTOR_MAZE_PLAYER_RADIUS,
  VECTOR_MAZE_START_POSITION,
  VECTOR_MAZE_VIEW_HEIGHT,
  VECTOR_MAZE_VIEW_WIDTH,
  VECTOR_MAZE_WALLS,
} from "./vector-maze-model";
import type {
  VectorMazeState,
} from "./vector-maze-model";

const MAX_FRAME_DELTA_MS = 50;

export const VECTOR_MAZE_CONTROLS = {
  up: {
    primary: "KeyW",
    secondary: "ArrowUp",
  },
  down: {
    primary: "KeyS",
    secondary: "ArrowDown",
  },
  left: {
    primary: "KeyA",
    secondary: "ArrowLeft",
  },
  right: {
    primary: "KeyD",
    secondary: "ArrowRight",
  },
} as const;

type VectorMazeControl = keyof typeof VECTOR_MAZE_CONTROLS;

const MOVEMENT_KEYS = new Set<string>(
  Object.values(VECTOR_MAZE_CONTROLS).flatMap((binding) => [
    binding.primary,
    binding.secondary,
  ]),
);

export class VectorMazeStage implements Stage {
  public readonly id = "vector-maze" as const;

  private context: StageContext | null = null;
  private root: HTMLElement | null = null;
  private playerElement: SVGCircleElement | null = null;
  private statusText: HTMLElement | null = null;
  private state: VectorMazeState | null = null;
  private abortController: AbortController | null = null;
  private readonly pressedKeys = new Set<string>();
  private frameRequestId: number | null = null;
  private lastFrameAtMs: number | null = null;
  private active = false;
  private paused = false;
  private completionSent = false;

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.state = createInitialVectorMazeState();

    const scene = document.createElement("section");
    scene.className = "vector-maze-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Vector Maze. Guide the dot from the lower entrance to the upper exit.",
    );

    const board = createSvgElement("svg", {
      class: "vector-maze-stage__board",
      viewBox:
        `0 0 ${VECTOR_MAZE_VIEW_WIDTH} ${VECTOR_MAZE_VIEW_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "Fixed maze playing field",
    });

    const startRing = createSvgElement("circle", {
      class: "vector-maze-stage__start",
      cx: VECTOR_MAZE_START_POSITION.x,
      cy: VECTOR_MAZE_START_POSITION.y,
      r: VECTOR_MAZE_PLAYER_RADIUS + 6,
    });

    const exitStem = createSvgElement("line", {
      class: "vector-maze-stage__exit-stem",
      x1: VECTOR_MAZE_EXIT_POSITION.x,
      y1: VECTOR_MAZE_EXIT_RECT.y + VECTOR_MAZE_EXIT_RECT.height,
      x2: VECTOR_MAZE_EXIT_POSITION.x,
      y2: 54,
    });

    const exit = createSvgElement("rect", {
      class: "vector-maze-stage__exit",
      x: VECTOR_MAZE_EXIT_RECT.x,
      y: VECTOR_MAZE_EXIT_RECT.y,
      width: VECTOR_MAZE_EXIT_RECT.width,
      height: VECTOR_MAZE_EXIT_RECT.height,
    });

    const wallGroup = createSvgElement("g", {
      class: "vector-maze-stage__walls",
      "aria-hidden": true,
    });

    for (const wall of VECTOR_MAZE_WALLS) {
      wallGroup.append(
        createSvgElement("rect", {
          class: "vector-maze-stage__wall",
          x: wall.x,
          y: wall.y,
          width: wall.width,
          height: wall.height,
        }),
      );
    }

    const player = createSvgElement("circle", {
      class: "vector-maze-stage__player",
      cx: VECTOR_MAZE_START_POSITION.x,
      cy: VECTOR_MAZE_START_POSITION.y,
      r: VECTOR_MAZE_PLAYER_RADIUS,
    });

    board.append(
      startRing,
      exitStem,
      exit,
      wallGroup,
      player,
    );

    const instruction = document.createElement("p");
    instruction.className = "vector-maze-stage__instruction";
    instruction.textContent =
      "WASD / ARROWS · GUIDE THE DOT · R RESTARTS";

    const status = document.createElement("span");
    status.className = "vector-maze-stage__status";
    status.textContent = "RUNNING";
    instruction.append(" · ", status);

    scene.append(board, instruction);
    context.root.append(scene);

    this.root = scene;
    this.playerElement = player;
    this.statusText = status;

    const abortController = new AbortController();
    this.abortController = abortController;

    window.addEventListener("keydown", this.handleKeyDown, {
      signal: abortController.signal,
    });
    window.addEventListener("keyup", this.handleKeyUp, {
      signal: abortController.signal,
    });
    window.addEventListener("blur", this.handleBlur, {
      signal: abortController.signal,
    });
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
      { signal: abortController.signal },
    );

    this.render();
  }

  public start(): void {
    if (this.context === null || this.state === null) {
      return;
    }

    this.active = true;
    this.paused = false;
    this.lastFrameAtMs = null;
    this.setStatus("RUNNING");
    this.scheduleFrame();
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.state = createInitialVectorMazeState();
    this.completionSent = false;
    this.active = true;
    this.paused = false;
    this.lastFrameAtMs = null;
    this.pressedKeys.clear();
    this.setStatus("RUNNING");
    this.render();
    this.scheduleFrame();
  }

  public pause(): void {
    this.paused = true;
    this.pressedKeys.clear();
    this.lastFrameAtMs = null;
    this.cancelFrame();
    this.setStatus("PAUSED");
  }

  public resume(): void {
    if (this.state?.complete === true) {
      return;
    }

    this.active = true;
    this.paused = false;
    this.lastFrameAtMs = null;
    this.setStatus("RUNNING");
    this.scheduleFrame();
  }

  public destroy(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.cancelFrame();
    this.pressedKeys.clear();
    this.root?.remove();

    this.context = null;
    this.root = null;
    this.playerElement = null;
    this.statusText = null;
    this.state = null;
    this.lastFrameAtMs = null;
    this.active = false;
    this.paused = false;
    this.completionSent = false;
  }

  private isPressed(control: VectorMazeControl): boolean {
    const binding = VECTOR_MAZE_CONTROLS[control];

    return (
      this.pressedKeys.has(binding.primary)
      || this.pressedKeys.has(binding.secondary)
    );
  }

  private readDirection(): { readonly x: number; readonly y: number } {
    return getVectorMazeDirection({
      up: this.isPressed("up"),
      down: this.isPressed("down"),
      left: this.isPressed("left"),
      right: this.isPressed("right"),
    });
  }

  private render(): void {
    if (this.state === null || this.playerElement === null) {
      return;
    }

    setSvgAttributes(this.playerElement, {
      cx: this.state.player.x,
      cy: this.state.player.y,
    });
  }

  private completeStage(): void {
    if (this.completionSent || this.context === null) {
      return;
    }

    this.completionSent = true;
    this.active = false;
    this.cancelFrame();
    this.setStatus("COMPLETE");
    this.context.complete();
  }

  private setStatus(value: string): void {
    if (this.statusText !== null) {
      this.statusText.textContent = value;
    }
  }

  private cancelFrame(): void {
    if (this.frameRequestId === null) {
      return;
    }

    cancelAnimationFrame(this.frameRequestId);
    this.frameRequestId = null;
  }

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (event.code === "KeyR") {
      if (!event.repeat && !this.paused) {
        event.preventDefault();
        this.restart();
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
      this.cancelFrame();
      return;
    }

    this.scheduleFrame();
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

    const deltaMs =
      this.lastFrameAtMs === null
        ? 0
        : Math.min(
            MAX_FRAME_DELTA_MS,
            Math.max(0, nowMs - this.lastFrameAtMs),
          );

    this.lastFrameAtMs = nowMs;

    if (deltaMs > 0) {
      this.state = stepVectorMaze(
        this.state,
        this.readDirection(),
        deltaMs / 1000,
      );
      this.render();

      if (this.state.complete) {
        this.completeStage();
        return;
      }
    }

    this.scheduleFrame();
  };

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

export function createVectorMazeStage(): Stage {
  return new VectorMazeStage();
}
