export const PRELIMINARY_STAGE_IDS = [
  "reverse-circuit",
  "deadeye",
  "pong-blitz",
  "pit-sprint",
  "tower-climb",
  "vector-maze",
  "memory-burst",
  "times-rush",
] as const;

export type PreliminaryStageId =
  (typeof PRELIMINARY_STAGE_IDS)[number];

export const FINAL_STAGE_ID = "speed-lock" as const;

export type FinalStageId = typeof FINAL_STAGE_ID;

export type StageId =
  | PreliminaryStageId
  | FinalStageId;

export type StageKind =
  | "preliminary"
  | "final";

export interface StageMetadata {
  readonly id: StageId;
  readonly shortName: string;
  readonly displayName: string;
  readonly kind: StageKind;
  readonly order: number;
  readonly iconId: string;
}

export const STAGE_REGISTRY = [
  {
    id: "reverse-circuit",
    shortName: "Circuit",
    displayName: "Reverse Circuit",
    kind: "preliminary",
    order: 1,
    iconId: "reverse-circuit",
  },
  {
    id: "deadeye",
    shortName: "Deadeye",
    displayName: "Deadeye",
    kind: "preliminary",
    order: 2,
    iconId: "deadeye",
  },
  {
    id: "pong-blitz",
    shortName: "Pong",
    displayName: "Pong Blitz",
    kind: "preliminary",
    order: 3,
    iconId: "pong-blitz",
  },
  {
    id: "pit-sprint",
    shortName: "Pit",
    displayName: "Pit Sprint",
    kind: "preliminary",
    order: 4,
    iconId: "pit-sprint",
  },
  {
    id: "tower-climb",
    shortName: "Tower",
    displayName: "Tower Climb",
    kind: "preliminary",
    order: 5,
    iconId: "tower-climb",
  },
  {
    id: "vector-maze",
    shortName: "Maze",
    displayName: "Vector Maze",
    kind: "preliminary",
    order: 6,
    iconId: "vector-maze",
  },
  {
    id: "memory-burst",
    shortName: "Memory",
    displayName: "Memory Burst",
    kind: "preliminary",
    order: 7,
    iconId: "memory-burst",
  },
  {
    id: "times-rush",
    shortName: "Times",
    displayName: "Times Rush",
    kind: "preliminary",
    order: 8,
    iconId: "times-rush",
  },
  {
    id: FINAL_STAGE_ID,
    shortName: "Locked",
    displayName: "Locked",
    kind: "final",
    order: 9,
    iconId: "speed-lock",
  },
] as const satisfies readonly StageMetadata[];

const STAGE_BY_ID = new Map<StageId, StageMetadata>(
  STAGE_REGISTRY.map(
    (stage): readonly [StageId, StageMetadata] => [
      stage.id,
      stage,
    ],
  ),
);

export function isPreliminaryStageId(
  stageId: StageId,
): stageId is PreliminaryStageId {
  return PRELIMINARY_STAGE_IDS.includes(
    stageId as PreliminaryStageId,
  );
}

export function isFinalStageId(
  stageId: StageId,
): stageId is FinalStageId {
  return stageId === FINAL_STAGE_ID;
}

export function isStageId(value: string): value is StageId {
  return STAGE_BY_ID.has(value as StageId);
}

export function getStageMetadata(
  stageId: StageId,
): StageMetadata {
  const stage = STAGE_BY_ID.get(stageId);

  if (stage === undefined) {
    throw new RangeError(`Unknown stage ID: ${stageId}`);
  }

  return stage;
}
