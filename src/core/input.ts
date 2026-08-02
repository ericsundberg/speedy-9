import { normalizeVector } from './geometry';
import type { Vec2 } from './geometry';

export type InputEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

export interface InputManagerOptions {
  readonly preventDefaultCodes?: readonly string[];
}

export interface PointerSnapshot {
  readonly clientPosition: Vec2;
  readonly primaryDown: boolean;
}

const DEFAULT_PREVENTED_CODES: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
];

const LEFT_CODES: readonly string[] = [
  'KeyA',
  'ArrowLeft',
];

const RIGHT_CODES: readonly string[] = [
  'KeyD',
  'ArrowRight',
];

const UP_CODES: readonly string[] = [
  'KeyW',
  'ArrowUp',
];

const DOWN_CODES: readonly string[] = [
  'KeyS',
  'ArrowDown',
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (target === null) {
    return false;
  }

  const candidate = target as {
    readonly tagName?: unknown;
    readonly isContentEditable?: unknown;
  };

  if (candidate.isContentEditable === true) {
    return true;
  }

  if (typeof candidate.tagName !== 'string') {
    return false;
  }

  const tagName = candidate.tagName.toUpperCase();

  return (
    tagName === 'INPUT'
    || tagName === 'TEXTAREA'
    || tagName === 'SELECT'
  );
}

export class InputManager {
  private readonly target: InputEventTarget;
  private readonly preventedCodes: ReadonlySet<string>;
  private readonly keysDown = new Set<string>();
  private readonly keysPressed = new Set<string>();
  private readonly keysReleased = new Set<string>();

  private captureEnabled = true;
  private pointerClientPosition: Vec2 = {
    x: 0,
    y: 0,
  };
  private primaryPointerDown = false;

  public constructor(
    target: InputEventTarget = window,
    options: InputManagerOptions = {},
  ) {
    this.target = target;
    this.preventedCodes = new Set(
      options.preventDefaultCodes ?? DEFAULT_PREVENTED_CODES,
    );

    this.target.addEventListener(
      'keydown',
      this.handleKeyDown,
    );
    this.target.addEventListener(
      'keyup',
      this.handleKeyUp,
    );
    this.target.addEventListener(
      'pointermove',
      this.handlePointerMove,
    );
    this.target.addEventListener(
      'pointerdown',
      this.handlePointerDown,
    );
    this.target.addEventListener(
      'pointerup',
      this.handlePointerUp,
    );
    this.target.addEventListener(
      'pointercancel',
      this.handlePointerCancel,
    );
    this.target.addEventListener(
      'blur',
      this.handleBlur,
    );
  }

  public setCaptureEnabled(enabled: boolean): void {
    this.captureEnabled = enabled;
  }

  public isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  public wasKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  public wasKeyReleased(code: string): boolean {
    return this.keysReleased.has(code);
  }

  public consumeKeyPress(code: string): boolean {
    if (!this.keysPressed.has(code)) {
      return false;
    }

    this.keysPressed.delete(code);
    return true;
  }

  public getMovementVector(): Vec2 {
    const horizontal =
      Number(this.isAnyKeyDown(RIGHT_CODES))
      - Number(this.isAnyKeyDown(LEFT_CODES));

    const vertical =
      Number(this.isAnyKeyDown(DOWN_CODES))
      - Number(this.isAnyKeyDown(UP_CODES));

    return normalizeVector({
      x: horizontal,
      y: vertical,
    });
  }

  public getPointerSnapshot(): PointerSnapshot {
    return {
      clientPosition: {
        x: this.pointerClientPosition.x,
        y: this.pointerClientPosition.y,
      },
      primaryDown: this.primaryPointerDown,
    };
  }

  public endFrame(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
  }

  public reset(): void {
    this.keysDown.clear();
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.primaryPointerDown = false;
  }

  public destroy(): void {
    this.target.removeEventListener(
      'keydown',
      this.handleKeyDown,
    );
    this.target.removeEventListener(
      'keyup',
      this.handleKeyUp,
    );
    this.target.removeEventListener(
      'pointermove',
      this.handlePointerMove,
    );
    this.target.removeEventListener(
      'pointerdown',
      this.handlePointerDown,
    );
    this.target.removeEventListener(
      'pointerup',
      this.handlePointerUp,
    );
    this.target.removeEventListener(
      'pointercancel',
      this.handlePointerCancel,
    );
    this.target.removeEventListener(
      'blur',
      this.handleBlur,
    );

    this.reset();
  }

  private isAnyKeyDown(codes: readonly string[]): boolean {
    return codes.some((code) => this.keysDown.has(code));
  }

  private updatePointerPosition(event: PointerEvent): void {
    this.pointerClientPosition = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  private readonly handleKeyDown: EventListener = (
    event: Event,
  ): void => {
    const keyboardEvent = event as KeyboardEvent;

    if (isEditableTarget(keyboardEvent.target)) {
      return;
    }

    if (
      this.captureEnabled
      && this.preventedCodes.has(keyboardEvent.code)
    ) {
      keyboardEvent.preventDefault();
    }

    if (!this.keysDown.has(keyboardEvent.code)) {
      this.keysPressed.add(keyboardEvent.code);
    }

    this.keysDown.add(keyboardEvent.code);
  };

  private readonly handleKeyUp: EventListener = (
    event: Event,
  ): void => {
    const keyboardEvent = event as KeyboardEvent;

    if (
      this.captureEnabled
      && this.preventedCodes.has(keyboardEvent.code)
      && !isEditableTarget(keyboardEvent.target)
    ) {
      keyboardEvent.preventDefault();
    }

    if (this.keysDown.delete(keyboardEvent.code)) {
      this.keysReleased.add(keyboardEvent.code);
    }
  };

  private readonly handlePointerMove: EventListener = (
    event: Event,
  ): void => {
    this.updatePointerPosition(event as PointerEvent);
  };

  private readonly handlePointerDown: EventListener = (
    event: Event,
  ): void => {
    const pointerEvent = event as PointerEvent;

    this.updatePointerPosition(pointerEvent);

    if (pointerEvent.button === 0) {
      this.primaryPointerDown = true;
    }
  };

  private readonly handlePointerUp: EventListener = (
    event: Event,
  ): void => {
    const pointerEvent = event as PointerEvent;

    this.updatePointerPosition(pointerEvent);

    if (pointerEvent.button === 0) {
      this.primaryPointerDown = false;
    }
  };

  private readonly handlePointerCancel: EventListener = (): void => {
    this.primaryPointerDown = false;
  };

  private readonly handleBlur: EventListener = (): void => {
    this.reset();
  };
}
