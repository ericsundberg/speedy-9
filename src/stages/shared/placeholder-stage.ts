import {
  getStageMetadata,
} from "../../game/stage-registry";
import type {
  StageId,
} from "../../game/stage-registry";
import type {
  Stage,
  StageContext,
} from "./stage";

export class PlaceholderStage implements Stage {
  public readonly id: StageId;

  private context: StageContext | null = null;
  private completeButton: HTMLButtonElement | null = null;
  private restartButton: HTMLButtonElement | null = null;
  private status: HTMLElement | null = null;
  private restartCount = 0;
  private completed = false;

  public constructor(id: StageId) {
    this.id = id;
  }

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.restartCount = 0;
    this.completed = false;

    const metadata = getStageMetadata(this.id);
    const scene = document.createElement("section");
    scene.className = "placeholder-stage";
    scene.dataset.stageId = this.id;
    scene.setAttribute(
      "aria-labelledby",
      "placeholder-stage-title",
    );

    const title = document.createElement("h1");
    title.id = "placeholder-stage-title";
    title.className = "placeholder-stage__title";
    title.textContent = metadata.displayName.toUpperCase();

    const description = document.createElement("p");
    description.className = "placeholder-stage__description";
    description.textContent = "TEMPORARY STAGE PLACEHOLDER";

    const status = document.createElement("p");
    status.className = "placeholder-stage__status";
    status.textContent = "READY";

    const actions = document.createElement("div");
    actions.className = "placeholder-stage__actions";

    const completeButton = document.createElement("button");
    completeButton.className =
      "vector-button vector-button--primary";
    completeButton.type = "button";
    completeButton.textContent = "COMPLETE STAGE";

    const restartButton = document.createElement("button");
    restartButton.className =
      "vector-button vector-button--secondary";
    restartButton.type = "button";
    restartButton.textContent = "RESTART STAGE";

    completeButton.addEventListener(
      "click",
      this.handleComplete,
    );
    restartButton.addEventListener(
      "click",
      this.handleRestart,
    );
    window.addEventListener(
      "keydown",
      this.handleKeyDown,
    );

    actions.append(completeButton, restartButton);
    scene.append(title, description, status, actions);
    context.root.replaceChildren(scene);

    this.completeButton = completeButton;
    this.restartButton = restartButton;
    this.status = status;
  }

  public start(): void {
    if (this.status !== null) {
      this.status.textContent = "ACTIVE";
    }

    this.completeButton?.focus({
      preventScroll: true,
    });
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.restartCount += 1;
    this.completed = false;

    if (this.status !== null) {
      this.status.textContent =
        `RESTARTED ${this.restartCount}`;
    }

    if (this.completeButton !== null) {
      this.completeButton.disabled = false;
      this.completeButton.focus({
        preventScroll: true,
      });
    }

    if (this.restartButton !== null) {
      this.restartButton.disabled = false;
    }
  }

  public pause(): void {
    // Placeholder stages have no active simulation.
  }

  public resume(): void {
    // Placeholder stages have no active simulation.
  }

  public destroy(): void {
    this.completeButton?.removeEventListener(
      "click",
      this.handleComplete,
    );
    this.restartButton?.removeEventListener(
      "click",
      this.handleRestart,
    );
    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );

    this.context = null;
    this.completeButton = null;
    this.restartButton = null;
    this.status = null;
    this.completed = false;
  }

  private readonly handleComplete = (): void => {
    if (
      this.context === null
      || this.completeButton === null
      || this.completed
    ) {
      return;
    }

    this.completed = true;
    this.completeButton.disabled = true;

    if (this.restartButton !== null) {
      this.restartButton.disabled = true;
    }

    if (this.status !== null) {
      this.status.textContent = "COMPLETE";
    }

    this.context.complete();
  };

  private readonly handleRestart = (): void => {
    this.restart();
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (event.code !== "KeyR" || event.repeat) {
      return;
    }

    event.preventDefault();
    this.restart();
  };
}
