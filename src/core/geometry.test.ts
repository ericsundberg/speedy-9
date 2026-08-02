import { describe, expect, it } from 'vitest';
import {
  clamp,
  distanceSquared,
  moveToward,
  normalizeVector,
} from './geometry';

describe('geometry helpers', () => {
  it('clamps values to the supplied range', () => {
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(6, 0, 10)).toBe(6);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('rejects an inverted clamp range', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });

  it('normalizes a non-zero vector', () => {
    const normalized = normalizeVector({
      x: 3,
      y: 4,
    });

    expect(normalized.x).toBeCloseTo(0.6);
    expect(normalized.y).toBeCloseTo(0.8);
    expect(Math.hypot(normalized.x, normalized.y)).toBeCloseTo(1);
  });

  it('returns a stable zero vector', () => {
    expect(normalizeVector({ x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('calculates squared distance without a square root', () => {
    expect(
      distanceSquared(
        { x: 1, y: 2 },
        { x: 4, y: 6 },
      ),
    ).toBe(25);
  });

  it('moves toward a target by the requested distance', () => {
    const result = moveToward(
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      2,
    );

    expect(result.x).toBeCloseTo(1.2);
    expect(result.y).toBeCloseTo(1.6);
  });

  it('snaps to a target when it is within range', () => {
    expect(
      moveToward(
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        10,
      ),
    ).toEqual({
      x: 2,
      y: 2,
    });
  });

  it('rejects a negative movement distance', () => {
    expect(() =>
      moveToward(
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        -1,
      ),
    ).toThrow(RangeError);
  });
});
