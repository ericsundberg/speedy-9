import { describe, expect, it } from "vitest";
import {
  FINAL_STAGE_ID,
  PRELIMINARY_STAGE_IDS,
} from "../game/stage-registry";
import type {
  ActiveRun,
  CompletedRun,
  RunState,
  SplitResult,
} from "../run/run-types";
import { createHudViewModel } from "./hud-model";

function createActiveRun(
  overrides: Partial<ActiveRun> = {},
): ActiveRun {
  return {
    seed: 123,
    runStartedAtMs: 0,
    totalPenaltyMs: 0,
    completedStageIds: [],
    completionOrder: [],
    splits: {},
    penalties: [],
    ...overrides,
  };
}

function createSplit(
  stageId: SplitResult["stageId"],
  segmentDurationMs: number,
): SplitResult {
  return {
    stageId,
    segmentStartedAtMs: 0,
    completedAtMs: segmentDurationMs,
    rawSegmentDurationMs: segmentDurationMs,
    segmentPenaltyMs: 0,
    segmentDurationMs,
    cumulativeRunTimeMs: segmentDurationMs,
  };
}

function findRow(
  state: RunState,
  stageId: SplitResult["stageId"],
) {
  const model = createHudViewModel(state, 0);
  const row = model.rows.find(
    (candidate) => candidate.stageId === stageId,
  );

  if (row === undefined) {
    throw new Error(`Missing HUD row: ${stageId}`);
  }

  return row;
}

describe("createHudViewModel", () => {
  it("renders a ready idle HUD with Speed Lock locked", () => {
    const model = createHudViewModel(
      { kind: "idle" },
      0,
    );

    expect(model.statusText).toBe("READY");
    expect(model.timerText).toBe("0:00.00");
    expect(model.penaltyText).toBe("—");
    expect(model.rows).toHaveLength(9);
    expect(
      model.rows.find(
        (row) => row.stageId === FINAL_STAGE_ID,
      ),
    ).toMatchObject({
      state: "locked",
      timeText: "LOCK",
    });
  });

  it("shows a running hub with preliminary stages available", () => {
    const model = createHudViewModel(
      {
        kind: "hub",
        run: createActiveRun(),
      },
      1_234,
    );

    expect(model.statusText).toBe("RUNNING");
    expect(model.timerText).toBe("0:01.23");
    expect(model.timerDateTime).toBe("PT1.234S");
    expect(model.rows[0]?.state).toBe("available");
  });

  it("highlights the active stage", () => {
    const state: RunState = {
      kind: "stage",
      run: createActiveRun(),
      stageId: "deadeye",
      segmentStartedAtMs: 100,
      segmentPenaltyMs: 0,
    };

    expect(findRow(state, "deadeye").state).toBe("active");
    expect(createHudViewModel(state, 500).statusText).toBe(
      "DEADEYE",
    );
  });

  it("renders completed segment times", () => {
    const split = createSplit("vector-maze", 12_345);
    const run = createActiveRun({
      completedStageIds: ["vector-maze"],
      completionOrder: ["vector-maze"],
      splits: {
        "vector-maze": split,
      },
    });

    const row = findRow(
      {
        kind: "hub",
        run,
      },
      "vector-maze",
    );

    expect(row.state).toBe("complete");
    expect(row.timeText).toBe("0:12.34");
  });

  it("unlocks the final row after eight preliminary completions", () => {
    const run = createActiveRun({
      completedStageIds: [...PRELIMINARY_STAGE_IDS],
      completionOrder: [...PRELIMINARY_STAGE_IDS],
    });

    expect(
      findRow(
        {
          kind: "hub",
          run,
        },
        FINAL_STAGE_ID,
      ).state,
    ).toBe("available");
  });

  it("shows accumulated penalties", () => {
    const model = createHudViewModel(
      {
        kind: "hub",
        run: createActiveRun({
          totalPenaltyMs: 2_500,
        }),
      },
      10_000,
    );

    expect(model.penaltyText).toBe("+2.5");
  });

  it("renders a completed run with a frozen final row", () => {
    const finalSplit = createSplit(FINAL_STAGE_ID, 1_500);

    const result: CompletedRun = {
      seed: 987,
      runStartedAtMs: 0,
      runEndedAtMs: 9_500,
      totalPenaltyMs: 0,
      totalDurationMs: 9_500,
      completedStageIds: [...PRELIMINARY_STAGE_IDS],
      completionOrder: [...PRELIMINARY_STAGE_IDS],
      splits: {
        [FINAL_STAGE_ID]: finalSplit,
      },
      penalties: [],
    };

    const state: RunState = {
      kind: "complete",
      result,
    };

    const model = createHudViewModel(state, 9_500);

    expect(model.statusText).toBe("COMPLETE");
    expect(model.timerTone).toBe("complete");
    expect(findRow(state, FINAL_STAGE_ID).state).toBe("complete");
  });
});
