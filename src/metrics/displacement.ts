// displacement tracking for crowd turbulence analysis

import { Pedestrian } from '../simulation/types';
import { vec2 } from '../utils/vector';

const STOP_THRESHOLD = 0.05;  // m/s

interface PedestrianState {
  lastStopPosition: import('../utils/vector').Vec2 | null;
  isStopped: boolean;
}

// track displacements between stops
export class DisplacementTracker {
  private states: Map<number, PedestrianState> = new Map();
  private displacements: number[] = [];
  
  update(pedestrians: Pedestrian[]): void {
    for (const ped of pedestrians) {
      if (!ped.active) continue;
      
      const speed = vec2.length(ped.velocity);
      const isStopped = speed < STOP_THRESHOLD;
      
      let state = this.states.get(ped.id);
      if (!state) {
        state = { lastStopPosition: null, isStopped: false };
        this.states.set(ped.id, state);
      }
      
      if (isStopped && !state.isStopped) {
        // just stopped
        if (state.lastStopPosition) {
          const displacement = vec2.distance(ped.position, state.lastStopPosition);
          if (displacement > 0.01) {
            this.displacements.push(displacement);
          }
        }
        state.lastStopPosition = vec2.copy(ped.position);
      }
      
      state.isStopped = isStopped;
    }
  }
  
  getDisplacements(): number[] {
    return this.displacements;
  }
  
  clear(): void {
    this.states.clear();
    this.displacements = [];
  }
  
  // compute histogram for displacement distribution
  getHistogram(binWidth = 0.1, maxDisplacement = 2.0): { bins: number[]; counts: number[] } {
    const numBins = Math.ceil(maxDisplacement / binWidth);
    const bins: number[] = [];
    const counts: number[] = [];
    
    for (let i = 0; i < numBins; i++) {
      bins.push(i * binWidth + binWidth / 2);
      counts.push(0);
    }
    
    for (const d of this.displacements) {
      const binIdx = Math.min(numBins - 1, Math.floor(d / binWidth));
      counts[binIdx]++;
    }
    
    return { bins, counts };
  }
  
  // fit power law to displacement distribution
  // P(d) ∝ d^(-α)
  fitPowerLaw(): { exponent: number; rSquared: number } {
    if (this.displacements.length < 10) {
      return { exponent: 0, rSquared: 0 };
    }
    
    const { bins, counts } = this.getHistogram();
    
    // log-log linear regression
    const logData: Array<{ x: number; y: number }> = [];
    
    for (let i = 0; i < bins.length; i++) {
      if (counts[i] > 0 && bins[i] > 0) {
        logData.push({
          x: Math.log(bins[i]),
          y: Math.log(counts[i]),
        });
      }
    }
    
    if (logData.length < 3) {
      return { exponent: 0, rSquared: 0 };
    }
    
    // linear regression on log-log data
    const n = logData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const { x, y } of logData) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // R² calculation
    const meanY = sumY / n;
    let ssTot = 0, ssRes = 0;
    
    for (const { x, y } of logData) {
      ssTot += (y - meanY) * (y - meanY);
      const predicted = slope * x + intercept;
      ssRes += (y - predicted) * (y - predicted);
    }
    
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    
    // exponent is negative of slope (since P(d) ∝ d^(-α))
    return {
      exponent: -slope,
      rSquared,
    };
  }
}
