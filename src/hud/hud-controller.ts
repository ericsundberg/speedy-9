import {
  isStageId,
  STAGE_REGISTRY,
} from "../game/stage-registry";
import type { StageId } from "../game/stage-registry";
import type { RunState } from "../run/run-types";
import {
  createHudViewModel,
} from "./hud-model";
import type {
  HudStageState,
} from "./hud-model";

interface HudStageElements {
  readonly root: HTMLElement;
  readonly name: HTMLElement;
  readonly delta: HTMLElement;
  readonly time: HTMLElement;
}

const STAGE_STATE_CLASSES: readonly string[] = [
  "livesplit-split--available",
  "livesplit-split--active",
  "livesplit-split--complete",
  "livesplit-split--locked",
];

const TIMER_TONE_CLASSES: readonly string[] = [
  "livesplit-timer--idle",
  "livesplit-timer--running",
  "livesplit-timer--complete",
];

export class HudController {
  private readonly root: HTMLElement;
  private readonly status: HTMLElement;
  private readonly timer: HTMLTimeElement;
  private readonly penaltyValue: HTMLElement;
  private readonly stageElements =
    new Map<StageId, HudStageElements>();

  public constructor(root: HTMLElement) {
    this.root = root;
    this.status = this.requireElement<HTMLElement>(
      "#hud-run-status",
    );
    this.timer = this.requireElement<HTMLTimeElement>(
      ".livesplit-timer",
    );

    const stats = this.requireElement<HTMLElement>(
      ".livesplit-stats",
    );

    this.penaltyValue = this.ensurePenaltyRow(stats);
    this.initializeStageRows();
  }

  public render(
    state: RunState,
    elapsedMs: number,
  ): void {
    const model = createHudViewModel(
      state,
      elapsedMs,
    );

    this.status.textContent = model.statusText;
    this.status.dataset.runState = model.statusTone;
    this.status.classList.remove(
      "hud-status__value--pending",
    );

    this.timer.textContent = model.timerText;
    this.timer.dateTime = model.timerDateTime;
    this.timer.classList.remove(...TIMER_TONE_CLASSES);
    this.timer.classList.add(
      `livesplit-timer--${model.timerTone}`,
    );

    this.penaltyValue.textContent = model.penaltyText;

    for (const rowModel of model.rows) {
      const elements = this.stageElements.get(
        rowModel.stageId,
      );

      if (elements === undefined) {
        throw new Error(
          `Missing HUD elements for stage: ${rowModel.stageId}`,
        );
      }

      this.renderStageRow(
        elements,
        rowModel.state,
        rowModel.name,
        rowModel.deltaText,
        rowModel.timeText,
      );
    }
  }

  private initializeStageRows(): void {
    const rows = Array.from(
      this.root.querySelectorAll<HTMLElement>(
        ".livesplit-split",
      ),
    );

    if (rows.length !== STAGE_REGISTRY.length) {
      throw new Error(
        `Expected ${STAGE_REGISTRY.length} HUD stage rows, found ${rows.length}.`,
      );
    }

    for (
      let index = 0;
      index < STAGE_REGISTRY.length;
      index += 1
    ) {
      const stage = STAGE_REGISTRY[index];
      const row = rows[index];

      if (stage === undefined || row === undefined) {
        throw new Error("Unable to initialize HUD stage rows.");
      }

      if (!isStageId(stage.id)) {
        throw new Error(`Invalid HUD stage ID: ${stage.id}`);
      }

      row.dataset.stageId = stage.id;

      this.stageElements.set(stage.id, {
        root: row,
        name: this.requireElement<HTMLElement>(
          ".livesplit-split__name",
          row,
        ),
        delta: this.requireElement<HTMLElement>(
          ".livesplit-split__delta",
          row,
        ),
        time: this.requireElement<HTMLElement>(
          ".livesplit-split__time",
          row,
        ),
      });
    }
  }

  private ensurePenaltyRow(stats: HTMLElement): HTMLElement {
    const existingValue = stats.querySelector<HTMLElement>(
      "[data-hud-stat-value=\"penalties\"]",
    );

    if (existingValue !== null) {
      return existingValue;
    }

    const row = document.createElement("div");
    row.className = "livesplit-stat";
    row.dataset.hudStat = "penalties";

    const label = document.createElement("span");
    label.className = "livesplit-stat__label";
    label.textContent = "Penalties";

    const value = document.createElement("span");
    value.className = "livesplit-stat__value";
    value.dataset.hudStatValue = "penalties";
    value.textContent = "—";

    row.append(label, value);
    stats.insertBefore(row, stats.lastElementChild);

    return value;
  }

  private renderStageRow(
    elements: HudStageElements,
    state: HudStageState,
    name: string,
    deltaText: string,
    timeText: string,
  ): void {
    elements.root.classList.remove(...STAGE_STATE_CLASSES);
    elements.root.classList.add(
      `livesplit-split--${state}`,
    );
    elements.root.dataset.stageState = state;

    if (state === "active") {
      elements.root.setAttribute("aria-current", "step");
    } else {
      elements.root.removeAttribute("aria-current");
    }

    elements.name.textContent = name;
    elements.delta.textContent = deltaText;
    elements.time.textContent = timeText;
  }

  private requireElement<TElement extends Element>(
    selector: string,
    root: ParentNode = this.root,
  ): TElement {
    const element = root.querySelector<TElement>(selector);

    if (element === null) {
      throw new Error(`Missing HUD element: ${selector}`);
    }

    return element;
  }
}
