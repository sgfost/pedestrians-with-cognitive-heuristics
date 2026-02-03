// pedestrian creation and management

import { Vec2, vec2 } from '../utils/vector';
import { randomNormal } from '../utils/geometry';
import { Pedestrian } from './types';

let nextId = 0;

export function resetPedestrianIds(): void {
  nextId = 0;
}

export interface PedestrianOptions {
  position: Vec2;
  destination: Vec2;
  mass?: number;
  desiredSpeed?: number;
  velocity?: Vec2;
  direction?: number;
}

export function createPedestrian(options: PedestrianOptions): Pedestrian {
  // default mass uniformly in [60, 100] kg
  const mass = options.mass ?? 60 + Math.random() * 40;
  
  // radius derived from mass: r = m / 320
  const radius = mass / 320;
  
  // default desired speed from normal distribution N(1.3, 0.2) m/s
  const desiredSpeed = options.desiredSpeed ?? Math.max(0.5, randomNormal(1.3, 0.2));
  
  return {
    id: nextId++,
    position: vec2.copy(options.position),
    velocity: options.velocity ? vec2.copy(options.velocity) : vec2.zero(),
    mass,
    radius,
    desiredSpeed,
    destination: vec2.copy(options.destination),
    direction: options.direction ?? 1,
    active: true,
  };
}

// create multiple pedestrians with random positions within bounds
export function createPedestriansInArea(
  count: number,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  destinationFn: (position: Vec2, index: number) => Vec2,
  options?: {
    desiredSpeedMean?: number;
    desiredSpeedStd?: number;
    uniformMass?: number;
    directionFn?: (index: number) => number;
  }
): Pedestrian[] {
  const pedestrians: Pedestrian[] = [];
  const maxAttempts = count * 100;
  let attempts = 0;
  
  while (pedestrians.length < count && attempts < maxAttempts) {
    attempts++;
    
    const position = {
      x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
      y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin),
    };
    
    // check for overlap with existing pedestrians
    const mass = options?.uniformMass ?? 60 + Math.random() * 40;
    const radius = mass / 320;
    let overlaps = false;
    
    for (const other of pedestrians) {
      const dist = vec2.distance(position, other.position);
      if (dist < radius + other.radius + 0.05) {
        overlaps = true;
        break;
      }
    }
    
    if (!overlaps) {
      const index = pedestrians.length;
      const desiredSpeed = options?.desiredSpeedMean !== undefined
        ? Math.max(0.5, randomNormal(
            options.desiredSpeedMean,
            options.desiredSpeedStd ?? 0.2
          ))
        : Math.max(0.5, randomNormal(1.3, 0.2));
      
      const ped = createPedestrian({
        position,
        destination: destinationFn(position, index),
        mass: options?.uniformMass,
        desiredSpeed,
        direction: options?.directionFn?.(index) ?? 1,
      });
      pedestrians.push(ped);
    }
  }
  
  return pedestrians;
}

// update pedestrian destination (for periodic boundaries)
export function updateDestination(ped: Pedestrian, newDestination: Vec2): void {
  ped.destination = vec2.copy(newDestination);
}

// check if pedestrian has reached destination
export function hasReachedDestination(ped: Pedestrian, tolerance = 0.5): boolean {
  return vec2.distance(ped.position, ped.destination) < tolerance;
}
