import { PerformanceClock } from "../core/clock";
import type {
  StageId,
} from "../game/stage-registry";
import {
  MenuSoundController,
} from "../audio/menu-sound-controller";
import { HudController } from "../hud/hud-controller";
import { RunManager } from "../run/run-manager";
import type {
  CompletedRun,
} from "../run/run-types";
import { HubScene } from "../scenes/hub-scene";
import { ResultsScene } from "../scenes/results-scene";
import { StageHostScene } from "../scenes/stage-host-scene";
import { TitleScene } from "../scenes/title-scene";
import { createStage } from "../stages/stage-factory";
import { SceneRouter } from "./scene-router";

interface AppControllerElements {
  readonly sceneRoot: HTMLElement;
  readonly hudRoot: HTMLElement;
}

export class AppController {
  private readonly clock = new PerformanceClock();
  private readonly runManager = new RunManager(this.clock);
  private readonly router: SceneRouter;
  private readonly hud: HudController;
  private readonly menuSounds: MenuSoundController;

  private animationFrameId: number | null = null;
  private unsubscribeRunState: (() => void) | null = null;
  private started = false;

  public constructor(elements: AppControllerElements) {
    this.router = new SceneRouter(elements.sceneRoot);
    this.hud = new HudController(elements.hudRoot);
    this.menuSounds =
      new MenuSoundController(elements.sceneRoot);
  }

  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.menuSounds.start();

    this.unsubscribeRunState = this.runManager.subscribe(
      (state) => {
        this.hud.render(
          state,
          this.runManager.getElapsedTimeMs(),
        );
      },
    );

    this.showTitle();
    this.scheduleAnimationFrame();
  }

  public destroy(): void {
    this.started = false;
    this.menuSounds.destroy();

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.unsubscribeRunState?.();
    this.unsubscribeRunState = null;
    this.router.destroy();
  }

  private showTitle(): void {
    this.menuSounds.stopMusic();

    this.router.navigate(
      new TitleScene({
        onBeginRun: this.handleBeginRun,
      }),
    );

    this.menuSounds.queueTitleBoot();
  }

  private showHub(
    musicDelaySeconds = 0.04,
  ): void {
    const state = this.runManager.getState();

    if (state.kind !== "hub") {
      throw new Error(
        `Expected hub state, received ${state.kind}.`,
      );
    }

    this.router.navigate(
      new HubScene({
        run: state.run,
        onSelect: this.handleStageSelect,
      }),
    );

    this.menuSounds.startStageSelectMusic(
      musicDelaySeconds,
    );
  }

  private showResults(result: CompletedRun): void {
    this.menuSounds.stopMusic();

    this.router.navigate(
      new ResultsScene({
        result,
        onNewRun: this.handleNewRun,
      }),
    );

    this.menuSounds.startRunCompleteMusic();
  }

  private readonly handleBeginRun = (): void => {
    this.runManager.beginRun();
    this.showHub(0.62);
  };

  private readonly handleStageSelect = (
    stageId: StageId,
  ): void => {
    if (!this.runManager.isStageAvailable(stageId)) {
      return;
    }

    this.menuSounds.stopMusic();
    this.runManager.enterStage(stageId);

    const stageSeed = this.runManager.getStageSeed(stageId);

    if (stageSeed === null) {
      throw new Error(`Missing stage seed for ${stageId}.`);
    }

    this.router.navigate(
      new StageHostScene(
        createStage(stageId),
        {
          stageSeed,
          complete: this.handleStageComplete,
          exitStage: this.handleStageExit,
          addPenalty: (
            milliseconds: number,
            reason: string,
          ) => {
            this.runManager.addPenalty(
              milliseconds,
              reason,
            );
          },
        },
      ),
    );
  };

  private readonly handleStageExit = (): void => {
    this.runManager.exitStage();
    this.showHub();
  };

  private readonly handleStageComplete = (): void => {
    this.runManager.completeStage();

    const state = this.runManager.getState();

    if (state.kind === "hub") {
      this.showHub();
      return;
    }

    if (state.kind === "complete") {
      this.showResults(state.result);
      return;
    }

    throw new Error(
      `Unexpected state after stage completion: ${state.kind}.`,
    );
  };

  private readonly handleNewRun = (): void => {
    this.runManager.restartRun();
    this.showHub();
  };

  private readonly renderFrame = (): void => {
    this.animationFrameId = null;

    this.hud.render(
      this.runManager.getState(),
      this.runManager.getElapsedTimeMs(),
    );

    this.scheduleAnimationFrame();
  };

  private scheduleAnimationFrame(): void {
    if (
      !this.started
      || this.animationFrameId !== null
    ) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(
      this.renderFrame,
    );
  }
}
