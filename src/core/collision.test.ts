import { describe, expect, it } from 'vitest';
import {
  circleIntersectsRect,
  circlesOverlap,
  pointInRect,
  rectsOverlap,
} from './collision';

describe('collision helpers', () => {
  it('detects overlapping rectangles', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it('does not count touching rectangle edges as overlap', () => {
    expect(
      rectsOverlap(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 10, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it('accepts points on a rectangle boundary', () => {
    expect(
      pointInRect(
        { x: 10, y: 10 },
        { x: 0, y: 0, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it('rejects points outside a rectangle', () => {
    expect(
      pointInRect(
        { x: 11, y: 5 },
        { x: 0, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });

  it('detects overlapping and touching circles', () => {
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 5 },
        { x: 10, y: 0, radius: 5 },
      ),
    ).toBe(true);
  });

  it('rejects separated circles', () => {
    expect(
      circlesOverlap(
        { x: 0, y: 0, radius: 5 },
        { x: 11, y: 0, radius: 5 },
      ),
    ).toBe(false);
  });

  it('detects circle-to-rectangle contact', () => {
    expect(
      circleIntersectsRect(
        { x: 12, y: 5, radius: 2 },
        { x: 0, y: 0, width: 10, height: 10 },
      ),
    ).toBe(true);
  });

  it('rejects a circle outside a rectangle', () => {
    expect(
      circleIntersectsRect(
        { x: 13, y: 5, radius: 2 },
        { x: 0, y: 0, width: 10, height: 10 },
      ),
    ).toBe(false);
  });
});
