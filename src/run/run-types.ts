import type {
  PreliminaryStageId,
  StageId,
} from "../game/stage-registry";

export interface SplitResult {
  readonly stageId: StageId;
  readonly segmentStartedAtMs: number;
  readonly completedAtMs: number;
  readonly rawSegmentDurationMs: number;
  readonly segmentPenaltyMs: number;
  readonly segmentDurationMs: number;
  readonly cumulativeRunTimeMs: number;
}

export interface PenaltyRecord {
  readonly stageId: StageId;
  readonly milliseconds: number;
  readonly reason: string;
  readonly recordedAtMs: number;
  readonly recordedAtRunTimeMs: number;
}

export interface ActiveRun {
  readonly seed: number;
  readonly runStartedAtMs: number;
  readonly totalPenaltyMs: number;
  readonly completedStageIds: readonly PreliminaryStageId[];
  readonly completionOrder: readonly PreliminaryStageId[];
  readonly splits: Readonly<
    Partial<Record<StageId, SplitResult>>
  >;
  readonly penalties: readonly PenaltyRecord[];
}

export interface CompletedRun {
  readonly seed: number;
  readonly runStartedAtMs: number;
  readonly runEndedAtMs: number;
  readonly totalPenaltyMs: number;
  readonly totalDurationMs: number;
  readonly completedStageIds: readonly PreliminaryStageId[];
  readonly completionOrder: readonly PreliminaryStageId[];
  readonly splits: Readonly<
    Partial<Record<StageId, SplitResult>>
  >;
  readonly penalties: readonly PenaltyRecord[];
}

export type RunState =
  | {
      readonly kind: "idle";
    }
  | {
      readonly kind: "hub";
      readonly run: ActiveRun;
    }
  | {
      readonly kind: "stage";
      readonly run: ActiveRun;
      readonly stageId: StageId;
      readonly segmentStartedAtMs: number;
      readonly segmentPenaltyMs: number;
    }
  | {
      readonly kind: "complete";
      readonly result: CompletedRun;
    };

export type RunStateListener = (state: RunState) => void;
