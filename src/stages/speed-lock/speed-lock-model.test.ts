import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SPEED_LOCKED_TARGET_WORDS,
  createSpeedLockedGameState,
  evaluateSpeedLockedGuess,
  getSpeedLockedSubmittedLetters,
  isSpeedLockedRowComplete,
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
  SpeedLockedRow,
  SpeedLockedSubmittedLetters,
  SpeedLockedTargetWord,
} from "./speed-lock-model";

const SPEED_GUESS: SpeedLockedSubmittedLetters = [
  "S",
  "P",
  "E",
  "E",
  "D",
];

const WRONG_GUESS: SpeedLockedSubmittedLetters = [
  "A",
  "A",
  "A",
  "A",
  "A",
];

function createStartedState(
  targetWord: SpeedLockedTargetWord = "speed",
): SpeedLockedGameState {
  return startSpeedLockedGame(
    createSpeedLockedGameState(targetWord),
  );
}

function enterGuess(
  state: SpeedLockedGameState,
  letters: SpeedLockedSubmittedLetters,
): SpeedLockedGameState {
  const activeRowIndex = state.activeRowIndex;

  if (activeRowIndex === null) {
    throw new Error(
      "Cannot enter a guess without an active row.",
    );
  }

  const rows = state.rows.map(
    (row, index): SpeedLockedRow => (
      index === activeRowIndex
        ? {
            kind: "editable",
            letters,
          }
        : row
    ),
  );

  return {
    ...state,
    rows,
  };
}

describe("Speed Locked target selection", () => {
  it("contains the fourteen approved five-letter words", () => {
    expect(SPEED_LOCKED_TARGET_WORDS).toHaveLength(14);

    for (const targetWord of SPEED_LOCKED_TARGET_WORDS) {
      expect(targetWord).toHaveLength(5);
      expect(targetWord).toBe(
        targetWord.toLowerCase(),
      );
    }
  });

  it("always selects an approved target", () => {
    for (let seed = 0; seed < 256; seed += 1) {
      expect(SPEED_LOCKED_TARGET_WORDS).toContain(
        selectSpeedLockedTargetWord(seed),
      );
    }
  });

  it("selects the same target for the same seed", () => {
    expect(selectSpeedLockedTargetWord(12_345)).toBe(
      selectSpeedLockedTargetWord(12_345),
    );
  });

  it("distributes representative seeds across targets", () => {
    const selectedTargets = new Set(
      Array.from(
        { length: 128 },
        (_, seed) => selectSpeedLockedTargetWord(seed),
      ),
    );

    expect(selectedTargets.size).toBeGreaterThan(1);
  });

  it("rejects invalid seeds", () => {
    expect(
      () => selectSpeedLockedTargetWord(-1),
    ).toThrow(RangeError);

    expect(
      () => selectSpeedLockedTargetWord(
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow(RangeError);
  });
});

describe("Speed Locked combination controls", () => {
  it("initializes blank letters from either direction", () => {
    expect(rotateSpeedLockedLetter(null, "up")).toBe(
      "A",
    );

    expect(rotateSpeedLockedLetter(null, "down")).toBe(
      "Z",
    );
  });

  it("rotates and wraps through the alphabet", () => {
    expect(rotateSpeedLockedLetter("A", "up")).toBe(
      "B",
    );

    expect(rotateSpeedLockedLetter("Z", "up")).toBe(
      "A",
    );

    expect(rotateSpeedLockedLetter("Z", "down")).toBe(
      "Y",
    );

    expect(rotateSpeedLockedLetter("A", "down")).toBe(
      "Z",
    );
  });

  it("moves horizontally without wrapping", () => {
    expect(moveSpeedLockedPosition(2, "left")).toBe(1);
    expect(moveSpeedLockedPosition(2, "right")).toBe(3);
    expect(moveSpeedLockedPosition(0, "left")).toBe(0);
    expect(moveSpeedLockedPosition(4, "right")).toBe(4);
  });

  it("rejects invalid position indexes", () => {
    expect(
      () => moveSpeedLockedPosition(-1, "left"),
    ).toThrow(RangeError);

    expect(
      () => moveSpeedLockedPosition(5, "right"),
    ).toThrow(RangeError);
  });
});

describe("Speed Locked row validation", () => {
  it("rejects rows containing a blank position", () => {
    const letters: SpeedLockedEditableLetters = [
      "Q",
      "W",
      null,
      "R",
      "T",
    ];

    expect(isSpeedLockedRowComplete(letters)).toBe(
      false,
    );

    expect(
      getSpeedLockedSubmittedLetters(letters),
    ).toBeNull();
  });

  it("accepts any complete five-letter sequence", () => {
    const letters: SpeedLockedEditableLetters = [
      "Q",
      "W",
      "E",
      "R",
      "T",
    ];

    expect(isSpeedLockedRowComplete(letters)).toBe(
      true,
    );

    expect(
      getSpeedLockedSubmittedLetters(letters),
    ).toEqual(letters);
  });
});

describe("Speed Locked guess evaluation", () => {
  it("marks a matching target as entirely exact", () => {
    expect(
      evaluateSpeedLockedGuess(
        "speed",
        SPEED_GUESS,
      ),
    ).toEqual([
      "exact",
      "exact",
      "exact",
      "exact",
      "exact",
    ]);
  });

  it("distinguishes misplaced and absent letters", () => {
    expect(
      evaluateSpeedLockedGuess(
        "speed",
        [
          "P",
          "S",
          "A",
          "R",
          "E",
        ],
      ),
    ).toEqual([
      "misplaced",
      "misplaced",
      "absent",
      "absent",
      "misplaced",
    ]);
  });

  it("does not over-count repeated guessed letters", () => {
    expect(
      evaluateSpeedLockedGuess(
        "speed",
        [
          "E",
          "E",
          "E",
          "A",
          "A",
        ],
      ),
    ).toEqual([
      "misplaced",
      "absent",
      "exact",
      "absent",
      "absent",
    ]);
  });

  it("does not over-count repeated target letters", () => {
    expect(
      evaluateSpeedLockedGuess(
        "rally",
        WRONG_GUESS,
      ),
    ).toEqual([
      "absent",
      "exact",
      "absent",
      "absent",
      "absent",
    ]);
  });
});

describe("Speed Locked state transitions", () => {
  it("creates one blank ready row", () => {
    const state = createSpeedLockedGameState("speed");

    expect(state.status).toBe("ready");
    expect(state.rows).toHaveLength(1);
    expect(state.activeRowIndex).toBe(0);
    expect(state.activePositionIndex).toBe(0);
    expect(state.submissionLocked).toBe(false);

    expect(state.rows[0]).toEqual({
      kind: "editable",
      letters: [
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });

  it("starts a ready game", () => {
    const state = createStartedState();

    expect(state.status).toBe("playing");
  });

  it("blocks submission before the game starts", () => {
    const state = createSpeedLockedGameState("speed");
    const transition = submitSpeedLockedRow(state);

    expect(transition.outcome).toBe("blocked");
    expect(transition.state).toBe(state);
  });

  it("does not advance an incomplete row", () => {
    const state = createStartedState();
    const transition = submitSpeedLockedRow(state);

    expect(transition.outcome).toBe("incomplete");
    expect(transition.state).toBe(state);
    expect(transition.state.rows).toHaveLength(1);
  });

  it("accepts an arbitrary complete guess", () => {
    const state = enterGuess(
      createStartedState(),
      [
        "Q",
        "W",
        "E",
        "R",
        "T",
      ],
    );

    const transition = submitSpeedLockedRow(state);

    expect(transition.outcome).toBe("submitted");
    expect(transition.state.rows).toHaveLength(2);
    expect(transition.state.rows[0]?.kind).toBe(
      "submitted",
    );
    expect(transition.state.rows[1]?.kind).toBe(
      "editable",
    );
    expect(transition.state.activeRowIndex).toBe(1);
    expect(transition.state.activePositionIndex).toBe(0);
  });

  it("wins immediately after an exact guess", () => {
    const state = enterGuess(
      createStartedState(),
      SPEED_GUESS,
    );

    const transition = submitSpeedLockedRow(state);

    expect(transition.outcome).toBe("won");
    expect(transition.state.status).toBe("won");
    expect(transition.state.rows).toHaveLength(1);
    expect(transition.state.activeRowIndex).toBeNull();
    expect(
      transition.state.activePositionIndex,
    ).toBeNull();
    expect(transition.state.submissionLocked).toBe(
      true,
    );
  });

  it("loses after the fifth incorrect guess", () => {
    let state = createStartedState();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const transition = submitSpeedLockedRow(
        enterGuess(state, WRONG_GUESS),
      );

      expect(transition.outcome).toBe("submitted");
      state = transition.state;
    }

    const finalTransition = submitSpeedLockedRow(
      enterGuess(state, WRONG_GUESS),
    );

    expect(finalTransition.outcome).toBe("lost");
    expect(finalTransition.state.status).toBe("lost");
    expect(finalTransition.state.rows).toHaveLength(5);
    expect(
      finalTransition.state.activeRowIndex,
    ).toBeNull();
    expect(
      finalTransition.state.submissionLocked,
    ).toBe(true);
  });

  it("allows a winning guess on the fifth attempt", () => {
    let state = createStartedState();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      state = submitSpeedLockedRow(
        enterGuess(state, WRONG_GUESS),
      ).state;
    }

    const finalTransition = submitSpeedLockedRow(
      enterGuess(state, SPEED_GUESS),
    );

    expect(finalTransition.outcome).toBe("won");
    expect(finalTransition.state.status).toBe("won");
    expect(finalTransition.state.rows).toHaveLength(5);
  });

  it("restarts with the same target and one blank row", () => {
    const submittedState = submitSpeedLockedRow(
      enterGuess(
        createStartedState("zippy"),
        WRONG_GUESS,
      ),
    ).state;

    const restartedState =
      restartSpeedLockedGame(submittedState);

    expect(restartedState.targetWord).toBe("zippy");
    expect(restartedState.status).toBe("playing");
    expect(restartedState.rows).toHaveLength(1);
    expect(restartedState.activeRowIndex).toBe(0);
    expect(restartedState.activePositionIndex).toBe(0);
    expect(restartedState.submissionLocked).toBe(false);

    expect(restartedState.rows[0]).toEqual({
      kind: "editable",
      letters: [
        null,
        null,
        null,
        null,
        null,
      ],
    });
  });
});
