// bidirectional flow with lane formation (Fig. S2)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestriansInArea } from '../simulation/pedestrian';
import { createCorridor } from '../simulation/environment';
import { computeBandIndex } from '../metrics/bandIndex';

export class BidirectionalFlowScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Bidirectional Flow',
    description: 'Spontaneous lane formation (Fig. S2)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (90 * Math.PI) / 180,
    dMax: 10,
    k: 5000,
    dt: 0.02,
  };
  
  // street: 16m x 4m
  readonly bounds: Bounds = {
    xMin: -8,
    xMax: 8,
    yMin: -2,
    yMax: 2,
  };
  
  readonly boundaryType: BoundaryType = 'periodic';
  
  private pedestrianCount = 60;
  
  createWalls(): Wall[] {
    // only top/bottom walls for periodic x-boundaries
    return createCorridor(16, 4);
  }
  
  initializePedestrians(simulation: Simulation): void {
    const halfCount = Math.floor(this.pedestrianCount / 2);
    
    // create pedestrians randomly placed, with half going each direction
    const pedestrians = createPedestriansInArea(
      this.pedestrianCount,
      this.bounds,
      (position, index) => {
        // destination is on opposite side
        const direction = index < halfCount ? 1 : -1;
        return {
          x: direction > 0 ? this.bounds.xMax : this.bounds.xMin,
          y: position.y,
        };
      },
      {
        desiredSpeedMean: 1.3,
        desiredSpeedStd: 0.2,
        directionFn: (index) => (index < halfCount ? 1 : -1),
      }
    );
    
    simulation.addPedestrians(pedestrians);
  }
  
  onStep(simulation: Simulation): void {
    // destinations stay fixed - direction field controls movement
  }
  
  getCustomMetrics(simulation: Simulation): Record<string, unknown> {
    const bandIndex = computeBandIndex(simulation.pedestrians, this.bounds);
    return { bandIndex };
  }
}
