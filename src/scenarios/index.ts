// scenario registry

import { Scenario } from './base';
import { SinglePedestrianScenario } from './singlePedestrian';
import { TwoPedestrianStaticScenario, TwoPedestrianMovingScenario } from './twoPedestrian';
import { BidirectionalFlowScenario } from './bidirectional';
import { UnidirectionalFlowScenario } from './unidirectional';
import { BottleneckScenario } from './bottleneck';
import { TurningCorridorScenario } from './turningCorridor';
import { EvacuationScenario } from './evacuation';

export { Scenario } from './base';

export const scenarios: Record<string, () => Scenario> = {
  'Single Pedestrian': () => new SinglePedestrianScenario(),
  'Two Pedestrian (Static)': () => new TwoPedestrianStaticScenario(),
  'Two Pedestrian (Moving)': () => new TwoPedestrianMovingScenario(),
  'Bidirectional Flow': () => new BidirectionalFlowScenario(),
  'Unidirectional Flow': () => new UnidirectionalFlowScenario(),
  'Bottleneck': () => new BottleneckScenario(),
  'Turning Corridor': () => new TurningCorridorScenario(),
  'Evacuation': () => new EvacuationScenario(),
};

export function getScenarioNames(): string[] {
  return Object.keys(scenarios);
}

export function createScenario(name: string): Scenario {
  const factory = scenarios[name];
  if (!factory) {
    throw new Error(`Unknown scenario: ${name}`);
  }
  return factory();
}
