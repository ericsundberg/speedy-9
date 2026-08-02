export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Circle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (minimum > maximum) {
    throw new RangeError('minimum cannot be greater than maximum.');
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeVector(vector: Vec2): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.y);

  if (magnitude === 0) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

export function distanceSquared(a: Vec2, b: Vec2): number {
  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;

  return deltaX * deltaX + deltaY * deltaY;
}

export function moveToward(
  current: Vec2,
  target: Vec2,
  maxDelta: number,
): Vec2 {
  if (!Number.isFinite(maxDelta) || maxDelta < 0) {
    throw new RangeError('maxDelta must be finite and non-negative.');
  }

  const deltaX = target.x - current.x;
  const deltaY = target.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance === 0 || distance <= maxDelta) {
    return {
      x: target.x,
      y: target.y,
    };
  }

  const scale = maxDelta / distance;

  return {
    x: current.x + deltaX * scale,
    y: current.y + deltaY * scale,
  };
}
