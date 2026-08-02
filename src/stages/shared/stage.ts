import type {
  StageId,
} from "../../game/stage-registry";

export interface StageContext {
  readonly root: HTMLElement;
  readonly stageSeed: number;
  readonly complete: () => void;
  readonly fail: () => void;
  readonly addPenalty: (
    milliseconds: number,
    reason: string,
  ) => void;
}

export interface Stage {
  readonly id: StageId;

  mount(context: StageContext): void;
  start(): void;
  restart(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
