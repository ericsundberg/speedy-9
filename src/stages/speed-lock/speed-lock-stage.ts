import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  PongAudio,
} from "../pong-blitz/pong-audio";
import {
  SpeedLockedAudio,
} from "./speed-lock-audio";
import {
  SPEED_LOCKED_MAX_GUESSES,
  SPEED_LOCKED_WORD_LENGTH,
  createSpeedLockedGameState,
  moveSpeedLockedPosition,
  restartSpeedLockedGame,
  rotateSpeedLockedLetter,
  selectSpeedLockedTargetWord,
  startSpeedLockedGame,
  submitSpeedLockedRow,
} from "./speed-lock-model";
import type {
  SpeedLockedEditableLetters,
  SpeedLockedGameState,
  SpeedLockedLetterResult,
  SpeedLockedLetterRotationDirection,
  SpeedLockedPositionDirection,
  SpeedLockedRow,
  SpeedLockedStatus,
} from "./speed-lock-model";

function describeSpeedLockedStatus(
  status: SpeedLockedStatus,
): string {
  switch (status) {
    case "ready":
      return "READY";

    case "playing":
      return "ACTIVE";

    case "paused":
      return "PAUSED";

    case "won":
      return "COMPLETE";

    case "lost":
      return "FAILED";
  }
}

function getSpeedLockedLetterResult(
  row: SpeedLockedRow,
  positionIndex: number,
): SpeedLockedLetterResult | null {
  if (row.kind !== "submitted") {
    return null;
  }

  const submittedRow = row as SpeedLockedRow & {
    readonly result?:
      readonly SpeedLockedLetterResult[];
    readonly results?:
      readonly SpeedLockedLetterResult[];
  };

  const resultRow =
    submittedRow.result
    ?? submittedRow.results;

  const result = resultRow?.[positionIndex];

  if (result === undefined) {
    throw new RangeError(
      `Missing Speed Locked result position ${positionIndex}.`,
    );
  }

  return result;
}

function describeSpeedLockedLetterResult(
  result: SpeedLockedLetterResult | null,
): string {
  switch (result) {
    case "exact":
      return ", correct letter and position";

    case "misplaced":
      return ", correct letter in another position";

    case "absent":
      return ", not in the target word";

    case null:
      return "";
  }
}

function replaceSpeedLockedEditableLetter(
  letters: SpeedLockedEditableLetters,
  positionIndex: number,
  letter: SpeedLockedEditableLetters[number],
): SpeedLockedEditableLetters {
  switch (positionIndex) {
    case 0:
      return [
        letter,
        letters[1],
        letters[2],
        letters[3],
        letters[4],
      ];

    case 1:
      return [
        letters[0],
        letter,
        letters[2],
        letters[3],
        letters[4],
      ];

    case 2:
      return [
        letters[0],
        letters[1],
        letter,
        letters[3],
        letters[4],
      ];

    case 3:
      return [
        letters[0],
        letters[1],
        letters[2],
        letter,
        letters[4],
      ];

    case 4:
      return [
        letters[0],
        letters[1],
        letters[2],
        letters[3],
        letter,
      ];

    default:
      throw new RangeError(
        `Invalid Speed Locked position ${positionIndex}.`,
      );
  }
}

export class SpeedLockedStage implements Stage {
  public readonly id = "speed-lock" as const;

  private context: StageContext | null = null;
  private state: SpeedLockedGameState | null = null;
  private audio: SpeedLockedAudio | null = null;
  private victoryAudio: PongAudio | null = null;

  private scene: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private rowElements: HTMLElement[] = [];
  private submissionInProgress = false;
  private completionReported = false;
  private failureReported = false;

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (
      this.state === null
      || this.state.status !== "playing"
    ) {
      return;
    }

    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        event.preventDefault();
        this.rotateActiveLetter("up");
        return;

      case "KeyS":
      case "ArrowDown":
        event.preventDefault();
        this.rotateActiveLetter("down");
        return;

      case "KeyA":
      case "ArrowLeft":
        event.preventDefault();
        this.moveActivePosition("left");
        return;

      case "KeyD":
      case "ArrowRight":
        event.preventDefault();
        this.moveActivePosition("right");
        return;

      case "Enter":
      case "Space":
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!event.repeat) {
          this.submitActiveRow();
        }

        return;

      default:
        return;
    }
  };

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.audio = new SpeedLockedAudio();
    this.victoryAudio = new PongAudio();

    const targetWord = selectSpeedLockedTargetWord(
      context.stageSeed,
    );

    this.state = createSpeedLockedGameState(
      targetWord,
    );

    const scene = document.createElement("section");

    scene.className =
      "placeholder-stage speed-locked-stage";

    scene.dataset.stageId = this.id;
    scene.tabIndex = 0;

    scene.setAttribute(
      "aria-labelledby",
      "speed-locked-stage-title",
    );

    scene.setAttribute(
      "aria-describedby",
      "speed-locked-stage-instructions",
    );

    const title = document.createElement("h1");

    title.id = "speed-locked-stage-title";
    title.className = "placeholder-stage__title";
    title.textContent = "SPEED LOCKED";

    const instructions = document.createElement("div");

    instructions.id =
      "speed-locked-stage-instructions";

    instructions.className =
      "speed-locked-stage__instructions";

    const objective = document.createElement("p");

    objective.className =
      "placeholder-stage__description speed-locked-stage__objective";

    objective.textContent =
      "CRACK THE FIVE-LETTER WORD IN FIVE TRIES.";

    const controls = document.createElement("div");

    controls.className =
      "speed-locked-stage__controls";

    const letterControl = document.createElement("p");

    letterControl.className =
      "speed-locked-stage__control";

    letterControl.textContent =
      "W/S OR ↑/↓ — CHANGE LETTER";

    const positionControl =
      document.createElement("p");

    positionControl.className =
      "speed-locked-stage__control";

    positionControl.textContent =
      "A/D OR ←/→ — CHANGE POSITION";

    const submitControl =
      document.createElement("p");

    submitControl.className =
      "speed-locked-stage__control";

    submitControl.textContent =
      "ACTION (ENTER / SPACE) — SUBMIT";

    controls.append(
      letterControl,
      positionControl,
      submitControl,
    );

    const feedbackLegend =
      document.createElement("div");

    feedbackLegend.className =
      "speed-locked-stage__legend";

    feedbackLegend.setAttribute(
      "aria-label",
      "Guess feedback key",
    );

    const misplacedLegendItem =
      document.createElement("div");

    misplacedLegendItem.className =
      "speed-locked-stage__legend-item";

    const misplacedLegendBox =
      document.createElement("span");

    misplacedLegendBox.className =
      "speed-locked-stage__legend-box speed-locked-stage__legend-box--misplaced";

    misplacedLegendBox.setAttribute(
      "aria-hidden",
      "true",
    );

    const misplacedLegendText =
      document.createElement("span");

    misplacedLegendText.textContent =
      "CORRECT LETTER — WRONG POSITION";

    misplacedLegendItem.append(
      misplacedLegendBox,
      misplacedLegendText,
    );

    const exactLegendItem =
      document.createElement("div");

    exactLegendItem.className =
      "speed-locked-stage__legend-item";

    const exactLegendBox =
      document.createElement("span");

    exactLegendBox.className =
      "speed-locked-stage__legend-box speed-locked-stage__legend-box--exact";

    exactLegendBox.setAttribute(
      "aria-hidden",
      "true",
    );

    const exactLegendText =
      document.createElement("span");

    exactLegendText.textContent =
      "CORRECT LETTER — CORRECT POSITION";

    exactLegendItem.append(
      exactLegendBox,
      exactLegendText,
    );

    feedbackLegend.append(
      misplacedLegendItem,
      exactLegendItem,
    );

    instructions.append(
      objective,
      controls,
      feedbackLegend,
    );

    const board = document.createElement("div");

    board.className = "speed-locked-stage__board";

    board.setAttribute("role", "grid");

    board.setAttribute(
      "aria-label",
      "Speed Locked guess board",
    );

    board.setAttribute(
      "aria-rowcount",
      String(SPEED_LOCKED_MAX_GUESSES),
    );

    board.setAttribute(
      "aria-colcount",
      String(SPEED_LOCKED_WORD_LENGTH),
    );

    const rowElements: HTMLElement[] = [];

    for (
      let rowIndex = 0;
      rowIndex < SPEED_LOCKED_MAX_GUESSES;
      rowIndex += 1
    ) {
      const rowElement =
        document.createElement("div");

      rowElement.className =
        "speed-locked-stage__row";

      rowElement.dataset.rowIndex =
        String(rowIndex);

      rowElement.setAttribute("role", "row");

      rowElement.setAttribute(
        "aria-rowindex",
        String(rowIndex + 1),
      );

      rowElement.style.gridRow =
        String(rowIndex + 1);

      rowElement.hidden = true;

      rowElement.setAttribute(
        "aria-hidden",
        "true",
      );

      board.append(rowElement);
      rowElements.push(rowElement);
    }

    const status = document.createElement("p");

    status.className =
      "placeholder-stage__status speed-locked-stage__status";

    status.setAttribute(
      "aria-live",
      "polite",
    );

    status.setAttribute(
      "aria-atomic",
      "true",
    );

    status.setAttribute(
      "role",
      "status",
    );

    scene.append(
      title,
      instructions,
      board,
      status,
    );

    context.root.replaceChildren(scene);

    this.scene = scene;
    this.status = status;
    this.rowElements = rowElements;
    this.submissionInProgress = false;
    this.completionReported = false;
    this.failureReported = false;

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
    );

    this.renderLifecycleState();
  }

  public start(): void {
    if (
      this.context === null
      || this.state === null
    ) {
      return;
    }

    this.state = startSpeedLockedGame(
      this.state,
    );

    this.renderLifecycleState();
  }

  public restart(): void {
    if (
      this.context === null
      || this.state === null
    ) {
      return;
    }

    this.state = restartSpeedLockedGame(
      this.state,
    );

    this.submissionInProgress = false;
    this.completionReported = false;
    this.failureReported = false;
    this.renderLifecycleState();
  }

  public pause(): void {
    if (
      this.context === null
      || this.state === null
      || this.state.status !== "playing"
    ) {
      return;
    }

    this.state = {
      ...this.state,
      status: "paused",
    };

    this.renderLifecycleState();
  }

  public resume(): void {
    if (
      this.context === null
      || this.state === null
      || this.state.status !== "paused"
    ) {
      return;
    }

    this.state = {
      ...this.state,
      status: "playing",
    };

    this.renderLifecycleState();
  }

  public destroy(): void {
    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );

    this.audio?.destroy();
    this.victoryAudio?.destroy();

    this.scene?.remove();

    this.context = null;
    this.state = null;
    this.audio = null;
    this.victoryAudio = null;
    this.scene = null;
    this.status = null;
    this.rowElements = [];
    this.submissionInProgress = false;
    this.completionReported = false;
    this.failureReported = false;
  }

  private rotateActiveLetter(
    direction: SpeedLockedLetterRotationDirection,
  ): void {
    const state = this.state;

    if (
      state === null
      || state.status !== "playing"
      || state.activeRowIndex === null
      || state.activePositionIndex === null
    ) {
      return;
    }

    const activeRow =
      state.rows[state.activeRowIndex];

    if (
      activeRow === undefined
      || activeRow.kind !== "editable"
    ) {
      return;
    }

    const currentLetter =
      activeRow.letters[
        state.activePositionIndex
      ];

    if (currentLetter === undefined) {
      throw new RangeError(
        `Missing Speed Locked letter position ${
          state.activePositionIndex
        }.`,
      );
    }

    const nextLetter =
      rotateSpeedLockedLetter(
        currentLetter,
        direction,
      );

    const nextLetters =
      replaceSpeedLockedEditableLetter(
        activeRow.letters,
        state.activePositionIndex,
        nextLetter,
      );

    const nextRows: SpeedLockedRow[] =
      state.rows.map(
        (row, rowIndex) => (
          rowIndex === state.activeRowIndex
            ? {
                ...activeRow,
                letters: nextLetters,
              }
            : row
        ),
      );

    this.state = {
      ...state,
      rows: nextRows,
    };

    this.audio?.playLetterTick();
    this.renderLifecycleState();
  }

  private moveActivePosition(
    direction: SpeedLockedPositionDirection,
  ): void {
    const state = this.state;

    if (
      state === null
      || state.status !== "playing"
      || state.activePositionIndex === null
    ) {
      return;
    }

    const nextPositionIndex =
      moveSpeedLockedPosition(
        state.activePositionIndex,
        direction,
      );

    if (
      nextPositionIndex
      === state.activePositionIndex
    ) {
      return;
    }

    this.state = {
      ...state,
      activePositionIndex:
        nextPositionIndex,
    };

    this.audio?.playPositionTick();
    this.renderLifecycleState();
  }

  private submitActiveRow(): void {
    const state = this.state;

    if (
      state === null
      || state.status !== "playing"
      || state.submissionLocked
      || this.submissionInProgress
    ) {
      return;
    }

    this.submissionInProgress = true;

    try {
      const transition =
        submitSpeedLockedRow(state);

      if (transition.outcome === "blocked") {
        return;
      }

      this.state = transition.state;

      if (transition.outcome === "incomplete") {
        this.audio?.playIncomplete();
        this.renderLifecycleState();

        if (this.status !== null) {
          this.status.textContent =
            "COMPLETE ALL FIVE LETTERS";
        }

        return;
      }

      this.renderLifecycleState();

      if (transition.outcome === "won") {
        this.victoryAudio?.playWinBuzz();
        this.reportVictory();
        return;
      }

      if (transition.outcome === "lost") {
        this.audio?.playFailure();
        this.reportFailure();
        return;
      }

      this.audio?.playSubmitted();
    } finally {
      this.submissionInProgress = false;
    }
  }

  private reportVictory(): void {
    if (this.completionReported) {
      return;
    }

    const context = this.context;

    if (context === null) {
      return;
    }

    this.completionReported = true;
    context.complete();
  }

  private reportFailure(): void {
    if (this.failureReported) {
      return;
    }

    const context = this.context;

    if (context === null) {
      return;
    }

    this.failureReported = true;
    context.fail();
  }

  private renderLifecycleState(): void {
    if (
      this.state === null
      || this.status === null
    ) {
      return;
    }

    const statusText =
      this.state.status === "playing"
      && this.state.activeRowIndex !== null
        ? `GUESS ${
            this.state.activeRowIndex + 1
          } OF ${SPEED_LOCKED_MAX_GUESSES}`
        : describeSpeedLockedStatus(
            this.state.status,
          );

    this.status.textContent = statusText;

    if (this.scene !== null) {
      this.scene.dataset.stageStatus =
        this.state.status;
    }

    this.renderBoard();
  }

  private renderBoard(): void {
    if (this.state === null) {
      return;
    }

    for (
      let rowIndex = 0;
      rowIndex < this.rowElements.length;
      rowIndex += 1
    ) {
      const rowElement =
        this.rowElements[rowIndex];

      if (rowElement === undefined) {
        continue;
      }

      const row = this.state.rows[rowIndex];

      if (row === undefined) {
        rowElement.hidden = true;

        rowElement.setAttribute(
          "aria-hidden",
          "true",
        );

        rowElement.classList.remove(
          "speed-locked-stage__row--active",
          "speed-locked-stage__row--submitted",
        );

        rowElement.removeAttribute(
          "aria-label",
        );

        rowElement.replaceChildren();
        continue;
      }

      const active =
        this.state.activeRowIndex === rowIndex;

      rowElement.hidden = false;

      rowElement.setAttribute(
        "aria-hidden",
        "false",
      );

      rowElement.classList.toggle(
        "speed-locked-stage__row--active",
        active,
      );

      rowElement.classList.toggle(
        "speed-locked-stage__row--submitted",
        row.kind === "submitted",
      );

      rowElement.setAttribute(
        "aria-label",
        active
          ? `Guess ${rowIndex + 1}, active`
          : `Guess ${rowIndex + 1}, submitted`,
      );

      const cellElements: HTMLElement[] = [];

      for (
        let positionIndex = 0;
        positionIndex < SPEED_LOCKED_WORD_LENGTH;
        positionIndex += 1
      ) {
        const letter =
          row.letters[positionIndex];

        if (letter === undefined) {
          throw new RangeError(
            `Missing Speed Locked letter position ${positionIndex}.`,
          );
        }

        const result =
          getSpeedLockedLetterResult(
            row,
            positionIndex,
          );

        const resultDescription =
          describeSpeedLockedLetterResult(
            result,
          );

        const cell =
          document.createElement("div");

        cell.className =
          "speed-locked-stage__cell";

        cell.dataset.positionIndex =
          String(positionIndex);

        const selected =
          active
          && this.state.activePositionIndex
            === positionIndex;

        cell.classList.toggle(
          "speed-locked-stage__cell--filled",
          letter !== null,
        );

        cell.classList.toggle(
          "speed-locked-stage__cell--selected",
          selected,
        );

        cell.classList.toggle(
          "speed-locked-stage__cell--exact",
          result === "exact",
        );

        cell.classList.toggle(
          "speed-locked-stage__cell--misplaced",
          result === "misplaced",
        );

        cell.classList.toggle(
          "speed-locked-stage__cell--absent",
          result === "absent",
        );

        if (result === null) {
          cell.removeAttribute(
            "data-result",
          );
        } else {
          cell.dataset.result = result;
        }

        cell.setAttribute(
          "role",
          "gridcell",
        );

        cell.setAttribute(
          "aria-colindex",
          String(positionIndex + 1),
        );

        cell.setAttribute(
          "aria-selected",
          String(selected),
        );

        cell.setAttribute(
          "aria-label",
          letter === null
            ? `Letter position ${positionIndex + 1}, blank${
                selected ? ", selected" : ""
              }${resultDescription}`
            : `Letter position ${positionIndex + 1}, ${letter}${
                selected ? ", selected" : ""
              }${resultDescription}`,
        );

        const character =
          document.createElement("span");

        character.className =
          "speed-locked-stage__character";

        character.textContent =
          letter ?? "";

        character.setAttribute(
          "aria-hidden",
          "true",
        );

        const underline =
          document.createElement("span");

        underline.className =
          "speed-locked-stage__underline";

        underline.setAttribute(
          "aria-hidden",
          "true",
        );

        const selector =
          document.createElement("span");

        selector.className =
          "speed-locked-stage__selector";

        selector.textContent = "⌃";

        selector.setAttribute(
          "aria-hidden",
          "true",
        );

        cell.append(
          character,
          underline,
          selector,
        );

        cellElements.push(cell);
      }

      rowElement.replaceChildren(
        ...cellElements,
      );
    }
  }
}

export function createLockedStage(): Stage {
  return new SpeedLockedStage();
}
