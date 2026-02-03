// physical contact forces for high-density scenarios

import { Vec2, vec2 } from '../utils/vector';
import { distanceToSegment, normalFromSegmentToPoint, periodicDisplacement } from '../utils/geometry';
import { Pedestrian, Wall, SimulationParams, Bounds } from './types';

// compute contact forces between all pedestrians and walls
export function computeContactForces(
  pedestrians: Pedestrian[],
  walls: Wall[],
  params: SimulationParams,
  bounds?: Bounds,
  periodic = false
): Vec2[] {
  const forces: Vec2[] = pedestrians.map(() => vec2.zero());
  
  for (let i = 0; i < pedestrians.length; i++) {
    const pi = pedestrians[i];
    if (!pi.active) continue;
    
    // pedestrian-pedestrian contacts
    for (let j = i + 1; j < pedestrians.length; j++) {
      const pj = pedestrians[j];
      if (!pj.active) continue;
      
      let delta: Vec2;
      
      if (periodic && bounds) {
        // use periodic displacement
        const displacement = periodicDisplacement(pj.position, pi.position, bounds);
        delta = displacement;
      } else {
        delta = vec2.sub(pi.position, pj.position);
      }
      
      const dist = vec2.length(delta);
      const overlap = pi.radius + pj.radius - dist;
      
      if (overlap > 0) {
        // compute normal and force
        const normal = dist > 1e-10 ? vec2.scale(delta, 1 / dist) : { x: 1, y: 0 };
        const forceMag = params.k * overlap;
        const force = vec2.scale(normal, forceMag);
        
        forces[i] = vec2.add(forces[i], force);
        forces[j] = vec2.sub(forces[j], force);
      }
    }
    
    // pedestrian-wall contacts
    for (const wall of walls) {
      const distance = distanceToSegment(pi.position, wall.start, wall.end);
      const overlap = pi.radius - distance;
      
      if (overlap > 0) {
        const normal = normalFromSegmentToPoint(pi.position, wall.start, wall.end);
        const forceMag = params.k * overlap;
        const force = vec2.scale(normal, forceMag);
        
        forces[i] = vec2.add(forces[i], force);
      }
    }
  }
  
  return forces;
}

// compute body compression for a pedestrian (average overlap)
export function computeCompression(
  pedestrian: Pedestrian,
  others: Pedestrian[],
  bounds?: Bounds,
  periodic = false
): number {
  let totalOverlap = 0;
  let contactCount = 0;
  
  for (const other of others) {
    if (other.id === pedestrian.id || !other.active) continue;
    
    let delta: Vec2;
    
    if (periodic && bounds) {
      const displacement = periodicDisplacement(other.position, pedestrian.position, bounds);
      delta = displacement;
    } else {
      delta = vec2.sub(pedestrian.position, other.position);
    }
    
    const dist = vec2.length(delta);
    const overlap = pedestrian.radius + other.radius - dist;
    
    if (overlap > 0) {
      totalOverlap += overlap;
      contactCount++;
    }
  }
  
  return contactCount > 0 ? totalOverlap / contactCount : 0;
}

// compute average compression for all pedestrians
export function computeAverageCompression(
  pedestrians: Pedestrian[],
  bounds?: Bounds,
  periodic = false
): number {
  let totalCompression = 0;
  let activeCount = 0;
  
  for (const ped of pedestrians) {
    if (!ped.active) continue;
    totalCompression += computeCompression(ped, pedestrians, bounds, periodic);
    activeCount++;
  }
  
  return activeCount > 0 ? totalCompression / activeCount : 0;
}
