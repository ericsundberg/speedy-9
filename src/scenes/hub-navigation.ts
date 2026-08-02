export interface GridMovement {
  readonly rowDelta: number;
  readonly columnDelta: number;
}

export type HubStageInteractionState =
  | "available"
  | "complete"
  | "locked";

export function isHubStageNavigable(
  state: HubStageInteractionState,
): boolean {
  return state !== "locked";
}

export function isHubStageLaunchable(
  state: HubStageInteractionState,
): boolean {
  return state === "available";
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function findFirstSelectableIndex(
  selectable: readonly boolean[],
): number {
  return selectable.findIndex(Boolean);
}

export function moveGridSelection(
  currentIndex: number,
  movement: GridMovement,
  selectable: readonly boolean[],
  gridSize = 3,
): number {
  const cellCount = gridSize * gridSize;

  if (gridSize <= 0 || selectable.length !== cellCount) {
    throw new RangeError(
      "Selectable-state length must match the square grid size.",
    );
  }

  if (
    movement.rowDelta === 0
    && movement.columnDelta === 0
  ) {
    return currentIndex;
  }

  const fallbackIndex = findFirstSelectableIndex(selectable);

  if (fallbackIndex < 0) {
    return currentIndex;
  }

  const validCurrentIndex =
    currentIndex >= 0 && currentIndex < cellCount
      ? currentIndex
      : fallbackIndex;

  let row = Math.floor(validCurrentIndex / gridSize);
  let column = validCurrentIndex % gridSize;

  for (let step = 0; step < cellCount; step += 1) {
    row = modulo(row + movement.rowDelta, gridSize);
    column = modulo(
      column + movement.columnDelta,
      gridSize,
    );

    const candidateIndex = row * gridSize + column;

    if (selectable[candidateIndex] === true) {
      return candidateIndex;
    }
  }

  return validCurrentIndex;
}
