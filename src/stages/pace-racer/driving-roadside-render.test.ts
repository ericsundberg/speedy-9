import {
  describe,
  expect,
  it,
} from "vitest";
import {
  DRIVING_VIEW_WIDTH,
} from "./driving-model";
import {
  DRIVING_MAIN_TRACK,
  projectDrivingRoad,
} from "./driving-projection";
import {
  DRIVING_ROADSIDE_OBJECT_COUNT,
  DRIVING_ROADSIDE_SPACING,
  getDrivingRoadsidePlacements,
  projectDrivingRoadsideAnchor,
} from "./driving-roadside-render";

function createProjectedRoad() {
  return projectDrivingRoad(
    DRIVING_MAIN_TRACK,
    {
      distance: 0,
      lateralPosition: 0,
      viewWidth: DRIVING_VIEW_WIDTH,
      horizonY: 154,
      roadBottomY: 650,
      nearHalfWidth: 392,
      farHalfWidth: 50,
    },
  );
}

describe("driving roadside scenery", () => {
  it("creates a dense repeating set ahead of the camera", () => {
    const placements = getDrivingRoadsidePlacements(500);

    expect(placements).toHaveLength(
      DRIVING_ROADSIDE_OBJECT_COUNT,
    );

    expect(
      placements.every(
        (placement) => placement.distance > 500,
      ),
    ).toBe(true);
  });

  it("uses consistent longitudinal spacing", () => {
    const placements = getDrivingRoadsidePlacements(0);

    for (
      let index = 1;
      index < placements.length;
      index += 1
    ) {
      const previous = placements[index - 1];
      const current = placements[index];

      expect(previous).toBeDefined();
      expect(current).toBeDefined();

      if (
        previous === undefined
        || current === undefined
      ) {
        continue;
      }

      expect(
        current.distance - previous.distance,
      ).toBe(DRIVING_ROADSIDE_SPACING);
    }
  });

  it("uses both sides of the road", () => {
    const placements = getDrivingRoadsidePlacements(0);
    const sides = new Set(
      placements.map((placement) => placement.side),
    );

    expect(sides).toEqual(new Set([-1, 1]));
  });

  it("includes both cacti and ox skulls", () => {
    const placements = getDrivingRoadsidePlacements(0);
    const kinds = new Set(
      placements.map((placement) => placement.kind),
    );

    expect(kinds).toEqual(
      new Set(["cactus", "ox-skull"]),
    );
  });

  it("varies distance outward from the road edge", () => {
    const placements = getDrivingRoadsidePlacements(0);
    const offsets = placements.map(
      (placement) => placement.edgeOffset,
    );

    expect(Math.min(...offsets)).toBeLessThan(0.25);
    expect(Math.max(...offsets)).toBeGreaterThan(0.7);
  });

  it("projects every visible object beyond its road edge", () => {
    const road = createProjectedRoad();
    const placements = getDrivingRoadsidePlacements(0);
    let visibleCount = 0;

    for (const placement of placements) {
      const projected = projectDrivingRoadsideAnchor(
        road,
        0,
        placement.distance,
        placement.side,
        placement.edgeOffset,
      );

      if (projected === null) {
        continue;
      }

      visibleCount += 1;

      if (placement.side === -1) {
        expect(projected.screenX).toBeLessThan(
          projected.roadEdgeX,
        );
      } else {
        expect(projected.screenX).toBeGreaterThan(
          projected.roadEdgeX,
        );
      }
    }

    expect(visibleCount).toBeGreaterThan(0);
  });
});
