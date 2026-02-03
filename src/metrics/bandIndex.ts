// band index calculation for bidirectional flow

import { Pedestrian, Bounds } from '../simulation/types';

// compute band index Y(t) for lane segregation
// Y = 0: completely mixed
// Y = 1: perfect segregation
export function computeBandIndex(
  pedestrians: Pedestrian[],
  bounds: Bounds,
  bandWidth = 0.3,   // d = 0.3 m
  stepSize = 0.1     // Δy = 0.1 m
): number {
  const activePeds = pedestrians.filter(p => p.active);
  if (activePeds.length < 2) return 0;
  
  const yMin = bounds.yMin;
  const yMax = bounds.yMax;
  
  let totalBandIndex = 0;
  let bandCount = 0;
  
  // iterate through bands
  for (let y0 = yMin; y0 <= yMax - bandWidth; y0 += stepSize) {
    const yEnd = y0 + bandWidth;
    
    // count pedestrians in this band by direction
    let n1 = 0;  // direction = 1
    let n2 = 0;  // direction = -1
    
    for (const ped of activePeds) {
      if (ped.position.y >= y0 && ped.position.y < yEnd) {
        if (ped.direction > 0) n1++;
        else n2++;
      }
    }
    
    const total = n1 + n2;
    if (total > 0) {
      // Y_B = |n1 - n2| / (n1 + n2)
      const bandY = Math.abs(n1 - n2) / total;
      totalBandIndex += bandY;
      bandCount++;
    }
  }
  
  return bandCount > 0 ? totalBandIndex / bandCount : 0;
}

// track band index over time for plotting
export class BandIndexTracker {
  private history: Array<{ time: number; value: number }> = [];
  private maxHistory = 1000;
  
  record(time: number, value: number): void {
    this.history.push({ time, value });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  getHistory(): Array<{ time: number; value: number }> {
    return this.history;
  }
  
  clear(): void {
    this.history = [];
  }
  
  getAverage(): number {
    if (this.history.length === 0) return 0;
    const sum = this.history.reduce((acc, h) => acc + h.value, 0);
    return sum / this.history.length;
  }
}
