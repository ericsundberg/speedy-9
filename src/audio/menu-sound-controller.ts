import {
  MenuAudio,
} from "./menu-audio";

const HUB_MOVEMENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

const NAVIGATION_KEYS = new Set([
  ...HUB_MOVEMENT_KEYS,
  "Tab",
]);

const CONFIRM_KEYS = new Set([
  "Enter",
  "Space",
]);

const INTERACTIVE_SELECTOR = [
  "button:not(:disabled)",
  "summary",
  `[role="button"]:not([aria-disabled="true"])`,
].join(", ");

const KEYBOARD_CLICK_SUPPRESSION_MS = 500;

export class MenuSoundController {
  private readonly root: HTMLElement;
  private readonly audio = new MenuAudio();

  private started = false;
  private keyboardMovePending = false;

  private pointerInteractive:
    HTMLElement | null = null;

  private suppressedClickInteractive:
    HTMLElement | null = null;

  private suppressClickUntilMs = 0;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    window.addEventListener(
      "keydown",
      this.handleKeyDown,
      true,
    );

    this.root.addEventListener(
      "focusin",
      this.handleFocusIn,
    );

    this.root.addEventListener(
      "pointerover",
      this.handlePointerOver,
    );

    this.root.addEventListener(
      "click",
      this.handleClick,
      true,
    );
  }

  public destroy(): void {
    if (!this.started) {
      return;
    }

    this.started = false;

    window.removeEventListener(
      "keydown",
      this.handleKeyDown,
      true,
    );

    this.root.removeEventListener(
      "focusin",
      this.handleFocusIn,
    );

    this.root.removeEventListener(
      "pointerover",
      this.handlePointerOver,
    );

    this.root.removeEventListener(
      "click",
      this.handleClick,
      true,
    );

    this.keyboardMovePending = false;
    this.pointerInteractive = null;
    this.suppressedClickInteractive = null;
    this.suppressClickUntilMs = 0;

    this.audio.destroy();
  }

  private getInteractive(
    target: EventTarget | null,
  ): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    const interactive =
      target.closest<HTMLElement>(
        INTERACTIVE_SELECTOR,
      );

    if (
      interactive === null
      || !this.root.contains(interactive)
    ) {
      return null;
    }

    return interactive;
  }

  private readonly handleFocusIn = (
    event: FocusEvent,
  ): void => {
    if (!this.keyboardMovePending) {
      return;
    }

    const interactive = this.getInteractive(
      event.target,
    );

    if (interactive === null) {
      return;
    }

    this.keyboardMovePending = false;
    this.audio.playMove(true);
  };

  private readonly handlePointerOver = (
    event: PointerEvent,
  ): void => {
    const interactive = this.getInteractive(
      event.target,
    );

    if (interactive === this.pointerInteractive) {
      return;
    }

    this.pointerInteractive = interactive;

    if (interactive !== null) {
      this.audio.playMove(false);
    }
  };

  private readonly handleClick = (
    event: MouseEvent,
  ): void => {
    const interactive = this.getInteractive(
      event.target,
    );

    if (interactive === null) {
      return;
    }

    const nowMs = performance.now();

    if (
      interactive
        === this.suppressedClickInteractive
      && nowMs <= this.suppressClickUntilMs
    ) {
      this.suppressedClickInteractive = null;
      this.suppressClickUntilMs = 0;
      return;
    }

    this.audio.playSelect();
  };

  private readonly handleKeyDown = (
    event: KeyboardEvent,
  ): void => {
    if (NAVIGATION_KEYS.has(event.code)) {
      const isHubGridMovement =
        HUB_MOVEMENT_KEYS.has(event.code)
        && this.root.querySelector(".hub-scene") !== null;

      /*
       * The hub changes a logical selected index rather than
       * transferring DOM focus, so focusin cannot announce it.
       */
      if (isHubGridMovement) {
        this.keyboardMovePending = false;
        this.audio.playMove(true);
        return;
      }

      if (!this.root.contains(event.target as Node)) {
        return;
      }

      this.keyboardMovePending = true;

      queueMicrotask(() => {
        this.keyboardMovePending = false;
      });

      return;
    }

    if (
      event.repeat
      || !CONFIRM_KEYS.has(event.code)
    ) {
      return;
    }

    const interactive = this.getInteractive(
      event.target,
    );

    if (interactive === null) {
      return;
    }

    this.audio.playSelect();

    this.suppressedClickInteractive =
      interactive;

    this.suppressClickUntilMs =
      performance.now()
      + KEYBOARD_CLICK_SUPPRESSION_MS;
  };
}
