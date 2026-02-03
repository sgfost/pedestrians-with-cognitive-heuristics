// turning corridor scenario (Fig. S4)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestriansInArea } from '../simulation/pedestrian';
import { createLShapedCorridor } from '../simulation/environment';

export class TurningCorridorScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Turning Corridor',
    description: '90° turn under high density (Fig. S4)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (75 * Math.PI) / 180,
    dMax: 8,
    k: 5000,
    dt: 0.02,
  };
  
  readonly bounds: Bounds = {
    xMin: 0,
    xMax: 8,
    yMin: -8,
    yMax: 2,
  };
  
  readonly boundaryType: BoundaryType = 'closed';
  
  private pedestrianCount = 80;
  
  createWalls(): Wall[] {
    return createLShapedCorridor(2, 6);
  }
  
  initializePedestrians(simulation: Simulation): void {
    // spawn in vertical part, destination in horizontal part
    const pedestrians = createPedestriansInArea(
      this.pedestrianCount,
      {
        xMin: 0.3,
        xMax: 1.7,
        yMin: -7,
        yMax: -1,
      },
      () => ({
        x: 7,
        y: 0,
      }),
      {
        desiredSpeedMean: 1.3,
        desiredSpeedStd: 0.2,
      }
    );
    
    simulation.addPedestrians(pedestrians);
  }
  
  onStep(simulation: Simulation): void {
    // update destinations based on position (guide through turn)
    for (const ped of simulation.pedestrians) {
      if (!ped.active) continue;
      
      // if in vertical part, head to corner
      if (ped.position.y < -0.5) {
        ped.destination = { x: 1, y: 0 };
      } else {
        // if past corner, head to end
        ped.destination = { x: 7, y: 0 };
      }
    }
  }
}
