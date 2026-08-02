import type { Scene } from "../app/scene";

interface TitleSceneOptions {
  onBeginRun(): void;
}

export class TitleScene implements Scene {
  private readonly options: TitleSceneOptions;
  private beginButton: HTMLButtonElement | null = null;

  public constructor(options: TitleSceneOptions) {
    this.options = options;
  }

  public mount(root: HTMLElement): void {
    this.destroy();

    const scene = document.createElement("section");
    scene.className = "title-scene";
    scene.dataset.scene = "title";
    scene.setAttribute("aria-labelledby", "game-title");

    const title = document.createElement("h1");
    title.id = "game-title";
    title.className = "title-scene__title";
    title.textContent = "SPEEDY 9";

    const actions = document.createElement("div");
    actions.className = "title-scene__actions";

    const beginButton = document.createElement("button");
    beginButton.className =
      "vector-button vector-button--primary";
    beginButton.type = "button";
    beginButton.textContent = "BEGIN RUN";

    const audioButton = document.createElement("button");
    audioButton.className =
      "vector-button vector-button--secondary";
    audioButton.type = "button";
    audioButton.disabled = true;
    audioButton.textContent = "AUDIO: OFFLINE";
    audioButton.title = "Audio is not yet available.";

    actions.append(beginButton, audioButton);

    const information = document.createElement("div");
    information.className = "title-scene__information";
    information.append(
      this.createControlsPanel(),
      this.createCreditsPanel(),
    );

    const record = document.createElement("p");
    record.className = "title-scene__record";

    const recordLabel = document.createElement("span");
    recordLabel.textContent = "PERSONAL BEST";

    const recordValue = document.createElement("strong");
    recordValue.textContent = "NO RECORDED RUN";

    record.append(recordLabel, recordValue);
    scene.append(title, actions, information, record);

    this.beginButton = beginButton;

    beginButton.addEventListener(
      "click",
      this.handleBeginRun,
    );

    root.replaceChildren(scene);
    beginButton.focus();
  }

  public destroy(): void {
    this.beginButton?.removeEventListener(
      "click",
      this.handleBeginRun,
    );

    this.beginButton = null;
  }

  private readonly handleBeginRun = (): void => {
    if (this.beginButton === null) {
      return;
    }

    this.beginButton.disabled = true;
    this.beginButton.textContent = "STARTING";
    this.options.onBeginRun();
  };

  private createControlsPanel(): HTMLDetailsElement {
    const controls = document.createElement("details");
    controls.className = "vector-details";

    const summary = document.createElement("summary");
    summary.textContent = "CONTROLS";

    const controlsList = document.createElement("dl");
    controlsList.className = "controls-list";

    const controlsData: readonly [string, string][] = [
      ["MOVE / NAVIGATE", "WASD or Arrow Keys"],
      ["SELECT / ACTION", "Enter, Space, or Primary Click"],
      ["RESTART STAGE", "R"],
      ["PAUSE", "Escape"],
    ];

    for (const [term, description] of controlsData) {
      const termElement = document.createElement("dt");
      termElement.textContent = term;

      const descriptionElement = document.createElement("dd");
      descriptionElement.textContent = description;

      controlsList.append(
        termElement,
        descriptionElement,
      );
    }

    controls.append(summary, controlsList);
    return controls;
  }

  private createCreditsPanel(): HTMLDetailsElement {
    const credits = document.createElement("details");
    credits.className = "vector-details";

    const summary = document.createElement("summary");
    summary.textContent = "CREDITS";

    const text = document.createElement("p");
    text.textContent = "Built with TypeScript, SVG, and Web Audio.";

    credits.append(summary, text);
    return credits;
  }
}
