import { describe, expect, it } from "vitest";
import type { Clock } from "../core/clock";
import {
  FINAL_STAGE_ID,
  PRELIMINARY_STAGE_IDS,
} from "../game/stage-registry";
import type { PreliminaryStageId } from "../game/stage-registry";
import { RunManager } from "./run-manager";
import type {
  RunState,
  SplitResult,
} from "./run-types";

class FakeClock implements Clock {
  private currentMs = 0;

  public nowMs(): number {
    return this.currentMs;
  }

  public set(milliseconds: number): void {
    this.currentMs = milliseconds;
  }

  public advance(milliseconds: number): void {
    this.currentMs += milliseconds;
  }
}

function expectHub(
  manager: RunManager,
): Extract<RunState, { readonly kind: "hub" }> {
  const state = manager.getState();

  if (state.kind !== "hub") {
    throw new Error(`Expected hub state, received ${state.kind}.`);
  }

  return state;
}

function expectStage(
  manager: RunManager,
): Extract<RunState, { readonly kind: "stage" }> {
  const state = manager.getState();

  if (state.kind !== "stage") {
    throw new Error(`Expected stage state, received ${state.kind}.`);
  }

  return state;
}

function expectComplete(
  manager: RunManager,
): Extract<RunState, { readonly kind: "complete" }> {
  const state = manager.getState();

  if (state.kind !== "complete") {
    throw new Error(
      `Expected complete state, received ${state.kind}.`,
    );
  }

  return state;
}

function completePreliminary(
  manager: RunManager,
  clock: FakeClock,
  stageId: PreliminaryStageId,
  durationMs = 100,
): SplitResult {
  manager.enterStage(stageId);
  clock.advance(durationMs);
  return manager.completeStage();
}

function completeAllPreliminaryStages(
  manager: RunManager,
  clock: FakeClock,
): void {
  for (const stageId of PRELIMINARY_STAGE_IDS) {
    completePreliminary(manager, clock, stageId);
  }
}

describe("RunManager", () => {
  it("starts idle with no elapsed time", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    expect(manager.getState()).toEqual({
      kind: "idle",
    });
    expect(manager.getElapsedTimeMs()).toBe(0);
    expect(manager.getCurrentSegmentElapsedMs()).toBeNull();
  });

  it("begins a run in the hub with a generated seed", () => {
    const clock = new FakeClock();
    clock.set(2_500);

    const manager = new RunManager(
      clock,
      () => 0xabcd_1234,
    );

    manager.beginRun();

    const state = expectHub(manager);

    expect(state.run.seed).toBe(0xabcd_1234);
    expect(state.run.runStartedAtMs).toBe(2_500);
    expect(state.run.totalPenaltyMs).toBe(0);
    expect(state.run.completedStageIds).toEqual([]);
    expect(state.run.splits).toEqual({});
    expect(manager.isStageAvailable("deadeye")).toBe(true);
    expect(manager.isStageAvailable(FINAL_STAGE_ID)).toBe(false);
  });

  it("enters an available preliminary stage", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(42);
    clock.advance(750);
    manager.enterStage("vector-maze");

    const state = expectStage(manager);

    expect(state.stageId).toBe("vector-maze");
    expect(state.segmentStartedAtMs).toBe(750);
    expect(state.segmentPenaltyMs).toBe(0);
    expect(manager.getStageSeed("vector-maze")).toBe(
      manager.getStageSeed("vector-maze"),
    );
    expect(manager.getStageSeed("vector-maze")).not.toBe(
      manager.getStageSeed("deadeye"),
    );
  });

  it("keeps the final stage locked before eight completions", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(1);

    expect(manager.isFinalUnlocked()).toBe(false);
    expect(() => manager.enterStage(FINAL_STAGE_ID)).toThrow(
      "Stage is unavailable",
    );
  });

  it("records a preliminary split and excludes hub time", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(2);
    clock.advance(1_000);
    manager.enterStage("deadeye");
    clock.advance(500);

    const split = manager.completeStage();
    const state = expectHub(manager);

    expect(split.rawSegmentDurationMs).toBe(500);
    expect(split.segmentDurationMs).toBe(500);
    expect(split.cumulativeRunTimeMs).toBe(1_500);
    expect(state.run.completedStageIds).toEqual(["deadeye"]);
    expect(state.run.completionOrder).toEqual(["deadeye"]);
    expect(state.run.splits.deadeye).toEqual(split);
    expect(manager.isStageAvailable("deadeye")).toBe(false);
  });

  it("includes stage penalties in segment and total timing", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(3);
    clock.advance(500);
    manager.enterStage("times-rush");
    clock.advance(750);
    manager.addPenalty(1_000, "Incorrect answer");

    expect(manager.getCurrentSegmentElapsedMs()).toBe(1_750);
    expect(manager.getElapsedTimeMs()).toBe(2_250);

    const split = manager.completeStage();
    const state = expectHub(manager);

    expect(split.rawSegmentDurationMs).toBe(750);
    expect(split.segmentPenaltyMs).toBe(1_000);
    expect(split.segmentDurationMs).toBe(1_750);
    expect(split.cumulativeRunTimeMs).toBe(2_250);
    expect(state.run.totalPenaltyMs).toBe(1_000);
    expect(state.run.penalties).toHaveLength(1);
    expect(state.run.penalties[0]).toMatchObject({
      stageId: "times-rush",
      milliseconds: 1_000,
      reason: "Incorrect answer",
    });
  });

  it("preserves earlier penalties without assigning them to later segments", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(4);
    manager.enterStage("times-rush");
    clock.advance(200);
    manager.addPenalty(500, "Incorrect answer");
    manager.completeStage();

    clock.advance(300);
    manager.enterStage("deadeye");
    clock.advance(400);

    const split = manager.completeStage();
    const state = expectHub(manager);

    expect(split.rawSegmentDurationMs).toBe(400);
    expect(split.segmentPenaltyMs).toBe(0);
    expect(split.segmentDurationMs).toBe(400);
    expect(split.cumulativeRunTimeMs).toBe(1_400);
    expect(state.run.totalPenaltyMs).toBe(500);
  });

  it("unlocks Speed Lock after all preliminary stages complete", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(5);
    completeAllPreliminaryStages(manager, clock);

    expect(manager.isFinalUnlocked()).toBe(true);
    expect(manager.isStageAvailable(FINAL_STAGE_ID)).toBe(true);

    const state = expectHub(manager);
    expect(state.run.completedStageIds).toEqual(
      PRELIMINARY_STAGE_IDS,
    );
  });

  it("completes the run at the exact final-stage timestamp", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(6);
    completeAllPreliminaryStages(manager, clock);
    manager.enterStage(FINAL_STAGE_ID);
    clock.advance(250);
    manager.addPenalty(500, "Failed lock attempt");

    const finalSplit = manager.completeStage();
    const state = expectComplete(manager);
    const frozenTime = state.result.totalDurationMs;

    expect(finalSplit.stageId).toBe(FINAL_STAGE_ID);
    expect(finalSplit.segmentDurationMs).toBe(750);
    expect(state.result.runEndedAtMs).toBe(clock.nowMs());
    expect(state.result.splits[FINAL_STAGE_ID]).toEqual(
      finalSplit,
    );
    expect(state.result.completedStageIds).toHaveLength(8);
    expect(manager.getElapsedTimeMs()).toBe(frozenTime);

    clock.advance(10_000);

    expect(manager.getElapsedTimeMs()).toBe(frozenTime);
  });

  it("prevents completed preliminary stages from being selected again", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(7);
    completePreliminary(manager, clock, "pong-blitz");

    expect(() => manager.enterStage("pong-blitz")).toThrow(
      "Stage is unavailable",
    );
  });

  it("rejects illegal transitions while already inside a stage", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(8);
    manager.enterStage("pit-sprint");

    expect(() => manager.enterStage("deadeye")).toThrow(
      "only be entered from the hub",
    );
    expect(() => manager.beginRun(9)).toThrow(
      "while a run is active",
    );
  });

  it("restarts the entire run with clean progress and a new timestamp", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(10);
    completePreliminary(manager, clock, "memory-burst", 300);
    clock.advance(700);

    manager.restartRun(11);

    const state = expectHub(manager);

    expect(state.run.seed).toBe(11);
    expect(state.run.runStartedAtMs).toBe(1_000);
    expect(state.run.completedStageIds).toEqual([]);
    expect(state.run.completionOrder).toEqual([]);
    expect(state.run.splits).toEqual({});
    expect(state.run.totalPenaltyMs).toBe(0);
    expect(manager.getElapsedTimeMs()).toBe(0);
  });

  it("exits an active stage without completing it or erasing run progress", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(12);

    manager.enterStage("reverse-circuit");
    clock.advance(300);
    manager.completeStage();

    manager.enterStage("pong-blitz");
    clock.advance(700);
    manager.addPenalty(250, "test penalty");

    const elapsedBeforeExit =
      manager.getElapsedTimeMs();

    manager.exitStage();

    const state = expectHub(manager);

    expect(state.run.completedStageIds).toEqual([
      "reverse-circuit",
    ]);

    expect(state.run.completionOrder).toEqual([
      "reverse-circuit",
    ]);

    expect(
      state.run.splits["reverse-circuit"],
    ).toBeDefined();

    expect(
      state.run.splits["pong-blitz"],
    ).toBeUndefined();

    expect(state.run.totalPenaltyMs).toBe(250);
    expect(state.run.penalties).toHaveLength(1);

    expect(
      manager.isStageAvailable("pong-blitz"),
    ).toBe(true);

    expect(
      manager.getElapsedTimeMs(),
    ).toBe(elapsedBeforeExit);
  });

  it("abandons an active run and returns to idle", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(12);
    manager.enterStage("tower-climb");
    manager.abandonRun();

    expect(manager.getState()).toEqual({
      kind: "idle",
    });
    expect(manager.getElapsedTimeMs()).toBe(0);
    expect(manager.getStageSeed("tower-climb")).toBeNull();
  });

  it("notifies subscribers of transitions and supports unsubscribe", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);
    const observedKinds: string[] = [];

    const unsubscribe = manager.subscribe((state) => {
      observedKinds.push(state.kind);
    });

    manager.beginRun(13);
    manager.enterStage("reverse-circuit");
    unsubscribe();
    clock.advance(100);
    manager.completeStage();

    expect(observedKinds).toEqual([
      "idle",
      "hub",
      "stage",
    ]);
  });
  it("preserves the Memory Burst seed when progress is unchanged", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(0x1234_5678);

    const initialSeed =
      manager.getStageSeed("memory-burst");

    manager.enterStage("memory-burst");

    const activeSeed =
      manager.getStageSeed("memory-burst");

    manager.exitStage();
    manager.enterStage("memory-burst");

    const reenteredSeed =
      manager.getStageSeed("memory-burst");

    expect(initialSeed).not.toBeNull();
    expect(activeSeed).toBe(initialSeed);
    expect(reenteredSeed).toBe(initialSeed);
  });

  it("changes the Memory Burst seed after another stage is cleared", () => {
    const clock = new FakeClock();
    const manager = new RunManager(clock);

    manager.beginRun(0x1234_5678);

    const initialSeed =
      manager.getStageSeed("memory-burst");

    completePreliminary(
      manager,
      clock,
      "deadeye",
    );

    const updatedSeed =
      manager.getStageSeed("memory-burst");

    expect(initialSeed).not.toBeNull();
    expect(updatedSeed).not.toBeNull();
    expect(updatedSeed).not.toBe(initialSeed);
  });

  it("derives the same Memory Burst seed for the same cleared-stage set", () => {
    const firstClock = new FakeClock();
    const firstManager = new RunManager(firstClock);

    const secondClock = new FakeClock();
    const secondManager = new RunManager(secondClock);

    firstManager.beginRun(0x1234_5678);
    secondManager.beginRun(0x1234_5678);

    completePreliminary(
      firstManager,
      firstClock,
      "deadeye",
    );

    completePreliminary(
      firstManager,
      firstClock,
      "pong-blitz",
    );

    completePreliminary(
      secondManager,
      secondClock,
      "pong-blitz",
    );

    completePreliminary(
      secondManager,
      secondClock,
      "deadeye",
    );

    expect(
      firstManager.getStageSeed("memory-burst"),
    ).toBe(
      secondManager.getStageSeed("memory-burst"),
    );
  });

});
