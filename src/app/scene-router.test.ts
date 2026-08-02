import { describe, expect, it, vi } from 'vitest';
import type { Scene } from './scene';
import { SceneRouter } from './scene-router';

function createRoot(): HTMLElement {
  return {
    replaceChildren: vi.fn(),
  } as unknown as HTMLElement;
}

function createScene(): Scene {
  return {
    mount: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('SceneRouter', () => {
  it('mounts a scene using navigate', () => {
    const root = createRoot();
    const scene = createScene();
    const router = new SceneRouter(root);

    router.navigate(scene);

    expect(root.replaceChildren).toHaveBeenCalledOnce();
    expect(scene.mount).toHaveBeenCalledWith(root);
    expect(scene.destroy).not.toHaveBeenCalled();
  });

  it('destroys the previous scene before mounting another', () => {
    const root = createRoot();
    const firstScene = createScene();
    const secondScene = createScene();
    const router = new SceneRouter(root);

    router.navigate(firstScene);
    router.navigate(secondScene);

    expect(firstScene.destroy).toHaveBeenCalledOnce();
    expect(secondScene.mount).toHaveBeenCalledWith(root);
    expect(root.replaceChildren).toHaveBeenCalledTimes(2);
  });

  it('destroys the active scene and clears the root', () => {
    const root = createRoot();
    const scene = createScene();
    const router = new SceneRouter(root);

    router.navigate(scene);
    router.destroy();

    expect(scene.destroy).toHaveBeenCalledOnce();
    expect(root.replaceChildren).toHaveBeenCalledTimes(2);
  });

  it('cleans up when a scene fails during mounting', () => {
    const root = createRoot();
    const error = new Error("Mount failed");
    const scene: Scene = {
      mount: vi.fn(() => {
        throw error;
      }),
      destroy: vi.fn(),
    };
    const router = new SceneRouter(root);

    expect(() => router.navigate(scene)).toThrow(error);
    expect(scene.destroy).toHaveBeenCalledOnce();
    expect(root.replaceChildren).toHaveBeenCalledTimes(2);
  });
});
