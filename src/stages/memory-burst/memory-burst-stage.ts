import {
  Mulberry32Random,
} from "../../core/random";
import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  MEMORY_BURST_COLUMN_COUNT,
  MEMORY_BURST_PAIR_COUNT,
  MEMORY_BURST_ROW_COUNT,
  createMemoryBurstDeck,
  findNextUnmatchedMemoryBurstIndex,
  getMemoryBurstActivationSlot,
  moveMemoryBurstSelection,
  resetMemoryBurstMismatch,
  resolveMemoryBurstMatch,
  resolveMemoryBurstMismatch,
} from "./memory-burst-model";
import type {
  MemoryBurstCard,
  MemoryBurstDirection,
  MemoryBurstPhase,
} from "./memory-burst-model";
import {
  createMemoryBurstCardFrontFace,
  createMemoryBurstCardReverseFace,
} from "./memory-burst-card-render";
import {
  MemoryBurstAudio,
} from "./memory-burst-audio";

function getDirectionForKey(
  key: string,
): MemoryBurstDirection | null {
  switch (key.toLowerCase()) {
    case "arrowup":
    case "w":
      return "up";

    case "arrowdown":
    case "s":
      return "down";

    case "arrowleft":
    case "a":
      return "left";

    case "arrowright":
    case "d":
      return "right";

    default:
      return null;
  }
}

function getCardDescription(
  card: MemoryBurstCard,
): string {
  return `${card.rank} of ${card.suit}`;
}

export class MemoryBurstStage implements Stage {
  public readonly id = "memory-burst" as const;

  private context: StageContext | null = null;
  private scene: HTMLElement | null = null;
  private cardGrid: HTMLElement | null = null;
  private pairCounter: HTMLElement | null = null;
  private status: HTMLElement | null = null;

  private deck: readonly MemoryBurstCard[] = [];
  private readonly cardButtons:
    HTMLButtonElement[] = [];

  private phase: MemoryBurstPhase =
    "waiting-first";

  private selectedIndex = 0;
  private firstSelectedIndex: number | null = null;
  private secondSelectedIndex: number | null = null;

  private matchedIndices = new Set<number>();

  private audio: MemoryBurstAudio | null = null;

  private mismatchTimeoutId: number | null = null;

  private mismatchStartedAtMs: number | null = null;
  private mismatchRemainingMs = 0;

  private pendingMismatch: {
    readonly firstCardIndex: number;
    readonly secondCardIndex: number;
  } | null = null;

  private active = false;
  private paused = false;

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (
      !this.active
      || this.paused
      || this.context === null
    ) {
      return;
    }

    if (
      event.key.toLowerCase() === "r"
      && !event.repeat
    ) {
      event.preventDefault();

      this.restart();
      return;
    }

    const direction =
      getDirectionForKey(event.key);

    if (direction !== null) {
      if (
        this.phase === "resolving-mismatch"
        || this.phase === "complete"
      ) {
        return;
      }

      event.preventDefault();

      this.moveSelection(direction);
      return;
    }

    if (
      event.key === "Enter"
      || event.key === " "
    ) {
      event.preventDefault();

      this.activateCard(this.selectedIndex);
    }
  };

  private readonly handleCardClick = (
    event: MouseEvent,
  ): void => {
    if (
      !this.active
      || this.paused
      || this.phase === "resolving-mismatch"
      || this.phase === "complete"
      || this.cardGrid === null
      || !(event.target instanceof Element)
    ) {
      return;
    }

    const button =
      event.target.closest<HTMLButtonElement>(
        ".memory-burst-card",
      );

    if (
      button === null
      || !this.cardGrid.contains(button)
    ) {
      return;
    }

    const cardIndex = Number(
      button.dataset.cardIndex,
    );

    if (
      !Number.isInteger(cardIndex)
      || this.matchedIndices.has(cardIndex)
    ) {
      return;
    }

    this.selectedIndex = cardIndex;
    this.updateCardSelection(false);
    this.activateCard(cardIndex);
  };

  public mount(context: StageContext): void {
    this.destroy();

    this.context = context;
    this.audio = new MemoryBurstAudio();
    this.phase = "waiting-first";
    this.selectedIndex = 0;
    this.firstSelectedIndex = null;
    this.secondSelectedIndex = null;
    this.matchedIndices = new Set<number>();

    this.active = false;
    this.paused = false;

    this.deck = createMemoryBurstDeck(
      new Mulberry32Random(context.stageSeed),
    );

    const scene = document.createElement("section");

    scene.className =
      "placeholder-stage memory-burst-stage";

    scene.dataset.stageId = this.id;

    scene.setAttribute(
      "aria-labelledby",
      "memory-burst-stage-title",
    );

    const header = document.createElement("header");

    header.className = "memory-burst-stage__header";

    const title = document.createElement("h1");

    title.id = "memory-burst-stage-title";
    title.className = "placeholder-stage__title";
    title.textContent = "MEMORY BURST";

    const instruction = document.createElement("p");

    instruction.className =
      "placeholder-stage__description memory-burst-stage__instruction";

    instruction.textContent =
      "MATCH ALL SIX PAIRS.";

    const controls = document.createElement("p");

    controls.className =
      "placeholder-stage__description memory-burst-stage__controls";

    controls.textContent =
      "WASD / ARROWS MOVE · ENTER / SPACE FLIP · CLICK FLIP · R RESTART";

    header.append(
      title,
      instruction,
      controls,
    );

    const pairCounter = document.createElement("p");

    pairCounter.className =
      "memory-burst-stage__pair-counter";

    pairCounter.setAttribute(
      "aria-live",
      "polite",
    );

    const cardGrid = document.createElement("div");

    cardGrid.className =
      "memory-burst-stage__card-grid";

    cardGrid.setAttribute("role", "grid");

    cardGrid.setAttribute(
      "aria-label",
      "Memory Burst card grid",
    );

    cardGrid.setAttribute(
      "aria-rowcount",
      String(MEMORY_BURST_ROW_COUNT),
    );

    cardGrid.setAttribute(
      "aria-colcount",
      String(MEMORY_BURST_COLUMN_COUNT),
    );

    for (
      let rowIndex = 0;
      rowIndex < MEMORY_BURST_ROW_COUNT;
      rowIndex += 1
    ) {
      const row = document.createElement("div");

      row.className =
        "memory-burst-stage__card-row";

      row.setAttribute("role", "row");

      row.setAttribute(
        "aria-rowindex",
        String(rowIndex + 1),
      );

      for (
        let columnIndex = 0;
        columnIndex < MEMORY_BURST_COLUMN_COUNT;
        columnIndex += 1
      ) {
        const cardIndex =
          rowIndex * MEMORY_BURST_COLUMN_COUNT
          + columnIndex;

        const card = this.deck[cardIndex];

        if (card === undefined) {
          throw new RangeError(
            `Missing Memory Burst card at index ${cardIndex}.`,
          );
        }

        const cell = document.createElement("div");

        cell.className =
          "memory-burst-stage__card-cell";

        cell.setAttribute("role", "gridcell");

        cell.setAttribute(
          "aria-colindex",
          String(columnIndex + 1),
        );

        const button =
          document.createElement("button");

        button.className = "memory-burst-card";
        button.type = "button";
        button.tabIndex = -1;

        button.dataset.cardIndex =
          String(cardIndex);

        button.dataset.instanceId =
          card.instanceId;

        button.setAttribute(
          "aria-label",
          `Card ${cardIndex + 1}, face down`,
        );

        button.setAttribute(
          "aria-pressed",
          "false",
        );

        const reverseFace =
          createMemoryBurstCardReverseFace();

        const frontFace =
          createMemoryBurstCardFrontFace(card);

        button.append(
          reverseFace,
          frontFace,
        );

        this.cardButtons.push(button);

        cell.append(button);
        row.append(cell);
      }

      cardGrid.append(row);
    }

    const status = document.createElement("p");

    status.className =
      "placeholder-stage__status memory-burst-stage__status";

    status.setAttribute(
      "aria-live",
      "polite",
    );

    status.textContent = "READY";

    scene.append(
      header,
      pairCounter,
      cardGrid,
      status,
    );

    context.root.replaceChildren(scene);

    this.scene = scene;
    this.cardGrid = cardGrid;
    this.pairCounter = pairCounter;
    this.status = status;

    this.setPairCount(0);
    this.updatePhasePresentation();
    this.updateCardSelection(false);

    cardGrid.addEventListener(
      "click",
      this.handleCardClick,
    );

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
    );
  }

  public start(): void {
    if (this.context === null) {
      return;
    }

    this.active = true;
    this.paused = false;

    this.setPhase("waiting-first");
    this.updateCardSelection(true);
  }

  public restart(): void {
    if (this.context === null) {
      return;
    }

    this.active = true;
    this.paused = false;

    this.resetAudio();
    this.resetBoard();
    this.setPhase("waiting-first");
    this.updateCardSelection(true);
  }

  public pause(): void {
    if (
      !this.active
      || this.paused
    ) {
      return;
    }

    this.paused = true;

    this.pauseMismatchTimeout();
    this.updatePhasePresentation();
  }

  public resume(): void {
    if (
      !this.active
      || !this.paused
    ) {
      return;
    }

    this.paused = false;

    if (
      this.phase === "resolving-mismatch"
      && this.pendingMismatch !== null
    ) {
      if (this.mismatchRemainingMs <= 0) {
        this.finishMismatchReset();
      } else {
        this.scheduleMismatchReset(
          this.mismatchRemainingMs,
        );
      }
    }

    this.updatePhasePresentation();
    this.updateCardSelection(true);
  }

  public destroy(): void {
    this.clearMismatchTimeout();
    this.pendingMismatch = null;

    this.audio?.destroy();
    this.audio = null;

    this.cardGrid?.removeEventListener(
      "click",
      this.handleCardClick,
    );

    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
    );

    this.context = null;
    this.scene = null;
    this.cardGrid = null;
    this.pairCounter = null;
    this.status = null;

    this.deck = [];
    this.cardButtons.length = 0;

    this.phase = "waiting-first";
    this.selectedIndex = 0;
    this.firstSelectedIndex = null;
    this.secondSelectedIndex = null;
    this.matchedIndices = new Set<number>();

    this.active = false;
    this.paused = false;
  }

  private moveSelection(
    direction: MemoryBurstDirection,
  ): void {
    this.selectedIndex =
      moveMemoryBurstSelection(
        this.selectedIndex,
        direction,
      );

    this.updateCardSelection(true);
  }

  private activateCard(cardIndex: number): void {
    const slot = getMemoryBurstActivationSlot(
      {
        phase: this.phase,
        firstSelectedIndex:
          this.firstSelectedIndex,
        secondSelectedIndex:
          this.secondSelectedIndex,
        matchedIndices:
          this.matchedIndices,
      },
      cardIndex,
    );

    if (slot === null) {
      return;
    }

    this.audio?.playCardFlip();
    this.setCardFaceUp(cardIndex, true);

    if (slot === "first") {
      this.firstSelectedIndex = cardIndex;
      this.setPhase("waiting-second");
      return;
    }

    this.secondSelectedIndex = cardIndex;

    this.resolveSelectedCards();
  }

  private resolveSelectedCards(): void {
    const firstCardIndex =
      this.firstSelectedIndex;

    const secondCardIndex =
      this.secondSelectedIndex;

    if (
      firstCardIndex === null
      || secondCardIndex === null
    ) {
      return;
    }

    const matchResult = resolveMemoryBurstMatch(
      this.deck,
      firstCardIndex,
      secondCardIndex,
      this.matchedIndices,
    );

    if (matchResult !== null) {
      const completedAllPairs =
        matchResult.phase === "complete";

      if (completedAllPairs) {
        this.audio?.playVictory();
      } else {
        this.audio?.playMatch();
      }

      this.matchedIndices =
        new Set(matchResult.matchedIndices);

      this.markCardMatched(firstCardIndex);
      this.markCardMatched(secondCardIndex);

      this.firstSelectedIndex = null;
      this.secondSelectedIndex = null;

      this.setPairCount(
        matchResult.matchedPairCount,
      );

      this.setPhase(matchResult.phase);

      if (completedAllPairs) {
        const complete =
          this.context?.complete;

        this.active = false;
        this.updateCardSelection(false);

        complete?.();
        return;
      }

      const nextIndex =
        findNextUnmatchedMemoryBurstIndex(
          secondCardIndex,
          this.matchedIndices,
        );

      if (nextIndex !== null) {
        this.selectedIndex = nextIndex;
        this.updateCardSelection(true);
      } else {
        this.updateCardSelection(false);
      }

      return;
    }

    const mismatchResult =
      resolveMemoryBurstMismatch(
        this.deck,
        firstCardIndex,
        secondCardIndex,
        this.matchedIndices,
      );

    if (mismatchResult === null) {
      return;
    }

    this.audio?.playMismatch();
    this.setPhase(mismatchResult.phase);

    this.pendingMismatch = {
      firstCardIndex:
        mismatchResult.firstCardIndex,
      secondCardIndex:
        mismatchResult.secondCardIndex,
    };

    this.scheduleMismatchReset(
      mismatchResult.delayMs,
    );
  }

  private markCardMatched(cardIndex: number): void {
    const button =
      this.cardButtons[cardIndex];

    const card =
      this.deck[cardIndex];

    if (
      button === undefined
      || card === undefined
    ) {
      return;
    }

    button.classList.add(
      "memory-burst-card--matched",
    );

    button.dataset.matched = "true";

    button.setAttribute(
      "aria-disabled",
      "true",
    );

    button.setAttribute(
      "aria-label",
      `Card ${cardIndex + 1}, ${getCardDescription(card)}, matched`,
    );
  }

  private setCardFaceUp(
    cardIndex: number,
    faceUp: boolean,
  ): void {
    const button =
      this.cardButtons[cardIndex];

    const card =
      this.deck[cardIndex];

    if (
      button === undefined
      || card === undefined
    ) {
      return;
    }

    const reverseFace =
      button.querySelector<HTMLElement>(
        ".memory-burst-card__face--reverse",
      );

    const frontFace =
      button.querySelector<HTMLElement>(
        ".memory-burst-card__face--front",
      );

    if (
      reverseFace === null
      || frontFace === null
    ) {
      return;
    }

    reverseFace.hidden = faceUp;
    frontFace.hidden = !faceUp;

    button.classList.toggle(
      "memory-burst-card--face-up",
      faceUp,
    );

    button.setAttribute(
      "aria-pressed",
      String(faceUp),
    );

    button.setAttribute(
      "aria-label",
      faceUp
        ? `Card ${cardIndex + 1}, ${getCardDescription(card)}`
        : `Card ${cardIndex + 1}, face down`,
    );
  }

  private updateCardSelection(
    focusSelectedCard: boolean,
  ): void {
    for (
      let index = 0;
      index < this.cardButtons.length;
      index += 1
    ) {
      const button =
        this.cardButtons[index];

      if (button === undefined) {
        continue;
      }

      const isSelected =
        this.phase !== "complete"
        && index === this.selectedIndex;

      button.classList.toggle(
        "memory-burst-card--selected",
        isSelected,
      );

      if (isSelected) {
        button.dataset.selected = "true";
        button.tabIndex = 0;
      } else {
        delete button.dataset.selected;
        button.tabIndex = -1;
      }
    }

    if (
      !focusSelectedCard
      || this.phase === "complete"
    ) {
      return;
    }

    this.cardButtons[
      this.selectedIndex
    ]?.focus({
      preventScroll: true,
    });
  }

  private resetBoard(): void {
    this.clearMismatchTimeout();
    this.pendingMismatch = null;

    this.phase = "waiting-first";
    this.selectedIndex = 0;
    this.firstSelectedIndex = null;
    this.secondSelectedIndex = null;
    this.matchedIndices = new Set<number>();

    for (
      let index = 0;
      index < this.cardButtons.length;
      index += 1
    ) {
      const button =
        this.cardButtons[index];

      if (button === undefined) {
        continue;
      }

      button.classList.remove(
        "memory-burst-card--matched",
      );

      delete button.dataset.matched;

      button.removeAttribute(
        "aria-disabled",
      );

      this.setCardFaceUp(index, false);
    }

    this.setPairCount(0);
  }

  private resetAudio(): void {
    this.audio?.destroy();
    this.audio = new MemoryBurstAudio();
  }

  private scheduleMismatchReset(
    delayMs: number,
  ): void {
    this.clearMismatchTimeout();

    this.mismatchRemainingMs =
      Math.max(0, delayMs);

    this.mismatchStartedAtMs =
      window.performance.now();

    this.mismatchTimeoutId = window.setTimeout(
      () => {
        this.mismatchTimeoutId = null;
        this.mismatchStartedAtMs = null;

        this.finishMismatchReset();
      },
      this.mismatchRemainingMs,
    );
  }

  private pauseMismatchTimeout(): void {
    if (
      this.mismatchTimeoutId === null
      || this.mismatchStartedAtMs === null
    ) {
      return;
    }

    const elapsedMs =
      window.performance.now()
      - this.mismatchStartedAtMs;

    this.mismatchRemainingMs = Math.max(
      0,
      this.mismatchRemainingMs - elapsedMs,
    );

    window.clearTimeout(
      this.mismatchTimeoutId,
    );

    this.mismatchTimeoutId = null;
    this.mismatchStartedAtMs = null;
  }

  private finishMismatchReset(): void {
    const mismatch =
      this.pendingMismatch;

    this.pendingMismatch = null;
    this.clearMismatchTimeout();

    if (
      this.context === null
      || mismatch === null
    ) {
      return;
    }

    this.setCardFaceUp(
      mismatch.firstCardIndex,
      false,
    );

    this.setCardFaceUp(
      mismatch.secondCardIndex,
      false,
    );

    const resetResult =
      resetMemoryBurstMismatch();

    this.firstSelectedIndex =
      resetResult.firstSelectedIndex;

    this.secondSelectedIndex =
      resetResult.secondSelectedIndex;

    this.setPhase(resetResult.phase);
    this.updateCardSelection(true);
  }

  private clearMismatchTimeout(): void {
    if (this.mismatchTimeoutId !== null) {
      window.clearTimeout(
        this.mismatchTimeoutId,
      );
    }

    this.mismatchTimeoutId = null;
    this.mismatchStartedAtMs = null;
    this.mismatchRemainingMs = 0;
  }

  private setPhase(phase: MemoryBurstPhase): void {
    this.phase = phase;
    this.updatePhasePresentation();
  }

  private updatePhasePresentation(): void {
    if (this.scene !== null) {
      this.scene.dataset.phase = this.phase;
    }

    if (!this.active) {
      this.setStatus("READY");
      return;
    }

    if (this.paused) {
      this.setStatus("PAUSED");
      return;
    }

    switch (this.phase) {
      case "waiting-first":
        this.setStatus("SELECT FIRST CARD");
        break;

      case "waiting-second":
        this.setStatus("SELECT SECOND CARD");
        break;

      case "resolving-mismatch":
        this.setStatus("NO MATCH");
        break;

      case "complete":
        this.setStatus("COMPLETE");
        break;
    }
  }

  private setPairCount(pairCount: number): void {
    if (this.pairCounter === null) {
      return;
    }

    this.pairCounter.textContent =
      `PAIRS ${pairCount} / ${MEMORY_BURST_PAIR_COUNT}`;

    this.pairCounter.setAttribute(
      "aria-label",
      `${pairCount} of ${MEMORY_BURST_PAIR_COUNT} pairs matched`,
    );
  }

  private setStatus(value: string): void {
    if (this.status !== null) {
      this.status.textContent = value;
    }
  }
}

export function createMemoryBurstStage(): Stage {
  return new MemoryBurstStage();
}
