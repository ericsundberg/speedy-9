import {
  createSvgElement,
  setSvgAttributes,
} from "../../core/svg";
import type {
  ProjectedDrivingRoadPoint,
} from "./driving-projection";

export const DRIVING_FINISH_ROWS = 2;
export const DRIVING_FINISH_COLUMNS = 8;
export const DRIVING_FINISH_ROW_DEPTH = 24;
export const DRIVING_FINISH_HATCH_COUNT = 3;

interface DrivingRoadCrossSection {
  readonly leftX: number;
  readonly rightX: number;
  readonly y: number;
}

interface DrivingFinishPoint {
  readonly x: number;
  readonly y: number;
}

export interface DrivingFinishHatchProjection {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface DrivingFinishCellProjection {
  readonly row: number;
  readonly column: number;
  readonly light: boolean;
  readonly points: string;
  readonly hatches:
    readonly DrivingFinishHatchProjection[];
}

export interface DrivingFinishCellView {
  readonly group: SVGGElement;
  readonly outline: SVGPolygonElement;
  readonly hatches: readonly SVGLineElement[];
}

export interface DrivingFinishLineView {
  readonly layer: SVGGElement;
  readonly cells: readonly DrivingFinishCellView[];
}

function lerp(
  start: number,
  end: number,
  amount: number,
): number {
  return start + (end - start) * amount;
}

function projectRoadCrossSection(
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  relativeDistance: number,
): DrivingRoadCrossSection | null {
  const firstPoint = roadPoints[0];
  const finalPoint = roadPoints.at(-1);

  if (
    firstPoint === undefined
    || finalPoint === undefined
    || !Number.isFinite(relativeDistance)
    || relativeDistance
      < firstPoint.relativeDistance
    || relativeDistance
      > finalPoint.relativeDistance
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

    return {
      leftX: lerp(
        nearPoint.leftX,
        farPoint.leftX,
        interpolation,
      ),
      rightX: lerp(
        nearPoint.rightX,
        farPoint.rightX,
        interpolation,
      ),
      y: lerp(
        nearPoint.y,
        farPoint.y,
        interpolation,
      ),
    };
  }

  return null;
}

function getCrossSectionX(
  section: DrivingRoadCrossSection,
  columnBoundary: number,
): number {
  return lerp(
    section.leftX,
    section.rightX,
    columnBoundary / DRIVING_FINISH_COLUMNS,
  );
}

function projectCellPoint(
  nearSection: DrivingRoadCrossSection,
  farSection: DrivingRoadCrossSection,
  column: number,
  horizontalFraction: number,
  depthFraction: number,
): DrivingFinishPoint {
  const nearLeftX = getCrossSectionX(
    nearSection,
    column,
  );

  const nearRightX = getCrossSectionX(
    nearSection,
    column + 1,
  );

  const farLeftX = getCrossSectionX(
    farSection,
    column,
  );

  const farRightX = getCrossSectionX(
    farSection,
    column + 1,
  );

  const leftX = lerp(
    nearLeftX,
    farLeftX,
    depthFraction,
  );

  const rightX = lerp(
    nearRightX,
    farRightX,
    depthFraction,
  );

  return {
    x: lerp(
      leftX,
      rightX,
      horizontalFraction,
    ),
    y: lerp(
      nearSection.y,
      farSection.y,
      depthFraction,
    ),
  };
}

function createCellHatches(
  nearSection: DrivingRoadCrossSection,
  farSection: DrivingRoadCrossSection,
  column: number,
): readonly DrivingFinishHatchProjection[] {
  return Array.from(
    { length: DRIVING_FINISH_HATCH_COUNT },
    (_unused, hatchIndex) => {
      const startFraction =
        0.03 + hatchIndex * 0.31;

      const endFraction =
        Math.min(
          0.97,
          startFraction + 0.27,
        );

      const start = projectCellPoint(
        nearSection,
        farSection,
        column,
        startFraction,
        0.08,
      );

      const end = projectCellPoint(
        nearSection,
        farSection,
        column,
        endFraction,
        0.92,
      );

      return {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
      };
    },
  );
}

export function projectDrivingFinishCells(
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  relativeFinishDistance: number,
): readonly DrivingFinishCellProjection[] {
  if (!Number.isFinite(relativeFinishDistance)) {
    return [];
  }

  const cells: DrivingFinishCellProjection[] = [];

  for (
    let row = 0;
    row < DRIVING_FINISH_ROWS;
    row += 1
  ) {
    const nearDistance =
      relativeFinishDistance
      + row * DRIVING_FINISH_ROW_DEPTH;

    const farDistance =
      nearDistance
      + DRIVING_FINISH_ROW_DEPTH;

    const nearSection = projectRoadCrossSection(
      roadPoints,
      nearDistance,
    );

    const farSection = projectRoadCrossSection(
      roadPoints,
      farDistance,
    );

    if (
      nearSection === null
      || farSection === null
    ) {
      return [];
    }

    for (
      let column = 0;
      column < DRIVING_FINISH_COLUMNS;
      column += 1
    ) {
      const nearLeftX = getCrossSectionX(
        nearSection,
        column,
      );

      const nearRightX = getCrossSectionX(
        nearSection,
        column + 1,
      );

      const farLeftX = getCrossSectionX(
        farSection,
        column,
      );

      const farRightX = getCrossSectionX(
        farSection,
        column + 1,
      );

      const light = (row + column) % 2 === 0;

      cells.push({
        row,
        column,
        light,
        points:
          `${nearLeftX.toFixed(2)},${nearSection.y.toFixed(2)} `
          + `${nearRightX.toFixed(2)},${nearSection.y.toFixed(2)} `
          + `${farRightX.toFixed(2)},${farSection.y.toFixed(2)} `
          + `${farLeftX.toFixed(2)},${farSection.y.toFixed(2)}`,
        hatches:
          light
            ? createCellHatches(
                nearSection,
                farSection,
                column,
              )
            : [],
      });
    }
  }

  return cells;
}

export function createDrivingFinishLineView():
DrivingFinishLineView {
  const layer = createSvgElement("g", {
    class: "driving-stage__finish-line",
    "aria-hidden": "true",
  });

  const cells = Array.from(
    {
      length:
        DRIVING_FINISH_ROWS
        * DRIVING_FINISH_COLUMNS,
    },
    (_unused, cellIndex) => {
      const row = Math.floor(
        cellIndex / DRIVING_FINISH_COLUMNS,
      );

      const column =
        cellIndex % DRIVING_FINISH_COLUMNS;

      const light =
        (row + column) % 2 === 0;

      const group = createSvgElement("g", {
        class:
          "driving-stage__finish-cell "
          + (
            light
              ? "driving-stage__finish-cell--hatched"
              : "driving-stage__finish-cell--open"
          ),
        "data-row": row,
        "data-column": column,
      });

      const outline = createSvgElement("polygon", {
        class: "driving-stage__finish-cell-outline",
      });

      const hatches = Array.from(
        { length: DRIVING_FINISH_HATCH_COUNT },
        () => createSvgElement("line", {
          class: "driving-stage__finish-cell-hatch",
        }),
      );

      group.append(
        outline,
        ...hatches,
      );

      layer.append(group);

      return {
        group,
        outline,
        hatches,
      };
    },
  );

  return {
    layer,
    cells,
  };
}

export function renderDrivingFinishLineView(
  view: DrivingFinishLineView,
  roadPoints: readonly ProjectedDrivingRoadPoint[],
  relativeFinishDistance: number,
): void {
  const projectedCells = projectDrivingFinishCells(
    roadPoints,
    relativeFinishDistance,
  );

  if (projectedCells.length !== view.cells.length) {
    setSvgAttributes(view.layer, {
      display: "none",
    });
    return;
  }

  setSvgAttributes(view.layer, {
    display: "",
  });

  for (
    let cellIndex = 0;
    cellIndex < view.cells.length;
    cellIndex += 1
  ) {
    const cell = view.cells[cellIndex];
    const projection = projectedCells[cellIndex];

    if (
      cell === undefined
      || projection === undefined
    ) {
      continue;
    }

    setSvgAttributes(cell.outline, {
      points: projection.points,
    });

    for (
      let hatchIndex = 0;
      hatchIndex < cell.hatches.length;
      hatchIndex += 1
    ) {
      const hatch = cell.hatches[hatchIndex];
      const hatchProjection =
        projection.hatches[hatchIndex];

      if (hatch === undefined) {
        continue;
      }

      if (hatchProjection === undefined) {
        setSvgAttributes(hatch, {
          display: "none",
        });
        continue;
      }

      setSvgAttributes(hatch, {
        display: "",
        x1: hatchProjection.x1,
        y1: hatchProjection.y1,
        x2: hatchProjection.x2,
        y2: hatchProjection.y2,
      });
    }
  }
}
