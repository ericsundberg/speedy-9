import { PlaceholderStage } from "../shared/placeholder-stage";
import type { Stage } from "../shared/stage";

export function createDeadeyeStage(): Stage {
  return new PlaceholderStage("deadeye");
}
