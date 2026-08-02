import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import {
  DRIVING_AI_IDS,
  DRIVING_SPIN_DURATION_MS,
  DRIVING_VIEW_WIDTH,
} from "./driving-model";
import type {
  DrivingAiId,
  DrivingInput,
  DrivingState,
} from "./driving-model";
import {
  projectDrivingObject,
} from "./driving-projection";
import type {
  DrivingTrack,
  ProjectedDrivingRoadPoint,
} from "./driving-projection";

export interface DrivingAiCarView {
  readonly layer: SVGGElement;
  readonly elements: Map<
    DrivingAiId,
    SVGGElement
  >;
}

interface VisibleAiCar {
  readonly driverId: DrivingAiId;
  readonly element: SVGGElement;
  readonly relativeDistance: number;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function getDrivingSpinRotation(
  remainingMs: number,
  direction: -1 | 1,
): number {
  if (remainingMs <= 0) {
    return 0;
  }

  const elapsedRatio =
    (
      DRIVING_SPIN_DURATION_MS
      - remainingMs
    )
    / DRIVING_SPIN_DURATION_MS;

  return elapsedRatio * 1_080 * direction;
}

function createCarBodyElements(
  compact: boolean,
): readonly SVGElement[] {
  const width = compact
    ? 34
    : 50;

  const height = compact
    ? 30
    : 44;

  const body = createSvgElement("polygon", {
    class: "driving-stage__car-body",
    points:
      `${-width},${height * 0.66} `
      + `${-width * 0.9},${-height * 0.34} `
      + `${-width * 0.54},${-height * 0.98} `
      + `${-width * 0.32},${-height * 1.2} `
      + `${width * 0.32},${-height * 1.2} `
      + `${width * 0.54},${-height * 0.98} `
      + `${width * 0.9},${-height * 0.34} `
      + `${width},${height * 0.66} `
      + `${width * 0.58},${height} `
      + `${-width * 0.58},${height}`,
  });

  const rearWindow = createSvgElement("polygon", {
    class: "driving-stage__car-detail",
    points:
      `${-width * 0.44},${-height * 0.86} `
      + `${-width * 0.26},${-height * 1.13} `
      + `${width * 0.26},${-height * 1.13} `
      + `${width * 0.44},${-height * 0.86} `
      + `${width * 0.34},${-height * 0.46} `
      + `${-width * 0.34},${-height * 0.46}`,
  });

  const bumper = createSvgElement("polyline", {
    class: "driving-stage__car-detail",
    points:
      `${-width * 0.78},${height * 0.54} `
      + `${-width * 0.48},${height * 0.78} `
      + `${width * 0.48},${height * 0.78} `
      + `${width * 0.78},${height * 0.54}`,
  });

  const leftWheel = createSvgElement("polygon", {
    class: "driving-stage__car-wheel",
    points:
      `${-width * 1.04},${-height * 0.2} `
      + `${-width * 0.88},${-height * 0.34} `
      + `${-width * 0.74},${-height * 0.22} `
      + `${-width * 0.74},${height * 0.56} `
      + `${-width * 0.88},${height * 0.7} `
      + `${-width * 1.04},${height * 0.56}`,
  });

  const rightWheel = createSvgElement("polygon", {
    class: "driving-stage__car-wheel",
    points:
      `${width * 1.04},${-height * 0.2} `
      + `${width * 0.88},${-height * 0.34} `
      + `${width * 0.74},${-height * 0.22} `
      + `${width * 0.74},${height * 0.56} `
      + `${width * 0.88},${height * 0.7} `
      + `${width * 1.04},${height * 0.56}`,
  });

  const leftLight = createSvgElement("polyline", {
    class: "driving-stage__car-accent",
    points:
      `${-width * 0.62},${height * 0.4} `
      + `${-width * 0.4},${height * 0.5} `
      + `${-width * 0.4},${height * 0.66} `
      + `${-width * 0.66},${height * 0.56}`,
  });

  const rightLight = createSvgElement("polyline", {
    class: "driving-stage__car-accent",
    points:
      `${width * 0.62},${height * 0.4} `
      + `${width * 0.4},${height * 0.5} `
      + `${width * 0.4},${height * 0.66} `
      + `${width * 0.66},${height * 0.56}`,
  });

  return [
    leftWheel,
    rightWheel,
    body,
    rearWindow,
    bumper,
    leftLight,
    rightLight,
  ];
}

export function createDrivingPlayerCar(): SVGGElement {
  const car = createSvgElement("g", {
    class: "driving-stage__player-car",
  });

  car.append(
    ...createCarBodyElements(false),
  );

  return car;
}

function createDrivingAiCar(
  id: DrivingAiId,
): SVGGElement {
  const car = createSvgElement("g", {
    class: "driving-stage__ai-car",
    "data-driver": id,
  });

  car.append(
    ...createCarBodyElements(true),
  );

  const label = createSvgElement("text", {
    class: "driving-stage__ai-label",
    x: 0,
    y: 20,
    "text-anchor": "middle",
  });

  label.textContent = id.slice(-1);

  car.append(label);

  return car;
}

export function createDrivingAiCarView():
DrivingAiCarView {
  const layer = createSvgElement("g", {
    class: "driving-stage__ai-layer",
  });

  const elements = new Map<
    DrivingAiId,
    SVGGElement
  >();

  for (const id of DRIVING_AI_IDS) {
    const element = createDrivingAiCar(id);

    elements.set(id, element);
    layer.append(element);
  }

  return {
    layer,
    elements,
  };
}

export function createDrivingRoadPath(
  points: readonly ProjectedDrivingRoadPoint[],
  edge: "leftX" | "rightX",
): string {
  return points
    .map((point, index) => (
      `${index === 0 ? "M" : "L"} `
      + `${point[edge].toFixed(2)} `
      + `${point.y.toFixed(2)}`
    ))
    .join(" ");
}

export function renderDrivingPlayerCar(
  car: SVGGElement,
  state: DrivingState,
  input: DrivingInput,
  curve: number,
): void {
  const lateral =
    state.player.lateralPosition;

  const carX =
    DRIVING_VIEW_WIDTH / 2
    + lateral * 108;

  const carLean =
    input.steer * -4.5
    - curve * 4;

  const speedSquash = Math.min(
    Math.abs(state.player.speed) / 800,
    0.08,
  );

  const spinRotation = getDrivingSpinRotation(
    state.player.spinRemainingMs,
    1,
  );

  setSvgAttributes(car, {
    transform:
      `translate(${carX} 601)`
      + ` rotate(${carLean + spinRotation})`
      + ` scale(${1 + speedSquash} ${1 - speedSquash})`,
  });

  car.classList.toggle(
    "driving-stage__player-car--impact",
    state.player.spinRemainingMs > 0,
  );
}

export function renderDrivingAiCarView(
  view: DrivingAiCarView,
  state: DrivingState,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  track: DrivingTrack,
): void {
  const visibleCars: VisibleAiCar[] = [];

  for (const driver of state.aiDrivers) {
    const element = view.elements.get(driver.id);

    if (element === undefined) {
      continue;
    }

    const projected = projectDrivingObject(
      roadPoints,
      state.player.distance,
      driver.distance,
      driver.lateralPosition,
      track.segmentLength,
    );

    if (projected === null) {
      setSvgAttributes(element, {
        display: "none",
      });
      continue;
    }

    const carScale =
      0.095 + projected.scale * 0.78;

    const lean = clamp(
      (
        driver.targetLane
        - driver.lateralPosition
      ) * 15,
      -6,
      6,
    );

    const spinDirection: -1 | 1 =
      driver.id === "ai-2"
        ? 1
        : -1;

    const spinRotation = getDrivingSpinRotation(
      driver.spinRemainingMs,
      spinDirection,
    );

    setSvgAttributes(element, {
      display: "",
      transform:
        `translate(${projected.screenX} ${projected.screenY})`
        + ` rotate(${lean + spinRotation})`
        + ` scale(${carScale})`,
      opacity:
        0.34 + projected.scale * 0.66,
    });

    element.classList.toggle(
      "driving-stage__ai-car--impact",
      driver.spinRemainingMs > 0,
    );

    visibleCars.push({
      driverId: driver.id,
      element,
      relativeDistance:
        projected.relativeDistance,
    });
  }

  visibleCars.sort(
    (left, right) =>
      right.relativeDistance
      - left.relativeDistance,
  );

  for (const visibleCar of visibleCars) {
    view.layer.append(visibleCar.element);
  }
}
