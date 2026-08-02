import {
  FINAL_STAGE_ID,
  getStageMetadata,
  PRELIMINARY_STAGE_IDS,
  STAGE_REGISTRY,
} from "../game/stage-registry";
import type { StageId } from "../game/stage-registry";
import {
  formatDeltaMs,
  formatDurationMs,
} from "../core/time-format";
import type {
  ActiveRun,
  CompletedRun,
  RunState,
} from "../run/run-types";

export type HudStageState =
  | "available"
  | "active"
  | "complete"
  | "locked";

export type HudStatusTone =
  | "ready"
  | "running"
  | "stage"
  | "complete";

export type HudTimerTone =
  | "idle"
  | "running"
  | "complete";

export interface HudStageRowModel {
  readonly stageId: StageId;
  readonly name: string;
  readonly state: HudStageState;
  readonly deltaText: string;
  readonly timeText: string;
}

export interface HudViewModel {
  readonly statusText: string;
  readonly statusTone: HudStatusTone;
  readonly timerText: string;
  readonly timerDateTime: string;
  readonly timerTone: HudTimerTone;
  readonly penaltyText: string;
  readonly rows: readonly HudStageRowModel[];
}

function getRunData(
  state: RunState,
): ActiveRun | CompletedRun | null {
  switch (state.kind) {
    case "idle":
      return null;

    case "hub":
    case "stage":
      return state.run;

    case "complete":
      return state.result;
  }
}

function getStatusText(state: RunState): string {
  switch (state.kind) {
    case "idle":
      return "READY";

    case "hub":
      return "RUNNING";

    case "stage":
      return getStageMetadata(state.stageId).shortName.toUpperCase();

    case "complete":
      return "COMPLETE";
  }
}

function getStatusTone(state: RunState): HudStatusTone {
  switch (state.kind) {
    case "idle":
      return "ready";

    case "hub":
      return "running";

    case "stage":
      return "stage";

    case "complete":
      return "complete";
  }
}

function getTimerTone(state: RunState): HudTimerTone {
  switch (state.kind) {
    case "idle":
      return "idle";

    case "hub":
    case "stage":
      return "running";

    case "complete":
      return "complete";
  }
}

function isFinalUnlocked(
  state: RunState,
  runData: ActiveRun | CompletedRun | null,
): boolean {
  if (state.kind === "complete") {
    return true;
  }

  if (runData === null) {
    return false;
  }

  return (
    runData.completedStageIds.length
    === PRELIMINARY_STAGE_IDS.length
  );
}

function createStageRow(
  state: RunState,
  runData: ActiveRun | CompletedRun | null,
  finalUnlocked: boolean,
  stageId: StageId,
): HudStageRowModel {
  const stage = getStageMetadata(stageId);
  const split = runData?.splits[stageId];
  const isActive =
    state.kind === "stage"
    && state.stageId === stageId;

  let stageState: HudStageState;

  if (split !== undefined) {
    stageState = "complete";
  } else if (isActive) {
    stageState = "active";
  } else if (
    stageId === FINAL_STAGE_ID
    && !finalUnlocked
  ) {
    stageState = "locked";
  } else {
    stageState = "available";
  }

  return {
    stageId,
    name: stage.displayName,
    state: stageState,
    deltaText: "—",
    timeText:
      split === undefined
        ? stageState === "locked"
          ? "LOCK"
          : "—"
        : formatDurationMs(split.segmentDurationMs),
  };
}

function createTimerDateTime(elapsedMs: number): string {
  const normalizedElapsedMs =
    Number.isFinite(elapsedMs) && elapsedMs > 0
      ? elapsedMs
      : 0;

  return `PT${(normalizedElapsedMs / 1_000).toFixed(3)}S`;
}

export function createHudViewModel(
  state: RunState,
  elapsedMs: number,
): HudViewModel {
  const runData = getRunData(state);
  const finalUnlocked = isFinalUnlocked(
    state,
    runData,
  );

  const penaltyText =
    runData !== null && runData.totalPenaltyMs > 0
      ? formatDeltaMs(runData.totalPenaltyMs)
      : "—";

  return {
    statusText: getStatusText(state),
    statusTone: getStatusTone(state),
    timerText: formatDurationMs(elapsedMs),
    timerDateTime: createTimerDateTime(elapsedMs),
    timerTone: getTimerTone(state),
    penaltyText,
    rows: STAGE_REGISTRY.map((stage) =>
      createStageRow(
        state,
        runData,
        finalUnlocked,
        stage.id,
      ),
    ),
  };
}
