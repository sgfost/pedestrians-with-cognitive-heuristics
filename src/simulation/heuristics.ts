// behavioral heuristics for direction and speed selection

import { SimulationParams, DirectionResult } from './types';

// heuristic 1: direction selection
// minimizes distance to destination while avoiding obstacles
export function selectDirection(
  angles: number[],
  distances: number[],
  params: SimulationParams
): DirectionResult {
  // α₀ = 0 in local coordinates (directly toward destination)
  const alpha0 = 0;
  
  let minCost = Infinity;
  let bestIdx = 0;
  
  const dMaxSq = params.dMax * params.dMax;
  
  // compute d(α) for each candidate and find minimum
  for (let i = 0; i < angles.length; i++) {
    const alpha = angles[i];
    const f = distances[i];
    
    // cost function from paper: effective distance to destination via this path
    // d(α) = dMax² + f(α)² - 2·dMax·f(α)·cos(α₀ - α)
    const cost = dMaxSq + f * f - 2 * params.dMax * f * Math.cos(alpha0 - alpha);
    
    if (cost < minCost) {
      minCost = cost;
      bestIdx = i;
    }
  }
  
  return {
    alphaDes: angles[bestIdx],
    distanceToObstacle: distances[bestIdx],
  };
}

// heuristic 2: speed selection
// maintain safe braking distance
export function selectSpeed(
  desiredSpeed: number,
  distanceToObstacle: number,
  tau: number
): number {
  // v_des = min(v0_i, d_h / τ)
  return Math.min(desiredSpeed, distanceToObstacle / tau);
}

// combined heuristic: given vision result, compute desired velocity magnitude and direction
export function computeDesiredVelocity(
  desiredSpeed: number,
  angles: number[],
  distances: number[],
  params: SimulationParams
): { alphaDes: number; speedDes: number } {
  const { alphaDes, distanceToObstacle } = selectDirection(angles, distances, params);
  const speedDes = selectSpeed(desiredSpeed, distanceToObstacle, params.tau);
  
  return { alphaDes, speedDes };
}
