// scenario selector utilities

import { Scenario, createScenario, getScenarioNames } from '../scenarios';
import { Simulation } from '../simulation/simulation';
import { SimulationParams, defaultParams } from '../simulation/types';

export interface ScenarioState {
  currentScenario: Scenario;
  simulation: Simulation;
  params: SimulationParams;
}

export function initializeScenario(
  name: string,
  customParams?: Partial<SimulationParams>
): ScenarioState {
  const scenario = createScenario(name);
  const params = { ...defaultParams, ...scenario.defaultParams, ...customParams };
  const simulation = scenario.create(params);
  
  return {
    currentScenario: scenario,
    simulation,
    params,
  };
}

export function switchScenario(
  name: string,
  currentParams?: Partial<SimulationParams>
): ScenarioState {
  const scenario = createScenario(name);
  
  // merge scenario defaults with any custom params
  const params = { ...defaultParams, ...scenario.defaultParams, ...currentParams };
  const simulation = scenario.create(params);
  
  return {
    currentScenario: scenario,
    simulation,
    params,
  };
}

export function resetCurrentScenario(state: ScenarioState): void {
  state.currentScenario.reset(state.simulation);
}

export { getScenarioNames };
