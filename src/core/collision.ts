import { clamp } from './geometry';
import type {
  Circle,
  Rect,
  Vec2,
} from './geometry';

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

export function pointInRect(point: Vec2, rect: Rect): boolean {
  return (
    point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

export function circlesOverlap(a: Circle, b: Circle): boolean {
  const combinedRadius = a.radius + b.radius;
  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;

  return (
    deltaX * deltaX + deltaY * deltaY
    <= combinedRadius * combinedRadius
  );
}

export function circleIntersectsRect(
  circle: Circle,
  rect: Rect,
): boolean {
  const closestX = clamp(
    circle.x,
    rect.x,
    rect.x + rect.width,
  );

  const closestY = clamp(
    circle.y,
    rect.y,
    rect.y + rect.height,
  );

  const deltaX = circle.x - closestX;
  const deltaY = circle.y - closestY;

  return (
    deltaX * deltaX + deltaY * deltaY
    <= circle.radius * circle.radius
  );
}
