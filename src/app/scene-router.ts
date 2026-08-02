import type { Scene } from './scene';

export class SceneRouter {
  private readonly root: HTMLElement;
  private currentScene: Scene | null = null;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public navigate(scene: Scene): void {
    const previousScene = this.currentScene;

    this.currentScene = null;
    previousScene?.destroy();
    this.root.replaceChildren();

    try {
      scene.mount(this.root);
      this.currentScene = scene;
    } catch (error: unknown) {
      scene.destroy();
      this.root.replaceChildren();
      throw error;
    }
  }

  public destroy(): void {
    const activeScene = this.currentScene;

    this.currentScene = null;
    activeScene?.destroy();
    this.root.replaceChildren();
  }
}
