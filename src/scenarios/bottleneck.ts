// bottleneck scenario for crowd turbulence (Fig. 4)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestriansInArea } from '../simulation/pedestrian';
import { createWall } from '../simulation/environment';

export class BottleneckScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Bottleneck',
    description: 'Crowd turbulence and disaster conditions (Fig. 4)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (75 * Math.PI) / 180,
    dMax: 8,
    k: 5000,
    dt: 0.02,
  };
  
  // corridor: 10m x 6m, bottleneck 2m wide
  readonly bounds: Bounds = {
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 3,
  };
  
  readonly boundaryType: BoundaryType = 'closed';
  
  private pedestrianCount = 100;
  
  createWalls(): Wall[] {
    const walls = [];
    
    // top wall before bottleneck
    walls.push(createWall({ x: -5, y: 3 }, { x: 2, y: 3 }));
    // top narrowing into bottleneck
    walls.push(createWall({ x: 2, y: 3 }, { x: 3, y: 1 }));
    // top wall after bottleneck
    walls.push(createWall({ x: 3, y: 1 }, { x: 5, y: 1 }));
    
    // bottom wall before bottleneck
    walls.push(createWall({ x: -5, y: -3 }, { x: 2, y: -3 }));
    // bottom narrowing into bottleneck
    walls.push(createWall({ x: 2, y: -3 }, { x: 3, y: -1 }));
    // bottom wall after bottleneck
    walls.push(createWall({ x: 3, y: -1 }, { x: 5, y: -1 }));
    
    // left wall (entry)
    walls.push(createWall({ x: -5, y: -3 }, { x: -5, y: 3 }));
    
    return walls;
  }
  
  initializePedestrians(simulation: Simulation): void {
    // place pedestrians in the wide section before the bottleneck
    const pedestrians = createPedestriansInArea(
      this.pedestrianCount,
      {
        xMin: -4.5,
        xMax: 1.5,
        yMin: -2.5,
        yMax: 2.5,
      },
      () => ({
        x: 6,  // destination is past the bottleneck
        y: 0,
      }),
      {
        desiredSpeedMean: 1.3,
        desiredSpeedStd: 0.2,
        directionFn: () => 1,
      }
    );
    
    simulation.addPedestrians(pedestrians);
  }
  
  onStep(simulation: Simulation): void {
    // remove pedestrians that have exited
    for (const ped of simulation.pedestrians) {
      if (!ped.active) continue;
      
      if (ped.position.x > 5) {
        ped.active = false;
      }
    }
  }
  
  getCustomMetrics(simulation: Simulation): Record<string, unknown> {
    const active = simulation.pedestrians.filter(p => p.active).length;
    const exited = simulation.pedestrians.filter(p => !p.active).length;
    return { 
      activePedestrians: active,
      exitedPedestrians: exited,
    };
  }
}
