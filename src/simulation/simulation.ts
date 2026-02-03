// main simulation loop and integration

import { Vec2, vec2 } from '../utils/vector';
import { wrapPosition, periodicDisplacement } from '../utils/geometry';
import { Pedestrian, Wall, Environment, SimulationParams, defaultParams, SimulationMetrics } from './types';
import { computeVision } from './vision';
import { computeDesiredVelocity } from './heuristics';
import { computeContactForces, computeAverageCompression } from './physics';

export class Simulation {
  public pedestrians: Pedestrian[] = [];
  public environment: Environment;
  public params: SimulationParams;
  public time = 0;
  
  private onStepCallbacks: Array<(sim: Simulation) => void> = [];
  
  constructor(
    environment: Environment,
    params: Partial<SimulationParams> = {}
  ) {
    this.environment = environment;
    this.params = { ...defaultParams, ...params };
  }
  
  // add a callback to run after each step
  onStep(callback: (sim: Simulation) => void): void {
    this.onStepCallbacks.push(callback);
  }
  
  // add pedestrians to simulation
  addPedestrians(pedestrians: Pedestrian[]): void {
    this.pedestrians.push(...pedestrians);
  }
  
  // clear all pedestrians
  clearPedestrians(): void {
    this.pedestrians = [];
  }
  
  // reset simulation state
  reset(): void {
    this.pedestrians = [];
    this.time = 0;
  }
  
  // run one simulation step
  step(): void {
    const { pedestrians, environment, params } = this;
    const { walls, boundaryType, bounds } = environment;
    const periodic = boundaryType === 'periodic';
    
    // compute contact forces for all pedestrians
    const forces = computeContactForces(pedestrians, walls, params, bounds, periodic);
    
    // update each pedestrian
    for (let i = 0; i < pedestrians.length; i++) {
      const ped = pedestrians[i];
      if (!ped.active) continue;
      
      // compute direction to destination
      // IMPORTANT: for periodic boundaries, use the pedestrian's intended direction
      // (stored in ped.direction) rather than shortest path, so they walk THROUGH
      // the crowd instead of taking shortcuts around the boundary
      let heading: number;
      
      if (periodic) {
        // use the direction field to determine base heading
        // direction = 1 means walking in +x direction, -1 means -x direction
        // this ensures pedestrians walk through each other for lane formation
        heading = ped.direction > 0 ? 0 : Math.PI;
      } else {
        // for non-periodic, head directly toward destination
        const toDestination = vec2.sub(ped.destination, ped.position);
        const dist = vec2.length(toDestination);
        if (dist > 0.1) {
          heading = vec2.angle(toDestination);
        } else {
          // already at destination, use current velocity direction or default
          heading = vec2.length(ped.velocity) > 0.01 
            ? vec2.angle(ped.velocity) 
            : 0;
        }
      }
      
      // compute visual information f(α)
      const vision = computeVision(ped, pedestrians, walls, params, bounds, periodic, heading);
      
      // apply heuristics to get desired velocity
      const { alphaDes, speedDes } = computeDesiredVelocity(
        ped.desiredSpeed,
        vision.angles,
        vision.distances,
        params
      );
      
      // compute desired velocity vector
      const absDirection = heading + alphaDes;
      const vDes = vec2.fromAngle(absDirection, speedDes);
      
      // compute acceleration
      // relaxation: (vDes - v) / τ
      const relaxation = vec2.scale(
        vec2.sub(vDes, ped.velocity),
        1 / params.tau
      );
      
      // contact acceleration: F / m
      const contactAccel = vec2.scale(forces[i], 1 / ped.mass);
      
      // total acceleration
      const acceleration = vec2.add(relaxation, contactAccel);
      
      // euler integration
      ped.velocity = vec2.add(ped.velocity, vec2.scale(acceleration, params.dt));
      ped.position = vec2.add(ped.position, vec2.scale(ped.velocity, params.dt));
      
      // handle periodic boundaries
      if (periodic) {
        ped.position = wrapPosition(ped.position, bounds);
      }
    }
    
    this.time += params.dt;
    
    // run callbacks
    for (const callback of this.onStepCallbacks) {
      callback(this);
    }
  }
  
  // run multiple steps
  stepN(n: number): void {
    for (let i = 0; i < n; i++) {
      this.step();
    }
  }
  
  // get current metrics
  getMetrics(): SimulationMetrics {
    const activePeds = this.pedestrians.filter(p => p.active);
    const count = activePeds.length;
    
    // average speed
    let totalSpeed = 0;
    for (const ped of activePeds) {
      totalSpeed += vec2.length(ped.velocity);
    }
    const averageSpeed = count > 0 ? totalSpeed / count : 0;
    
    // occupancy (fraction of area covered by bodies)
    const { bounds } = this.environment;
    const area = (bounds.xMax - bounds.xMin) * (bounds.yMax - bounds.yMin);
    let bodyArea = 0;
    for (const ped of activePeds) {
      bodyArea += Math.PI * ped.radius * ped.radius;
    }
    const occupancy = bodyArea / area;
    
    // average compression
    const periodic = this.environment.boundaryType === 'periodic';
    const averageCompression = computeAverageCompression(
      this.pedestrians,
      this.environment.bounds,
      periodic
    );
    
    return {
      time: this.time,
      pedestrianCount: count,
      averageSpeed,
      occupancy,
      averageCompression,
    };
  }
  
  // get pedestrians moving in a specific direction
  getPedestriansByDirection(direction: number): Pedestrian[] {
    return this.pedestrians.filter(p => p.active && p.direction === direction);
  }
}
