export const DRIVING_SEGMENT_LENGTH = 36;
export const DRIVING_DRAW_DISTANCE = 36;
export const DRIVING_LANE_MARKER_COUNT = 18;

const DEFAULT_ROAD_WIDTH = 1;
const NEAR_CLIP_DISTANCE = 6;
const CURVE_ACCELERATION = 0.13;
const CURVE_SCREEN_SCALE = 5.8;

export interface DrivingTrackSegment {
  readonly index: number;
  readonly curve: number;
  readonly elevation: number;
  readonly width: number;
}

export interface DrivingTrack {
  readonly segmentLength: number;
  readonly segments: readonly DrivingTrackSegment[];
  readonly length: number;
}

export interface DrivingTrackSection {
  readonly segmentCount: number;
  readonly curve: number;
  readonly elevationDelta: number;
  readonly width: number;
}

export interface DrivingProjectionCamera {
  readonly distance: number;
  readonly lateralPosition: number;
  readonly viewWidth: number;
  readonly horizonY: number;
  readonly roadBottomY: number;
  readonly nearHalfWidth: number;
  readonly farHalfWidth: number;
  readonly drawDistance?: number;
}

export interface ProjectedDrivingRoadPoint {
  readonly segmentIndex: number;
  readonly centerX: number;
  readonly leftX: number;
  readonly rightX: number;
  readonly y: number;
  readonly scale: number;
  readonly relativeDistance: number;
}

export interface ProjectedDrivingObject {
  readonly screenX: number;
  readonly screenY: number;
  readonly scale: number;
  readonly relativeDistance: number;
}

const MAIN_TRACK_SECTIONS: readonly DrivingTrackSection[] = [
  {
    segmentCount: 14,
    curve: 0,
    elevationDelta: 0,
    width: 1,
  },
  {
    segmentCount: 8,
    curve: -0.18,
    elevationDelta: 0.03,
    width: 1,
  },
  {
    segmentCount: 18,
    curve: -0.42,
    elevationDelta: 0.07,
    width: 1,
  },
  {
    segmentCount: 8,
    curve: -0.18,
    elevationDelta: 0.02,
    width: 1.02,
  },
  {
    segmentCount: 10,
    curve: 0,
    elevationDelta: -0.12,
    width: 1.04,
  },
  {
    segmentCount: 8,
    curve: 0.2,
    elevationDelta: -0.02,
    width: 1,
  },
  {
    segmentCount: 22,
    curve: 0.48,
    elevationDelta: 0.04,
    width: 0.94,
  },
  {
    segmentCount: 8,
    curve: 0.2,
    elevationDelta: -0.03,
    width: 0.94,
  },
  {
    segmentCount: 12,
    curve: 0.12,
    elevationDelta: -0.05,
    width: 0.98,
  },
  {
    segmentCount: 8,
    curve: -0.16,
    elevationDelta: 0,
    width: 1.04,
  },
  {
    segmentCount: 20,
    curve: -0.38,
    elevationDelta: 0,
    width: 1.08,
  },
  {
    segmentCount: 8,
    curve: -0.14,
    elevationDelta: 0,
    width: 1.04,
  },
  {
    segmentCount: 14,
    curve: 0,
    elevationDelta: 0,
    width: 1,
  },
];

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

function lerp(
  start: number,
  end: number,
  amount: number,
): number {
  return start + (end - start) * amount;
}

function positiveModulo(
  value: number,
  divisor: number,
): number {
  return ((value % divisor) + divisor) % divisor;
}

function normalizeFinite(
  value: number,
  fallback: number,
): number {
  return Number.isFinite(value)
    ? value
    : fallback;
}

export function createDrivingTrack(
  sections: readonly DrivingTrackSection[],
  segmentLength = DRIVING_SEGMENT_LENGTH,
): DrivingTrack {
  if (
    !Number.isFinite(segmentLength)
    || segmentLength <= 0
  ) {
    throw new RangeError(
      "Driving track segment length must be positive.",
    );
  }

  const segments: DrivingTrackSegment[] = [];
  let elevation = 0;

  for (const section of sections) {
    const segmentCount = Math.max(
      0,
      Math.floor(section.segmentCount),
    );

    for (
      let sectionIndex = 0;
      sectionIndex < segmentCount;
      sectionIndex += 1
    ) {
      elevation += section.elevationDelta;

      segments.push({
        index: segments.length,
        curve: normalizeFinite(section.curve, 0),
        elevation,
        width: Math.max(
          0.25,
          normalizeFinite(
            section.width,
            DEFAULT_ROAD_WIDTH,
          ),
        ),
      });
    }
  }

  if (segments.length === 0) {
    throw new RangeError(
      "Driving track requires at least one segment.",
    );
  }

  return {
    segmentLength,
    segments,
    length: segments.length * segmentLength,
  };
}

export const DRIVING_MAIN_TRACK = createDrivingTrack(
  MAIN_TRACK_SECTIONS,
);

export function sampleDrivingTrack(
  track: DrivingTrack,
  distance: number,
): DrivingTrackSegment {
  const normalizedDistance = positiveModulo(
    normalizeFinite(distance, 0),
    track.length,
  );

  const segmentIndex = Math.floor(
    normalizedDistance / track.segmentLength,
  );

  const segment = track.segments[segmentIndex];

  if (segment === undefined) {
    throw new RangeError(
      `Missing driving track segment ${segmentIndex}.`,
    );
  }

  return segment;
}

export function getDrivingTrackCurveAtDistance(
  track: DrivingTrack,
  distance: number,
): number {
  return sampleDrivingTrack(
    track,
    distance,
  ).curve;
}

export function projectDrivingRoad(
  track: DrivingTrack,
  camera: DrivingProjectionCamera,
): readonly ProjectedDrivingRoadPoint[] {
  const drawDistance = Math.max(
    2,
    Math.floor(
      camera.drawDistance
      ?? DRIVING_DRAW_DISTANCE,
    ),
  );

  const cameraDistance = normalizeFinite(
    camera.distance,
    0,
  );

  const cameraLateral = clamp(
    normalizeFinite(camera.lateralPosition, 0),
    -2,
    2,
  );

  const cameraSegment = sampleDrivingTrack(
    track,
    cameraDistance,
  );

  const points: ProjectedDrivingRoadPoint[] = [];

  let curveVelocity = 0;
  let curveOffset = 0;

  for (
    let pointIndex = 0;
    pointIndex <= drawDistance;
    pointIndex += 1
  ) {
    const relativeDistance =
      NEAR_CLIP_DISTANCE
      + pointIndex * track.segmentLength;

    const absoluteDistance =
      cameraDistance + relativeDistance;

    const segment = sampleDrivingTrack(
      track,
      absoluteDistance,
    );

    if (pointIndex > 0) {
      curveVelocity +=
        segment.curve * CURVE_ACCELERATION;

      curveOffset += curveVelocity;
    }

    const depth = pointIndex / drawDistance;

    const scale = clamp(
      1 - Math.pow(depth, 0.72),
      0,
      1,
    );

    const widthScale = lerp(
      camera.farHalfWidth,
      camera.nearHalfWidth,
      scale,
    );

    const roadHalfWidth =
      widthScale * segment.width;

    const cameraShift =
      -cameraLateral
      * roadHalfWidth
      * 0.5;

    const curveShift =
      curveOffset
      * CURVE_SCREEN_SCALE
      * (0.38 + scale * 0.62);

    const elevationDifference =
      segment.elevation
      - cameraSegment.elevation;

    const baseY =
      camera.horizonY
      + (
        camera.roadBottomY
        - camera.horizonY
      )
      * Math.pow(scale, 1.28);

    const elevationShift =
      elevationDifference
      * (0.45 + scale * 0.72);

    const centerX =
      camera.viewWidth / 2
      + cameraShift
      + curveShift;

    const y = baseY - elevationShift;

    points.push({
      segmentIndex: segment.index,
      centerX,
      leftX: centerX - roadHalfWidth,
      rightX: centerX + roadHalfWidth,
      y,
      scale,
      relativeDistance,
    });
  }

  return points;
}
export function projectDrivingObject(
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  cameraDistance: number,
  objectDistance: number,
  lateralPosition: number,
  segmentLength = DRIVING_SEGMENT_LENGTH,
): ProjectedDrivingObject | null {
  const firstPoint = roadPoints[0];
  const finalPoint = roadPoints.at(-1);

  if (
    firstPoint === undefined
    || finalPoint === undefined
    || !Number.isFinite(cameraDistance)
    || !Number.isFinite(objectDistance)
    || !Number.isFinite(segmentLength)
    || segmentLength <= 0
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

  const pointPosition =
    (
      relativeDistance
      - firstPoint.relativeDistance
    )
    / segmentLength;

  const lowerIndex = clamp(
    Math.floor(pointPosition),
    0,
    roadPoints.length - 1,
  );

  const upperIndex = Math.min(
    lowerIndex + 1,
    roadPoints.length - 1,
  );

  const lowerPoint = roadPoints[lowerIndex];
  const upperPoint = roadPoints[upperIndex];

  if (
    lowerPoint === undefined
    || upperPoint === undefined
  ) {
    return null;
  }

  const interpolation = clamp(
    pointPosition - lowerIndex,
    0,
    1,
  );

  const centerX = lerp(
    lowerPoint.centerX,
    upperPoint.centerX,
    interpolation,
  );

  const leftX = lerp(
    lowerPoint.leftX,
    upperPoint.leftX,
    interpolation,
  );

  const rightX = lerp(
    lowerPoint.rightX,
    upperPoint.rightX,
    interpolation,
  );

  const roadHalfWidth =
    (rightX - leftX) / 2;

  const normalizedLateral = clamp(
    normalizeFinite(lateralPosition, 0),
    -1.5,
    1.5,
  );

  return {
    screenX:
      centerX
      + normalizedLateral
      * roadHalfWidth
      * 0.78,
    screenY: lerp(
      lowerPoint.y,
      upperPoint.y,
      interpolation,
    ),
    scale: lerp(
      lowerPoint.scale,
      upperPoint.scale,
      interpolation,
    ),
    relativeDistance,
  };
}
