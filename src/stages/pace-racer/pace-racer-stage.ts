import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  createInitialDrivingState,
  DRIVING_VIEW_HEIGHT,
  DRIVING_VIEW_WIDTH,
  getDrivingRacePosition,
  getDrivingRemainingDistance,
  isDrivingPlayerOnShoulder,
  stepDriving,
} from "./driving-model";
import type {
  DrivingInput,
  DrivingState,
} from "./driving-model";
import {
  DRIVING_LANE_MARKER_COUNT,
  DRIVING_MAIN_TRACK,
  DRIVING_SEGMENT_LENGTH,
  getDrivingTrackCurveAtDistance,
  projectDrivingRoad,
} from "./driving-projection";
import type {
  ProjectedDrivingRoadPoint,
} from "./driving-projection";
import {
  createDrivingFinishLineView,
  renderDrivingFinishLineView,
} from "./driving-finish-render";
import type {
  DrivingFinishLineView,
} from "./driving-finish-render";
import {
  createDrivingRoadsideSceneryView,
  renderDrivingRoadsideSceneryView,
} from "./driving-roadside-render";
import type {
  DrivingRoadsideSceneryView,
} from "./driving-roadside-render";
import {
  createDrivingAiCarView,
  createDrivingPlayerCar,
  createDrivingRoadPath,
  renderDrivingAiCarView,
  renderDrivingPlayerCar,
} from "./driving-render";
import type {
  DrivingAiCarView,
} from "./driving-render";
import {
  createDrivingItemView,
  renderDrivingItemView,
} from "./driving-item-render";
import type {
  DrivingItemView,
} from "./driving-item-render";

const HORIZON_Y = 154;
const ROAD_BOTTOM_Y = 650;
const ROAD_FAR_HALF_WIDTH = 50;
const ROAD_NEAR_HALF_WIDTH = 392;
const READY_PROMPT_DURATION_MS = 2_000;
const READY_PROMPT_FLASH_INTERVAL_MS = 220;
const SECRET_TRACK_DISTANCE_OFFSET = 2_400;
const SECRET_HORIZON_Y = 206;
const SECRET_ROAD_BOTTOM_Y = 626;
const SECRET_ROAD_FAR_HALF_WIDTH = 28;
const SECRET_ROAD_NEAR_HALF_WIDTH = 268;

const MOVEMENT_KEYS = new Set<string>([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

function positiveModulo(
  value: number,
  divisor: number,
): number {
  return ((value % divisor) + divisor) % divisor;
}

export class PaceRacerStage implements Stage {
  public readonly id = "pace-racer" as const;

  private context: StageContext | null = null;
  private state: DrivingState | null = null;

  private roadLeft: SVGPathElement | null = null;
  private roadRight: SVGPathElement | null = null;
  private laneMarkers: SVGLineElement[] = [];
  private finishLineView: DrivingFinishLineView | null = null;
  private roadsideSceneryView:
    DrivingRoadsideSceneryView | null = null;
  private playerCar: SVGGElement | null = null;
  private aiCarView: DrivingAiCarView | null = null;
  private itemView: DrivingItemView | null = null;

  private positionText: SVGTextElement | null = null;
  private itemText: SVGTextElement | null = null;
  private finishText: SVGTextElement | null = null;
  private readyPromptText: SVGTextElement | null = null;
  private speedText: SVGTextElement | null = null;
  private distanceText: SVGTextElement | null = null;
  private lateralText: SVGTextElement | null = null;
  private surfaceText: SVGTextElement | null = null;

  private readonly pressedKeys = new Set<string>();

  private frameRequestId: number | null = null;
  private lastFrameAtMs: number | null = null;
  private useItemQueued = false;
  private completionSent = false;
  private active = false;

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.state = createInitialDrivingState();
    this.completionSent = false;

    const scene = document.createElement("section");
    scene.className = "driving-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-label",
      "Four-car pseudo-three-dimensional driving test.",
    );

    const svg = createSvgElement("svg", {
      class: "driving-stage__board",
      viewBox:
        `0 0 ${DRIVING_VIEW_WIDTH} ${DRIVING_VIEW_HEIGHT}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label":
        "Rear-view wireframe road with four racing cars",
    });

    const horizon = createSvgElement("line", {
      class: "driving-stage__horizon",
      x1: 80,
      y1: HORIZON_Y,
      x2: DRIVING_VIEW_WIDTH - 80,
      y2: HORIZON_Y,
    });

    const mountainLeft = createSvgElement("polyline", {
      class: "driving-stage__scenery",
      points:
        "0,154 74,112 126,137 196,86 278,154",
    });

    const mountainRight = createSvgElement("polyline", {
      class: "driving-stage__scenery",
      points:
        "676,154 748,101 812,132 884,78 960,154",
    });

    const roadLeft = createSvgElement("path", {
      class:
        "driving-stage__road-edge "
        + "driving-stage__road-edge--left",
    });

    const roadRight = createSvgElement("path", {
      class:
        "driving-stage__road-edge "
        + "driving-stage__road-edge--right",
    });

    const markerLayer = createSvgElement("g", {
      class: "driving-stage__marker-layer",
    });

    const laneMarkers = Array.from(
      { length: DRIVING_LANE_MARKER_COUNT },
      () => createSvgElement("line", {
        class: "driving-stage__lane-marker",
      }),
    );

    markerLayer.append(...laneMarkers);

    const finishLineView =
      createDrivingFinishLineView();

    const roadsideSceneryView =
      createDrivingRoadsideSceneryView();

    const aiCarView = createDrivingAiCarView();
    const itemView = createDrivingItemView(
      this.state.pickups,
      this.state.bananas,
    );
    const playerCar = createDrivingPlayerCar();

    const diagnostics = createSvgElement("g", {
      class: "driving-stage__diagnostics",
      "aria-hidden": "true",
    });

    const title = createSvgElement("text", {
      class: "driving-stage__title",
      x: DRIVING_VIEW_WIDTH / 2,
      y: 50,
      "text-anchor": "middle",
    });
    title.textContent = "PACE RACER";

    const positionText = createSvgElement("text", {
      class:
        "driving-stage__readout "
        + "driving-stage__readout--position",
      x: DRIVING_VIEW_WIDTH / 2,
      y: 80,
      "text-anchor": "middle",
    });

    const itemText = createSvgElement("text", {
      class:
        "driving-stage__readout "
        + "driving-stage__readout--item",
      x: DRIVING_VIEW_WIDTH / 2,
      y: 108,
      "text-anchor": "middle",
    });

    const finishText = createSvgElement("text", {
      class:
        "driving-stage__readout "
        + "driving-stage__readout--finish",
      x: DRIVING_VIEW_WIDTH / 2,
      y: 134,
      "text-anchor": "middle",
    });

    const readyPromptText = createSvgElement("text", {
      class: "driving-stage__ready-prompt",
      x: DRIVING_VIEW_WIDTH / 2,
      y: DRIVING_VIEW_HEIGHT / 2,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "aria-hidden": "true",
    });

    readyPromptText.textContent = "READY PLAYER ONE?";

    const speedText = createSvgElement("text", {
      class: "driving-stage__readout",
      x: 36,
      y: 48,
    });

    const distanceText = createSvgElement("text", {
      class: "driving-stage__readout",
      x: 36,
      y: 76,
    });

    const lateralText = createSvgElement("text", {
      class: "driving-stage__readout",
      x: DRIVING_VIEW_WIDTH - 36,
      y: 48,
      "text-anchor": "end",
    });

    const surfaceText = createSvgElement("text", {
      class:
        "driving-stage__readout "
        + "driving-stage__readout--surface",
      x: DRIVING_VIEW_WIDTH - 36,
      y: 76,
      "text-anchor": "end",
    });

    diagnostics.append(
      title,
      positionText,
      itemText,
      finishText,
      speedText,
      distanceText,
      lateralText,
      surfaceText,
    );

    svg.append(
      mountainLeft,
      mountainRight,
      horizon,
      roadLeft,
      roadRight,
      markerLayer,
      roadsideSceneryView.layer,
      finishLineView.layer,
      itemView.layer,
      aiCarView.layer,
      playerCar,
      diagnostics,
      readyPromptText,
    );

    const controls = document.createElement("p");
    controls.className = "driving-stage__controls";
    controls.textContent =
      "W / ↑ ACCELERATE   ·   S / ↓ BRAKE + REVERSE"
      + "   ·   A D / ← → STEER"
      + "   ·   SPACE ITEM   ·   R RESTART";

    scene.append(svg, controls);
    context.root.replaceChildren(scene);

    this.roadLeft = roadLeft;
    this.roadRight = roadRight;
    this.laneMarkers = laneMarkers;
    this.finishLineView = finishLineView;
    this.roadsideSceneryView = roadsideSceneryView;
    this.playerCar = playerCar;
    this.aiCarView = aiCarView;
    this.itemView = itemView;
    this.positionText = positionText;
    this.itemText = itemText;
    this.finishText = finishText;
    this.readyPromptText = readyPromptText;
    this.speedText = speedText;
    this.distanceText = distanceText;
    this.lateralText = lateralText;
    this.surfaceText = surfaceText;

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
    );
    window.addEventListener(
      "keyup",
      this.handleKeyUp,
    );
    window.addEventListener(
      "blur",
      this.handleBlur,
    );

    this.render();
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
    this.scheduleFrame();
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.state = createInitialDrivingState();
    this.pressedKeys.clear();
    this.useItemQueued = false;
    this.completionSent = false;
    this.active = true;
    this.lastFrameAtMs = performance.now();

    this.render();
    this.scheduleFrame();
  }

  public pause(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.pressedKeys.clear();
    this.useItemQueued = false;
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

    this.active = true;
    this.lastFrameAtMs = performance.now();
    this.scheduleFrame();
  }

  public destroy(): void {
    this.active = false;

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );
    window.removeEventListener(
      "keyup",
      this.handleKeyUp,
    );
    window.removeEventListener(
      "blur",
      this.handleBlur,
    );

    this.pressedKeys.clear();

    this.context = null;
    this.state = null;
    this.roadLeft = null;
    this.roadRight = null;
    this.laneMarkers = [];
    this.finishLineView = null;
    this.roadsideSceneryView = null;
    this.playerCar = null;
    this.aiCarView = null;
    this.itemView = null;
    this.positionText = null;
    this.itemText = null;
    this.finishText = null;
    this.readyPromptText = null;
    this.speedText = null;
    this.distanceText = null;
    this.lateralText = null;
    this.surfaceText = null;
    this.useItemQueued = false;
    this.completionSent = false;
    this.lastFrameAtMs = null;
  }

  private readInput(): DrivingInput {
    const accelerate =
      this.pressedKeys.has("KeyW")
      || this.pressedKeys.has("ArrowUp");

    const brake =
      this.pressedKeys.has("KeyS")
      || this.pressedKeys.has("ArrowDown");

    const left =
      this.pressedKeys.has("KeyA")
      || this.pressedKeys.has("ArrowLeft");

    const right =
      this.pressedKeys.has("KeyD")
      || this.pressedKeys.has("ArrowRight");

    let steer: -1 | 0 | 1 = 0;

    if (left !== right) {
      steer = left ? -1 : 1;
    }

    return {
      accelerate,
      brake,
      steer,
      useItemPressed: this.useItemQueued,
    };
  }

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (MOVEMENT_KEYS.has(event.code)) {
      event.preventDefault();
      this.pressedKeys.add(event.code);
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      event.preventDefault();
      this.useItemQueued = true;
      return;
    }

    if (event.code === "KeyR" && !event.repeat) {
      event.preventDefault();
      this.restart();
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
    this.useItemQueued = false;
  };

  private scheduleFrame(): void {
    if (
      !this.active
      || this.frameRequestId !== null
    ) {
      return;
    }

    this.frameRequestId = requestAnimationFrame(
      this.handleFrame,
    );
  }

  private readonly handleFrame = (
    nowMs: number,
  ): void => {
    this.frameRequestId = null;

    if (
      !this.active
      || this.state === null
    ) {
      return;
    }

    const deltaMs =
      this.lastFrameAtMs === null
        ? 0
        : Math.max(
            0,
            nowMs - this.lastFrameAtMs,
          );

    this.lastFrameAtMs = nowMs;

    const routeBeforeStep = this.state.route;

    this.state = stepDriving(
      this.state,
      this.readInput(),
      deltaMs,
      (distance) =>
        getDrivingTrackCurveAtDistance(
          DRIVING_MAIN_TRACK,
          distance
          + (
            routeBeforeStep === "secret"
              ? SECRET_TRACK_DISTANCE_OFFSET
              : 0
          ),
        ),
    );

    this.useItemQueued = false;

    this.render();

    if (
      getDrivingRemainingDistance(this.state) <= 0
    ) {
      this.completeRace();
      return;
    }

    this.scheduleFrame();
  };

  private render(): void {
    const state = this.state;

    if (
      state === null
      || this.roadLeft === null
      || this.roadRight === null
      || this.finishLineView === null
      || this.roadsideSceneryView === null
      || this.playerCar === null
      || this.aiCarView === null
      || this.itemView === null
    ) {
      return;
    }

    const onSecretRoute =
      state.route === "secret";

    const projectedCameraDistance =
      state.player.distance
      + (
        onSecretRoute
          ? SECRET_TRACK_DISTANCE_OFFSET
          : 0
      );

    const projectedRoad = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      {
        distance: projectedCameraDistance,
        lateralPosition:
          state.player.lateralPosition,
        viewWidth: DRIVING_VIEW_WIDTH,
        horizonY:
          onSecretRoute
            ? SECRET_HORIZON_Y
            : HORIZON_Y,
        roadBottomY:
          onSecretRoute
            ? SECRET_ROAD_BOTTOM_Y
            : ROAD_BOTTOM_Y,
        nearHalfWidth:
          onSecretRoute
            ? SECRET_ROAD_NEAR_HALF_WIDTH
            : ROAD_NEAR_HALF_WIDTH,
        farHalfWidth:
          onSecretRoute
            ? SECRET_ROAD_FAR_HALF_WIDTH
            : ROAD_FAR_HALF_WIDTH,
      },
    );

    setSvgAttributes(this.roadLeft, {
      d: createDrivingRoadPath(
        projectedRoad,
        "leftX",
      ),
    });

    setSvgAttributes(this.roadRight, {
      d: createDrivingRoadPath(
        projectedRoad,
        "rightX",
      ),
    });

    this.renderLaneMarkers(
      state,
      projectedRoad,
    );

    renderDrivingRoadsideSceneryView(
      this.roadsideSceneryView,
      projectedRoad,
      projectedCameraDistance,
    );

    renderDrivingFinishLineView(
      this.finishLineView,
      projectedRoad,
      getDrivingRemainingDistance(state),
    );

    setSvgAttributes(this.itemView.layer, {
      display: onSecretRoute ? "none" : "",
    });

    setSvgAttributes(this.aiCarView.layer, {
      display: onSecretRoute ? "none" : "",
    });

    if (!onSecretRoute) {
      renderDrivingItemView(
        this.itemView,
        state,
        projectedRoad,
        DRIVING_MAIN_TRACK,
      );

      renderDrivingAiCarView(
        this.aiCarView,
        state,
        projectedRoad,
        DRIVING_MAIN_TRACK,
      );
    }

    const input = this.readInput();

    const currentCurve =
      getDrivingTrackCurveAtDistance(
        DRIVING_MAIN_TRACK,
        state.player.distance
        + (
          onSecretRoute
            ? SECRET_TRACK_DISTANCE_OFFSET
            : 0
        ),
      );

    renderDrivingPlayerCar(
      this.playerCar,
      state,
      input,
      currentCurve,
    );

    const direction =
      state.player.speed < -0.5
        ? "REV"
        : "FWD";

    if (this.positionText !== null) {
      this.positionText.textContent =
        onSecretRoute
          ? "SECRET ROUTE"
          : `POS ${getDrivingRacePosition(state)}/4`;
    }

    if (this.finishText !== null) {
      const remainingDistance = Math.ceil(
        getDrivingRemainingDistance(state),
      );

      const finishLabel =
        onSecretRoute
          ? "EXIT"
          : "FINISH";

      this.finishText.textContent =
        remainingDistance > 0
          ? `${finishLabel} ${remainingDistance}`
          : finishLabel;
    }

    if (this.readyPromptText !== null) {
      const promptActive =
        state.elapsedMs < READY_PROMPT_DURATION_MS;

      const flashVisible =
        Math.floor(
          state.elapsedMs
          / READY_PROMPT_FLASH_INTERVAL_MS,
        ) % 2 === 0;

      setSvgAttributes(this.readyPromptText, {
        display: promptActive ? "" : "none",
        opacity:
          promptActive && flashVisible
            ? 1
            : 0.22,
      });
    }

    if (this.itemText !== null) {
      const heldItem =
        state.player.heldItem;

      this.itemText.textContent =
        heldItem === null
          ? "ITEM —"
          : `ITEM ${heldItem.toUpperCase()}`;

      this.itemText.classList.toggle(
        "driving-stage__readout--item-ready",
        heldItem !== null,
      );
    }

    if (this.speedText !== null) {
      this.speedText.textContent =
        `SPD ${Math.round(Math.abs(state.player.speed))
          .toString()
          .padStart(3, "0")} ${direction}`;
    }

    if (this.distanceText !== null) {
      this.distanceText.textContent =
        `DIST ${Math.round(state.player.distance)}`;
    }

    if (this.lateralText !== null) {
      this.lateralText.textContent =
        `LAT ${state.player.lateralPosition.toFixed(2)}`;
    }

    if (this.surfaceText !== null) {
      const onShoulder =
        isDrivingPlayerOnShoulder(
          state.player,
        );

      const slowed =
        state.player.slowdownRemainingMs > 0;

      this.surfaceText.textContent =
        onSecretRoute
          ? "LOW TRACK"
          : slowed
            ? "CONE SLOW"
            : onShoulder
              ? "SHOULDER"
              : "ON ROAD";

      this.surfaceText.classList.toggle(
        "driving-stage__readout--warning",
        slowed || onShoulder,
      );
    }
  }

  private completeRace(): void {
    if (
      this.completionSent
      || this.context === null
    ) {
      return;
    }

    this.completionSent = true;
    this.active = false;
    this.pressedKeys.clear();
    this.useItemQueued = false;

    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    if (this.finishText !== null) {
      this.finishText.textContent = "FINISH";
    }

    this.context.complete();
  }

  private renderLaneMarkers(
    state: DrivingState,
    points: readonly ProjectedDrivingRoadPoint[],
  ): void {
    const cameraSegment = Math.floor(
      state.player.distance
      / DRIVING_SEGMENT_LENGTH,
    );

    const parity = positiveModulo(
      cameraSegment,
      2,
    );

    for (
      let markerIndex = 0;
      markerIndex < this.laneMarkers.length;
      markerIndex += 1
    ) {
      const marker = this.laneMarkers[markerIndex];

      if (marker === undefined) {
        continue;
      }

      const nearPointIndex =
        markerIndex * 2 + parity;

      const nearPoint =
        points[nearPointIndex];

      const farPoint =
        points[nearPointIndex + 1];

      if (
        nearPoint === undefined
        || farPoint === undefined
      ) {
        setSvgAttributes(marker, {
          opacity: 0,
        });
        continue;
      }

      setSvgAttributes(marker, {
        x1: farPoint.centerX,
        y1: farPoint.y,
        x2: nearPoint.centerX,
        y2: nearPoint.y,
        opacity:
          0.12 + nearPoint.scale * 0.82,
      });
    }
  }
}

export function createPaceRacerStage(): Stage {
  return new PaceRacerStage();
}
