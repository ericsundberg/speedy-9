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
  DRIVING_FINISH_COLUMNS,
  DRIVING_FINISH_HATCH_COUNT,
  DRIVING_FINISH_ROWS,
  projectDrivingFinishCells,
} from "./driving-finish-render";

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

describe("driving finish-line renderer", () => {
  it("projects exactly two checker rows across the road", () => {
    const cells = projectDrivingFinishCells(
      createProjectedRoad(),
      240,
    );

    expect(cells).toHaveLength(
      DRIVING_FINISH_ROWS
      * DRIVING_FINISH_COLUMNS,
    );

    expect(
      new Set(cells.map((cell) => cell.row)),
    ).toEqual(new Set([0, 1]));

    expect(
      cells.filter((cell) => cell.row === 0),
    ).toHaveLength(DRIVING_FINISH_COLUMNS);

    expect(
      cells.filter((cell) => cell.row === 1),
    ).toHaveLength(DRIVING_FINISH_COLUMNS);
  });

  it("alternates the checker pattern between rows", () => {
    const cells = projectDrivingFinishCells(
      createProjectedRoad(),
      240,
    );

    expect(cells[0]?.light).toBe(true);
    expect(cells[1]?.light).toBe(false);
    expect(
      cells[DRIVING_FINISH_COLUMNS]?.light,
    ).toBe(false);
    expect(
      cells[DRIVING_FINISH_COLUMNS + 1]?.light,
    ).toBe(true);
  });

  it("creates four corners for every checker cell", () => {
    const cells = projectDrivingFinishCells(
      createProjectedRoad(),
      240,
    );

    for (const cell of cells) {
      expect(cell.points.split(" ")).toHaveLength(4);
    }
  });

  it("uses diagonal hatching instead of filled checks", () => {
    const cells = projectDrivingFinishCells(
      createProjectedRoad(),
      240,
    );

    for (const cell of cells) {
      expect(cell.hatches).toHaveLength(
        cell.light
          ? DRIVING_FINISH_HATCH_COUNT
          : 0,
      );

      for (const hatch of cell.hatches) {
        expect(hatch.x1).not.toBe(hatch.x2);
        expect(hatch.y1).not.toBe(hatch.y2);
      }
    }
  });

  it("hides the line outside the projected road range", () => {
    const road = createProjectedRoad();

    expect(
      projectDrivingFinishCells(road, 0),
    ).toEqual([]);

    expect(
      projectDrivingFinishCells(road, 10_000),
    ).toEqual([]);
  });
});
