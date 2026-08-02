export interface RandomSource {
  next(): number;
}

const UINT32_RANGE = 4_294_967_296;

export class Mulberry32Random implements RandomSource {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;

    let value = this.state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61,
    );

    return (
      (value ^ (value >>> 14)) >>> 0
    ) / UINT32_RANGE;
  }
}

export function deriveSeed(
  baseSeed: number,
  namespace: string,
): number {
  let hash = (baseSeed >>> 0) ^ 0x811c9dc5;

  for (let index = 0; index < namespace.length; index += 1) {
    hash ^= namespace.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function randomIntInclusive(
  random: RandomSource,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
    throw new RangeError('Random integer bounds must be integers.');
  }

  if (minimum > maximum) {
    throw new RangeError('minimum cannot be greater than maximum.');
  }

  const sample = random.next();

  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('Random samples must be in the range [0, 1).');
  }

  const possibleValues = maximum - minimum + 1;

  return minimum + Math.floor(sample * possibleValues);
}

export function shuffled<TValue>(
  values: readonly TValue[],
  random: RandomSource,
): TValue[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIntInclusive(random, 0, index);
    const currentValue = result[index] as TValue;
    const swapValue = result[swapIndex] as TValue;

    result[index] = swapValue;
    result[swapIndex] = currentValue;
  }

  return result;
}
