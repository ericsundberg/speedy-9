[1mdiff --git a/src/app/app-controller.ts b/src/app/app-controller.ts[m
[1mindex 9d50684..0c4ab79 100644[m
[1m--- a/src/app/app-controller.ts[m
[1m+++ b/src/app/app-controller.ts[m
[36m@@ -1,37 +1,198 @@[m
[31m-import { TitleScene } from '../scenes/title-scene';[m
[31m-import { SceneRouter } from './scene-router';[m
[32m+[m[32mimport { PerformanceClock } from "../core/clock";[m
[32m+[m[32mimport type {[m
[32m+[m[32m  StageId,[m
[32m+[m[32m} from "../game/stage-registry";[m
[32m+[m[32mimport { HudController } from "../hud/hud-controller";[m
[32m+[m[32mimport { RunManager } from "../run/run-manager";[m
[32m+[m[32mimport type {[m
[32m+[m[32m  CompletedRun,[m
[32m+[m[32m} from "../run/run-types";[m
[32m+[m[32mimport { HubScene } from "../scenes/hub-scene";[m
[32m+[m[32mimport { ResultsScene } from "../scenes/results-scene";[m
[32m+[m[32mimport { StageHostScene } from "../scenes/stage-host-scene";[m
[32m+[m[32mimport { TitleScene } from "../scenes/title-scene";[m
[32m+[m[32mimport { createStage } from "../stages/stage-factory";[m
[32m+[m[32mimport { SceneRouter } from "./scene-router";[m
 [m
 interface AppControllerElements {[m
   readonly sceneRoot: HTMLElement;[m
[31m-  readonly runStatus: HTMLElement;[m
[32m+[m[32m  readonly hudRoot: HTMLElement;[m
 }[m
 [m
 export class AppController {[m
[31m-  private readonly runStatus: HTMLElement;[m
[32m+[m[32m  private readonly clock = new PerformanceClock();[m
[32m+[m[32m  private readonly runManager = new RunManager(this.clock);[m
   private readonly router: SceneRouter;[m
[32m+[m[32m  private readonly hud: HudController;[m
[32m+[m
[32m+[m[32m  private animationFrameId: number | null = null;[m
[32m+[m[32m  private unsubscribeRunState: (() => void) | null = null;[m
[32m+[m[32m  private started = false;[m
 [m
   public constructor(elements: AppControllerElements) {[m
[31m-    this.runStatus = elements.runStatus;[m
     this.router = new SceneRouter(elements.sceneRoot);[m
[32m+[m[32m    this.hud = new HudController(elements.hudRoot);[m
   }[m
 [m
   public start(): void {[m
[31m-    this.runStatus.textContent = 'READY';[m
[31m-    this.runStatus.classList.remove('hud-status__value--pending');[m
[32m+[m[32m    if (this.started) {[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.started = true;[m
[32m+[m
[32m+[m[32m    this.unsubscribeRunState = this.runManager.subscribe([m
[32m+[m[32m      (state) => {[m
[32m+[m[32m        this.hud.render([m
[32m+[m[32m          state,[m
[32m+[m[32m          this.runManager.getElapsedTimeMs(),[m
[32m+[m[32m        );[m
[32m+[m[32m      },[m
[32m+[m[32m    );[m
 [m
[32m+[m[32m    this.showTitle();[m
[32m+[m[32m    this.scheduleAnimationFrame();[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  public destroy(): void {[m
[32m+[m[32m    this.started = false;[m
[32m+[m
[32m+[m[32m    if (this.animationFrameId !== null) {[m
[32m+[m[32m      cancelAnimationFrame(this.animationFrameId);[m
[32m+[m[32m      this.animationFrameId = null;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.unsubscribeRunState?.();[m
[32m+[m[32m    this.unsubscribeRunState = null;[m
[32m+[m[32m    this.router.destroy();[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  private showTitle(): void {[m
     this.router.navigate([m
       new TitleScene({[m
[31m-        onBeginRun: () => {[m
[31m-          this.runStatus.textContent = 'RUN SYSTEM PENDING';[m
[31m-          this.runStatus.classList.add([m
[31m-            'hud-status__value--pending',[m
[31m-          );[m
[31m-        },[m
[32m+[m[32m        onBeginRun: this.handleBeginRun,[m
       }),[m
     );[m
   }[m
 [m
[31m-  public destroy(): void {[m
[31m-    this.router.destroy();[m
[32m+[m[32m  private showHub(): void {[m
[32m+[m[32m    const state = this.runManager.getState();[m
[32m+[m
[32m+[m[32m    if (state.kind !== "hub") {[m
[32m+[m[32m      throw new Error([m
[32m+[m[32m        `Expected hub state, received ${state.kind}.`,[m
[32m+[m[32m      );[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.router.navigate([m
[32m+[m[32m      new HubScene({[m
[32m+[m[32m        run: state.run,[m
[32m+[m[32m        onSelect: this.handleStageSelect,[m
[32m+[m[32m      }),[m
[32m+[m[32m    );[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  private showResults(result: CompletedRun): void {[m
[32m+[m[32m    this.router.navigate([m
[32m+[m[32m      new ResultsScene({[m
[32m+[m[32m        result,[m
[32m+[m[32m        onNewRun: this.handleNewRun,[m
[32m+[m[32m      }),[m
[32m+[m[32m    );[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  private readonly handleBeginRun = (): void => {[m
[32m+[m[32m    this.runManager.beginRun();[m
[32m+[m[32m    this.showHub();[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private readonly handleStageSelect = ([m
[32m+[m[32m    stageId: StageId,[m
[32m+[m[32m  ): void => {[m
[32m+[m[32m    if (!this.runManager.isStageAvailable(stageId)) {[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.runManager.enterStage(stageId);[m
[32m+[m
[32m+[m[32m    const stageSeed = this.runManager.getStageSeed(stageId);[m
[32m+[m
[32m+[m[32m    if (stageSeed === null) {[m
[32m+[m[32m      throw new Error(`Missing stage seed for ${stageId}.`);[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.router.navigate([m
[32m+[m[32m      new StageHostScene([m
[32m+[m[32m        createStage(stageId),[m
[32m+[m[32m        {[m
[32m+[m[32m          stageSeed,[m
[32m+[m[32m          complete: this.handleStageComplete,[m
[32m+[m[32m          exitStage: this.handleStageExit,[m
[32m+[m[32m          addPenalty: ([m
[32m+[m[32m            milliseconds: number,[m
[32m+[m[32m            reason: string,[m
[32m+[m[32m          ) => {[m
[32m+[m[32m            this.runManager.addPenalty([m
[32m+[m[32m              milliseconds,[m
[32m+[m[32m              reason,[m
[32m+[m[32m            );[m
[32m+[m[32m          },[m
[32m+[m[32m        },[m
[32m+[m[32m      ),[m
[32m+[m[32m    );[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private readonly handleStageExit = (): void => {[m
[32m+[m[32m    this.runManager.exitStage();[m
[32m+[m[32m    this.showHub();[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private readonly handleStageComplete = (): void => {[m
[32m+[m[32m    this.runManager.completeStage();[m
[32m+[m
[32m+[m[32m    const state = this.runManager.getState();[m
[32m+[m
[32m+[m[32m    if (state.kind === "hub") {[m
[32m+[m[32m      this.showHub();[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    if (state.kind === "complete") {[m
[32m+[m[32m      this.showResults(state.result);[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    throw new Error([m
[32m+[m[32m      `Unexpected state after stage completion: ${state.kind}.`,[m
[32m+[m[32m    );[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private readonly handleNewRun = (): void => {[m
[32m+[m[32m    this.runManager.restartRun();[m
[32m+[m[32m    this.showHub();[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private readonly renderFrame = (): void => {[m
[32m+[m[32m    this.animationFrameId = null;[m
[32m+[m
[32m+[m[32m    this.hud.render([m
[32m+[m[32m      this.runManager.getState(),[m
[32m+[m[32m      this.runManager.getElapsedTimeMs(),[m
[32m+[m[32m    );[m
[32m+[m
[32m+[m[32m    this.scheduleAnimationFrame();[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  private scheduleAnimationFrame(): void {[m
[32m+[m[32m    if ([m
[32m+[m[32m      !this.started[m
[32m+[m[32m      || this.animationFrameId !== null[m
[32m+[m[32m    ) {[m
[32m+[m[32m      return;[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    this.animationFrameId = requestAnimationFrame([m
[32m+[m[32m      this.renderFrame,[m
[32m+[m[32m    );[m
   }[m
 }[m
[1mdiff --git a/src/styles/index.css b/src/styles/index.css[m
[1mindex 6f3de48..f1b2a9d 100644[m
[1m--- a/src/styles/index.css[m
[1m+++ b/src/styles/index.css[m
[36m@@ -1,4 +1,14 @@[m
[31m-@import './base.css';[m
[31m-@import './layout.css';[m
[31m-@import './title.css';[m
[31m-@import './responsive.css';[m
[32m+[m[32m@import "./fonts.css";[m
[32m+[m[32m@import "./base.css";[m
[32m+[m[32m@import "./layout.css";[m
[32m+[m[32m@import "./console.css";[m
[32m+[m[32m@import "./hud-runtime.css";[m
[32m+[m[32m@import "./title.css";[m
[32m+[m[32m@import "./hub.css";[m
[32m+[m[32m@import "./hub-interaction.css";[m
[32m+[m[32m@import "./placeholder-stage.css";[m
[32m+[m[32m@import "./pong.css";[m
[32m+[m[32m@import "./results.css";[m
[32m+[m[32m@import "./responsive.css";[m
[32m+[m[32m@import "./gamespace.css";[m
[32m+[m[32m@import "./pause-overlay.css";[m
