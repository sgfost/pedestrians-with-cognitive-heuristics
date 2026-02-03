// core types for pedestrian simulation

import { Vec2 } from '../utils/vector';

export interface Pedestrian {
  id: number;
  position: Vec2;
  velocity: Vec2;
  mass: number;           // kg
  radius: number;         // m (derived: mass / 320)
  desiredSpeed: number;   // m/s
  destination: Vec2;
  direction: number;      // 1 or -1 for flow direction in bidirectional scenarios
  active: boolean;        // whether pedestrian is in simulation
}

export interface Wall {
  start: Vec2;
  end: Vec2;
  // line equation ax + by + c = 0
  a: number;
  b: number;
  c: number;
  normal: Vec2;  // unit normal
}

export type BoundaryType = 'closed' | 'periodic' | 'open';

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Environment {
  walls: Wall[];
  boundaryType: BoundaryType;
  bounds: Bounds;
}

export interface SimulationParams {
  tau: number;              // relaxation time (s), default 0.5
  phi: number;              // vision half-angle (radians)
  dMax: number;             // horizon distance (m)
  k: number;                // contact stiffness, default 5000
  dt: number;               // time step (s), default 0.02
  angularResolution: number; // direction search step (radians)
}

export const defaultParams: SimulationParams = {
  tau: 0.5,
  phi: (75 * Math.PI) / 180,  // 75 degrees
  dMax: 10.0,
  k: 5000,
  dt: 0.02,
  angularResolution: (1 * Math.PI) / 180,  // 1 degree
};

export interface VisionResult {
  angles: number[];      // relative angles in [-phi, phi]
  distances: number[];   // distance to first obstacle for each angle
}

export interface DirectionResult {
  alphaDes: number;           // chosen direction (relative to heading)
  distanceToObstacle: number; // distance in chosen direction
}

// metrics types
export interface SimulationMetrics {
  time: number;
  pedestrianCount: number;
  averageSpeed: number;
  occupancy: number;
  bandIndex?: number;           // for bidirectional flow
  averageCompression?: number;  // for high density scenarios
}

export interface LocalSpeedField {
  x: number[];
  values: number[];   // local speed at each x position
}

// scenario configuration
export interface ScenarioConfig {
  name: string;
  description: string;
  params: Partial<SimulationParams>;
  bounds: Bounds;
  boundaryType: BoundaryType;
}
