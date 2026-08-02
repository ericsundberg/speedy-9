import { TitleScene } from '../scenes/title-scene';
import { SceneRouter } from './scene-router';

interface AppControllerElements {
  readonly sceneRoot: HTMLElement;
  readonly runStatus: HTMLElement;
}

export class AppController {
  private readonly runStatus: HTMLElement;
  private readonly router: SceneRouter;

  public constructor(elements: AppControllerElements) {
    this.runStatus = elements.runStatus;
    this.router = new SceneRouter(elements.sceneRoot);
  }

  public start(): void {
    this.runStatus.textContent = 'READY';
    this.runStatus.classList.remove('hud-status__value--pending');

    this.router.navigate(
      new TitleScene({
        onBeginRun: () => {
          this.runStatus.textContent = 'RUN SYSTEM PENDING';
          this.runStatus.classList.add(
            'hud-status__value--pending',
          );
        },
      }),
    );
  }

  public destroy(): void {
    this.router.destroy();
  }
}
