import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createDrivingTrack,
  DRIVING_DRAW_DISTANCE,
  DRIVING_MAIN_TRACK,
  projectDrivingObject,
  projectDrivingRoad,
  sampleDrivingTrack,
} from "./driving-projection";
import type {
  DrivingProjectionCamera,
  DrivingTrack,
  DrivingTrackSection,
} from "./driving-projection";

const BASE_CAMERA: DrivingProjectionCamera = {
  distance: 0,
  lateralPosition: 0,
  viewWidth: 960,
  horizonY: 154,
  roadBottomY: 650,
  nearHalfWidth: 392,
  farHalfWidth: 50,
};

function createTestTrack(
  sections: readonly DrivingTrackSection[],
): DrivingTrack {
  return createDrivingTrack(
    sections,
    36,
  );
}

describe("driving projection", () => {
  it("creates an authored looping track", () => {
    expect(
      DRIVING_MAIN_TRACK.segments.length,
    ).toBeGreaterThan(
      DRIVING_DRAW_DISTANCE,
    );

    expect(DRIVING_MAIN_TRACK.length).toBe(
      DRIVING_MAIN_TRACK.segments.length
      * DRIVING_MAIN_TRACK.segmentLength,
    );
  });

  it("contains pronounced sustained curves in both directions", () => {
    const curves = DRIVING_MAIN_TRACK.segments.map(
      (segment) => segment.curve,
    );

    expect(Math.min(...curves)).toBeLessThanOrEqual(-0.42);
    expect(Math.max(...curves)).toBeGreaterThanOrEqual(0.48);

    const strongLeftCurves = curves.filter(
      (curve) => curve <= -0.35,
    );

    const strongRightCurves = curves.filter(
      (curve) => curve >= 0.35,
    );

    expect(strongLeftCurves).toHaveLength(38);
    expect(strongRightCurves).toHaveLength(22);
    expect(
      strongLeftCurves.length
      + strongRightCurves.length,
    ).toBe(60);
  });

  it("samples negative distances by wrapping", () => {
    const finalSegment =
      DRIVING_MAIN_TRACK.segments.at(-1);

    expect(finalSegment).toBeDefined();

    expect(
      sampleDrivingTrack(
        DRIVING_MAIN_TRACK,
        -1,
      ).index,
    ).toBe(finalSegment?.index);
  });

  it("projects one more point than the draw distance", () => {
    const points = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      BASE_CAMERA,
    );

    expect(points).toHaveLength(
      DRIVING_DRAW_DISTANCE + 1,
    );
  });

  it("makes nearby road geometry wider and lower", () => {
    const points = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      BASE_CAMERA,
    );

    const nearPoint = points[0];
    const farPoint = points.at(-1);

    expect(nearPoint).toBeDefined();
    expect(farPoint).toBeDefined();

    const nearWidth =
      (nearPoint?.rightX ?? 0)
      - (nearPoint?.leftX ?? 0);

    const farWidth =
      (farPoint?.rightX ?? 0)
      - (farPoint?.leftX ?? 0);

    expect(nearWidth).toBeGreaterThan(farWidth);
    expect(nearPoint?.y).toBeGreaterThan(
      farPoint?.y ?? 0,
    );
  });

  it("shifts the road opposite the camera position", () => {
    const centered = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      BASE_CAMERA,
    );

    const cameraRight = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      {
        ...BASE_CAMERA,
        lateralPosition: 0.75,
      },
    );

    expect(cameraRight[0]?.centerX).toBeLessThan(
      centered[0]?.centerX ?? 0,
    );
  });

  it("bends projected geometry through curved sections", () => {
    const straightTrack = createTestTrack([
      {
        segmentCount: 80,
        curve: 0,
        elevationDelta: 0,
        width: 1,
      },
    ]);

    const curvedTrack = createTestTrack([
      {
        segmentCount: 80,
        curve: 0.28,
        elevationDelta: 0,
        width: 1,
      },
    ]);

    const straight = projectDrivingRoad(
      straightTrack,
      BASE_CAMERA,
    );

    const curved = projectDrivingRoad(
      curvedTrack,
      BASE_CAMERA,
    );

    expect(curved[24]?.centerX).not.toBeCloseTo(
      straight[24]?.centerX ?? 0,
    );
  });

  it("projects rising road sections above flat ones", () => {
    const flatTrack = createTestTrack([
      {
        segmentCount: 80,
        curve: 0,
        elevationDelta: 0,
        width: 1,
      },
    ]);

    const risingTrack = createTestTrack([
      {
        segmentCount: 80,
        curve: 0,
        elevationDelta: 0.4,
        width: 1,
      },
    ]);

    const flat = projectDrivingRoad(
      flatTrack,
      BASE_CAMERA,
    );

    const rising = projectDrivingRoad(
      risingTrack,
      BASE_CAMERA,
    );

    expect(rising[18]?.y).toBeLessThan(
      flat[18]?.y ?? 0,
    );
  });

  it("returns finite projection values", () => {
    const points = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      {
        ...BASE_CAMERA,
        distance: Number.NaN,
        lateralPosition: Number.POSITIVE_INFINITY,
      },
    );

    for (const point of points) {
      expect(Number.isFinite(point.centerX)).toBe(true);
      expect(Number.isFinite(point.leftX)).toBe(true);
      expect(Number.isFinite(point.rightX)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Number.isFinite(point.scale)).toBe(true);
    }
  });
it("keeps cars visible throughout the collision envelope", () => {
    const points = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      BASE_CAMERA,
    );

    const projected = projectDrivingObject(
      points,
      BASE_CAMERA.distance,
      13,
      0,
    );

    expect(projected).not.toBeNull();
    expect(projected?.relativeDistance).toBe(13);
  });

  it("visually aligns cars occupying the player lane", () => {
    const lateralPosition = 0.55;

    const points = projectDrivingRoad(
      DRIVING_MAIN_TRACK,
      {
        ...BASE_CAMERA,
        lateralPosition,
      },
    );

    const projected = projectDrivingObject(
      points,
      BASE_CAMERA.distance,
      13,
      lateralPosition,
    );

    const playerScreenX =
      BASE_CAMERA.viewWidth / 2
      + lateralPosition * 108;

    expect(projected).not.toBeNull();

    expect(
      Math.abs(
        (projected?.screenX ?? 0)
        - playerScreenX,
      ),
    ).toBeLessThan(14);
  });
});
