import type {
  Scene,
} from "../app/scene";
import {
  formatMenuOptionLabel,
} from "./menu-option";

interface TitleSceneOptions {
  readonly onBeginRun: () => void;
}

const SVG_NAMESPACE =
  "http://www.w3.org/2000/svg";

function createFrameRect(
  className: string,
  x: string,
  y: string,
  width: string,
  height: string,
): SVGRectElement {
  const rect = document.createElementNS(
    SVG_NAMESPACE,
    "rect",
  );

  rect.setAttribute("class", className);
  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", width);
  rect.setAttribute("height", height);
  rect.setAttribute("rx", "2");
  rect.setAttribute("pathLength", "100");
  rect.setAttribute("fill", "none");
  rect.setAttribute(
    "vector-effect",
    "non-scaling-stroke",
  );

  return rect;
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
    scene.setAttribute(
      "aria-labelledby",
      "game-title",
    );

    const frame = document.createElementNS(
      SVG_NAMESPACE,
      "svg",
    );

    frame.classList.add("title-scene__frame");
    frame.setAttribute("viewBox", "0 0 600 520");
    frame.setAttribute(
      "preserveAspectRatio",
      "none",
    );
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("focusable", "false");

    frame.append(
      createFrameRect(
        "title-scene__frame-line title-scene__frame-line--outer",
        "8",
        "8",
        "584",
        "504",
      ),
      createFrameRect(
        "title-scene__frame-line title-scene__frame-line--inner",
        "34",
        "32",
        "532",
        "456",
      ),
    );

    const title = document.createElement("h1");

    title.id = "game-title";
    title.className = "title-scene__title";

    const titleWord = document.createElement("span");

    titleWord.className = "title-scene__title-word";
    titleWord.textContent = "SPEEDY";

    const titleNumber = document.createElement("span");

    titleNumber.className = "title-scene__title-number";
    titleNumber.textContent = "9";

    title.append(titleWord, titleNumber);

    const actions = document.createElement("div");

    actions.className = "title-scene__actions";

    const beginButton = document.createElement("button");

    beginButton.className =
      "menu-option menu-option--selected";
    beginButton.type = "button";
    beginButton.textContent =
      formatMenuOptionLabel(
        "BEGIN RUN",
        true,
      );

    actions.append(beginButton);

    const record = document.createElement("p");

    record.className = "title-scene__record";

    const recordLabel = document.createElement("span");
    recordLabel.textContent = "PERSONAL BEST";

    const recordValue = document.createElement("strong");
    recordValue.textContent = "NO RECORDED RUN";

    record.append(recordLabel, recordValue);

    const credit = document.createElement("p");

    credit.className = "title-scene__credit";
    credit.textContent = "A GAME BY ERIC SUNDBERG";

    scene.append(
      frame,
      title,
      actions,
      record,
      credit,
    );

    this.beginButton = beginButton;

    beginButton.addEventListener(
      "click",
      this.handleBeginRun,
    );

    root.replaceChildren(scene);

    beginButton.focus({
      preventScroll: true,
    });
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
    this.beginButton.textContent =
      formatMenuOptionLabel(
        "STARTING",
        true,
      );

    this.options.onBeginRun();
  };
}
