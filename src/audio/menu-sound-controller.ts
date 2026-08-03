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
  private titleBootPending = false;
  private suppressSelectUntilMs = 0;

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
      "pointerdown",
      this.handlePointerDown,
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

  public startStageSelectMusic(
    delaySeconds = 0.04,
  ): void {
    if (!this.started) {
      return;
    }

    this.audio.playStageSelectMusic(delaySeconds);
  }

  public startRunCompleteMusic(
    delaySeconds = 0.08,
  ): void {
    if (!this.started) {
      return;
    }

    this.audio.playRunCompleteMusic(delaySeconds);
  }

  public stopMusic(): void {
    this.audio.stopMusic();
  }

  public queueTitleBoot(): void {
    if (!this.started) {
      return;
    }

    this.titleBootPending = true;
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
      "pointerdown",
      this.handlePointerDown,
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
    this.titleBootPending = false;
    this.suppressSelectUntilMs = 0;
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

  private playPendingTitleBoot(): boolean {
    if (
      !this.titleBootPending
      || this.root.querySelector(".title-scene") === null
    ) {
      return false;
    }

    this.titleBootPending = false;
    this.suppressSelectUntilMs =
      performance.now()
      + KEYBOARD_CLICK_SUPPRESSION_MS;

    this.audio.playBoot();
    return true;
  }

  private readonly handlePointerDown = (): void => {
    this.playPendingTitleBoot();
  };

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

    if (nowMs <= this.suppressSelectUntilMs) {
      this.suppressSelectUntilMs = 0;
      return;
    }

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
    if (this.playPendingTitleBoot()) {
      return;
    }

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
