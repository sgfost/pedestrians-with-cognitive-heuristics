// visual information function f(α) computation

import { Vec2, vec2 } from '../utils/vector';
import { distanceToSegment, periodicDisplacement } from '../utils/geometry';
import { Pedestrian, Wall, SimulationParams, VisionResult, Bounds } from './types';

// compute collision distance with another pedestrian
function collisionDistancePedestrian(
  pi: Pedestrian,
  pj: Pedestrian,
  vCandidate: Vec2,
  dMax: number
): number {
  // relative position and velocity
  const dx = pj.position.x - pi.position.x;
  const dy = pj.position.y - pi.position.y;
  const dvx = pj.velocity.x - vCandidate.x;
  const dvy = pj.velocity.y - vCandidate.y;
  
  // current distance
  const currentDistSq = dx * dx + dy * dy;
  const combinedRadius = pi.radius + pj.radius;
  
  // already overlapping - check if moving toward
  if (currentDistSq <= combinedRadius * combinedRadius) {
    // check if candidate direction points toward other pedestrian
    const toOther = vec2.normalize({ x: dx, y: dy });
    const candidateDir = vec2.normalize(vCandidate);
    const dot = vec2.dot(candidateDir, toOther);
    
    if (dot > 0) {
      return 0; // moving toward, distance is 0
    }
    return dMax; // moving away
  }
  
  // quadratic coefficients: A*t^2 + B*t + C = 0
  const A = dvx * dvx + dvy * dvy;
  const B = 2 * (dvx * dx + dvy * dy);
  const C = dx * dx + dy * dy - combinedRadius * combinedRadius;
  
  // parallel motion or both stationary
  if (A < 1e-10) {
    return C <= 0 ? 0 : dMax;
  }
  
  const discriminant = B * B - 4 * A * C;
  
  if (discriminant < 0) {
    // no collision
    return dMax;
  }
  
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-B - sqrtDisc) / (2 * A);
  const t2 = (-B + sqrtDisc) / (2 * A);
  
  // take smallest positive time
  let tCollision = Infinity;
  if (t1 > 1e-6) tCollision = t1;
  else if (t2 > 1e-6) tCollision = t2;
  
  if (tCollision === Infinity) {
    return dMax;
  }
  
  // distance = speed * time
  const speed = vec2.length(vCandidate);
  const distance = speed * tCollision;
  return Math.min(distance, dMax);
}

// compute collision distance with a wall
function collisionDistanceWall(
  ped: Pedestrian,
  wall: Wall,
  vCandidate: Vec2,
  dMax: number
): number {
  const speed = vec2.length(vCandidate);
  if (speed < 1e-10) return dMax;
  
  const vDir = vec2.normalize(vCandidate);
  
  // ray-segment intersection
  const segDir = vec2.sub(wall.end, wall.start);
  const segLen = vec2.length(segDir);
  if (segLen < 1e-10) return dMax;
  
  const toStart = vec2.sub(wall.start, ped.position);
  
  // using parametric form: ped.pos + t*vDir = wall.start + s*segDir
  const cross = vDir.x * segDir.y - vDir.y * segDir.x;
  
  if (Math.abs(cross) < 1e-10) {
    // parallel to wall
    const dist = distanceToSegment(ped.position, wall.start, wall.end);
    if (dist <= ped.radius) {
      // already touching, check if moving toward
      const perpDist = wall.a * ped.position.x + wall.b * ped.position.y + wall.c;
      
      if (perpDist * (wall.a * vCandidate.x + wall.b * vCandidate.y) < 0) {
        return 0; // moving toward wall
      }
    }
    return dMax;
  }
  
  const t = (toStart.x * segDir.y - toStart.y * segDir.x) / cross;
  const s = (toStart.x * vDir.y - toStart.y * vDir.x) / cross;
  
  // check if intersection is valid
  if (t < 0 || s < 0 || s > segLen) {
    // no intersection with segment, check distance to endpoints
    const distToStart = vec2.distance(ped.position, wall.start);
    const distToEnd = vec2.distance(ped.position, wall.end);
    
    if (distToStart <= ped.radius || distToEnd <= ped.radius) {
      return 0;
    }
    
    return dMax;
  }
  
  // calculate distance, accounting for pedestrian radius
  const intersectionDist = t * speed;
  const adjustedDist = Math.max(0, intersectionDist - ped.radius);
  
  return Math.min(adjustedDist, dMax);
}

// compute vision function for all angles
export function computeVision(
  pedestrian: Pedestrian,
  others: Pedestrian[],
  walls: Wall[],
  params: SimulationParams,
  bounds?: Bounds,
  periodic = false,
  heading?: number  // optional pre-computed heading
): VisionResult {
  const angles: number[] = [];
  const distances: number[] = [];
  
  // use provided heading or compute from destination
  const actualHeading = heading ?? vec2.angle(vec2.sub(pedestrian.destination, pedestrian.position));
  
  // iterate through all candidate directions
  const numSteps = Math.ceil((2 * params.phi) / params.angularResolution) + 1;
  
  for (let i = 0; i < numSteps; i++) {
    const alpha = -params.phi + i * params.angularResolution;
    angles.push(alpha);
    
    let minDist = params.dMax;
    
    // absolute direction for this candidate
    const absDirection = actualHeading + alpha;
    
    // candidate velocity if pedestrian moved in this direction
    const vCandidate = vec2.fromAngle(absDirection, pedestrian.desiredSpeed);
    
    // check collision with each other pedestrian
    for (const other of others) {
      if (other.id === pedestrian.id || !other.active) continue;
      
      let otherPos = other.position;
      
      // handle periodic boundaries - find closest image of other pedestrian
      if (periodic && bounds) {
        const displacement = periodicDisplacement(pedestrian.position, other.position, bounds);
        otherPos = vec2.add(pedestrian.position, displacement);
      }
      
      const otherAdjusted = { ...other, position: otherPos };
      const dist = collisionDistancePedestrian(pedestrian, otherAdjusted, vCandidate, params.dMax);
      minDist = Math.min(minDist, dist);
    }
    
    // check collision with each wall
    for (const wall of walls) {
      const dist = collisionDistanceWall(pedestrian, wall, vCandidate, params.dMax);
      minDist = Math.min(minDist, dist);
    }
    
    distances.push(minDist);
  }
  
  return { angles, distances };
}

// get distance in a specific direction (for debug visualization)
export function getDistanceInDirection(
  pedestrian: Pedestrian,
  direction: number,
  others: Pedestrian[],
  walls: Wall[],
  dMax: number
): number {
  const vCandidate = vec2.fromAngle(direction, pedestrian.desiredSpeed);
  let minDist = dMax;
  
  for (const other of others) {
    if (other.id === pedestrian.id || !other.active) continue;
    const dist = collisionDistancePedestrian(pedestrian, other, vCandidate, dMax);
    minDist = Math.min(minDist, dist);
  }
  
  for (const wall of walls) {
    const dist = collisionDistanceWall(pedestrian, wall, vCandidate, dMax);
    minDist = Math.min(minDist, dist);
  }
  
  return minDist;
}
