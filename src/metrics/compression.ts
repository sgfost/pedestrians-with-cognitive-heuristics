// compression and crowd pressure metrics

import { Pedestrian, Bounds } from '../simulation/types';
import { vec2 } from '../utils/vector';
import { periodicDisplacement, gaussian } from '../utils/geometry';

// compute body compression for a pedestrian
export function computeBodyCompression(
  pedestrian: Pedestrian,
  others: Pedestrian[],
  bounds?: Bounds,
  periodic = false
): number {
  let totalOverlap = 0;
  
  for (const other of others) {
    if (other.id === pedestrian.id || !other.active) continue;
    
    let delta: import('../utils/vector').Vec2;
    
    if (periodic && bounds) {
      delta = periodicDisplacement(other.position, pedestrian.position, bounds);
    } else {
      delta = vec2.sub(pedestrian.position, other.position);
    }
    
    const dist = vec2.length(delta);
    const overlap = pedestrian.radius + other.radius - dist;
    
    if (overlap > 0) {
      totalOverlap += overlap;
    }
  }
  
  return totalOverlap;
}

// compute local compression field C(x)
export function computeCompressionField(
  pedestrians: Pedestrian[],
  bounds: Bounds,
  resolution = 0.5,
  R = 1.0,
  periodic = false
): { x: number[]; y: number[]; values: number[][] } {
  const xValues: number[] = [];
  const yValues: number[] = [];
  
  for (let x = bounds.xMin; x <= bounds.xMax; x += resolution) {
    xValues.push(x);
  }
  for (let y = bounds.yMin; y <= bounds.yMax; y += resolution) {
    yValues.push(y);
  }
  
  const values: number[][] = [];
  const activePeds = pedestrians.filter(p => p.active);
  
  for (let i = 0; i < xValues.length; i++) {
    values[i] = [];
    for (let j = 0; j < yValues.length; j++) {
      const point = { x: xValues[i], y: yValues[j] };
      
      let weightedCompression = 0;
      let totalWeight = 0;
      
      for (const ped of activePeds) {
        let delta: import('../utils/vector').Vec2;
        
        if (periodic) {
          delta = periodicDisplacement(point, ped.position, bounds);
        } else {
          delta = vec2.sub(ped.position, point);
        }
        
        const dist = vec2.length(delta);
        const weight = gaussian(dist, R);
        const compression = computeBodyCompression(ped, activePeds, bounds, periodic);
        
        weightedCompression += compression * weight;
        totalWeight += weight;
      }
      
      values[i][j] = totalWeight > 1e-10 ? weightedCompression / totalWeight : 0;
    }
  }
  
  return { x: xValues, y: yValues, values };
}

// compute crowd pressure P(x) = ρ(x) × Var(V(x,t))
export function computeCrowdPressure(
  pedestrians: Pedestrian[],
  bounds: Bounds,
  resolution = 0.5,
  R = 1.0,
  periodic = false
): { x: number[]; y: number[]; values: number[][] } {
  const xValues: number[] = [];
  const yValues: number[] = [];
  
  for (let x = bounds.xMin; x <= bounds.xMax; x += resolution) {
    xValues.push(x);
  }
  for (let y = bounds.yMin; y <= bounds.yMax; y += resolution) {
    yValues.push(y);
  }
  
  const values: number[][] = [];
  const activePeds = pedestrians.filter(p => p.active);
  
  for (let i = 0; i < xValues.length; i++) {
    values[i] = [];
    for (let j = 0; j < yValues.length; j++) {
      const point = { x: xValues[i], y: yValues[j] };
      
      // compute local density and velocity variance
      let totalWeight = 0;
      let weightedVx = 0;
      let weightedVy = 0;
      let weightedVx2 = 0;
      let weightedVy2 = 0;
      
      for (const ped of activePeds) {
        let delta: import('../utils/vector').Vec2;
        
        if (periodic) {
          delta = periodicDisplacement(point, ped.position, bounds);
        } else {
          delta = vec2.sub(ped.position, point);
        }
        
        const dist = vec2.length(delta);
        const weight = gaussian(dist, R);
        
        totalWeight += weight;
        weightedVx += ped.velocity.x * weight;
        weightedVy += ped.velocity.y * weight;
        weightedVx2 += ped.velocity.x * ped.velocity.x * weight;
        weightedVy2 += ped.velocity.y * ped.velocity.y * weight;
      }
      
      if (totalWeight > 1e-10) {
        const meanVx = weightedVx / totalWeight;
        const meanVy = weightedVy / totalWeight;
        const varVx = weightedVx2 / totalWeight - meanVx * meanVx;
        const varVy = weightedVy2 / totalWeight - meanVy * meanVy;
        const velocityVariance = varVx + varVy;
        
        // density approximation
        const density = totalWeight;
        
        values[i][j] = density * velocityVariance;
      } else {
        values[i][j] = 0;
      }
    }
  }
  
  return { x: xValues, y: yValues, values };
}
