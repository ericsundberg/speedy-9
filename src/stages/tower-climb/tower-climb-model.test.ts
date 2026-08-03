import {
  describe,
  expect,
  it,
} from "vitest";
import {
  chooseTicTacToeCpuMove,
  createInitialTicTacToeState,
  getTicTacToeStatus,
  getTicTacToeWinner,
  playTicTacToeCpuMove,
  playTicTacToePlayerMove,
} from "./tower-climb-model";

describe("Tic-Tac-Toe model", () => {
  it("starts with an empty player turn", () => {
    const state = createInitialTicTacToeState();

    expect(state.board).toHaveLength(9);
    expect(state.board.every(
      (cell) => cell === null,
    )).toBe(true);
    expect(state.turn).toBe("player");
    expect(state.phase).toBe("active");
    expect(getTicTacToeStatus(state)).toBe(
      "YOUR TURN · X",
    );
  });

  it("places the player mark once", () => {
    const initial = createInitialTicTacToeState();

    const moved = playTicTacToePlayerMove(
      initial,
      0,
    );

    expect(moved.board[0]).toBe("x");
    expect(moved.turn).toBe("cpu");

    expect(
      playTicTacToePlayerMove(moved, 1),
    ).toBe(moved);
  });

  it("recognizes a winning row", () => {
    const winner = getTicTacToeWinner([
      "x",
      "x",
      "x",
      null,
      "o",
      null,
      "o",
      null,
      null,
    ]);

    expect(winner).toEqual({
      mark: "x",
      line: [0, 1, 2],
    });
  });

  it("takes an immediate CPU win", () => {
    expect(
      chooseTicTacToeCpuMove([
        "o",
        "o",
        null,
        "x",
        "x",
        null,
        null,
        null,
        null,
      ]),
    ).toBe(2);
  });

  it("blocks an immediate player win", () => {
    expect(
      chooseTicTacToeCpuMove([
        "x",
        "x",
        null,
        "o",
        null,
        null,
        null,
        null,
        null,
      ]),
    ).toBe(2);
  });

  it("prefers the center on an open board", () => {
    expect(
      chooseTicTacToeCpuMove(
        createInitialTicTacToeState().board,
      ),
    ).toBe(4);
  });

  it("advances the CPU turn", () => {
    const playerMoved =
      playTicTacToePlayerMove(
        createInitialTicTacToeState(),
        0,
      );

    const cpuMoved =
      playTicTacToeCpuMove(playerMoved);

    expect(cpuMoved.board[4]).toBe("o");
    expect(cpuMoved.turn).toBe("player");
    expect(cpuMoved.moveCount).toBe(2);
  });

  it("does not overwrite an occupied cell", () => {
    const initial = createInitialTicTacToeState();
    const moved = playTicTacToePlayerMove(
      initial,
      4,
    );
    const cpuMoved = playTicTacToeCpuMove(moved);

    expect(
      playTicTacToePlayerMove(cpuMoved, 4),
    ).toBe(cpuMoved);
  });
});
