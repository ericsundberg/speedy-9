import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  StageContext,
} from "../shared/stage";
import {
  selectSpeedLockedTargetWord,
} from "./speed-lock-model";
import {
  SpeedLockedStage,
} from "./speed-lock-stage";

class FakeClassList {
  private readonly owner: FakeElement;

  public constructor(owner: FakeElement) {
    this.owner = owner;
  }

  public contains(token: string): boolean {
    return this.getTokens().has(token);
  }

  public toggle(
    token: string,
    force?: boolean,
  ): boolean {
    const tokens = this.getTokens();

    const enabled =
      force ?? !tokens.has(token);

    if (enabled) {
      tokens.add(token);
    } else {
      tokens.delete(token);
    }

    this.writeTokens(tokens);

    return enabled;
  }

  public remove(...tokensToRemove: string[]): void {
    const tokens = this.getTokens();

    for (const token of tokensToRemove) {
      tokens.delete(token);
    }

    this.writeTokens(tokens);
  }

  private getTokens(): Set<string> {
    return new Set(
      this.owner.className
        .split(/\s+/u)
        .filter(Boolean),
    );
  }

  private writeTokens(tokens: Set<string>): void {
    this.owner.className =
      [...tokens].join(" ");
  }
}

class FakeElement {
  public id = "";
  public className = "";
  public textContent = "";
  public hidden = false;
  public tabIndex = -1;

  public readonly dataset:
  Record<string, string> = {};

  public readonly style:
  Record<string, string> = {};

  public readonly children: FakeElement[] = [];

  public readonly classList =
    new FakeClassList(this);

  public parentElement: FakeElement | null = null;

  private readonly attributes =
    new Map<string, string>();

  public readonly tagName: string;

  public constructor(tagName: string) {
    this.tagName = tagName;
  }

  public setAttribute(
    name: string,
    value: string,
  ): void {
    this.attributes.set(name, value);
  }

  public getAttribute(
    name: string,
  ): string | null {
    return this.attributes.get(name) ?? null;
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
    }
  }

  public replaceChildren(
    ...nodes: FakeElement[]
  ): void {
    for (const child of this.children) {
      child.parentElement = null;
    }

    this.children.length = 0;
    this.append(...nodes);
  }

  public remove(): void {
    const parent = this.parentElement;

    if (parent === null) {
      return;
    }

    const index =
      parent.children.indexOf(this);

    if (index >= 0) {
      parent.children.splice(index, 1);
    }

    this.parentElement = null;
  }

  public findAllByClass(
    className: string,
  ): FakeElement[] {
    const matches: FakeElement[] = [];

    if (this.classList.contains(className)) {
      matches.push(this);
    }

    for (const child of this.children) {
      matches.push(
        ...child.findAllByClass(className),
      );
    }

    return matches;
  }
}

class FakeDocument {
  public createElement(tagName: string): HTMLElement {
    return new FakeElement(
      tagName,
    ) as unknown as HTMLElement;
  }
}

interface DispatchedKey {
  readonly defaultPrevented: boolean;
  readonly propagationStopped: boolean;
}

class FakeWindow {
  private readonly keydownListeners =
    new Set<
      (event: KeyboardEvent) => void
    >();

  public addEventListener(
    type: string,
    listener: unknown,
  ): void {
    if (
      type === "keydown"
      && typeof listener === "function"
    ) {
      this.keydownListeners.add(
        listener as (
          event: KeyboardEvent,
        ) => void,
      );
    }
  }

  public removeEventListener(
    type: string,
    listener: unknown,
  ): void {
    if (
      type === "keydown"
      && typeof listener === "function"
    ) {
      this.keydownListeners.delete(
        listener as (
          event: KeyboardEvent,
        ) => void,
      );
    }
  }

  public dispatchKey(
    code: string,
    repeat = false,
  ): DispatchedKey {
    let defaultPrevented = false;
    let propagationStopped = false;

    const event = {
      code,
      repeat,

      preventDefault(): void {
        defaultPrevented = true;
      },

      stopImmediatePropagation(): void {
        propagationStopped = true;
      },
    } as KeyboardEvent;

    for (
      const listener
      of [...this.keydownListeners]
    ) {
      listener(event);

      if (propagationStopped) {
        break;
      }
    }

    return {
      defaultPrevented,
      propagationStopped,
    };
  }

  public getListenerCount(): number {
    return this.keydownListeners.size;
  }
}

interface StageHarness {
  readonly stage: SpeedLockedStage;
  readonly root: FakeElement;
  readonly complete: ReturnType<typeof vi.fn>;
  readonly fail: ReturnType<typeof vi.fn>;
  readonly stageSeed: number;
}

let fakeWindow: FakeWindow;
let activeStage: SpeedLockedStage | null;

beforeEach(() => {
  fakeWindow = new FakeWindow();
  activeStage = null;

  vi.stubGlobal(
    "window",
    fakeWindow,
  );

  vi.stubGlobal(
    "document",
    new FakeDocument(),
  );
});

afterEach(() => {
  activeStage?.destroy();
  activeStage = null;

  vi.unstubAllGlobals();
});

function createHarness(
  stageSeed = 17,
): StageHarness {
  const root = new FakeElement("div");
  const complete = vi.fn();
  const fail = vi.fn();

  const context: StageContext = {
    root: root as unknown as HTMLElement,
    stageSeed,
    complete,
    fail,

    addPenalty: (
      _milliseconds: number,
      _reason: string,
    ): void => {},
  };

  const stage = new SpeedLockedStage();

  stage.mount(context);
  stage.start();

  activeStage = stage;

  return {
    stage,
    root,
    complete,
    fail,
    stageSeed,
  };
}

function getElements(
  root: FakeElement,
  className: string,
): FakeElement[] {
  return root.findAllByClass(className);
}

function getOnlyElement(
  root: FakeElement,
  className: string,
): FakeElement {
  const elements = getElements(
    root,
    className,
  );

  expect(elements).toHaveLength(1);

  const element = elements[0];

  if (element === undefined) {
    throw new Error(
      `Missing element with class ${className}.`,
    );
  }

  return element;
}

function getRows(
  root: FakeElement,
): FakeElement[] {
  return getElements(
    root,
    "speed-locked-stage__row",
  );
}

function getVisibleRows(
  root: FakeElement,
): FakeElement[] {
  return getRows(root).filter(
    (row) => !row.hidden,
  );
}

function getCells(
  row: FakeElement,
): FakeElement[] {
  return row.children.filter(
    (child) => child.classList.contains(
      "speed-locked-stage__cell",
    ),
  );
}

function getCharacters(
  row: FakeElement,
): FakeElement[] {
  return row.findAllByClass(
    "speed-locked-stage__character",
  );
}

function enterWord(word: string): void {
  const uppercaseWord = word.toUpperCase();

  for (
    let positionIndex = 0;
    positionIndex < uppercaseWord.length;
    positionIndex += 1
  ) {
    const letter =
      uppercaseWord[positionIndex];

    if (letter === undefined) {
      throw new RangeError(
        `Missing test letter ${positionIndex}.`,
      );
    }

    const rotations =
      letter.charCodeAt(0)
      - "A".charCodeAt(0)
      + 1;

    for (
      let rotation = 0;
      rotation < rotations;
      rotation += 1
    ) {
      fakeWindow.dispatchKey("KeyW");
    }

    if (
      positionIndex
      < uppercaseWord.length - 1
    ) {
      fakeWindow.dispatchKey("KeyD");
    }
  }
}

describe("SpeedLockedStage", () => {
  it("mounts five fixed rows with only row one visible", () => {
    const { root } = createHarness();

    const scene = getOnlyElement(
      root,
      "speed-locked-stage",
    );

    expect(scene.tabIndex).toBe(0);

    expect(
      getElements(
        root,
        "speed-locked-stage__legend-item",
      ),
    ).toHaveLength(2);

    expect(
      getElements(
        root,
        "speed-locked-stage__legend-box--misplaced",
      ),
    ).toHaveLength(1);

    expect(
      getElements(
        root,
        "speed-locked-stage__legend-box--exact",
      ),
    ).toHaveLength(1);

    expect(
      scene.getAttribute("aria-labelledby"),
    ).toBe("speed-locked-stage-title");

    const rows = getRows(root);

    expect(rows).toHaveLength(5);
    expect(getVisibleRows(root)).toHaveLength(1);

    expect(
      rows.map(
        (row) => row.getAttribute(
          "aria-rowindex",
        ),
      ),
    ).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);

    const firstRow = getVisibleRows(root)[0];

    if (firstRow === undefined) {
      throw new Error(
        "Expected the first row to be visible.",
      );
    }

    expect(getCells(firstRow)).toHaveLength(5);

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("GUESS 1 OF 5");
  });

  it("rotates letters and moves the selected position", () => {
    const { root } = createHarness();

    fakeWindow.dispatchKey("KeyW");

    let activeRow = getVisibleRows(root)[0];

    if (activeRow === undefined) {
      throw new Error(
        "Expected an active row.",
      );
    }

    expect(
      getCharacters(activeRow)[0]?.textContent,
    ).toBe("A");

    fakeWindow.dispatchKey("KeyD");

    activeRow = getVisibleRows(root)[0];

    if (activeRow === undefined) {
      throw new Error(
        "Expected an active row.",
      );
    }

    const selectedCells = getCells(
      activeRow,
    ).filter(
      (cell) => cell.classList.contains(
        "speed-locked-stage__cell--selected",
      ),
    );

    expect(selectedCells).toHaveLength(1);

    expect(
      selectedCells[0]?.getAttribute(
        "aria-colindex",
      ),
    ).toBe("2");

    fakeWindow.dispatchKey("ArrowDown");

    activeRow = getVisibleRows(root)[0];

    if (activeRow === undefined) {
      throw new Error(
        "Expected an active row.",
      );
    }

    expect(
      getCharacters(activeRow)[1]?.textContent,
    ).toBe("Z");
  });

  it("blocks submission until all five letters are filled", () => {
    const {
      root,
      complete,
      fail,
    } = createHarness();

    const dispatched =
      fakeWindow.dispatchKey("Enter");

    expect(dispatched.defaultPrevented).toBe(
      true,
    );

    expect(
      dispatched.propagationStopped,
    ).toBe(true);

    expect(getVisibleRows(root)).toHaveLength(1);

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("COMPLETE ALL FIVE LETTERS");

    expect(complete).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });

  it("submits an arbitrary word and reveals one new row", () => {
    const {
      root,
      complete,
      fail,
    } = createHarness();

    enterWord("aaaaa");
    fakeWindow.dispatchKey("Space");

    const visibleRows = getVisibleRows(root);

    expect(visibleRows).toHaveLength(2);

    const submittedRow = visibleRows[0];

    if (submittedRow === undefined) {
      throw new Error(
        "Expected a submitted row.",
      );
    }

    expect(
      submittedRow.classList.contains(
        "speed-locked-stage__row--submitted",
      ),
    ).toBe(true);

    for (const cell of getCells(submittedRow)) {
      expect(cell.dataset.result).toMatch(
        /^(exact|misplaced|absent)$/u,
      );
    }

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("GUESS 2 OF 5");

    expect(complete).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });

  it("reports victory exactly once", () => {
    const {
      root,
      complete,
      fail,
      stageSeed,
    } = createHarness();

    const targetWord =
      selectSpeedLockedTargetWord(stageSeed);

    enterWord(targetWord);
    fakeWindow.dispatchKey("Enter");

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("COMPLETE");

    expect(complete).toHaveBeenCalledTimes(1);
    expect(fail).not.toHaveBeenCalled();

    fakeWindow.dispatchKey("Enter");
    fakeWindow.dispatchKey("Space");

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("reports failure exactly once after five wrong guesses", () => {
    const {
      root,
      complete,
      fail,
    } = createHarness();

    for (
      let attempt = 0;
      attempt < 5;
      attempt += 1
    ) {
      enterWord("aaaaa");
      fakeWindow.dispatchKey("Enter");
    }

    expect(getVisibleRows(root)).toHaveLength(5);

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("FAILED");

    expect(fail).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();

    fakeWindow.dispatchKey("Enter");
    fakeWindow.dispatchKey("Space");

    expect(fail).toHaveBeenCalledTimes(1);
  });

  it("ignores gameplay input while paused", () => {
    const {
      stage,
      root,
    } = createHarness();

    stage.pause();

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("PAUSED");

    fakeWindow.dispatchKey("KeyW");

    let activeRow = getVisibleRows(root)[0];

    if (activeRow === undefined) {
      throw new Error(
        "Expected an active row.",
      );
    }

    expect(
      getCharacters(activeRow)[0]?.textContent,
    ).toBe("");

    stage.resume();
    fakeWindow.dispatchKey("KeyW");

    activeRow = getVisibleRows(root)[0];

    if (activeRow === undefined) {
      throw new Error(
        "Expected an active row.",
      );
    }

    expect(
      getCharacters(activeRow)[0]?.textContent,
    ).toBe("A");
  });

  it("restarts with one blank row and the original target", () => {
    const {
      stage,
      root,
      complete,
      stageSeed,
    } = createHarness();

    enterWord("aaaaa");
    fakeWindow.dispatchKey("Enter");

    expect(getVisibleRows(root)).toHaveLength(2);

    stage.restart();

    expect(getVisibleRows(root)).toHaveLength(1);

    expect(
      getOnlyElement(
        root,
        "placeholder-stage__status",
      ).textContent,
    ).toBe("GUESS 1 OF 5");

    const targetWord =
      selectSpeedLockedTargetWord(stageSeed);

    enterWord(targetWord);
    fakeWindow.dispatchKey("Enter");

    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("removes its keyboard listener and scene on destroy", () => {
    const {
      stage,
      root,
    } = createHarness();

    expect(
      fakeWindow.getListenerCount(),
    ).toBe(1);

    stage.destroy();
    activeStage = null;

    expect(
      fakeWindow.getListenerCount(),
    ).toBe(0);

    expect(root.children).toHaveLength(0);

    fakeWindow.dispatchKey("KeyW");

    expect(root.children).toHaveLength(0);
  });
});
