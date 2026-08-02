import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import { PongAudio } from "../pong-blitz/pong-audio";
import { VectorMazeScuffleAudio } from "./vector-maze-audio";
import {
  createInitialVectorMazeState,
  getVectorMazeDirection,
  stepVectorMaze,
  VECTOR_MAZE_EXIT_POSITION,
  VECTOR_MAZE_START_POSITION,
  VECTOR_MAZE_VIEW_HEIGHT,
  VECTOR_MAZE_VIEW_WIDTH,
  VECTOR_MAZE_WALLS,
} from "./vector-maze-model";
import type {
  VectorMazeState,
} from "./vector-maze-model";

const MAX_FRAME_DELTA_MS = 50;
const WALK_FRAME_INTERVAL_MS = 120;

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

type VectorMazeMouseDirection =
  | "up"
  | "down"
  | "left"
  | "right";

interface VectorMazeMouseVariant {
  readonly element: SVGGElement;
  readonly frames: readonly [SVGGElement, SVGGElement];
}

function createMousePolygon(
  points: string,
  accent = false,
): SVGPolygonElement {
  return createSvgElement("polygon", {
    class: accent
      ? "vector-maze-stage__mouse-accent"
      : "vector-maze-stage__mouse-wire",
    points,
  });
}

function createMousePolyline(
  points: string,
  accent = false,
): SVGPolylineElement {
  return createSvgElement("polyline", {
    class: accent
      ? "vector-maze-stage__mouse-accent"
      : "vector-maze-stage__mouse-wire",
    points,
  });
}

function createMouseWalkFrame(
  tailPoints: string,
  legs: readonly [string, string],
): SVGGElement {
  const frame = createSvgElement("g", {
    class: "vector-maze-stage__mouse-walk-frame",
  });

  frame.append(
    createMousePolyline(tailPoints),
    createMousePolyline(legs[0]),
    createMousePolyline(legs[1]),
  );

  return frame;
}

function createUpMouseVariant(): VectorMazeMouseVariant {
  const element = createSvgElement("g", {
    class: "vector-maze-stage__mouse-direction",
    "data-direction": "up",
  });

  const frameZero = createMouseWalkFrame(
    "0,9 -5,13 -7,17 -3,20 1,19",
    [
      "-4,7 -6,10 -8,12",
      "4,7 6,10 8,12",
    ],
  );

  const frameOne = createMouseWalkFrame(
    "0,9 5,13 7,17 3,20 -1,19",
    [
      "-4,7 -2,10 -1,13",
      "4,7 2,10 1,13",
    ],
  );

  element.append(
    createMousePolygon(
      "-7,7 -7,1 -5,-5 -2,-8 0,-10 2,-8 5,-5 7,1 7,7 3,11 -3,11",
    ),
    createMousePolygon(
      "-5,-5 0,-12 5,-5 4,-1 0,2 -4,-1",
    ),
    createMousePolygon(
      "-7,-8 -5,-12 -2,-8 -4,-5",
      true,
    ),
    createMousePolygon(
      "7,-8 5,-12 2,-8 4,-5",
      true,
    ),
    createMousePolygon(
      "-3,-7 -2,-8 -1,-7 -2,-6",
      true,
    ),
    createMousePolygon(
      "3,-7 2,-8 1,-7 2,-6",
      true,
    ),
    createMousePolygon(
      "-1,-12 0,-13 1,-12 0,-11",
      true,
    ),
    createMousePolyline("-2,-9 -6,-10 -9,-9"),
    createMousePolyline("-2,-8 -6,-7 -9,-7"),
    createMousePolyline("2,-9 6,-10 9,-9"),
    createMousePolyline("2,-8 6,-7 9,-7"),
    frameZero,
    frameOne,
  );

  return {
    element,
    frames: [frameZero, frameOne],
  };
}

function createDownMouseVariant(): VectorMazeMouseVariant {
  const element = createSvgElement("g", {
    class: "vector-maze-stage__mouse-direction",
    "data-direction": "down",
  });

  const frameZero = createMouseWalkFrame(
    "0,-9 -5,-13 -7,-17 -3,-20 1,-19",
    [
      "-4,-7 -6,-10 -8,-12",
      "4,-7 6,-10 8,-12",
    ],
  );

  const frameOne = createMouseWalkFrame(
    "0,-9 5,-13 7,-17 3,-20 -1,-19",
    [
      "-4,-7 -2,-10 -1,-13",
      "4,-7 2,-10 1,-13",
    ],
  );

  element.append(
    createMousePolygon(
      "-7,-7 -7,-1 -5,5 -2,8 0,10 2,8 5,5 7,-1 7,-7 3,-11 -3,-11",
    ),
    createMousePolygon(
      "-5,5 0,12 5,5 4,1 0,-2 -4,1",
    ),
    createMousePolygon(
      "-7,8 -5,12 -2,8 -4,5",
      true,
    ),
    createMousePolygon(
      "7,8 5,12 2,8 4,5",
      true,
    ),
    createMousePolygon(
      "-3,7 -2,8 -1,7 -2,6",
      true,
    ),
    createMousePolygon(
      "3,7 2,8 1,7 2,6",
      true,
    ),
    createMousePolygon(
      "-1,12 0,13 1,12 0,11",
      true,
    ),
    createMousePolyline("-2,9 -6,10 -9,9"),
    createMousePolyline("-2,8 -6,7 -9,7"),
    createMousePolyline("2,9 6,10 9,9"),
    createMousePolyline("2,8 6,7 9,7"),
    frameZero,
    frameOne,
  );

  return {
    element,
    frames: [frameZero, frameOne],
  };
}

function createLeftMouseVariant(): VectorMazeMouseVariant {
  const element = createSvgElement("g", {
    class: "vector-maze-stage__mouse-direction",
    "data-direction": "left",
  });

  const frameZero = createMouseWalkFrame(
    "9,0 13,-5 17,-7 20,-3 19,1",
    [
      "7,-4 10,-6 12,-8",
      "7,4 10,6 12,8",
    ],
  );

  const frameOne = createMouseWalkFrame(
    "9,0 13,5 17,7 20,3 19,-1",
    [
      "7,-4 10,-2 13,-1",
      "7,4 10,2 13,1",
    ],
  );

  element.append(
    createMousePolygon(
      "7,-7 1,-7 -5,-5 -8,-2 -10,0 -8,2 -5,5 1,7 7,7 11,3 11,-3",
    ),
    createMousePolygon(
      "-5,-5 -12,0 -5,5 -1,4 2,0 -1,-4",
    ),
    createMousePolygon(
      "-8,-7 -12,-5 -8,-2 -5,-4",
      true,
    ),
    createMousePolygon(
      "-8,7 -12,5 -8,2 -5,4",
      true,
    ),
    createMousePolygon(
      "-7,-3 -8,-2 -7,-1 -6,-2",
      true,
    ),
    createMousePolygon(
      "-7,3 -8,2 -7,1 -6,2",
      true,
    ),
    createMousePolygon(
      "-12,-1 -13,0 -12,1 -11,0",
      true,
    ),
    createMousePolyline("-9,-2 -10,-6 -9,-9"),
    createMousePolyline("-8,-1 -7,-6 -6,-9"),
    createMousePolyline("-9,2 -10,6 -9,9"),
    createMousePolyline("-8,1 -7,6 -6,9"),
    frameZero,
    frameOne,
  );

  return {
    element,
    frames: [frameZero, frameOne],
  };
}

function createRightMouseVariant(): VectorMazeMouseVariant {
  const element = createSvgElement("g", {
    class: "vector-maze-stage__mouse-direction",
    "data-direction": "right",
  });

  const frameZero = createMouseWalkFrame(
    "-9,0 -13,-5 -17,-7 -20,-3 -19,1",
    [
      "-7,-4 -10,-6 -12,-8",
      "-7,4 -10,6 -12,8",
    ],
  );

  const frameOne = createMouseWalkFrame(
    "-9,0 -13,5 -17,7 -20,3 -19,-1",
    [
      "-7,-4 -10,-2 -13,-1",
      "-7,4 -10,2 -13,1",
    ],
  );

  element.append(
    createMousePolygon(
      "-7,-7 -1,-7 5,-5 8,-2 10,0 8,2 5,5 -1,7 -7,7 -11,3 -11,-3",
    ),
    createMousePolygon(
      "5,-5 12,0 5,5 1,4 -2,0 1,-4",
    ),
    createMousePolygon(
      "8,-7 12,-5 8,-2 5,-4",
      true,
    ),
    createMousePolygon(
      "8,7 12,5 8,2 5,4",
      true,
    ),
    createMousePolygon(
      "7,-3 8,-2 7,-1 6,-2",
      true,
    ),
    createMousePolygon(
      "7,3 8,2 7,1 6,2",
      true,
    ),
    createMousePolygon(
      "12,-1 13,0 12,1 11,0",
      true,
    ),
    createMousePolyline("9,-2 10,-6 9,-9"),
    createMousePolyline("8,-1 7,-6 6,-9"),
    createMousePolyline("9,2 10,6 9,9"),
    createMousePolyline("8,1 7,6 6,9"),
    frameZero,
    frameOne,
  );

  return {
    element,
    frames: [frameZero, frameOne],
  };
}

export class VectorMazeStage implements Stage {
  public readonly id = "vector-maze" as const;

  private context: StageContext | null = null;
  private audio: PongAudio | null = null;
  private scuffleAudio: VectorMazeScuffleAudio | null = null;
  private root: HTMLElement | null = null;
  private playerElement: SVGGElement | null = null;
  private mouseDirectionElements:
    Readonly<
      Record<VectorMazeMouseDirection, SVGGElement>
    > | null = null;
  private walkFrameElements:
    Readonly<
      Record<
        VectorMazeMouseDirection,
        readonly [SVGGElement, SVGGElement]
      >
    > | null = null;
  private mouseDirection: VectorMazeMouseDirection = "up";
  private walkFrame: 0 | 1 = 0;
  private walkFrameElapsedMs = 0;
  private scuffleSoundActive = false;
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
    this.audio = new PongAudio();
    this.scuffleAudio = new VectorMazeScuffleAudio();

    const scene = document.createElement("section");
    scene.className = "vector-maze-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Vector Maze. Guide the mouse from the lower entrance to the upper exit.",
    );

    const board = createSvgElement("svg", {
      class: "vector-maze-stage__board",
      viewBox:
        `0 0 ${VECTOR_MAZE_VIEW_WIDTH} ${VECTOR_MAZE_VIEW_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "Fixed maze playing field",
    });

    const exitCheese = createSvgElement("g", {
      class: "vector-maze-stage__exit-cheese",
      "aria-hidden": true,
    });

    const cheeseFront = createSvgElement("polygon", {
      class: "vector-maze-stage__exit-cheese-face",
      points:
        `${VECTOR_MAZE_EXIT_POSITION.x - 14},${VECTOR_MAZE_EXIT_POSITION.y + 7} `
        + `${VECTOR_MAZE_EXIT_POSITION.x - 14},${VECTOR_MAZE_EXIT_POSITION.y - 7} `
        + `${VECTOR_MAZE_EXIT_POSITION.x + 6},${VECTOR_MAZE_EXIT_POSITION.y}`,
    });

    const cheeseBack = createSvgElement("polygon", {
      class: "vector-maze-stage__exit-cheese-face",
      points:
        `${VECTOR_MAZE_EXIT_POSITION.x - 6},${VECTOR_MAZE_EXIT_POSITION.y + 3} `
        + `${VECTOR_MAZE_EXIT_POSITION.x - 6},${VECTOR_MAZE_EXIT_POSITION.y - 11} `
        + `${VECTOR_MAZE_EXIT_POSITION.x + 14},${VECTOR_MAZE_EXIT_POSITION.y - 4}`,
    });

    const cheeseEdgeA = createSvgElement("line", {
      class: "vector-maze-stage__exit-cheese-edge",
      x1: VECTOR_MAZE_EXIT_POSITION.x - 14,
      y1: VECTOR_MAZE_EXIT_POSITION.y + 7,
      x2: VECTOR_MAZE_EXIT_POSITION.x - 6,
      y2: VECTOR_MAZE_EXIT_POSITION.y + 3,
    });

    const cheeseEdgeB = createSvgElement("line", {
      class: "vector-maze-stage__exit-cheese-edge",
      x1: VECTOR_MAZE_EXIT_POSITION.x - 14,
      y1: VECTOR_MAZE_EXIT_POSITION.y - 7,
      x2: VECTOR_MAZE_EXIT_POSITION.x - 6,
      y2: VECTOR_MAZE_EXIT_POSITION.y - 11,
    });

    const cheeseEdgeC = createSvgElement("line", {
      class: "vector-maze-stage__exit-cheese-edge",
      x1: VECTOR_MAZE_EXIT_POSITION.x + 6,
      y1: VECTOR_MAZE_EXIT_POSITION.y,
      x2: VECTOR_MAZE_EXIT_POSITION.x + 14,
      y2: VECTOR_MAZE_EXIT_POSITION.y - 4,
    });

    const cheeseHoleA = createSvgElement("ellipse", {
      class: "vector-maze-stage__exit-cheese-hole",
      cx: VECTOR_MAZE_EXIT_POSITION.x - 7.5,
      cy: VECTOR_MAZE_EXIT_POSITION.y - 2.2,
      rx: 2.3,
      ry: 1.7,
    });

    const cheeseHoleB = createSvgElement("ellipse", {
      class: "vector-maze-stage__exit-cheese-hole",
      cx: VECTOR_MAZE_EXIT_POSITION.x - 7.8,
      cy: VECTOR_MAZE_EXIT_POSITION.y + 3,
      rx: 1.7,
      ry: 1.2,
    });

    const cheeseHoleC = createSvgElement("ellipse", {
      class: "vector-maze-stage__exit-cheese-hole",
      cx: VECTOR_MAZE_EXIT_POSITION.x - 1.3,
      cy: VECTOR_MAZE_EXIT_POSITION.y - 0.4,
      rx: 1.8,
      ry: 1.25,
    });

    const cheeseHoleD = createSvgElement("ellipse", {
      class: "vector-maze-stage__exit-cheese-hole",
      cx: VECTOR_MAZE_EXIT_POSITION.x + 1.5,
      cy: VECTOR_MAZE_EXIT_POSITION.y - 5.1,
      rx: 1.25,
      ry: 0.95,
    });

    exitCheese.append(
      cheeseBack,
      cheeseFront,
      cheeseEdgeA,
      cheeseEdgeB,
      cheeseEdgeC,
      cheeseHoleA,
      cheeseHoleB,
      cheeseHoleC,
      cheeseHoleD,
    );

    const wallGroup = createSvgElement("g", {
      class: "vector-maze-stage__walls",
      "aria-hidden": true,
    });

    for (const wall of VECTOR_MAZE_WALLS) {
      const horizontal = wall.width >= wall.height;
      const halfThickness =
        (horizontal ? wall.height : wall.width) / 2;

      wallGroup.append(
        createSvgElement("line", {
          class: "vector-maze-stage__wall",
          x1: horizontal
            ? wall.x + halfThickness
            : wall.x + wall.width / 2,
          y1: horizontal
            ? wall.y + wall.height / 2
            : wall.y + halfThickness,
          x2: horizontal
            ? wall.x + wall.width - halfThickness
            : wall.x + wall.width / 2,
          y2: horizontal
            ? wall.y + wall.height / 2
            : wall.y + wall.height - halfThickness,
        }),
      );
    }

    const player = createSvgElement("g", {
      class: "vector-maze-stage__player",
      transform:
        `translate(${VECTOR_MAZE_START_POSITION.x} `
        + `${VECTOR_MAZE_START_POSITION.y})`,
      "aria-hidden": true,
    });

    const upMouse = createUpMouseVariant();
    const rightMouse = createRightMouseVariant();
    const downMouse = createDownMouseVariant();
    const leftMouse = createLeftMouseVariant();

    player.append(
      upMouse.element,
      rightMouse.element,
      downMouse.element,
      leftMouse.element,
    );

    board.append(
      exitCheese,
      wallGroup,
      player,
    );

    const instruction = document.createElement("p");
    instruction.className = "vector-maze-stage__instruction";
    instruction.textContent =
      "WASD / ARROWS · GUIDE THE MOUSE · R RESTARTS";

    const status = document.createElement("span");
    status.className = "vector-maze-stage__status";
    status.textContent = "RUNNING";
    instruction.append(" · ", status);

    scene.append(board, instruction);
    context.root.append(scene);

    this.root = scene;
    this.playerElement = player;
    this.mouseDirectionElements = {
      up: upMouse.element,
      right: rightMouse.element,
      down: downMouse.element,
      left: leftMouse.element,
    };
    this.walkFrameElements = {
      up: upMouse.frames,
      right: rightMouse.frames,
      down: downMouse.frames,
      left: leftMouse.frames,
    };
    this.mouseDirection = "up";
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
    this.mouseDirection = "up";
    this.walkFrame = 0;
    this.walkFrameElapsedMs = 0;
    this.scuffleSoundActive = false;
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

    this.scuffleAudio?.destroy();
    this.scuffleAudio = null;

    this.audio?.destroy();
    this.audio = null;

    this.context = null;
    this.root = null;
    this.playerElement = null;
    this.mouseDirectionElements = null;
    this.walkFrameElements = null;
    this.mouseDirection = "up";
    this.walkFrame = 0;
    this.walkFrameElapsedMs = 0;
    this.scuffleSoundActive = false;
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
      transform:
        `translate(${this.state.player.x} `
        + `${this.state.player.y})`,
    });

    if (
      this.mouseDirectionElements !== null
      && this.walkFrameElements !== null
    ) {
      const directions: readonly VectorMazeMouseDirection[] = [
        "up",
        "right",
        "down",
        "left",
      ];

      for (const direction of directions) {
        this.mouseDirectionElements[direction].style.display =
          direction === this.mouseDirection ? "" : "none";

        this.walkFrameElements[direction].forEach(
          (frame, index) => {
            frame.style.display =
              index === this.walkFrame ? "" : "none";
          },
        );
      }
    }
  }

  private updateMouseDirection(
    direction: { readonly x: number; readonly y: number },
  ): void {
    if (direction.x === 0 && direction.y === 0) {
      return;
    }

    if (Math.abs(direction.x) >= Math.abs(direction.y)) {
      this.mouseDirection =
        direction.x >= 0 ? "right" : "left";
      return;
    }

    this.mouseDirection =
      direction.y >= 0 ? "down" : "up";
  }

  private updateWalkAnimation(
    moving: boolean,
    deltaMs: number,
  ): void {
    if (!moving) {
      this.walkFrame = 0;
      this.walkFrameElapsedMs = 0;
      this.scuffleSoundActive = false;
      return;
    }

    if (!this.scuffleSoundActive) {
      this.scuffleSoundActive = true;
      this.scuffleAudio?.playStep(this.walkFrame);
    }

    this.walkFrameElapsedMs += deltaMs;

    while (this.walkFrameElapsedMs >= WALK_FRAME_INTERVAL_MS) {
      this.walkFrameElapsedMs -= WALK_FRAME_INTERVAL_MS;
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      this.scuffleAudio?.playStep(this.walkFrame);
    }
  }

  private completeStage(): void {
    if (this.completionSent || this.context === null) {
      return;
    }

    this.completionSent = true;
    this.active = false;
    this.cancelFrame();
    this.setStatus("COMPLETE");

    this.audio?.playWinBuzz();

    /*
     * Completion destroys the stage immediately. Relinquish
     * ownership so destroy() does not stop the victory buzz.
     * Pong uses the same lifecycle behavior.
     */
    this.audio = null;

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
      const direction = this.readDirection();
      const previousPlayer = this.state.player;

      this.updateMouseDirection(direction);

      this.state = stepVectorMaze(
        this.state,
        direction,
        deltaMs / 1000,
      );

      const moved =
        this.state.player.x !== previousPlayer.x
        || this.state.player.y !== previousPlayer.y;

      this.updateWalkAnimation(moved, deltaMs);
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
