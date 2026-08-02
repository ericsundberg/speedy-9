import {
  shuffled,
} from "../../core/random";
import type {
  RandomSource,
} from "../../core/random";

export const MEMORY_BURST_COLUMN_COUNT = 4;
export const MEMORY_BURST_ROW_COUNT = 3;

export const MEMORY_BURST_CARD_COUNT =
  MEMORY_BURST_COLUMN_COUNT
  * MEMORY_BURST_ROW_COUNT;

export const MEMORY_BURST_PAIR_COUNT =
  MEMORY_BURST_CARD_COUNT / 2;

export const MEMORY_BURST_MISMATCH_DELAY_MS =
  450;

export type MemoryBurstSuit =
  | "spades"
  | "hearts"
  | "clubs"
  | "diamonds";

export type MemoryBurstRank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export type MemoryBurstPairId =
  `${MemoryBurstRank}-${MemoryBurstSuit}`;

export interface MemoryBurstPairDefinition {
  readonly pairId: MemoryBurstPairId;
  readonly rank: MemoryBurstRank;
  readonly suit: MemoryBurstSuit;
}

export interface MemoryBurstCard
  extends MemoryBurstPairDefinition {
  readonly instanceId: string;
}

export type MemoryBurstPhase =
  | "waiting-first"
  | "waiting-second"
  | "resolving-mismatch"
  | "complete";

export type MemoryBurstDirection =
  | "up"
  | "down"
  | "left"
  | "right";

export interface MemoryBurstGridPosition {
  readonly row: number;
  readonly column: number;
}

export type MemoryBurstActivationSlot =
  | "first"
  | "second";

export interface MemoryBurstActivationState {
  readonly phase: MemoryBurstPhase;
  readonly firstSelectedIndex: number | null;
  readonly secondSelectedIndex: number | null;
  readonly matchedIndices: ReadonlySet<number>;
}

export const MEMORY_BURST_PAIR_DEFINITIONS = [
  {
    pairId: "1-spades",
    rank: 1,
    suit: "spades",
  },
  {
    pairId: "2-hearts",
    rank: 2,
    suit: "hearts",
  },
  {
    pairId: "3-clubs",
    rank: 3,
    suit: "clubs",
  },
  {
    pairId: "4-diamonds",
    rank: 4,
    suit: "diamonds",
  },
  {
    pairId: "5-spades",
    rank: 5,
    suit: "spades",
  },
  {
    pairId: "6-hearts",
    rank: 6,
    suit: "hearts",
  },
] as const satisfies readonly MemoryBurstPairDefinition[];

function isValidMemoryBurstCardIndex(
  index: number,
): boolean {
  return (
    Number.isInteger(index)
    && index >= 0
    && index < MEMORY_BURST_CARD_COUNT
  );
}

function assertValidCardIndex(index: number): void {
  if (!isValidMemoryBurstCardIndex(index)) {
    throw new RangeError(
      `Memory Burst card index must be between 0 and ${
        MEMORY_BURST_CARD_COUNT - 1
      }.`,
    );
  }
}

export function getMemoryBurstActivationSlot(
  state: MemoryBurstActivationState,
  cardIndex: number,
): MemoryBurstActivationSlot | null {
  if (!isValidMemoryBurstCardIndex(cardIndex)) {
    return null;
  }

  if (state.matchedIndices.has(cardIndex)) {
    return null;
  }

  if (
    state.firstSelectedIndex === cardIndex
    || state.secondSelectedIndex === cardIndex
  ) {
    return null;
  }

  switch (state.phase) {
    case "waiting-first":
      if (
        state.firstSelectedIndex !== null
        || state.secondSelectedIndex !== null
      ) {
        return null;
      }

      return "first";

    case "waiting-second":
      if (
        state.firstSelectedIndex === null
        || state.secondSelectedIndex !== null
      ) {
        return null;
      }

      return "second";

    case "resolving-mismatch":
    case "complete":
      return null;
  }
}

export function createUnshuffledMemoryBurstDeck():
MemoryBurstCard[] {
  const cards: MemoryBurstCard[] = [];

  for (const pair of MEMORY_BURST_PAIR_DEFINITIONS) {
    for (let copyNumber = 1; copyNumber <= 2; copyNumber += 1) {
      cards.push({
        ...pair,
        instanceId: `${pair.pairId}-${copyNumber}`,
      });
    }
  }

  return cards;
}

export function createMemoryBurstDeck(
  random: RandomSource,
): MemoryBurstCard[] {
  return shuffled(
    createUnshuffledMemoryBurstDeck(),
    random,
  );
}

export function areMemoryBurstCardsMatching(
  firstCard: MemoryBurstCard,
  secondCard: MemoryBurstCard,
): boolean {
  return (
    firstCard.instanceId !== secondCard.instanceId
    && firstCard.pairId === secondCard.pairId
  );
}

export interface MemoryBurstMatchResult {
  readonly matchedIndices: ReadonlySet<number>;
  readonly matchedPairCount: number;
  readonly phase:
    | "waiting-first"
    | "complete";
}

export function resolveMemoryBurstMatch(
  deck: readonly MemoryBurstCard[],
  firstCardIndex: number,
  secondCardIndex: number,
  matchedIndices: ReadonlySet<number>,
): MemoryBurstMatchResult | null {
  assertValidCardIndex(firstCardIndex);
  assertValidCardIndex(secondCardIndex);

  if (firstCardIndex === secondCardIndex) {
    return null;
  }

  if (
    matchedIndices.has(firstCardIndex)
    || matchedIndices.has(secondCardIndex)
  ) {
    return null;
  }

  const firstCard = deck[firstCardIndex];
  const secondCard = deck[secondCardIndex];

  if (
    firstCard === undefined
    || secondCard === undefined
  ) {
    throw new RangeError(
      "Memory Burst deck is missing a selected card.",
    );
  }

  if (
    !areMemoryBurstCardsMatching(
      firstCard,
      secondCard,
    )
  ) {
    return null;
  }

  const nextMatchedIndices =
    new Set(matchedIndices);

  nextMatchedIndices.add(firstCardIndex);
  nextMatchedIndices.add(secondCardIndex);

  const matchedPairCount =
    nextMatchedIndices.size / 2;

  return {
    matchedIndices: nextMatchedIndices,
    matchedPairCount,
    phase:
      nextMatchedIndices.size
      === MEMORY_BURST_CARD_COUNT
        ? "complete"
        : "waiting-first",
  };
}

export interface MemoryBurstMismatchResult {
  readonly firstCardIndex: number;
  readonly secondCardIndex: number;
  readonly phase: "resolving-mismatch";
  readonly delayMs: number;
}

export function resolveMemoryBurstMismatch(
  deck: readonly MemoryBurstCard[],
  firstCardIndex: number,
  secondCardIndex: number,
  matchedIndices: ReadonlySet<number>,
): MemoryBurstMismatchResult | null {
  assertValidCardIndex(firstCardIndex);
  assertValidCardIndex(secondCardIndex);

  if (firstCardIndex === secondCardIndex) {
    return null;
  }

  if (
    matchedIndices.has(firstCardIndex)
    || matchedIndices.has(secondCardIndex)
  ) {
    return null;
  }

  const firstCard = deck[firstCardIndex];
  const secondCard = deck[secondCardIndex];

  if (
    firstCard === undefined
    || secondCard === undefined
  ) {
    throw new RangeError(
      "Memory Burst deck is missing a selected card.",
    );
  }

  if (
    areMemoryBurstCardsMatching(
      firstCard,
      secondCard,
    )
  ) {
    return null;
  }

  return {
    firstCardIndex,
    secondCardIndex,
    phase: "resolving-mismatch",
    delayMs: MEMORY_BURST_MISMATCH_DELAY_MS,
  };
}

export interface MemoryBurstMismatchResetResult {
  readonly firstSelectedIndex: null;
  readonly secondSelectedIndex: null;
  readonly phase: "waiting-first";
}

export function resetMemoryBurstMismatch():
MemoryBurstMismatchResetResult {
  return {
    firstSelectedIndex: null,
    secondSelectedIndex: null,
    phase: "waiting-first",
  };
}

export function getMemoryBurstGridPosition(
  index: number,
): MemoryBurstGridPosition {
  assertValidCardIndex(index);

  return {
    row: Math.floor(
      index / MEMORY_BURST_COLUMN_COUNT,
    ),
    column:
      index % MEMORY_BURST_COLUMN_COUNT,
  };
}

export function moveMemoryBurstSelection(
  currentIndex: number,
  direction: MemoryBurstDirection,
): number {
  const position =
    getMemoryBurstGridPosition(currentIndex);

  switch (direction) {
    case "up":
      if (position.row === 0) {
        return currentIndex;
      }

      return currentIndex - MEMORY_BURST_COLUMN_COUNT;

    case "down":
      if (
        position.row
        === MEMORY_BURST_ROW_COUNT - 1
      ) {
        return currentIndex;
      }

      return currentIndex + MEMORY_BURST_COLUMN_COUNT;

    case "left":
      if (position.column === 0) {
        return currentIndex;
      }

      return currentIndex - 1;

    case "right":
      if (
        position.column
        === MEMORY_BURST_COLUMN_COUNT - 1
      ) {
        return currentIndex;
      }

      return currentIndex + 1;
  }
}

export function findNextUnmatchedMemoryBurstIndex(
  currentIndex: number,
  matchedIndices: ReadonlySet<number>,
): number | null {
  assertValidCardIndex(currentIndex);

  for (
    let offset = 1;
    offset <= MEMORY_BURST_CARD_COUNT;
    offset += 1
  ) {
    const candidateIndex =
      (
        currentIndex + offset
      ) % MEMORY_BURST_CARD_COUNT;

    if (!matchedIndices.has(candidateIndex)) {
      return candidateIndex;
    }
  }

  return null;
}
