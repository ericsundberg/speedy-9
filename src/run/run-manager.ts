import type { Clock } from "../core/clock";
import { calculateElapsedMs } from "../core/clock";
import { deriveSeed } from "../core/random";
import {
  FINAL_STAGE_ID,
  isPreliminaryStageId,
  PRELIMINARY_STAGE_IDS,
} from "../game/stage-registry";
import type {
  PreliminaryStageId,
  StageId,
} from "../game/stage-registry";
import type {
  ActiveRun,
  CompletedRun,
  PenaltyRecord,
  RunState,
  RunStateListener,
  SplitResult,
} from "./run-types";

const MAX_UINT32 = 0xffff_ffff;

export type RunTransitionErrorCode =
  | "run-active"
  | "not-in-hub"
  | "stage-unavailable"
  | "not-in-stage";

export class RunTransitionError extends Error {
  public readonly code: RunTransitionErrorCode;

  public constructor(
    code: RunTransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RunTransitionError";
    this.code = code;
  }
}

export type RunSeedFactory = () => number;

function createDefaultRunSeed(): number {
  return Math.floor(Math.random() * (MAX_UINT32 + 1));
}

function validateRunSeed(seed: number): number {
  if (
    !Number.isInteger(seed)
    || seed < 0
    || seed > MAX_UINT32
  ) {
    throw new RangeError(
      "Run seeds must be unsigned 32-bit integers.",
    );
  }

  return seed >>> 0;
}

function createMemoryBurstSeedNamespace(
  completedStageIds: readonly PreliminaryStageId[],
): string {
  const clearedStageIds = PRELIMINARY_STAGE_IDS.filter(
    (stageId) => (
      stageId !== "memory-burst"
      && completedStageIds.includes(stageId)
    ),
  );

  return [
    "memory-burst",
    `cleared:${clearedStageIds.join(",")}`,
  ].join("|");
}

function cloneSplitResult(split: SplitResult): SplitResult {
  return {
    ...split,
  };
}

function clonePenaltyRecord(
  penalty: PenaltyRecord,
): PenaltyRecord {
  return {
    ...penalty,
  };
}

function cloneSplits(
  splits: Readonly<Partial<Record<StageId, SplitResult>>>,
): Partial<Record<StageId, SplitResult>> {
  const clonedSplits: Partial<Record<StageId, SplitResult>> = {};

  for (const stageId of [
    ...PRELIMINARY_STAGE_IDS,
    FINAL_STAGE_ID,
  ] as const) {
    const split = splits[stageId];

    if (split !== undefined) {
      clonedSplits[stageId] = cloneSplitResult(split);
    }
  }

  return clonedSplits;
}

function cloneActiveRun(run: ActiveRun): ActiveRun {
  return {
    seed: run.seed,
    runStartedAtMs: run.runStartedAtMs,
    totalPenaltyMs: run.totalPenaltyMs,
    completedStageIds: [...run.completedStageIds],
    completionOrder: [...run.completionOrder],
    splits: cloneSplits(run.splits),
    penalties: run.penalties.map(clonePenaltyRecord),
  };
}

function cloneCompletedRun(result: CompletedRun): CompletedRun {
  return {
    seed: result.seed,
    runStartedAtMs: result.runStartedAtMs,
    runEndedAtMs: result.runEndedAtMs,
    totalPenaltyMs: result.totalPenaltyMs,
    totalDurationMs: result.totalDurationMs,
    completedStageIds: [...result.completedStageIds],
    completionOrder: [...result.completionOrder],
    splits: cloneSplits(result.splits),
    penalties: result.penalties.map(clonePenaltyRecord),
  };
}

function cloneRunState(state: RunState): RunState {
  switch (state.kind) {
    case "idle":
      return {
        kind: "idle",
      };

    case "hub":
      return {
        kind: "hub",
        run: cloneActiveRun(state.run),
      };

    case "stage":
      return {
        kind: "stage",
        run: cloneActiveRun(state.run),
        stageId: state.stageId,
        segmentStartedAtMs: state.segmentStartedAtMs,
        segmentPenaltyMs: state.segmentPenaltyMs,
      };

    case "complete":
      return {
        kind: "complete",
        result: cloneCompletedRun(state.result),
      };
  }
}

function createActiveRun(
  seed: number,
  runStartedAtMs: number,
): ActiveRun {
  return {
    seed,
    runStartedAtMs,
    totalPenaltyMs: 0,
    completedStageIds: [],
    completionOrder: [],
    splits: {},
    penalties: [],
  };
}

export class RunManager {
  private readonly clock: Clock;
  private readonly seedFactory: RunSeedFactory;
  private readonly listeners = new Set<RunStateListener>();

  private state: RunState = {
    kind: "idle",
  };

  public constructor(
    clock: Clock,
    seedFactory: RunSeedFactory = createDefaultRunSeed,
  ) {
    this.clock = clock;
    this.seedFactory = seedFactory;
  }

  public getState(): RunState {
    return cloneRunState(this.state);
  }

  public subscribe(
    listener: RunStateListener,
    emitImmediately = true,
  ): () => void {
    this.listeners.add(listener);

    if (emitImmediately) {
      listener(this.getState());
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  public beginRun(seed = this.seedFactory()): void {
    if (
      this.state.kind === "hub"
      || this.state.kind === "stage"
    ) {
      throw new RunTransitionError(
        "run-active",
        "Cannot begin a new run while a run is active.",
      );
    }

    this.startNewRun(seed);
  }

  public restartRun(seed = this.seedFactory()): void {
    this.startNewRun(seed);
  }

  public abandonRun(): void {
    this.transition({
      kind: "idle",
    });
  }

  public enterStage(stageId: StageId): void {
    const hubState = this.requireHubState();

    if (!this.isStageAvailable(stageId)) {
      throw new RunTransitionError(
        "stage-unavailable",
        `Stage is unavailable: ${stageId}`,
      );
    }

    this.transition({
      kind: "stage",
      run: hubState.run,
      stageId,
      segmentStartedAtMs: this.clock.nowMs(),
      segmentPenaltyMs: 0,
    });
  }

  public exitStage(): void {
    const stageState = this.requireStageState();

    this.transition({
      kind: "hub",
      run: stageState.run,
    });
  }

  public addPenalty(
    milliseconds: number,
    reason: string,
  ): void {
    const stageState = this.requireStageState();

    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError(
        "Penalty duration must be finite and non-negative.",
      );
    }

    if (reason.trim().length === 0) {
      throw new RangeError("Penalty reason cannot be empty.");
    }

    if (milliseconds === 0) {
      return;
    }

    const recordedAtMs = this.clock.nowMs();
    const totalPenaltyMs =
      stageState.run.totalPenaltyMs + milliseconds;

    const penalty: PenaltyRecord = {
      stageId: stageState.stageId,
      milliseconds,
      reason: reason.trim(),
      recordedAtMs,
      recordedAtRunTimeMs: calculateElapsedMs(
        stageState.run.runStartedAtMs,
        recordedAtMs,
        totalPenaltyMs,
      ),
    };

    const updatedRun: ActiveRun = {
      ...stageState.run,
      totalPenaltyMs,
      penalties: [
        ...stageState.run.penalties,
        penalty,
      ],
    };

    this.transition({
      ...stageState,
      run: updatedRun,
      segmentPenaltyMs:
        stageState.segmentPenaltyMs + milliseconds,
    });
  }

  public completeStage(): SplitResult {
    const stageState = this.requireStageState();
    const completedAtMs = this.clock.nowMs();

    const rawSegmentDurationMs = Math.max(
      0,
      completedAtMs - stageState.segmentStartedAtMs,
    );

    const segmentDurationMs =
      rawSegmentDurationMs + stageState.segmentPenaltyMs;

    const cumulativeRunTimeMs = calculateElapsedMs(
      stageState.run.runStartedAtMs,
      completedAtMs,
      stageState.run.totalPenaltyMs,
    );

    const split: SplitResult = {
      stageId: stageState.stageId,
      segmentStartedAtMs: stageState.segmentStartedAtMs,
      completedAtMs,
      rawSegmentDurationMs,
      segmentPenaltyMs: stageState.segmentPenaltyMs,
      segmentDurationMs,
      cumulativeRunTimeMs,
    };

    const splits: Partial<Record<StageId, SplitResult>> = {
      ...stageState.run.splits,
      [stageState.stageId]: split,
    };

    if (isPreliminaryStageId(stageState.stageId)) {
      const completedStageIds: readonly PreliminaryStageId[] = [
        ...stageState.run.completedStageIds,
        stageState.stageId,
      ];

      const completionOrder: readonly PreliminaryStageId[] = [
        ...stageState.run.completionOrder,
        stageState.stageId,
      ];

      this.transition({
        kind: "hub",
        run: {
          ...stageState.run,
          completedStageIds,
          completionOrder,
          splits,
        },
      });

      return cloneSplitResult(split);
    }

    const result: CompletedRun = {
      seed: stageState.run.seed,
      runStartedAtMs: stageState.run.runStartedAtMs,
      runEndedAtMs: completedAtMs,
      totalPenaltyMs: stageState.run.totalPenaltyMs,
      totalDurationMs: cumulativeRunTimeMs,
      completedStageIds: [
        ...stageState.run.completedStageIds,
      ],
      completionOrder: [
        ...stageState.run.completionOrder,
      ],
      splits,
      penalties: stageState.run.penalties.map(
        clonePenaltyRecord,
      ),
    };

    this.transition({
      kind: "complete",
      result,
    });

    return cloneSplitResult(split);
  }

  public getElapsedTimeMs(): number {
    switch (this.state.kind) {
      case "idle":
        return 0;

      case "hub":
      case "stage":
        return calculateElapsedMs(
          this.state.run.runStartedAtMs,
          this.clock.nowMs(),
          this.state.run.totalPenaltyMs,
        );

      case "complete":
        return this.state.result.totalDurationMs;
    }
  }

  public getCurrentSegmentElapsedMs(): number | null {
    if (this.state.kind !== "stage") {
      return null;
    }

    return calculateElapsedMs(
      this.state.segmentStartedAtMs,
      this.clock.nowMs(),
      this.state.segmentPenaltyMs,
    );
  }

  public isFinalUnlocked(): boolean {
    switch (this.state.kind) {
      case "idle":
        return false;

      case "hub":
      case "stage":
        return (
          this.state.run.completedStageIds.length
          === PRELIMINARY_STAGE_IDS.length
        );

      case "complete":
        return true;
    }
  }

  public isStageAvailable(stageId: StageId): boolean {
    if (this.state.kind !== "hub") {
      return false;
    }

    if (stageId === FINAL_STAGE_ID) {
      return (
        this.state.run.completedStageIds.length
        === PRELIMINARY_STAGE_IDS.length
      );
    }

    return !this.state.run.completedStageIds.includes(stageId);
  }

  public getStageSeed(stageId: StageId): number | null {
    let runSeed: number;

    let completedStageIds:
      readonly PreliminaryStageId[];

    switch (this.state.kind) {
      case "idle":
        return null;

      case "hub":
      case "stage":
        runSeed = this.state.run.seed;
        completedStageIds =
          this.state.run.completedStageIds;
        break;

      case "complete":
        runSeed = this.state.result.seed;
        completedStageIds =
          this.state.result.completedStageIds;
        break;
    }

    if (stageId === "memory-burst") {
      return deriveSeed(
        runSeed,
        createMemoryBurstSeedNamespace(
          completedStageIds,
        ),
      );
    }

    return deriveSeed(runSeed, stageId);
  }

  private startNewRun(seed: number): void {
    const validatedSeed = validateRunSeed(seed);
    const runStartedAtMs = this.clock.nowMs();

    this.transition({
      kind: "hub",
      run: createActiveRun(
        validatedSeed,
        runStartedAtMs,
      ),
    });
  }

  private requireHubState(): Extract<
    RunState,
    { readonly kind: "hub" }
  > {
    if (this.state.kind !== "hub") {
      throw new RunTransitionError(
        "not-in-hub",
        "A stage can only be entered from the hub.",
      );
    }

    return this.state;
  }

  private requireStageState(): Extract<
    RunState,
    { readonly kind: "stage" }
  > {
    if (this.state.kind !== "stage") {
      throw new RunTransitionError(
        "not-in-stage",
        "This operation requires an active stage.",
      );
    }

    return this.state;
  }

  private transition(state: RunState): void {
    this.state = state;

    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}
