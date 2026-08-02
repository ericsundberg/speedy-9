import { PlaceholderStage } from "../shared/placeholder-stage";
import type { Stage } from "../shared/stage";

export function createLockedStage(): Stage {
  return new PlaceholderStage("speed-lock");
}
