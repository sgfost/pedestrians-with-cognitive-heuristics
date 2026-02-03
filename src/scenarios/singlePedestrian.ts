// single pedestrian acceleration scenario (Fig. S1)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestrian } from '../simulation/pedestrian';
import { createCorridor } from '../simulation/environment';

export class SinglePedestrianScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Single Pedestrian',
    description: 'Validate acceleration behavior without interactions (Fig. S1)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.54,
    phi: (90 * Math.PI) / 180,
    dMax: 10,
    k: 5000,
    dt: 0.02,
  };
  
  readonly bounds: Bounds = {
    xMin: -10,
    xMax: 10,
    yMin: -2,
    yMax: 2,
  };
  
  readonly boundaryType: BoundaryType = 'closed';
  
  createWalls(): Wall[] {
    return createCorridor(20, 4);
  }
  
  initializePedestrians(simulation: Simulation): void {
    // single pedestrian starting at rest
    const ped = createPedestrian({
      position: { x: -8, y: 0 },
      destination: { x: 8, y: 0 },
      desiredSpeed: 1.29,
      velocity: { x: 0, y: 0 },
    });
    
    simulation.addPedestrians([ped]);
  }
}
