import type {
  Scene,
} from "../app/scene";
import {
  debug_mode,
} from "../core/debug";
import type {
  Stage,
  StageContext,
} from "../stages/shared/stage";

type StageHostContext = Omit<StageContext, "root" | "fail"> & {
  readonly exitStage: () => void;
};

type PauseOption =
  | "resume"
  | "exit-stage";

const DEBUG_WIN_KEY = "KeyK";
const PAUSE_KEY = "Escape";

const UP_KEYS = new Set([
  "KeyW",
  "ArrowUp",
]);

const DOWN_KEYS = new Set([
  "KeyS",
  "ArrowDown",
]);

const CONFIRM_KEYS = new Set([
  "Enter",
  "Space",
]);

export class StageHostScene implements Scene {
  private readonly stage: Stage;
  private readonly context: StageHostContext;

  private pauseOverlay: HTMLElement | null = null;
  private resumeButton: HTMLButtonElement | null = null;
  private exitStageButton: HTMLButtonElement | null = null;

  private selectedPauseOption: PauseOption = "resume";
  private paused = false;
  private transitionTriggered = false;
  private debugCompletionTriggered = false;

  public constructor(
    stage: Stage,
    context: StageHostContext,
  ) {
    this.stage = stage;
    this.context = context;
  }

  public mount(root: HTMLElement): void {
    this.paused = false;
    this.transitionTriggered = false;
    this.debugCompletionTriggered = false;
    this.selectedPauseOption = "resume";

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
      true,
    );

    try {
      this.stage.mount({
        root,
        stageSeed: this.context.stageSeed,
        complete: this.handleStageComplete,
      fail: this.handleStageFail,
        addPenalty: this.context.addPenalty,
      });

      this.mountPauseOverlay(root);
      this.stage.start();
    } catch (error: unknown) {
      window.removeEventListener(
        "keydown",
        this.handleKeyDown,
        true,
      );

      this.destroyPauseOverlay();
      this.stage.destroy();
      throw error;
    }
  }

  public destroy(): void {
    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
      true,
    );

    this.destroyPauseOverlay();
    this.stage.destroy();

    this.paused = false;
    this.transitionTriggered = false;
    this.debugCompletionTriggered = false;
    this.selectedPauseOption = "resume";
  }

  private mountPauseOverlay(root: HTMLElement): void {
    const overlay = document.createElement("section");

    overlay.className = "stage-pause-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute(
      "aria-labelledby",
      "stage-pause-heading",
    );

    const panel = document.createElement("div");
    panel.className = "stage-pause-overlay__panel";

    const heading = document.createElement("h2");
    heading.id = "stage-pause-heading";
    heading.className = "stage-pause-overlay__title";
    heading.textContent = "PAUSED";

    const options = document.createElement("div");
    options.className = "stage-pause-overlay__options";

    const resumeButton = document.createElement("button");
    resumeButton.className = "stage-pause-overlay__option";
    resumeButton.type = "button";
    resumeButton.tabIndex = -1;
    resumeButton.addEventListener(
      "click",
      this.handleResumeClick,
    );
    resumeButton.addEventListener(
      "pointerenter",
      this.handleResumePointerEnter,
    );

    const exitStageButton =
      document.createElement("button");

    exitStageButton.className =
      "stage-pause-overlay__option";

    exitStageButton.type = "button";
    exitStageButton.tabIndex = -1;
    exitStageButton.addEventListener(
      "click",
      this.handleExitStageClick,
    );
    exitStageButton.addEventListener(
      "pointerenter",
      this.handleExitStagePointerEnter,
    );

    options.append(
      resumeButton,
      exitStageButton,
    );

    panel.append(
      heading,
      options,
    );

    overlay.append(panel);
    root.append(overlay);

    this.pauseOverlay = overlay;
    this.resumeButton = resumeButton;
    this.exitStageButton = exitStageButton;

    this.renderPauseSelection();
  }

  private destroyPauseOverlay(): void {
    this.resumeButton?.removeEventListener(
      "click",
      this.handleResumeClick,
    );

    this.resumeButton?.removeEventListener(
      "pointerenter",
      this.handleResumePointerEnter,
    );

    this.exitStageButton?.removeEventListener(
      "click",
      this.handleExitStageClick,
    );

    this.exitStageButton?.removeEventListener(
      "pointerenter",
      this.handleExitStagePointerEnter,
    );

    this.pauseOverlay?.remove();

    this.pauseOverlay = null;
    this.resumeButton = null;
    this.exitStageButton = null;
  }

  private openPauseOverlay(): void {
    if (
      this.paused
      || this.transitionTriggered
      || this.pauseOverlay === null
    ) {
      return;
    }

    this.stage.pause();

    this.paused = true;
    this.selectedPauseOption = "resume";

    this.pauseOverlay.hidden = false;
    this.pauseOverlay.setAttribute(
      "aria-hidden",
      "false",
    );

    this.renderPauseSelection();
    this.focusSelectedOption();
  }

  private resumeStage(): void {
    if (
      !this.paused
      || this.transitionTriggered
    ) {
      return;
    }

    this.paused = false;

    if (this.pauseOverlay !== null) {
      this.pauseOverlay.hidden = true;
      this.pauseOverlay.setAttribute(
        "aria-hidden",
        "true",
      );
    }

    this.stage.resume();
  }

  private exitStage(): void {
    if (this.transitionTriggered) {
      return;
    }

    this.transitionTriggered = true;
    this.context.exitStage();
  }

  private activateSelectedOption(): void {
    if (this.selectedPauseOption === "resume") {
      this.resumeStage();
      return;
    }

    this.exitStage();
  }

  private movePauseSelection(): void {
    this.selectedPauseOption =
      this.selectedPauseOption === "resume"
        ? "exit-stage"
        : "resume";

    this.renderPauseSelection();
    this.focusSelectedOption();
  }

  private renderPauseSelection(): void {
    if (
      this.resumeButton === null
      || this.exitStageButton === null
    ) {
      return;
    }

    const resumeSelected =
      this.selectedPauseOption === "resume";

    this.resumeButton.textContent =
      resumeSelected
        ? "> RESUME <"
        : "RESUME";

    this.exitStageButton.textContent =
      resumeSelected
        ? "EXIT STAGE"
        : "> EXIT STAGE <";

    this.resumeButton.classList.toggle(
      "stage-pause-overlay__option--selected",
      resumeSelected,
    );

    this.exitStageButton.classList.toggle(
      "stage-pause-overlay__option--selected",
      !resumeSelected,
    );
  }

  private focusSelectedOption(): void {
    const selectedButton =
      this.selectedPauseOption === "resume"
        ? this.resumeButton
        : this.exitStageButton;

    selectedButton?.focus({
      preventScroll: true,
    });
  }

  private readonly handleStageFail = (): void => {
    if (this.transitionTriggered) {
      return;
    }

    this.transitionTriggered = true;
    this.context.exitStage();
  };

  private readonly handleStageComplete = (): void => {
    if (this.transitionTriggered) {
      return;
    }

    this.transitionTriggered = true;
    this.context.complete();
  };

  private readonly handleResumeClick = (): void => {
    this.resumeStage();
  };

  private readonly handleExitStageClick = (): void => {
    this.exitStage();
  };

  private readonly handleResumePointerEnter =
    (): void => {
      if (!this.paused) {
        return;
      }

      this.selectedPauseOption = "resume";
      this.renderPauseSelection();
    };

  private readonly handleExitStagePointerEnter =
    (): void => {
      if (!this.paused) {
        return;
      }

      this.selectedPauseOption = "exit-stage";
      this.renderPauseSelection();
    };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (this.transitionTriggered) {
      return;
    }

    if (this.paused) {
      event.stopImmediatePropagation();

      if (event.code === PAUSE_KEY) {
        event.preventDefault();

        if (!event.repeat) {
          this.resumeStage();
        }

        return;
      }

      if (
        UP_KEYS.has(event.code)
        || DOWN_KEYS.has(event.code)
      ) {
        event.preventDefault();

        if (!event.repeat) {
          this.movePauseSelection();
        }

        return;
      }

      if (CONFIRM_KEYS.has(event.code)) {
        event.preventDefault();

        if (!event.repeat) {
          this.activateSelectedOption();
        }
      }

      return;
    }

    if (event.code === PAUSE_KEY) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!event.repeat) {
        this.openPauseOverlay();
      }

      return;
    }

    if (
      !debug_mode
      || event.code !== DEBUG_WIN_KEY
      || event.repeat
      || this.debugCompletionTriggered
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    this.debugCompletionTriggered = true;
    this.handleStageComplete();
  };
}
