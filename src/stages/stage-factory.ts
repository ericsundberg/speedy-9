import type {
  StageId,
} from "../game/stage-registry";
import {
  createDeadeyeStage,
} from "./deadeye/deadeye-stage";
import {
  createMemoryBurstStage,
} from "./memory-burst/memory-burst-stage";
import {
  createPitSprintStage,
} from "./pit-sprint/pit-sprint-stage";
import {
  createPongBlitzStage,
} from "./pong-blitz/pong-blitz-stage";
import {
  createPitfallRunStage,
} from "./reverse-circuit/reverse-circuit-stage";
import {
  createLockedStage,
} from "./speed-lock/speed-lock-stage";
import {
  createTimesRushStage,
} from "./times-rush/times-rush-stage";
import {
  createTowerClimbStage,
} from "./tower-climb/tower-climb-stage";
import {
  createVectorMazeStage,
} from "./vector-maze/vector-maze-stage";
import type {
  Stage,
} from "./shared/stage";

export function createStage(stageId: StageId): Stage {
  switch (stageId) {
    case "reverse-circuit":
      return createPitfallRunStage();

    case "deadeye":
      return createDeadeyeStage();

    case "pong-blitz":
      return createPongBlitzStage();

    case "pit-sprint":
      return createPitSprintStage();

    case "tower-climb":
      return createTowerClimbStage();

    case "vector-maze":
      return createVectorMazeStage();

    case "memory-burst":
      return createMemoryBurstStage();

    case "times-rush":
      return createTimesRushStage();

    case "speed-lock":
      return createLockedStage();
  }
}
