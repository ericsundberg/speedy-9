import {
  deriveSeed,
} from "../../core/random";

export const SPEED_LOCKED_WORD_LENGTH = 5;
export const SPEED_LOCKED_MAX_GUESSES = 5;

export const SPEED_LOCKED_TARGET_WORDS = [
  "speed",
  "quick",
  "rapid",
  "swift",
  "fleet",
  "brisk",
  "hasty",
  "zippy",
  "turbo",
  "surge",
  "hurry",
  "rally",
  "racer",
  "burst",
] as const;

export const SPEED_LOCKED_ALPHABET = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

const SPEED_LOCKED_TARGET_SEED_NAMESPACE =
  "speed-locked-target";

export type SpeedLockedTargetWord =
  (typeof SPEED_LOCKED_TARGET_WORDS)[number];

export type SpeedLockedLetter =
  (typeof SPEED_LOCKED_ALPHABET)[number];

export type SpeedLockedEditableLetter =
  SpeedLockedLetter | null;

export type SpeedLockedEditableLetters = readonly [
  SpeedLockedEditableLetter,
  SpeedLockedEditableLetter,
  SpeedLockedEditableLetter,
  SpeedLockedEditableLetter,
  SpeedLockedEditableLetter,
];

export type SpeedLockedSubmittedLetters = readonly [
  SpeedLockedLetter,
  SpeedLockedLetter,
  SpeedLockedLetter,
  SpeedLockedLetter,
  SpeedLockedLetter,
];

export type SpeedLockedLetterResult =
  | "exact"
  | "misplaced"
  | "absent";

export type SpeedLockedResultRow = readonly [
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
];

export type SpeedLockedStatus =
  | "ready"
  | "playing"
  | "paused"
  | "won"
  | "lost";

export type SpeedLockedLetterRotationDirection =
  | "up"
  | "down";

export type SpeedLockedPositionDirection =
  | "left"
  | "right";

export interface SpeedLockedEditableRow {
  readonly kind: "editable";
  readonly letters: SpeedLockedEditableLetters;
}

export interface SpeedLockedSubmittedRow {
  readonly kind: "submitted";
  readonly letters: SpeedLockedSubmittedLetters;
  readonly results: SpeedLockedResultRow;
}

export type SpeedLockedRow =
  | SpeedLockedEditableRow
  | SpeedLockedSubmittedRow;

export interface SpeedLockedGameState {
  readonly targetWord: SpeedLockedTargetWord;
  readonly rows: readonly SpeedLockedRow[];
  readonly activeRowIndex: number | null;
  readonly activePositionIndex: number | null;
  readonly status: SpeedLockedStatus;
  readonly submissionLocked: boolean;
}

function normalizeSpeedLockedSeed(seed: number): number {
  if (!Number.isFinite(seed) || seed < 0) {
    throw new RangeError(
      "Speed Locked seeds must be finite and non-negative.",
    );
  }

  return Math.floor(seed) >>> 0;
}

function requireSpeedLockedPositionIndex(
  positionIndex: number,
): number {
  if (
    !Number.isInteger(positionIndex)
    || positionIndex < 0
    || positionIndex >= SPEED_LOCKED_WORD_LENGTH
  ) {
    throw new RangeError(
      `Speed Locked position index must be between 0 and ${
        SPEED_LOCKED_WORD_LENGTH - 1
      }.`,
    );
  }

  return positionIndex;
}

export function selectSpeedLockedTargetWord(
  seed: number,
): SpeedLockedTargetWord {
  const normalizedSeed = normalizeSpeedLockedSeed(seed);

  const targetSeed = deriveSeed(
    normalizedSeed,
    SPEED_LOCKED_TARGET_SEED_NAMESPACE,
  );

  const targetIndex =
    targetSeed % SPEED_LOCKED_TARGET_WORDS.length;

  const targetWord =
    SPEED_LOCKED_TARGET_WORDS[targetIndex];

  if (targetWord === undefined) {
    throw new RangeError(
      `Unable to select Speed Locked target at index ${targetIndex}.`,
    );
  }

  return targetWord;
}

export function rotateSpeedLockedLetter(
  letter: SpeedLockedEditableLetter,
  direction: SpeedLockedLetterRotationDirection,
): SpeedLockedLetter {
  if (letter === null) {
    return direction === "up"
      ? "A"
      : "Z";
  }

  const currentIndex =
    SPEED_LOCKED_ALPHABET.indexOf(letter);

  if (currentIndex < 0) {
    throw new RangeError(
      `Unknown Speed Locked letter: ${letter}`,
    );
  }

  const offset = direction === "up"
    ? 1
    : -1;

  const nextIndex = (
    currentIndex
    + offset
    + SPEED_LOCKED_ALPHABET.length
  ) % SPEED_LOCKED_ALPHABET.length;

  const nextLetter =
    SPEED_LOCKED_ALPHABET[nextIndex];

  if (nextLetter === undefined) {
    throw new RangeError(
      `Unable to rotate Speed Locked letter to index ${nextIndex}.`,
    );
  }

  return nextLetter;
}

export function moveSpeedLockedPosition(
  positionIndex: number,
  direction: SpeedLockedPositionDirection,
): number {
  const validatedIndex =
    requireSpeedLockedPositionIndex(positionIndex);

  if (direction === "left") {
    return Math.max(0, validatedIndex - 1);
  }

  return Math.min(
    SPEED_LOCKED_WORD_LENGTH - 1,
    validatedIndex + 1,
  );
}

export function isSpeedLockedRowComplete(
  letters: SpeedLockedEditableLetters,
): letters is SpeedLockedSubmittedLetters {
  return letters.every(
    (
      letter,
    ): letter is SpeedLockedLetter => letter !== null,
  );
}

export function getSpeedLockedSubmittedLetters(
  letters: SpeedLockedEditableLetters,
): SpeedLockedSubmittedLetters | null {
  if (!isSpeedLockedRowComplete(letters)) {
    return null;
  }

  return letters;
}

type MutableSpeedLockedResultRow = [
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
  SpeedLockedLetterResult,
];

function requireSpeedLockedLetter(
  value: string | undefined,
): SpeedLockedLetter {
  if (
    value === undefined
    || !SPEED_LOCKED_ALPHABET.includes(
      value as SpeedLockedLetter,
    )
  ) {
    throw new RangeError(
      `Invalid Speed Locked letter: ${value ?? "undefined"}`,
    );
  }

  return value as SpeedLockedLetter;
}

function getSpeedLockedTargetLetters(
  targetWord: SpeedLockedTargetWord,
): SpeedLockedSubmittedLetters {
  return [
    requireSpeedLockedLetter(
      targetWord[0]?.toUpperCase(),
    ),
    requireSpeedLockedLetter(
      targetWord[1]?.toUpperCase(),
    ),
    requireSpeedLockedLetter(
      targetWord[2]?.toUpperCase(),
    ),
    requireSpeedLockedLetter(
      targetWord[3]?.toUpperCase(),
    ),
    requireSpeedLockedLetter(
      targetWord[4]?.toUpperCase(),
    ),
  ];
}

export function evaluateSpeedLockedGuess(
  targetWord: SpeedLockedTargetWord,
  guessedLetters: SpeedLockedSubmittedLetters,
): SpeedLockedResultRow {
  const targetLetters =
    getSpeedLockedTargetLetters(targetWord);

  const results: MutableSpeedLockedResultRow = [
    "absent",
    "absent",
    "absent",
    "absent",
    "absent",
  ];

  const remainingTargetCounts =
    new Map<SpeedLockedLetter, number>();

  for (
    let index = 0;
    index < SPEED_LOCKED_WORD_LENGTH;
    index += 1
  ) {
    const targetLetter = targetLetters[index];
    const guessedLetter = guessedLetters[index];

    if (
      targetLetter === undefined
      || guessedLetter === undefined
    ) {
      throw new RangeError(
        `Missing Speed Locked letter at index ${index}.`,
      );
    }

    if (guessedLetter === targetLetter) {
      results[index] = "exact";
      continue;
    }

    remainingTargetCounts.set(
      targetLetter,
      (remainingTargetCounts.get(targetLetter) ?? 0) + 1,
    );
  }

  for (
    let index = 0;
    index < SPEED_LOCKED_WORD_LENGTH;
    index += 1
  ) {
    if (results[index] === "exact") {
      continue;
    }

    const guessedLetter = guessedLetters[index];

    if (guessedLetter === undefined) {
      throw new RangeError(
        `Missing Speed Locked guess at index ${index}.`,
      );
    }

    const remainingCount =
      remainingTargetCounts.get(guessedLetter) ?? 0;

    if (remainingCount <= 0) {
      continue;
    }

    results[index] = "misplaced";

    if (remainingCount === 1) {
      remainingTargetCounts.delete(guessedLetter);
    } else {
      remainingTargetCounts.set(
        guessedLetter,
        remainingCount - 1,
      );
    }
  }

  return results;
}

export type SpeedLockedSubmissionOutcome =
  | "blocked"
  | "incomplete"
  | "submitted"
  | "won"
  | "lost";

export interface SpeedLockedSubmissionTransition {
  readonly state: SpeedLockedGameState;
  readonly outcome: SpeedLockedSubmissionOutcome;
}

function createSpeedLockedEditableRow():
SpeedLockedEditableRow {
  return {
    kind: "editable",
    letters: [
      null,
      null,
      null,
      null,
      null,
    ],
  };
}

function isWinningSpeedLockedResult(
  results: SpeedLockedResultRow,
): boolean {
  return results.every(
    (result) => result === "exact",
  );
}

export function createSpeedLockedGameState(
  targetWord: SpeedLockedTargetWord,
): SpeedLockedGameState {
  return {
    targetWord,
    rows: [
      createSpeedLockedEditableRow(),
    ],
    activeRowIndex: 0,
    activePositionIndex: 0,
    status: "ready",
    submissionLocked: false,
  };
}

export function startSpeedLockedGame(
  state: SpeedLockedGameState,
): SpeedLockedGameState {
  if (state.status !== "ready") {
    return state;
  }

  return {
    ...state,
    status: "playing",
  };
}

export function submitSpeedLockedRow(
  state: SpeedLockedGameState,
): SpeedLockedSubmissionTransition {
  if (
    state.status !== "playing"
    || state.submissionLocked
    || state.activeRowIndex === null
  ) {
    return {
      state,
      outcome: "blocked",
    };
  }

  const activeRow =
    state.rows[state.activeRowIndex];

  if (
    activeRow === undefined
    || activeRow.kind !== "editable"
  ) {
    return {
      state,
      outcome: "blocked",
    };
  }

  const submittedLetters =
    getSpeedLockedSubmittedLetters(
      activeRow.letters,
    );

  if (submittedLetters === null) {
    return {
      state,
      outcome: "incomplete",
    };
  }

  const results = evaluateSpeedLockedGuess(
    state.targetWord,
    submittedLetters,
  );

  const submittedRow: SpeedLockedSubmittedRow = {
    kind: "submitted",
    letters: submittedLetters,
    results,
  };

  const submittedRows = state.rows.map(
    (row, index): SpeedLockedRow => (
      index === state.activeRowIndex
        ? submittedRow
        : row
    ),
  );

  if (isWinningSpeedLockedResult(results)) {
    return {
      outcome: "won",
      state: {
        ...state,
        rows: submittedRows,
        activeRowIndex: null,
        activePositionIndex: null,
        status: "won",
        submissionLocked: true,
      },
    };
  }

  const finalAttempt =
    state.activeRowIndex
    >= SPEED_LOCKED_MAX_GUESSES - 1;

  if (finalAttempt) {
    return {
      outcome: "lost",
      state: {
        ...state,
        rows: submittedRows,
        activeRowIndex: null,
        activePositionIndex: null,
        status: "lost",
        submissionLocked: true,
      },
    };
  }

  const nextRowIndex =
    state.activeRowIndex + 1;

  return {
    outcome: "submitted",
    state: {
      ...state,
      rows: [
        ...submittedRows,
        createSpeedLockedEditableRow(),
      ],
      activeRowIndex: nextRowIndex,
      activePositionIndex: 0,
      submissionLocked: false,
    },
  };
}

export function restartSpeedLockedGame(
  state: SpeedLockedGameState,
): SpeedLockedGameState {
  return {
    ...createSpeedLockedGameState(
      state.targetWord,
    ),
    status: "playing",
  };
}
