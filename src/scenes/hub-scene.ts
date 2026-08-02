import type {
  Scene,
} from "../app/scene";
import {
  FINAL_STAGE_ID,
  getStageMetadata,
  isPreliminaryStageId,
  isStageId,
  PRELIMINARY_STAGE_IDS,
} from "../game/stage-registry";
import type {
  StageId,
} from "../game/stage-registry";
import type {
  ActiveRun,
} from "../run/run-types";
import {
  createHubPlaceholderGraphic,
} from "./hub-glyphs";
import {
  getHubStagePresentation,
  HUB_STAGE_ORDER,
} from "./hub-layout";
import {
  findFirstSelectableIndex,
  moveGridSelection,
} from "./hub-navigation";
import type {
  GridMovement,
} from "./hub-navigation";

interface HubSceneOptions {
  readonly run: ActiveRun;
  readonly onSelect: (stageId: StageId) => void;
}

const FRAME_CORNER_NAMES = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const;

const KEY_MOVEMENTS: Readonly<Record<string, GridMovement>> = {
  ArrowUp: {
    rowDelta: -1,
    columnDelta: 0,
  },
  KeyW: {
    rowDelta: -1,
    columnDelta: 0,
  },
  ArrowDown: {
    rowDelta: 1,
    columnDelta: 0,
  },
  KeyS: {
    rowDelta: 1,
    columnDelta: 0,
  },
  ArrowLeft: {
    rowDelta: 0,
    columnDelta: -1,
  },
  KeyA: {
    rowDelta: 0,
    columnDelta: -1,
  },
  ArrowRight: {
    rowDelta: 0,
    columnDelta: 1,
  },
  KeyD: {
    rowDelta: 0,
    columnDelta: 1,
  },
};

export class HubScene implements Scene {
  private readonly options: HubSceneOptions;
  private scene: HTMLElement | null = null;
  private buttons: HTMLButtonElement[] = [];

  public constructor(options: HubSceneOptions) {
    this.options = options;
  }

  public mount(root: HTMLElement): void {
    this.destroy();

    const scene = document.createElement("section");
    scene.className = "hub-scene";
    scene.setAttribute("aria-labelledby", "hub-title");

    const title = document.createElement("h1");
    title.id = "hub-title";
    title.className = "hub-scene__title";
    title.textContent = "SELECT STAGE";

    const grid = document.createElement("div");
    grid.className = "hub-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Stage selection");

    this.buttons = HUB_STAGE_ORDER.map((stageId) =>
      this.createStageTile(stageId),
    );

    grid.append(...this.buttons);
    scene.append(title, grid);

    scene.addEventListener("click", this.handleClick);
    scene.addEventListener("keydown", this.handleKeyDown);
    scene.addEventListener(
      "pointerover",
      this.handlePointerOver,
    );

    this.scene = scene;
    root.replaceChildren(scene);

    const firstIndex = findFirstSelectableIndex(
      this.buttons.map((button) => !button.disabled),
    );

    if (firstIndex >= 0) {
      this.buttons[firstIndex]?.focus({
        preventScroll: true,
      });
    }
  }

  public destroy(): void {
    this.scene?.removeEventListener(
      "click",
      this.handleClick,
    );
    this.scene?.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );
    this.scene?.removeEventListener(
      "pointerover",
      this.handlePointerOver,
    );

    this.scene = null;
    this.buttons = [];
  }

  private createStageTile(stageId: StageId): HTMLButtonElement {
    const metadata = getStageMetadata(stageId);
    const presentation = getHubStagePresentation(stageId);
    const isFinal = stageId === FINAL_STAGE_ID;
    const completed =
      isPreliminaryStageId(stageId)
      && this.options.run.completedStageIds.includes(stageId);
    const finalUnlocked =
      this.options.run.completedStageIds.length
      === PRELIMINARY_STAGE_IDS.length;
    const available = isFinal ? finalUnlocked : !completed;

    const tile = document.createElement("button");
    tile.className = "hub-stage";
    tile.type = "button";
    tile.dataset.stageId = stageId;
    tile.dataset.stageState =
      completed
        ? "complete"
        : available
          ? "available"
          : "locked";
    tile.disabled = !available;

    if (isFinal) {
      tile.classList.add("hub-stage--final");

      if (finalUnlocked) {
        tile.classList.add("hub-stage--unlocked");
      } else {
        tile.classList.add("hub-stage--locked");
      }
    }

    if (completed) {
      tile.classList.add("hub-stage--complete");
    }

    const stateLabel =
      completed
        ? "complete"
        : available
          ? "available"
          : "unavailable";

    tile.setAttribute(
      "aria-label",
      `${metadata.displayName}, ${stateLabel}`,
    );

    const portraitFrame = document.createElement("div");
    portraitFrame.className = "hub-stage__portrait-frame";

    const innerFrame = document.createElement("div");
    innerFrame.className = "hub-stage__portrait-inner";
    innerFrame.append(
      createHubPlaceholderGraphic(
        presentation.glyph,
        metadata.order,
      ),
    );

    for (const cornerName of FRAME_CORNER_NAMES) {
      const corner = document.createElement("span");
      corner.className =
        `hub-stage__corner hub-stage__corner--${cornerName}`;
      corner.setAttribute("aria-hidden", "true");
      portraitFrame.append(corner);
    }

    portraitFrame.append(innerFrame);

    if (isFinal) {
      portraitFrame.append(this.createDamageRing());
    }

    const label = document.createElement("div");
    label.className = "hub-stage__label";

    for (const lineText of presentation.labelLines) {
      const line = document.createElement("span");
      line.className = "hub-stage__label-line";
      line.textContent = lineText;
      label.append(line);
    }

    tile.append(portraitFrame, label);
    return tile;
  }

  private createDamageRing(): HTMLElement {
    const ring = document.createElement("span");
    ring.className = "hub-stage__damage-ring";
    ring.setAttribute("aria-hidden", "true");

    for (
      let index = 0;
      index < PRELIMINARY_STAGE_IDS.length;
      index += 1
    ) {
      const stageId = PRELIMINARY_STAGE_IDS[index];

      if (stageId === undefined) {
        continue;
      }

      const segment = document.createElement("span");
      segment.className = "hub-stage__damage-segment";
      segment.style.setProperty(
        "--damage-index",
        index.toString(),
      );

      if (
        this.options.run.completedStageIds.includes(stageId)
      ) {
        segment.classList.add(
          "hub-stage__damage-segment--complete",
        );
      }

      ring.append(segment);
    }

    return ring;
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const candidate = target.closest(".hub-stage");

    if (
      !(candidate instanceof HTMLButtonElement)
      || candidate.disabled
    ) {
      return;
    }

    const stageId = candidate.dataset.stageId;

    if (stageId === undefined || !isStageId(stageId)) {
      return;
    }

    this.options.onSelect(stageId);
  };

  private readonly handlePointerOver = (
    event: PointerEvent,
  ): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const candidate = target.closest(".hub-stage");

    if (
      candidate instanceof HTMLButtonElement
      && !candidate.disabled
    ) {
      candidate.focus({
        preventScroll: true,
      });
    }
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    const movement = KEY_MOVEMENTS[event.code];

    if (movement === undefined) {
      return;
    }

    event.preventDefault();

    const currentIndex = this.buttons.findIndex(
      (button) => button === document.activeElement,
    );

    const nextIndex = moveGridSelection(
      currentIndex,
      movement,
      this.buttons.map((button) => !button.disabled),
    );

    this.buttons[nextIndex]?.focus({
      preventScroll: true,
    });
  };
}
