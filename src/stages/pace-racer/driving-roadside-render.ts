import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  ProjectedDrivingRoadPoint,
} from "./driving-projection";

export type DrivingRoadsideObjectKind =
  | "cactus"
  | "ox-skull";

export const DRIVING_ROADSIDE_SPACING = 120;
export const DRIVING_ROADSIDE_OBJECT_COUNT = 20;

export interface DrivingRoadsidePlacement {
  readonly index: number;
  readonly kind: DrivingRoadsideObjectKind;
  readonly side: -1 | 1;
  readonly distance: number;
  readonly edgeOffset: number;
}

interface DrivingRoadsideObjectView {
  readonly group: SVGGElement;
  readonly cactus: SVGGElement;
  readonly oxSkull: SVGGElement;
}

export interface DrivingRoadsideSceneryView {
  readonly layer: SVGGElement;
  readonly objects:
    readonly DrivingRoadsideObjectView[];
}

export interface ProjectedDrivingRoadsideAnchor {
  readonly screenX: number;
  readonly screenY: number;
  readonly scale: number;
  readonly relativeDistance: number;
  readonly roadEdgeX: number;
}

interface VisibleRoadsideObject {
  readonly element: SVGGElement;
  readonly relativeDistance: number;
}

function positiveModulo(
  value: number,
  divisor: number,
): number {
  return ((value % divisor) + divisor) % divisor;
}

function lerp(
  start: number,
  end: number,
  amount: number,
): number {
  return start + (end - start) * amount;
}

export function projectDrivingRoadsideAnchor(
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  cameraDistance: number,
  objectDistance: number,
  side: -1 | 1,
  edgeOffset: number,
): ProjectedDrivingRoadsideAnchor | null {
  const firstPoint = roadPoints[0];
  const finalPoint = roadPoints.at(-1);

  if (
    firstPoint === undefined
    || finalPoint === undefined
    || !Number.isFinite(cameraDistance)
    || !Number.isFinite(objectDistance)
    || !Number.isFinite(edgeOffset)
  ) {
    return null;
  }

  const relativeDistance =
    objectDistance - cameraDistance;

  if (
    relativeDistance < firstPoint.relativeDistance
    || relativeDistance > finalPoint.relativeDistance
  ) {
    return null;
  }

  for (
    let pointIndex = 0;
    pointIndex < roadPoints.length - 1;
    pointIndex += 1
  ) {
    const nearPoint = roadPoints[pointIndex];
    const farPoint = roadPoints[pointIndex + 1];

    if (
      nearPoint === undefined
      || farPoint === undefined
      || relativeDistance
        < nearPoint.relativeDistance
      || relativeDistance
        > farPoint.relativeDistance
    ) {
      continue;
    }

    const distanceSpan =
      farPoint.relativeDistance
      - nearPoint.relativeDistance;

    const interpolation =
      distanceSpan <= 0
        ? 0
        : (
            relativeDistance
            - nearPoint.relativeDistance
          ) / distanceSpan;

    const leftX = lerp(
      nearPoint.leftX,
      farPoint.leftX,
      interpolation,
    );

    const rightX = lerp(
      nearPoint.rightX,
      farPoint.rightX,
      interpolation,
    );

    const screenY = lerp(
      nearPoint.y,
      farPoint.y,
      interpolation,
    );

    const scale = lerp(
      nearPoint.scale,
      farPoint.scale,
      interpolation,
    );

    const roadHalfWidth =
      (rightX - leftX) / 2;

    const roadEdgeX =
      side === -1
        ? leftX
        : rightX;

    const normalizedOffset = Math.max(
      0.18,
      edgeOffset,
    );

    const objectClearance =
      12 + scale * 34;

    return {
      screenX:
        roadEdgeX
        + side
          * (
            roadHalfWidth * normalizedOffset
            + objectClearance
          ),
      screenY,
      scale,
      relativeDistance,
      roadEdgeX,
    };
  }

  return null;
}

function createCactus(): SVGGElement {
  const cactus = createSvgElement("g", {
    class: "driving-stage__cactus",
  });

  const outline = createSvgElement("polygon", {
    class:
      "driving-stage__roadside-outline "
      + "driving-stage__cactus-outline",
    points:
      "-6,0 -6,-17 -15,-17 -20,-22 "
      + "-20,-37 -15,-42 -10,-37 -10,-27 "
      + "-6,-27 -6,-50 0,-58 6,-50 6,-34 "
      + "11,-34 11,-43 16,-48 21,-43 "
      + "21,-27 16,-22 6,-22 6,0",
  });

  const centerLine = createSvgElement("line", {
    class: "driving-stage__roadside-detail",
    x1: 0,
    y1: -52,
    x2: 0,
    y2: -3,
  });

  const leftBranch = createSvgElement("polyline", {
    class: "driving-stage__roadside-detail",
    points: "-5,-22 -14,-22 -15,-36",
  });

  const rightBranch = createSvgElement("polyline", {
    class: "driving-stage__roadside-detail",
    points: "5,-29 16,-29 16,-42",
  });

  const hatchOne = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -5,
    y1: -12,
    x2: 5,
    y2: -19,
  });

  const hatchTwo = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -5,
    y1: -27,
    x2: 5,
    y2: -34,
  });

  const hatchThree = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -4,
    y1: -42,
    x2: 4,
    y2: -48,
  });

  cactus.append(
    outline,
    centerLine,
    leftBranch,
    rightBranch,
    hatchOne,
    hatchTwo,
    hatchThree,
  );

  return cactus;
}

function createOxSkull(): SVGGElement {
  const skull = createSvgElement("g", {
    class: "driving-stage__ox-skull",
  });

  const leftHorn = createSvgElement("polyline", {
    class: "driving-stage__roadside-outline",
    points:
      "-7,-32 -20,-39 -34,-37 -43,-30 "
      + "-32,-33 -22,-30 -12,-22",
  });

  const rightHorn = createSvgElement("polyline", {
    class: "driving-stage__roadside-outline",
    points:
      "7,-32 20,-39 34,-37 43,-30 "
      + "32,-33 22,-30 12,-22",
  });

  const skullOutline = createSvgElement("polygon", {
    class: "driving-stage__roadside-outline",
    points:
      "-12,-28 -7,-39 0,-44 7,-39 "
      + "12,-28 10,-15 6,-7 3,-2 "
      + "0,0 -3,-2 -6,-7 -10,-15",
  });

  const leftEye = createSvgElement("polygon", {
    class: "driving-stage__roadside-detail",
    points: "-8,-27 -3,-29 -4,-21 -9,-19",
  });

  const rightEye = createSvgElement("polygon", {
    class: "driving-stage__roadside-detail",
    points: "8,-27 3,-29 4,-21 9,-19",
  });

  const nose = createSvgElement("polyline", {
    class: "driving-stage__roadside-detail",
    points: "-3,-10 0,-5 3,-10",
  });

  const hatchOne = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -9,
    y1: -34,
    x2: -1,
    y2: -39,
  });

  const hatchTwo = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -1,
    y1: -35,
    x2: 8,
    y2: -29,
  });

  const hatchThree = createSvgElement("line", {
    class: "driving-stage__roadside-hatch",
    x1: -6,
    y1: -16,
    x2: 5,
    y2: -10,
  });

  skull.append(
    leftHorn,
    rightHorn,
    skullOutline,
    leftEye,
    rightEye,
    nose,
    hatchOne,
    hatchTwo,
    hatchThree,
  );

  return skull;
}

export function getDrivingRoadsidePlacements(
  cameraDistance: number,
): readonly DrivingRoadsidePlacement[] {
  const normalizedCameraDistance =
    Number.isFinite(cameraDistance)
      ? cameraDistance
      : 0;

  const firstObjectIndex = Math.ceil(
    (
      normalizedCameraDistance + 72
    ) / DRIVING_ROADSIDE_SPACING,
  );

  return Array.from(
    { length: DRIVING_ROADSIDE_OBJECT_COUNT },
    (_unused, slotIndex) => {
      const objectIndex =
        firstObjectIndex + slotIndex;

      const side: -1 | 1 =
        positiveModulo(objectIndex, 2) === 0
          ? -1
          : 1;

      const kind: DrivingRoadsideObjectKind =
        positiveModulo(objectIndex, 5) === 0
        || positiveModulo(objectIndex, 5) === 3
          ? "ox-skull"
          : "cactus";

      const edgeOffsetPattern = [
        0.22,
        0.38,
        0.56,
        0.72,
      ] as const;

      const edgeOffset =
        edgeOffsetPattern[
          positiveModulo(
            objectIndex + Math.floor(objectIndex / 2),
            edgeOffsetPattern.length,
          )
        ] ?? 0.38;

      return {
        index: objectIndex,
        kind,
        side,
        distance:
          objectIndex * DRIVING_ROADSIDE_SPACING,
        edgeOffset,
      };
    },
  );
}

export function createDrivingRoadsideSceneryView():
DrivingRoadsideSceneryView {
  const layer = createSvgElement("g", {
    class: "driving-stage__roadside-layer",
    "aria-hidden": "true",
  });

  const objects = Array.from(
    { length: DRIVING_ROADSIDE_OBJECT_COUNT },
    () => {
      const group = createSvgElement("g", {
        class: "driving-stage__roadside-object",
      });

      const cactus = createCactus();
      const oxSkull = createOxSkull();

      group.append(cactus, oxSkull);
      layer.append(group);

      return {
        group,
        cactus,
        oxSkull,
      };
    },
  );

  return {
    layer,
    objects,
  };
}

export function renderDrivingRoadsideSceneryView(
  view: DrivingRoadsideSceneryView,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  cameraDistance: number,
): void {
  const placements = getDrivingRoadsidePlacements(
    cameraDistance,
  );

  const visibleObjects: VisibleRoadsideObject[] = [];

  for (
    let objectIndex = 0;
    objectIndex < view.objects.length;
    objectIndex += 1
  ) {
    const objectView = view.objects[objectIndex];
    const placement = placements[objectIndex];

    if (
      objectView === undefined
      || placement === undefined
    ) {
      continue;
    }

    const projected = projectDrivingRoadsideAnchor(
      roadPoints,
      cameraDistance,
      placement.distance,
      placement.side,
      placement.edgeOffset,
    );

    if (projected === null) {
      setSvgAttributes(objectView.group, {
        display: "none",
      });
      continue;
    }

    const objectScale =
      placement.kind === "cactus"
        ? (0.1 + projected.scale * 0.82) * 1.75
        : 0.09 + projected.scale * 0.7;

    const mirror =
      placement.side === -1
        ? -1
        : 1;

    const rotation =
      placement.kind === "ox-skull"
        ? placement.side * 4
        : placement.side * -2;

    setSvgAttributes(objectView.group, {
      display: "",
      transform:
        `translate(${projected.screenX} ${projected.screenY})`
        + ` rotate(${rotation})`
        + ` scale(${mirror * objectScale} ${objectScale})`,
      opacity:
        0.2 + projected.scale * 0.8,
    });

    setSvgAttributes(objectView.cactus, {
      display:
        placement.kind === "cactus"
          ? ""
          : "none",
    });

    setSvgAttributes(objectView.oxSkull, {
      display:
        placement.kind === "ox-skull"
          ? ""
          : "none",
    });

    visibleObjects.push({
      element: objectView.group,
      relativeDistance: projected.relativeDistance,
    });
  }

  visibleObjects.sort(
    (left, right) =>
      right.relativeDistance
      - left.relativeDistance,
  );

  for (const visibleObject of visibleObjects) {
    view.layer.append(visibleObject.element);
  }
}
