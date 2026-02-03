// two pedestrian avoidance scenarios (Fig. 2A, 2B)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestrian } from '../simulation/pedestrian';
import { createCorridor } from '../simulation/environment';

// static obstacle avoidance (Fig. 2A)
export class TwoPedestrianStaticScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Two Pedestrian (Static)',
    description: 'Avoidance trajectory around static person (Fig. 2A)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (75 * Math.PI) / 180,
    dMax: 10,
    k: 5000,
    dt: 0.02,
  };
  
  // corridor: 7.88m x 1.75m
  readonly bounds: Bounds = {
    xMin: -3.94,
    xMax: 3.94,
    yMin: -0.875,
    yMax: 0.875,
  };
  
  readonly boundaryType: BoundaryType = 'closed';
  
  createWalls(): Wall[] {
    return createCorridor(7.88, 1.75);
  }
  
  initializePedestrians(simulation: Simulation): void {
    // pedestrian A walks from left to right
    const pedA = createPedestrian({
      position: { x: -3.5, y: 0 },
      destination: { x: 3.5, y: 0 },
      desiredSpeed: 1.3,
      velocity: { x: 0, y: 0 },
    });
    
    // pedestrian B stands stationary in middle
    const pedB = createPedestrian({
      position: { x: 0, y: 0 },
      destination: { x: 0, y: 0 },  // no destination, stays put
      desiredSpeed: 0,               // stationary
      velocity: { x: 0, y: 0 },
    });
    
    simulation.addPedestrians([pedA, pedB]);
  }
}

// moving opposite avoidance (Fig. 2B)
export class TwoPedestrianMovingScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Two Pedestrian (Moving)',
    description: 'Avoidance when both pedestrians moving (Fig. 2B)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (75 * Math.PI) / 180,
    dMax: 10,
    k: 5000,
    dt: 0.02,
  };
  
  readonly bounds: Bounds = {
    xMin: -3.94,
    xMax: 3.94,
    yMin: -0.875,
    yMax: 0.875,
  };
  
  readonly boundaryType: BoundaryType = 'closed';
  
  createWalls(): Wall[] {
    return createCorridor(7.88, 1.75);
  }
  
  initializePedestrians(simulation: Simulation): void {
    // pedestrian A walks from left to right
    const pedA = createPedestrian({
      position: { x: -3.5, y: 0 },
      destination: { x: 3.5, y: 0 },
      desiredSpeed: 1.3,
      velocity: { x: 0, y: 0 },
      direction: 1,
    });
    
    // pedestrian B walks from right to left
    const pedB = createPedestrian({
      position: { x: 3.5, y: 0 },
      destination: { x: -3.5, y: 0 },
      desiredSpeed: 1.3,
      velocity: { x: 0, y: 0 },
      direction: -1,
    });
    
    simulation.addPedestrians([pedA, pedB]);
  }
}
