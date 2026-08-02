import { describe, expect, it } from 'vitest';
import {
  clientPointToViewBox,
  setSvgAttributes,
} from './svg';

class FakeSvgAttributeTarget {
  public readonly attributes = new Map<string, string>();

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

describe('SVG coordinate helpers', () => {
  it('maps client coordinates into an equally shaped viewBox', () => {
    expect(
      clientPointToViewBox(
        { x: 480, y: 360 },
        { left: 0, top: 0, width: 960, height: 720 },
        { x: 0, y: 0, width: 960, height: 720 },
      ),
    ).toEqual({
      x: 480,
      y: 360,
    });
  });

  it('accounts for horizontal letterboxing', () => {
    expect(
      clientPointToViewBox(
        { x: 500, y: 360 },
        { left: 0, top: 0, width: 1_000, height: 720 },
        { x: 0, y: 0, width: 960, height: 720 },
      ),
    ).toEqual({
      x: 480,
      y: 360,
    });
  });

  it('returns null for a point in the letterbox area', () => {
    expect(
      clientPointToViewBox(
        { x: 10, y: 360 },
        { left: 0, top: 0, width: 1_000, height: 720 },
        { x: 0, y: 0, width: 960, height: 720 },
      ),
    ).toBeNull();
  });

  it('can clamp points to the nearest viewBox edge', () => {
    expect(
      clientPointToViewBox(
        { x: 10, y: 900 },
        { left: 0, top: 0, width: 1_000, height: 720 },
        { x: 0, y: 0, width: 960, height: 720 },
        { clampToViewBox: true },
      ),
    ).toEqual({
      x: 0,
      y: 720,
    });
  });

  it('preserves a non-zero viewBox origin', () => {
    expect(
      clientPointToViewBox(
        { x: 50, y: 50 },
        { left: 0, top: 0, width: 100, height: 100 },
        { x: -50, y: -25, width: 100, height: 100 },
      ),
    ).toEqual({
      x: 0,
      y: 25,
    });
  });

  it('returns null for unusable geometry', () => {
    expect(
      clientPointToViewBox(
        { x: 0, y: 0 },
        { left: 0, top: 0, width: 0, height: 720 },
        { x: 0, y: 0, width: 960, height: 720 },
      ),
    ).toBeNull();

    expect(
      clientPointToViewBox(
        { x: 0, y: 0 },
        { left: 0, top: 0, width: 960, height: 720 },
        { x: 0, y: 0, width: 0, height: 720 },
      ),
    ).toBeNull();
  });

  it('sets and removes SVG attributes predictably', () => {
    const target = new FakeSvgAttributeTarget();

    target.setAttribute(
      'data-old',
      'remove me',
    );

    setSvgAttributes(target, {
      x: 15,
      fill: 'none',
      focusable: true,
      'data-old': false,
      'data-unused': undefined,
    });

    expect(target.attributes.get('x')).toBe('15');
    expect(target.attributes.get('fill')).toBe('none');
    expect(target.attributes.get('focusable')).toBe('');
    expect(target.attributes.has('data-old')).toBe(false);
    expect(target.attributes.has('data-unused')).toBe(false);
  });
});
