import { describe, expect, it } from 'vitest';
import { calculateElapsedMs } from './clock';

describe('calculateElapsedMs', () => {
  it('adds wall-clock time and explicit penalties', () => {
    expect(calculateElapsedMs(1_000, 1_750, 500)).toBe(1_250);
  });

  it('does not return negative elapsed time', () => {
    expect(calculateElapsedMs(2_000, 1_500)).toBe(0);
  });

  it('rejects non-finite timing values', () => {
    expect(() => calculateElapsedMs(Number.NaN, 1_000)).toThrow(
      RangeError,
    );

    expect(() => calculateElapsedMs(0, Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });

  it('rejects negative penalties', () => {
    expect(() => calculateElapsedMs(0, 1_000, -1)).toThrow(
      RangeError,
    );
  });
});
