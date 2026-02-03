// room evacuation scenario (Fig. S5)

import { Scenario, ScenarioInfo } from './base';
import { Simulation } from '../simulation/simulation';
import { Wall, SimulationParams, Bounds, BoundaryType } from '../simulation/types';
import { createPedestriansInArea } from '../simulation/pedestrian';
import { createCorridorWithDoor } from '../simulation/environment';

export class EvacuationScenario extends Scenario {
  readonly info: ScenarioInfo = {
    name: 'Evacuation',
    description: 'Room evacuation with varying door widths (Fig. S5)',
  };
  
  readonly defaultParams: Partial<SimulationParams> = {
    tau: 0.5,
    phi: (90 * Math.PI) / 180,
    dMax: 2,
    k: 5000,
    dt: 0.02,
  };
  
  // room: 10m x 4m
  readonly bounds: Bounds = {
    xMin: -5,
    xMax: 5,
    yMin: -2,
    yMax: 2,
  };
  
  readonly boundaryType: BoundaryType = 'open';
  
  private pedestrianCount = 80;
  private doorWidth = 1.0;
  private evacuatedCount = 0;
  
  setDoorWidth(width: number): void {
    this.doorWidth = Math.max(0.4, Math.min(2.0, width));
  }
  
  getDoorWidth(): number {
    return this.doorWidth;
  }
  
  getEvacuatedCount(): number {
    return this.evacuatedCount;
  }
  
  createWalls(): Wall[] {
    return createCorridorWithDoor(10, 4, this.doorWidth, 'right');
  }
  
  initializePedestrians(simulation: Simulation): void {
    this.evacuatedCount = 0;
    
    const pedestrians = createPedestriansInArea(
      this.pedestrianCount,
      {
        xMin: this.bounds.xMin + 0.5,
        xMax: this.bounds.xMax - 1,
        yMin: this.bounds.yMin + 0.3,
        yMax: this.bounds.yMax - 0.3,
      },
      () => ({
        x: this.bounds.xMax + 2, // destination outside room
        y: 0,
      }),
      {
        desiredSpeedMean: 1.4,
        desiredSpeedStd: 0.1,
        uniformMass: 60, // uniform mass as per paper
      }
    );
    
    simulation.addPedestrians(pedestrians);
  }
  
  onStep(simulation: Simulation): void {
    // check for pedestrians that have exited
    for (const ped of simulation.pedestrians) {
      if (!ped.active) continue;
      
      // if past the door, mark as evacuated
      if (ped.position.x > this.bounds.xMax + 0.5) {
        ped.active = false;
        this.evacuatedCount++;
      }
    }
  }
  
  isComplete(): boolean {
    return this.evacuatedCount >= this.pedestrianCount;
  }
  
  getCustomMetrics(simulation: Simulation): Record<string, unknown> {
    return {
      evacuatedCount: this.evacuatedCount,
      remainingCount: this.pedestrianCount - this.evacuatedCount,
    };
  }
}
