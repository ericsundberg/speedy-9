import {
  FINAL_STAGE_ID,
} from "../game/stage-registry";
import type {
  StageId,
} from "../game/stage-registry";

export type HubGlyphId =
  | "pitfall"
  | "deadeye"
  | "pong"
  | "pit"
  | "tower"
  | "maze"
  | "memory"
  | "pace"
  | "lock";

export interface HubStagePresentation {
  readonly labelLines: readonly string[];
  readonly glyph: HubGlyphId;
}

export const HUB_STAGE_ORDER = [
  "reverse-circuit",
  "deadeye",
  "pong-blitz",
  "pit-sprint",
  FINAL_STAGE_ID,
  "tower-climb",
  "vector-maze",
  "memory-burst",
  "pace-racer",
] as const satisfies readonly StageId[];

const HUB_STAGE_PRESENTATIONS: Readonly<
  Record<StageId, HubStagePresentation>
> = {
  "reverse-circuit": {
    labelLines: ["PITFALL", "RUN"],
    glyph: "pitfall",
  },
  deadeye: {
    labelLines: ["DEAD", "EYE"],
    glyph: "deadeye",
  },
  "pong-blitz": {
    labelLines: ["PONG", "BLITZ"],
    glyph: "pong",
  },
  "pit-sprint": {
    labelLines: ["SPACE", "WAR"],
    glyph: "pit",
  },
  "tower-climb": {
    labelLines: ["TOWER", "CLIMB"],
    glyph: "tower",
  },
  "vector-maze": {
    labelLines: ["VECTOR", "MAZE"],
    glyph: "maze",
  },
  "memory-burst": {
    labelLines: ["MEMORY", "BURST"],
    glyph: "memory",
  },
  "pace-racer": {
    labelLines: ["PACE", "RACER"],
    glyph: "pace",
  },
  "speed-lock": {
    labelLines: ["LOCKED"],
    glyph: "lock",
  },
};

export function getHubStagePresentation(
  stageId: StageId,
): HubStagePresentation {
  return HUB_STAGE_PRESENTATIONS[stageId];
}
