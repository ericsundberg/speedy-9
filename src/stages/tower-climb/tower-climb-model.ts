export type TicTacToeMark = "x" | "o";

export type TicTacToeCell = TicTacToeMark | null;

export type TicTacToeTurn = "player" | "cpu";

export type TicTacToePhase =
  | "active"
  | "player-won"
  | "cpu-won"
  | "draw";

export interface TicTacToeState {
  readonly board: readonly TicTacToeCell[];
  readonly turn: TicTacToeTurn;
  readonly phase: TicTacToePhase;
  readonly winningLine: readonly number[] | null;
  readonly moveCount: number;
}

export interface TicTacToeWinner {
  readonly mark: TicTacToeMark;
  readonly line: readonly number[];
}

export const TIC_TAC_TOE_CELL_COUNT = 9;

export const TIC_TAC_TOE_WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const satisfies readonly (
  readonly number[]
)[];

const CPU_PREFERENCE_ORDER = [
  4,
  0,
  8,
  2,
  6,
  1,
  3,
  5,
  7,
] as const;

function isCellIndex(index: number): boolean {
  return (
    Number.isInteger(index)
    && index >= 0
    && index < TIC_TAC_TOE_CELL_COUNT
  );
}

function setCell(
  board: readonly TicTacToeCell[],
  index: number,
  mark: TicTacToeMark,
): readonly TicTacToeCell[] {
  return board.map(
    (cell, cellIndex) =>
      cellIndex === index
        ? mark
        : cell,
  );
}

function getOpenCellCount(
  board: readonly TicTacToeCell[],
): number {
  return board.filter(
    (cell) => cell === null,
  ).length;
}

function resolveMove(
  board: readonly TicTacToeCell[],
  turn: TicTacToeTurn,
  moveCount: number,
): TicTacToeState {
  const winner = getTicTacToeWinner(board);

  if (winner !== null) {
    return {
      board,
      turn,
      phase:
        winner.mark === "x"
          ? "player-won"
          : "cpu-won",
      winningLine: winner.line,
      moveCount,
    };
  }

  if (getOpenCellCount(board) === 0) {
    return {
      board,
      turn,
      phase: "draw",
      winningLine: null,
      moveCount,
    };
  }

  return {
    board,
    turn,
    phase: "active",
    winningLine: null,
    moveCount,
  };
}

function findTacticalMove(
  board: readonly TicTacToeCell[],
  mark: TicTacToeMark,
): number | null {
  for (
    let index = 0;
    index < TIC_TAC_TOE_CELL_COUNT;
    index += 1
  ) {
    if (board[index] !== null) {
      continue;
    }

    const trial = setCell(
      board,
      index,
      mark,
    );

    if (
      getTicTacToeWinner(trial)?.mark
      === mark
    ) {
      return index;
    }
  }

  return null;
}

export function createInitialTicTacToeState():
  TicTacToeState {
  return {
    board: Array<TicTacToeCell>(
      TIC_TAC_TOE_CELL_COUNT,
    ).fill(null),
    turn: "player",
    phase: "active",
    winningLine: null,
    moveCount: 0,
  };
}

export function getTicTacToeWinner(
  board: readonly TicTacToeCell[],
): TicTacToeWinner | null {
  for (const line of TIC_TAC_TOE_WINNING_LINES) {
    const [first, second, third] = line;

    const mark = board[first];

    if (
      mark !== undefined
      && mark !== null
      && mark === board[second]
      && mark === board[third]
    ) {
      return {
        mark,
        line,
      };
    }
  }

  return null;
}

export function chooseTicTacToeCpuMove(
  board: readonly TicTacToeCell[],
): number | null {
  const winningMove = findTacticalMove(
    board,
    "o",
  );

  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findTacticalMove(
    board,
    "x",
  );

  if (blockingMove !== null) {
    return blockingMove;
  }

  return CPU_PREFERENCE_ORDER.find(
    (index) => board[index] === null,
  ) ?? null;
}

export function playTicTacToePlayerMove(
  state: TicTacToeState,
  index: number,
): TicTacToeState {
  if (
    state.phase !== "active"
    || state.turn !== "player"
    || !isCellIndex(index)
    || state.board[index] !== null
  ) {
    return state;
  }

  const board = setCell(
    state.board,
    index,
    "x",
  );

  return resolveMove(
    board,
    "cpu",
    state.moveCount + 1,
  );
}

export function playTicTacToeCpuMove(
  state: TicTacToeState,
): TicTacToeState {
  if (
    state.phase !== "active"
    || state.turn !== "cpu"
  ) {
    return state;
  }

  const index = chooseTicTacToeCpuMove(
    state.board,
  );

  if (index === null) {
    return {
      ...state,
      phase: "draw",
    };
  }

  const board = setCell(
    state.board,
    index,
    "o",
  );

  return resolveMove(
    board,
    "player",
    state.moveCount + 1,
  );
}

export function getTicTacToeStatus(
  state: TicTacToeState,
): string {
  switch (state.phase) {
    case "player-won":
      return "THREE IN A ROW";

    case "cpu-won":
      return "MACHINE WINS";

    case "draw":
      return "DRAW";

    case "active":
      return state.turn === "player"
        ? "YOUR TURN · X"
        : "MACHINE THINKING · O";
  }
}
