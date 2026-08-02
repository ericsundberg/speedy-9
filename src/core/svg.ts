import { clamp } from './geometry';
import type { Vec2 } from './geometry';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export interface SvgViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ViewportRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface SvgCoordinateOptions {
  readonly clampToViewBox?: boolean;
}

export type SvgAttributeValue =
  | string
  | number
  | boolean
  | undefined;

export type SvgAttributes = Readonly<
  Record<string, SvgAttributeValue>
>;

interface SvgAttributeTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

function hasUsableDimensions(
  rect: ViewportRect,
  viewBox: SvgViewBox,
): boolean {
  return (
    Number.isFinite(rect.left)
    && Number.isFinite(rect.top)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && Number.isFinite(viewBox.x)
    && Number.isFinite(viewBox.y)
    && Number.isFinite(viewBox.width)
    && Number.isFinite(viewBox.height)
    && rect.width > 0
    && rect.height > 0
    && viewBox.width > 0
    && viewBox.height > 0
  );
}

export function setSvgAttributes(
  element: SvgAttributeTarget,
  attributes: SvgAttributes,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) {
      element.removeAttribute(name);
      continue;
    }

    const serializedValue = value === true ? '' : String(value);
    element.setAttribute(name, serializedValue);
  }
}

export function createSvgElement<
  TTagName extends keyof SVGElementTagNameMap,
>(
  tagName: TTagName,
  attributes: SvgAttributes = {},
): SVGElementTagNameMap[TTagName] {
  const element = document.createElementNS(
    SVG_NAMESPACE,
    tagName,
  );

  setSvgAttributes(element, attributes);
  return element;
}

export function clearSvgElement(element: Element): void {
  element.replaceChildren();
}

export function clientPointToViewBox(
  clientPoint: Vec2,
  rect: ViewportRect,
  viewBox: SvgViewBox,
  options: SvgCoordinateOptions = {},
): Vec2 | null {
  if (!hasUsableDimensions(rect, viewBox)) {
    return null;
  }

  const scale = Math.min(
    rect.width / viewBox.width,
    rect.height / viewBox.height,
  );

  const renderedWidth = viewBox.width * scale;
  const renderedHeight = viewBox.height * scale;

  const renderedLeft =
    rect.left + (rect.width - renderedWidth) / 2;
  const renderedTop =
    rect.top + (rect.height - renderedHeight) / 2;

  const localX = (clientPoint.x - renderedLeft) / scale;
  const localY = (clientPoint.y - renderedTop) / scale;

  const isOutside =
    localX < 0
    || localX > viewBox.width
    || localY < 0
    || localY > viewBox.height;

  if (isOutside && options.clampToViewBox !== true) {
    return null;
  }

  return {
    x: viewBox.x + clamp(localX, 0, viewBox.width),
    y: viewBox.y + clamp(localY, 0, viewBox.height),
  };
}

export function clientPointToSvg(
  svg: SVGSVGElement,
  clientPoint: Vec2,
  options: SvgCoordinateOptions = {},
): Vec2 | null {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;

  return clientPointToViewBox(
    clientPoint,
    {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    {
      x: viewBox.x,
      y: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    },
    options,
  );
}
