import { PlaceholderStage } from "../shared/placeholder-stage";
import type { Stage } from "../shared/stage";

export function createMemoryBurstStage(): Stage {
  return new PlaceholderStage("memory-burst");
}
