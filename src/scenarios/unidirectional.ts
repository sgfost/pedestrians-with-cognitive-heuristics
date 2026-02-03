// unidirectional flow scenarios (Fig. 3A, 3B, 3C)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestriansInArea } from '../simulation/pedestrian';
import { createCorridor } from '../simulation/environment';

export class UnidirectionalFlowScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Unidirectional Flow',
    description: 'Velocity-density relation and stop-and-go waves (Fig. 3)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (45 * Math.PI) / 180,
    dMax: 8,
    k: 5000,
    dt: 0.02,
  };
  
  // street: 8m x 3m
  readonly bounds: Bounds = {
    xMin: -4,
    xMax: 4,
    yMin: -1.5,
    yMax: 1.5,
  };
  
  readonly boundaryType: BoundaryType = 'periodic';
  
  private pedestrianCount = 50;
  
  setPedestrianCount(count: number): void {
    this.pedestrianCount = count;
  }
  
  createWalls(): Wall[] {
    return createCorridor(8, 3);
  }
  
  initializePedestrians(simulation: Simulation): void {
    // all pedestrians walk in the same direction (+x)
    const pedestrians = createPedestriansInArea(
      this.pedestrianCount,
      this.bounds,
      (position) => ({
        x: this.bounds.xMax,
        y: position.y,
      }),
      {
        desiredSpeedMean: 1.3,
        desiredSpeedStd: 0.2,
        directionFn: () => 1,  // all go right
      }
    );
    
    simulation.addPedestrians(pedestrians);
  }
  
  onStep(simulation: Simulation): void {
    // destinations stay fixed - direction field controls movement
  }
}
