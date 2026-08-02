export interface Scene {
  mount(root: HTMLElement): void;
  destroy(): void;
}
