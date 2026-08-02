import { describe, expect, it } from 'vitest';
import {
  deriveSeed,
  Mulberry32Random,
  randomIntInclusive,
  shuffled,
} from './random';
import type { RandomSource } from './random';

class SequenceRandom implements RandomSource {
  private index = 0;
  private readonly values: readonly number[];

  public constructor(values: readonly number[]) {
    this.values = values;
  }

  public next(): number {
    const value = this.values[this.index];

    if (value === undefined) {
      throw new Error('The random sequence was exhausted.');
    }

    this.index += 1;
    return value;
  }
}

describe('seeded randomness', () => {
  it('produces the same sequence from the same seed', () => {
    const first = new Mulberry32Random(12_345);
    const second = new Mulberry32Random(12_345);

    const firstSequence = Array.from(
      { length: 8 },
      () => first.next(),
    );

    const secondSequence = Array.from(
      { length: 8 },
      () => second.next(),
    );

    expect(firstSequence).toEqual(secondSequence);
  });

  it('derives stable namespaced stage seeds', () => {
    expect(deriveSeed(42, 'deadeye')).toBe(
      deriveSeed(42, 'deadeye'),
    );

    expect(deriveSeed(42, 'deadeye')).not.toBe(
      deriveSeed(42, 'memory-burst'),
    );
  });

  it('maps random samples to inclusive integer bounds', () => {
    expect(
      randomIntInclusive(
        new SequenceRandom([0]),
        2,
        12,
      ),
    ).toBe(2);

    expect(
      randomIntInclusive(
        new SequenceRandom([0.999_999]),
        2,
        12,
      ),
    ).toBe(12);
  });

  it('performs a deterministic Fisher-Yates shuffle', () => {
    const random = new SequenceRandom([
      0.5,
      0.25,
      0,
    ]);

    expect(shuffled([1, 2, 3, 4], random)).toEqual([
      2,
      4,
      1,
      3,
    ]);
  });

  it('rejects invalid random integer ranges', () => {
    const random = new SequenceRandom([0.5]);

    expect(() => randomIntInclusive(random, 5, 4)).toThrow(
      RangeError,
    );
  });
});
