import { describe, expect, it } from 'vitest';
import { InputManager } from './input';

function createKeyboardEvent(
  type: string,
  code: string,
  repeat = false,
): Event {
  const event = new Event(type, {
    cancelable: true,
  });

  Object.defineProperties(event, {
    code: {
      value: code,
    },
    repeat: {
      value: repeat,
    },
  });

  return event;
}

function createPointerEvent(
  type: string,
  clientX: number,
  clientY: number,
  button: number,
): Event {
  const event = new Event(type, {
    cancelable: true,
  });

  Object.defineProperties(event, {
    clientX: {
      value: clientX,
    },
    clientY: {
      value: clientY,
    },
    button: {
      value: button,
    },
  });

  return event;
}

describe('InputManager', () => {
  it('tracks held and newly pressed keys', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyR'),
    );

    expect(input.isKeyDown('KeyR')).toBe(true);
    expect(input.wasKeyPressed('KeyR')).toBe(true);
    expect(input.consumeKeyPress('KeyR')).toBe(true);
    expect(input.consumeKeyPress('KeyR')).toBe(false);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyR', true),
    );

    expect(input.wasKeyPressed('KeyR')).toBe(false);
    input.destroy();
  });

  it('normalizes diagonal movement input', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyD'),
    );
    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyW'),
    );

    const movement = input.getMovementVector();

    expect(movement.x).toBeCloseTo(Math.SQRT1_2);
    expect(movement.y).toBeCloseTo(-Math.SQRT1_2);
    expect(Math.hypot(movement.x, movement.y)).toBeCloseTo(1);
    input.destroy();
  });

  it('tracks released keys', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'Escape'),
    );
    target.dispatchEvent(
      createKeyboardEvent('keyup', 'Escape'),
    );

    expect(input.isKeyDown('Escape')).toBe(false);
    expect(input.wasKeyReleased('Escape')).toBe(true);
    input.destroy();
  });

  it('prevents configured browser-default keys while capturing', () => {
    const target = new EventTarget();
    const input = new InputManager(target, {
      preventDefaultCodes: [
        'ArrowUp',
      ],
    });

    const capturedEvent = createKeyboardEvent(
      'keydown',
      'ArrowUp',
    );

    expect(target.dispatchEvent(capturedEvent)).toBe(false);

    target.dispatchEvent(
      createKeyboardEvent('keyup', 'ArrowUp'),
    );

    input.setCaptureEnabled(false);

    const uncapturedEvent = createKeyboardEvent(
      'keydown',
      'ArrowUp',
    );

    expect(target.dispatchEvent(uncapturedEvent)).toBe(true);
    input.destroy();
  });

  it('tracks pointer position and primary-button state', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createPointerEvent('pointermove', 125, 240, -1),
    );

    expect(input.getPointerSnapshot()).toEqual({
      clientPosition: {
        x: 125,
        y: 240,
      },
      primaryDown: false,
    });

    target.dispatchEvent(
      createPointerEvent('pointerdown', 130, 245, 0),
    );

    expect(input.getPointerSnapshot()).toEqual({
      clientPosition: {
        x: 130,
        y: 245,
      },
      primaryDown: true,
    });

    target.dispatchEvent(
      createPointerEvent('pointerup', 135, 250, 0),
    );

    expect(input.getPointerSnapshot()).toEqual({
      clientPosition: {
        x: 135,
        y: 250,
      },
      primaryDown: false,
    });
    input.destroy();
  });

  it('clears edge-triggered state at the end of a frame', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyA'),
    );

    input.endFrame();

    expect(input.isKeyDown('KeyA')).toBe(true);
    expect(input.wasKeyPressed('KeyA')).toBe(false);
    expect(input.wasKeyReleased('KeyA')).toBe(false);
    input.destroy();
  });

  it('clears all active input when focus is lost', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyS'),
    );
    target.dispatchEvent(
      createPointerEvent('pointerdown', 10, 20, 0),
    );
    target.dispatchEvent(new Event(
      'blur',
    ));

    expect(input.isKeyDown('KeyS')).toBe(false);
    expect(input.getPointerSnapshot().primaryDown).toBe(false);
    input.destroy();
  });

  it('removes listeners when destroyed', () => {
    const target = new EventTarget();
    const input = new InputManager(target);

    input.destroy();

    target.dispatchEvent(
      createKeyboardEvent('keydown', 'KeyW'),
    );

    expect(input.isKeyDown('KeyW')).toBe(false);
  });
});
