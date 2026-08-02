import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createDrivingRoadPath,
} from "./driving-render";
import type {
  ProjectedDrivingRoadPoint,
} from "./driving-projection";

function createPoint(
  index: number,
  leftX: number,
  rightX: number,
  y: number,
): ProjectedDrivingRoadPoint {
  return {
    segmentIndex: index,
    centerX: (leftX + rightX) / 2,
    leftX,
    rightX,
    y,
    scale: 1 - index * 0.2,
    relativeDistance: index * 36,
  };
}

describe("driving road rendering", () => {
  it("renders road edges as smooth cubic curves", () => {
    const points = [
      createPoint(0, 100, 860, 650),
      createPoint(1, 130, 820, 520),
      createPoint(2, 190, 760, 390),
      createPoint(3, 270, 690, 270),
    ];

    const path = createDrivingRoadPath(
      points,
      "leftX",
    );

    expect(path).toMatch(
      /^M 100\.00 650\.00/,
    );
    expect(path).toContain(" C ");
    expect(path).not.toContain(" L ");
    expect(path.endsWith("270.00 270.00")).toBe(true);
  });

  it("returns an empty path when no road points exist", () => {
    expect(createDrivingRoadPath([], "rightX")).toBe("");
  });

  it("renders a single point without an invalid curve", () => {
    const point = createPoint(0, 100, 860, 650);

    expect(
      createDrivingRoadPath([point], "rightX"),
    ).toBe("M 860.00 650.00");
  });
});
