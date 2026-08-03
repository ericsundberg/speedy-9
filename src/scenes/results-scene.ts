import type {
  Scene,
} from "../app/scene";
import {
  formatMenuOptionLabel,
} from "./menu-option";
import {
  formatDurationMs,
} from "../core/time-format";
import {
  STAGE_REGISTRY,
} from "../game/stage-registry";
import type {
  CompletedRun,
} from "../run/run-types";

interface ResultsSceneOptions {
  readonly result: CompletedRun;
  readonly onNewRun: () => void;
}

export class ResultsScene implements Scene {
  private readonly options: ResultsSceneOptions;
  private newRunButton: HTMLButtonElement | null = null;

  public constructor(options: ResultsSceneOptions) {
    this.options = options;
  }

  public mount(root: HTMLElement): void {
    this.destroy();

    const scene = document.createElement("section");
    scene.className = "results-scene";
    scene.setAttribute("aria-labelledby", "results-title");

    const title = document.createElement("h1");
    title.id = "results-title";
    title.className = "results-scene__title";
    title.textContent = "RUN COMPLETE";

    const total = document.createElement("p");
    total.className = "results-scene__total";
    total.textContent = formatDurationMs(
      this.options.result.totalDurationMs,
    );

    const splits = document.createElement("ol");
    splits.className = "results-scene__splits";

    for (const stage of STAGE_REGISTRY) {
      const row = document.createElement("li");
      const name = document.createElement("span");
      const time = document.createElement("span");
      const split = this.options.result.splits[stage.id];

      name.textContent = stage.displayName;
      time.textContent =
        split === undefined
          ? "—"
          : formatDurationMs(split.segmentDurationMs);

      row.append(name, time);
      splits.append(row);
    }

    const newRunButton = document.createElement("button");
    newRunButton.className =
      "menu-option menu-option--selected";
    newRunButton.type = "button";
    newRunButton.textContent =
      formatMenuOptionLabel(
        "NEW RUN",
        true,
      );
    newRunButton.addEventListener(
      "click",
      this.handleNewRun,
    );

    scene.append(title, total, splits, newRunButton);
    root.replaceChildren(scene);

    this.newRunButton = newRunButton;
    newRunButton.focus({
      preventScroll: true,
    });
  }

  public destroy(): void {
    this.newRunButton?.removeEventListener(
      "click",
      this.handleNewRun,
    );

    this.newRunButton = null;
  }

  private readonly handleNewRun = (): void => {
    this.options.onNewRun();
  };
}
