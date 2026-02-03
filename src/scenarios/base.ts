// base scenario class

import { Simulation } from '../simulation/simulation';
import { Environment, SimulationParams, Bounds, BoundaryType, SimulationMetrics } from '../simulation/types';
import { createEnvironment } from '../simulation/environment';
import { resetPedestrianIds } from '../simulation/pedestrian';

export interface ScenarioInfo {
  name: string;
  description: string;
}

export abstract class Scenario {
  abstract readonly info: ScenarioInfo;
  abstract readonly defaultParams: Partial<SimulationParams>;
  abstract readonly bounds: Bounds;
  abstract readonly boundaryType: BoundaryType;
  
  protected simulation: Simulation | null = null;
  
  // create walls for this scenario
  abstract createWalls(): import('../simulation/types').Wall[];
  
  // initialize pedestrians
  abstract initializePedestrians(simulation: Simulation): void;
  
  // optional: custom step logic (e.g., respawning for periodic boundaries)
  onStep?(simulation: Simulation): void;
  
  // optional: custom metrics
  getCustomMetrics?(simulation: Simulation): Record<string, unknown>;
  
  // create and initialize the simulation
  create(customParams?: Partial<SimulationParams>): Simulation {
    resetPedestrianIds();
    
    const walls = this.createWalls();
    const environment = createEnvironment(walls, this.bounds, this.boundaryType);
    
    const params = { ...this.defaultParams, ...customParams };
    const simulation = new Simulation(environment, params);
    
    this.initializePedestrians(simulation);
    
    if (this.onStep) {
      simulation.onStep(this.onStep.bind(this));
    }
    
    this.simulation = simulation;
    return simulation;
  }
  
  // reset the scenario
  reset(simulation: Simulation): void {
    resetPedestrianIds();
    simulation.reset();
    this.initializePedestrians(simulation);
  }
}
