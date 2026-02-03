// geometry utilities for wall and collision calculations

import { Vec2, vec2 } from './vector';

export interface LineEquation {
  a: number;
  b: number;
  c: number;
}

// compute line equation ax + by + c = 0 from two points
export function lineFromPoints(p1: Vec2, p2: Vec2): LineEquation {
  // direction vector
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  // normal vector (perpendicular to direction)
  // ax + by + c = 0 where (a, b) is normal
  const a = -dy;
  const b = dx;
  const c = -(a * p1.x + b * p1.y);
  
  // normalize
  const len = Math.sqrt(a * a + b * b);
  if (len < 1e-10) {
    return { a: 0, b: 0, c: 0 };
  }
  
  return {
    a: a / len,
    b: b / len,
    c: c / len,
  };
}

// signed distance from point to line
export function signedDistanceToLine(point: Vec2, line: LineEquation): number {
  return line.a * point.x + line.b * point.y + line.c;
}

// absolute distance from point to line
export function distanceToLine(point: Vec2, line: LineEquation): number {
  return Math.abs(signedDistanceToLine(point, line));
}

// check if a point is within the bounds of a line segment
export function isPointOnSegment(
  point: Vec2,
  segStart: Vec2,
  segEnd: Vec2,
  tolerance = 0.01
): boolean {
  const segLen = vec2.distance(segStart, segEnd);
  if (segLen < 1e-10) return false;
  
  const toPoint = vec2.sub(point, segStart);
  const segDir = vec2.normalize(vec2.sub(segEnd, segStart));
  
  // project point onto segment direction
  const projection = vec2.dot(toPoint, segDir);
  
  // check if projection is within segment bounds
  return projection >= -tolerance && projection <= segLen + tolerance;
}

// closest point on a line segment to a given point
export function closestPointOnSegment(point: Vec2, segStart: Vec2, segEnd: Vec2): Vec2 {
  const seg = vec2.sub(segEnd, segStart);
  const segLenSq = vec2.lengthSquared(seg);
  
  if (segLenSq < 1e-10) {
    return vec2.copy(segStart);
  }
  
  const toPoint = vec2.sub(point, segStart);
  let t = vec2.dot(toPoint, seg) / segLenSq;
  t = Math.max(0, Math.min(1, t));
  
  return vec2.add(segStart, vec2.scale(seg, t));
}

// distance from point to line segment
export function distanceToSegment(point: Vec2, segStart: Vec2, segEnd: Vec2): number {
  const closest = closestPointOnSegment(point, segStart, segEnd);
  return vec2.distance(point, closest);
}

// normal vector from segment pointing toward a point
export function normalFromSegmentToPoint(
  point: Vec2,
  segStart: Vec2,
  segEnd: Vec2
): Vec2 {
  const closest = closestPointOnSegment(point, segStart, segEnd);
  const toPoint = vec2.sub(point, closest);
  const len = vec2.length(toPoint);
  
  if (len < 1e-10) {
    // point is on segment, use perpendicular
    const seg = vec2.sub(segEnd, segStart);
    return vec2.normalize(vec2.perpendicular(seg));
  }
  
  return vec2.scale(toPoint, 1 / len);
}

// wrap a value to a range (for periodic boundaries)
export function wrapValue(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0) return value;
  
  let result = value;
  while (result < min) result += range;
  while (result >= max) result -= range;
  return result;
}

// wrap a position for periodic boundaries
export function wrapPosition(
  position: Vec2,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
): Vec2 {
  return {
    x: wrapValue(position.x, bounds.xMin, bounds.xMax),
    y: wrapValue(position.y, bounds.yMin, bounds.yMax),
  };
}

// compute the shortest displacement considering periodic boundaries
export function periodicDisplacement(
  from: Vec2,
  to: Vec2,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number }
): Vec2 {
  const rangeX = bounds.xMax - bounds.xMin;
  const rangeY = bounds.yMax - bounds.yMin;
  
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  
  // wrap to shortest path
  if (dx > rangeX / 2) dx -= rangeX;
  else if (dx < -rangeX / 2) dx += rangeX;
  
  if (dy > rangeY / 2) dy -= rangeY;
  else if (dy < -rangeY / 2) dy += rangeY;
  
  return { x: dx, y: dy };
}

// Gaussian distribution for local speed calculation
export function gaussian(distance: number, R: number): number {
  const Rsq = R * R;
  return (1 / (Math.PI * Rsq)) * Math.exp(-(distance * distance) / Rsq);
}

// normalize an angle to [-π, π]
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

// random number from normal distribution (Box-Muller)
export function randomNormal(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}
