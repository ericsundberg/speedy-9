import type {
  Stage,
  StageContext,
} from "../shared/stage";
import {
  TicTacToeAudio,
} from "./tower-climb-audio";
import {
  createInitialTicTacToeState,
  getTicTacToeStatus,
  playTicTacToeCpuMove,
  playTicTacToePlayerMove,
} from "./tower-climb-model";
import type {
  TicTacToeCell,
  TicTacToeState,
} from "./tower-climb-model";

const CPU_DELAY_MS = 150;
const RESULT_DELAY_MS = 260;

function createMarkSvg(): SVGSVGElement {
  const namespace =
    "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(
    namespace,
    "svg",
  );

  svg.classList.add(
    "tic-tac-toe-stage__mark",
  );

  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");

  const xGroup = document.createElementNS(
    namespace,
    "g",
  );

  xGroup.classList.add(
    "tic-tac-toe-stage__mark-x",
  );

  for (
    const [x1, y1, x2, y2] of [
      [24, 24, 76, 76],
      [76, 24, 24, 76],
    ] as const
  ) {
    const line = document.createElementNS(
      namespace,
      "line",
    );

    line.setAttribute("x1", `${x1}`);
    line.setAttribute("y1", `${y1}`);
    line.setAttribute("x2", `${x2}`);
    line.setAttribute("y2", `${y2}`);
    xGroup.append(line);
  }

  const oGroup = document.createElementNS(
    namespace,
    "g",
  );

  oGroup.classList.add(
    "tic-tac-toe-stage__mark-o",
  );

  const diamond = document.createElementNS(
    namespace,
    "polygon",
  );

  diamond.setAttribute(
    "points",
    [
      "50,18",
      "62.25,20.44",
      "72.63,27.37",
      "79.56,37.75",
      "82,50",
      "79.56,62.25",
      "72.63,72.63",
      "62.25,79.56",
      "50,82",
      "37.75,79.56",
      "27.37,72.63",
      "20.44,62.25",
      "18,50",
      "20.44,37.75",
      "27.37,27.37",
      "37.75,20.44",
    ].join(" "),
  );

  const innerDiamond = document.createElementNS(
    namespace,
    "polygon",
  );

  innerDiamond.classList.add(
    "tic-tac-toe-stage__mark-detail",
  );

  innerDiamond.setAttribute(
    "points",
    [
      "50,31",
      "57.27,32.45",
      "63.44,36.56",
      "67.55,42.73",
      "69,50",
      "67.55,57.27",
      "63.44,63.44",
      "57.27,67.55",
      "50,69",
      "42.73,67.55",
      "36.56,63.44",
      "32.45,57.27",
      "31,50",
      "32.45,42.73",
      "36.56,36.56",
      "42.73,32.45",
    ].join(" "),
  );

  oGroup.append(diamond, innerDiamond);
  svg.append(xGroup, oGroup);

  return svg;
}

function getCellLabel(
  index: number,
  cell: TicTacToeCell,
): string {
  const row = Math.floor(index / 3) + 1;
  const column = index % 3 + 1;

  const value =
    cell === null
      ? "empty"
      : cell.toUpperCase();

  return (
    `Row ${row}, column ${column}: ${value}`
  );
}

export class TowerClimbStage implements Stage {
  public readonly id = "tower-climb" as const;

  private state: TicTacToeState =
    createInitialTicTacToeState();

  private scene: HTMLElement | null = null;

  private status: HTMLElement | null = null;

  private board: HTMLElement | null = null;

  private cells:
    readonly HTMLButtonElement[] = [];

  private restartButton:
    HTMLButtonElement | null = null;

  private completeStage:
    (() => void) | null = null;

  private failStage:
    (() => void) | null = null;

  private abortController:
    AbortController | null = null;

  private cpuTimer: number | null = null;

  private resultTimer: number | null = null;

  private started = false;

  private paused = false;

  private resultReported = false;

  private readonly audio =
    new TicTacToeAudio();

  public mount(context: StageContext): void {
    this.destroy();

    this.completeStage = context.complete;
    this.failStage = context.fail;
    this.state = createInitialTicTacToeState();
    this.resultReported = false;
    this.started = false;
    this.paused = false;

    const abortController =
      new AbortController();

    this.abortController = abortController;

    const scene = document.createElement("section");

    scene.className =
      "placeholder-stage tic-tac-toe-stage";

    scene.dataset.stageId = "tower-climb";
    scene.setAttribute(
      "aria-labelledby",
      "tic-tac-toe-stage-title",
    );

    const title = document.createElement("h1");

    title.id = "tic-tac-toe-stage-title";
    title.className =
      "placeholder-stage__title "
      + "tic-tac-toe-stage__title";
    title.textContent = "TIC-TAC-TOE";

    const instruction =
      document.createElement("p");

    instruction.className =
      "placeholder-stage__description "
      + "tic-tac-toe-stage__instruction";

    instruction.textContent =
      "MAKE THREE IN A ROW BEFORE THE MACHINE.";

    const controls = document.createElement("p");

    controls.className =
      "tic-tac-toe-stage__controls";

    controls.textContent =
      "CLICK A CELL · KEYS 1–9 · RESTART: R";

    const board = document.createElement("div");

    board.className = "tic-tac-toe-stage__board";
    board.setAttribute("role", "grid");
    board.setAttribute(
      "aria-label",
      "Tic-Tac-Toe board. You are X.",
    );

    const cells: HTMLButtonElement[] = [];

    for (let index = 0; index < 9; index += 1) {
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "tic-tac-toe-stage__cell";
      cell.dataset.index = `${index}`;
      cell.setAttribute("role", "gridcell");
      cell.append(createMarkSvg());

      board.append(cell);
      cells.push(cell);
    }

    const status = document.createElement("p");

    status.className =
      "placeholder-stage__status "
      + "tic-tac-toe-stage__status";

    const restartButton =
      document.createElement("button");

    restartButton.type = "button";
    restartButton.className =
      "tic-tac-toe-stage__restart";
    restartButton.textContent = "RESTART";
    restartButton.hidden = true;

    scene.append(
      title,
      instruction,
      controls,
      board,
      status,
      restartButton,
    );

    context.root.replaceChildren(scene);

    this.scene = scene;
    this.status = status;
    this.board = board;
    this.cells = cells;
    this.restartButton = restartButton;

    board.addEventListener(
      "click",
      this.handleBoardClick,
      {
        signal: abortController.signal,
      },
    );

    restartButton.addEventListener(
      "click",
      this.handleRestartClick,
      {
        signal: abortController.signal,
      },
    );

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
      {
        signal: abortController.signal,
      },
    );

    this.render();
  }

  public start(): void {
    this.started = true;
    this.audio.unlock();
    this.render();
    this.focusFirstOpenCell();
  }

  public restart(): void {
    this.clearTimers();
    this.state = createInitialTicTacToeState();
    this.resultReported = false;
    this.started = true;
    this.paused = false;
    this.render();
    this.focusFirstOpenCell();
  }

  public pause(): void {
    this.paused = true;
    this.clearCpuTimer();
    this.render();
  }

  public resume(): void {
    this.paused = false;
    this.render();

    if (
      this.state.phase === "active"
      && this.state.turn === "cpu"
    ) {
      this.scheduleCpuMove();
    }
  }

  public destroy(): void {
    this.abortController?.abort();
    this.abortController = null;

    this.clearTimers();
    this.audio.destroy();

    this.scene?.remove();

    this.scene = null;
    this.status = null;
    this.board = null;
    this.cells = [];
    this.restartButton = null;
    this.completeStage = null;
    this.failStage = null;
    this.started = false;
    this.paused = false;
    this.resultReported = false;
  }

  private playPlayerMove(index: number): void {
    if (
      !this.started
      || this.paused
      || this.state.phase !== "active"
      || this.state.turn !== "player"
    ) {
      return;
    }

    const nextState = playTicTacToePlayerMove(
      this.state,
      index,
    );

    if (nextState === this.state) {
      return;
    }

    this.audio.unlock();
    this.audio.playPlayerMove();
    this.state = nextState;
    this.render();

    if (this.state.phase !== "active") {
      this.reportResult();
      return;
    }

    this.scheduleCpuMove();
  }

  private scheduleCpuMove(): void {
    this.clearCpuTimer();

    this.cpuTimer = window.setTimeout(
      () => {
        this.cpuTimer = null;

        if (
          this.paused
          || this.state.phase !== "active"
          || this.state.turn !== "cpu"
        ) {
          return;
        }

        this.state = playTicTacToeCpuMove(
          this.state,
        );

        this.audio.playCpuMove();
        this.render();

        if (this.state.phase !== "active") {
          this.reportResult();
        } else {
          this.focusFirstOpenCell();
        }
      },
      CPU_DELAY_MS,
    );
  }

  private reportResult(): void {
    if (this.resultReported) {
      return;
    }

    this.resultReported = true;

    if (this.state.phase === "player-won") {
      this.audio.playWin();
    } else {
      this.audio.playLoss();
    }

    this.resultTimer = window.setTimeout(
      () => {
        this.resultTimer = null;

        if (this.state.phase === "player-won") {
          this.completeStage?.();
        } else {
          this.failStage?.();
        }
      },
      RESULT_DELAY_MS,
    );
  }

  private render(): void {
    if (
      this.status === null
      || this.board === null
      || this.restartButton === null
    ) {
      return;
    }

    this.status.textContent =
      this.paused
        ? "PAUSED"
        : getTicTacToeStatus(this.state);

    this.board.dataset.turn = this.state.turn;
    this.board.dataset.phase = this.state.phase;

    const boardDisabled = (
      !this.started
      || this.paused
      || this.state.phase !== "active"
      || this.state.turn !== "player"
    );

    for (
      let index = 0;
      index < this.cells.length;
      index += 1
    ) {
      const cellButton = this.cells[index];

      if (cellButton === undefined) {
        continue;
      }

      const cell = this.state.board[index] ?? null;

      cellButton.dataset.mark = cell ?? "empty";
      cellButton.dataset.winning =
        this.state.winningLine?.includes(index)
          ? "true"
          : "false";

      cellButton.disabled = (
        boardDisabled
        || cell !== null
      );

      cellButton.setAttribute(
        "aria-label",
        getCellLabel(index, cell),
      );
    }

    this.restartButton.hidden =
      this.state.phase === "active";
  }

  private focusFirstOpenCell(): void {
    if (
      !this.started
      || this.paused
      || this.state.phase !== "active"
      || this.state.turn !== "player"
    ) {
      return;
    }

    const openIndex = this.state.board.findIndex(
      (cell) => cell === null,
    );

    if (openIndex < 0) {
      return;
    }

    this.cells[openIndex]?.focus({
      preventScroll: true,
    });
  }

  private clearCpuTimer(): void {
    if (this.cpuTimer === null) {
      return;
    }

    window.clearTimeout(this.cpuTimer);
    this.cpuTimer = null;
  }

  private clearTimers(): void {
    this.clearCpuTimer();

    if (this.resultTimer !== null) {
      window.clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }
  }

  private readonly handleBoardClick = (
    event: MouseEvent,
  ): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest(
      ".tic-tac-toe-stage__cell",
    );

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const index = Number(button.dataset.index);

    this.playPlayerMove(index);
  };

  private readonly handleRestartClick = (): void => {
    this.restart();
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (event.code === "KeyR") {
      event.preventDefault();
      this.restart();
      return;
    }

    const digit = (
      event.code.startsWith("Digit")
        ? event.code.slice(5)
        : event.code.startsWith("Numpad")
          ? event.code.slice(6)
          : ""
    );

    const number = Number(digit);

    if (
      !Number.isInteger(number)
      || number < 1
      || number > 9
    ) {
      return;
    }

    event.preventDefault();
    this.playPlayerMove(number - 1);
  };
}

export function createTowerClimbStage(): Stage {
  return new TowerClimbStage();
}
