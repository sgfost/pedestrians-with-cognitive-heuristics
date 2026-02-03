// local speed calculation for space-time diagrams

import { Pedestrian, Bounds, LocalSpeedField } from '../simulation/types';
import { vec2 } from '../utils/vector';
import { gaussian } from '../utils/geometry';

// compute local speed field V(x, t) using Gaussian weighting
export function computeLocalSpeedField(
  pedestrians: Pedestrian[],
  bounds: Bounds,
  resolution = 0.2,  // spacing between x samples
  R = 0.7            // Gaussian kernel radius
): LocalSpeedField {
  const xValues: number[] = [];
  const speedValues: number[] = [];
  
  const activePeds = pedestrians.filter(p => p.active);
  
  for (let x = bounds.xMin; x <= bounds.xMax; x += resolution) {
    xValues.push(x);
    
    let weightedSpeed = 0;
    let totalWeight = 0;
    
    for (const ped of activePeds) {
      const dx = ped.position.x - x;
      const weight = gaussian(Math.abs(dx), R);
      const speed = vec2.length(ped.velocity);
      
      weightedSpeed += speed * weight;
      totalWeight += weight;
    }
    
    const localSpeed = totalWeight > 1e-10 ? weightedSpeed / totalWeight : 0;
    speedValues.push(localSpeed);
  }
  
  return { x: xValues, values: speedValues };
}

// compute average speed for all pedestrians
export function computeAverageSpeed(pedestrians: Pedestrian[]): number {
  const activePeds = pedestrians.filter(p => p.active);
  if (activePeds.length === 0) return 0;
  
  let totalSpeed = 0;
  for (const ped of activePeds) {
    totalSpeed += vec2.length(ped.velocity);
  }
  
  return totalSpeed / activePeds.length;
}

// track local speed over time for space-time diagrams
export class SpaceTimeTracker {
  private data: Array<{ time: number; field: LocalSpeedField }> = [];
  private maxHistory = 500;
  
  record(time: number, field: LocalSpeedField): void {
    this.data.push({ time, field });
    if (this.data.length > this.maxHistory) {
      this.data.shift();
    }
  }
  
  getData(): Array<{ time: number; field: LocalSpeedField }> {
    return this.data;
  }
  
  clear(): void {
    this.data = [];
  }
}

// compute correlation coefficient for stop-and-go wave detection
export function computeSpeedCorrelation(
  history: Array<{ time: number; field: LocalSpeedField }>,
  X: number,  // spatial offset (m)
  T: number   // time offset (s)
): number {
  if (history.length < 2) return 0;
  
  const pairs: Array<{ v1: number; v2: number }> = [];
  
  for (let i = 0; i < history.length; i++) {
    const t1 = history[i].time;
    const t2 = t1 + T;
    
    // find entry at time t2
    const j = history.findIndex(h => Math.abs(h.time - t2) < 0.1);
    if (j < 0 || j >= history.length) continue;
    
    const field1 = history[i].field;
    const field2 = history[j].field;
    
    // match positions with offset X
    for (let k = 0; k < field1.x.length; k++) {
      const x1 = field1.x[k];
      const x2 = x1 - X;  // look back in space
      
      // find closest x in field2
      let closestIdx = 0;
      let minDist = Infinity;
      for (let m = 0; m < field2.x.length; m++) {
        const dist = Math.abs(field2.x[m] - x2);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = m;
        }
      }
      
      if (minDist < 0.3) {
        pairs.push({
          v1: field1.values[k],
          v2: field2.values[closestIdx],
        });
      }
    }
  }
  
  if (pairs.length < 10) return 0;
  
  // compute Pearson correlation
  const n = pairs.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const { v1, v2 } of pairs) {
    sumX += v1;
    sumY += v2;
    sumXY += v1 * v2;
    sumX2 += v1 * v1;
    sumY2 += v2 * v2;
  }
  
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return den > 1e-10 ? num / den : 0;
}
