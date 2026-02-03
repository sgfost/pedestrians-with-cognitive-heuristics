# Pedestrian Simulation Replication Specification

## Overview

This document specifies the complete implementation of the cognitive heuristics-based pedestrian model from:

> Moussaïd, M., Helbing, D., & Theraulaz, G. (2011). How simple rules determine pedestrian behavior and crowd disasters. *PNAS*, 108(17), 6884-6888.

The model uses two behavioral heuristics based on visual information to determine pedestrian walking direction and speed, combined with physical contact forces for high-density scenarios.

---

## 1. Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Type safety, runs natively in browser |
| Rendering | Three.js | Real-time 2D/3D rendering, interactive |
| Build Tool | Vite | Fast dev server, simple bundling |
| UI Framework | Vanilla DOM + dat.gui | Lightweight, no framework overhead |
| Deployment | Static files | No server needed, runs entirely client-side |

### Advantages of Browser-Only Architecture
- No server infrastructure required
- Zero latency between simulation and visualization
- Easy to share (just host static files)
- Works offline once loaded
- Simpler debugging (single runtime)

---

## 2. Model Specification

### 2.1 Pedestrian State Variables

Each pedestrian `i` is characterized by:

| Variable | Symbol | Type | Description |
|----------|--------|------|-------------|
| Position | `x_i` | Vector (x, y) | Current location in 2D space |
| Velocity | `v_i` | Vector (vx, vy) | Current velocity |
| Mass | `m_i` | Scalar (kg) | Body mass, uniform in [60, 100] kg |
| Body radius | `r_i` | Scalar (m) | `r_i = m_i / 320` |
| Desired speed | `v0_i` | Scalar (m/s) | Comfortable walking speed |
| Destination | `O_i` | Vector (x, y) | Target location |

### 2.2 Model Parameters

| Parameter | Symbol | Default Value | Description |
|-----------|--------|---------------|-------------|
| Relaxation time | `τ` | 0.5 s | Time to adjust to desired velocity |
| Vision field half-angle | `φ` | 45° - 90° | Angular extent of vision (scenario-dependent) |
| Horizon distance | `d_max` | 8 - 10 m | Maximum perception distance |
| Contact stiffness | `k` | 5 × 10³ kg/s² | Body collision force coefficient |
| Desired speed mean | `v0_mean` | 1.3 m/s | Mean comfortable walking speed |
| Desired speed std | `v0_std` | 0.2 m/s | Standard deviation of walking speeds |
| Angular resolution | - | 1° | Resolution for direction search |
| Time step | `dt` | 0.01 - 0.05 s | Integration time step |

### 2.3 Visual Information Function f(α)

For each candidate direction `α` in `[-φ, +φ]`:

1. Compute distance to first collision `f(α)` if pedestrian moves at speed `v0_i` in direction `α`
2. Account for other pedestrians' velocities and body sizes
3. If no collision expected, set `f(α) = d_max`

#### 2.3.1 Collision with Other Pedestrians

The expected collision time `Δt` with pedestrian `j` is found by solving:

```
d_ij(Δt) = r_i + r_j
```

Where:
```
d_ij(Δt) = sqrt[(x_i(Δt) - x_j(Δt))² + (y_i(Δt) - y_j(Δt))²]
```

With linear motion prediction:
```
x_i(Δt) = x_i(t₀) + Δt · vx_i
y_i(Δt) = y_i(t₀) + Δt · vy_i
```

This yields a quadratic equation `AΔt² + BΔt + C = 0` with:
```
A = (vx_j - vx_i)² + (vy_j - vy_i)²
B = 2(vx_j - vx_i)(x_j - x_i) + 2(vy_j - vy_i)(y_j - y_i)
C = (x_j - x_i)² + (y_j - y_i)² - (r_i + r_j)²
```

**Note:** The paper has a typo in the SI (uses `r_i - r_j` instead of `r_i + r_j` in C).

Take smallest positive root `Δt`, then `f_j(α) = v0_i · Δt`

**Special case:** If pedestrians already in contact at `t₀`:
- `f_j(α) = 0` if `β₁ < α < β₂` (direction towards pedestrian j)
- `f_j(α) = d_max` otherwise
- Where `β₁, β₂` are angular bounds of pedestrian j from i's perspective

#### 2.3.2 Collision with Walls

For a wall segment with line equation `ax + by + c = 0`:

Distance to wall at time `Δt`:
```
d_iW(Δt) = |a·x_i(Δt) + b·y_i(Δt) + c| / sqrt(a² + b²)
```

Collision time when `d_iW(Δt) = r_i`:
```
Δt = (r_i · sqrt(a² + b²) - a·x_i(t₀) - b·y_i(t₀) - c) / (a·vx_i + b·vy_i)
```

(Take the appropriate solution that gives positive Δt approaching the wall)

Set `f_W(α) = d_max` if direction points away from wall segment.

#### 2.3.3 Combined Visual Function

```
f(α) = min(min_j(f_j(α)), min_W(f_W(α)))
```

Where:
- `j` iterates over all visible pedestrians
- `W` iterates over all walls
- Only consider pedestrians/walls in the field of view `[-φ, +φ]`

### 2.4 Heuristic 1: Direction Selection

**Principle:** Choose direction that minimizes distance to destination while avoiding obstacles.

The chosen direction `α_des` minimizes:
```
d(α) = d_max² + f(α)² - 2·d_max·f(α)·cos(α₀ - α)
```

Where `α₀` is the direction to the destination point `O_i`.

**Implementation:** Evaluate `d(α)` for all `α` in `[-φ, +φ]` at the chosen angular resolution, select `α` with minimum `d(α)`.

### 2.5 Heuristic 2: Speed Selection

**Principle:** Maintain safe distance for reaction time.

```
v_des = min(v0_i, d_h / τ)
```

Where `d_h = f(α_des)` is the distance to the first obstacle in the chosen direction.

### 2.6 Velocity Update (Normal Conditions)

The desired velocity vector:
```
v_des = v_des · (cos(α_des + heading), sin(α_des + heading))
```

Where `heading` is the current line of sight direction (direction to destination).

**Wait, clarification needed:** The angle `α` is relative to the line of sight `H_i`. So:
- `α = 0` means straight toward destination
- `α_des` is the deviation from the direct path

Absolute direction of desired velocity:
```
θ_des = θ_destination + α_des
```
Where `θ_destination = atan2(O_y - y_i, O_x - x_i)`

Relaxation dynamics:
```
dv_i/dt = (v_des - v_i) / τ
```

### 2.7 Physical Contact Forces (High Density)

When pedestrians physically overlap:

```
f_ij = k · g(r_i + r_j - d_ij) · n_ij
```

Where:
- `g(x) = x` if `x > 0` (overlap), else `0`
- `n_ij` = unit vector from j to i
- `d_ij` = distance between centers of mass

Wall contact force:
```
f_iW = k · g(r_i - d_iW) · n_iW
```

Where `n_iW` is perpendicular to wall, pointing toward pedestrian.

### 2.8 Full Equations of Motion

```
dv_i/dt = (v_des - v_i) / τ + (1/m_i) · Σ_j f_ij + (1/m_i) · Σ_W f_iW

dx_i/dt = v_i
```

### 2.9 Numerical Integration

Use Euler method (as implied by the paper's relaxation dynamics):

```
v_i(t + dt) = v_i(t) + dt · dv_i/dt
x_i(t + dt) = x_i(t) + dt · v_i(t + dt)
```

---

## 3. Simulation Scenarios

### 3.1 Single Pedestrian Acceleration (Fig. S1)

**Purpose:** Validate acceleration behavior without interactions.

| Parameter | Value |
|-----------|-------|
| τ | 0.54 s |
| φ | 90° |
| d_max | 10 m |
| k | 5 × 10³ |
| v0_i | 1.29 m/s |
| Reaction time | 0.35 s |

**Setup:**
- Single pedestrian starts at rest
- Walks toward destination
- Measure speed over time

**Metric:** Speed vs. time curve

### 3.2 Two-Pedestrian Avoidance: Static Obstacle (Fig. 2A)

**Purpose:** Validate avoidance trajectory around static person.

| Parameter | Value |
|-----------|-------|
| Corridor length | 7.88 m |
| Corridor width | 1.75 m |
| τ | 0.5 s |
| φ | 75° |
| d_max | 10 m |
| k | 5 × 10³ |
| v0_i | 1.3 m/s |

**Setup:**
- Pedestrian A walks from one end to other
- Pedestrian B stands stationary in middle
- Track A's trajectory (y vs. x)

**Metric:** Average trajectory ± standard deviation (n=148 replications)

### 3.3 Two-Pedestrian Avoidance: Moving Opposite (Fig. 2B)

**Purpose:** Validate avoidance when both pedestrians moving.

Same parameters as 3.2.

**Setup:**
- Two pedestrians start at opposite ends
- Walk toward each other
- Track trajectories

**Metric:** Average trajectory ± standard deviation (n=123 replications)

### 3.4 Bidirectional Flow: Lane Formation (Fig. S2)

**Purpose:** Demonstrate spontaneous lane formation.

| Parameter | Value |
|-----------|-------|
| Street length | 16 m |
| Street width | 4 m |
| Number of pedestrians | 60 (30 each direction) |
| Boundary conditions | Periodic |
| τ | 0.5 s |
| φ | 90° |
| d_max | 10 m |
| k | 5 × 10³ |
| v0_i | 1.3 m/s |

**Setup:**
- Random initial positions
- Half walk left→right, half right→left
- Simulate for 30+ seconds

**Metrics:**
- Band index Y(t) over time
- Visual snapshots showing lane emergence

#### Band Index Calculation

For bands of width `d = 0.3 m`:
```
Y_B(t) = |n₁ - n₂| / (n₁ + n₂)
```
Where `n₁`, `n₂` are counts of pedestrians in each flow direction within band B.

`Y(t)` = average over all bands (stepping `y₀` by Δy = 0.1 m)

- Y = 0: completely mixed
- Y = 1: perfect segregation

### 3.5 Unidirectional Flow: Velocity-Density Relation (Fig. 3A)

**Purpose:** Reproduce fundamental diagram.

| Parameter | Value |
|-----------|-------|
| Street length | 8 m |
| Street width | 3 m |
| Number of pedestrians | 6 to 96 (varied) |
| Boundary conditions | Periodic |
| Simulation time | 90 s |
| τ | 0.5 s |
| φ | 45° |
| d_max | 8 m |
| k | 5 × 10³ |
| v0_i | Normal(1.3, 0.2) m/s |

**Setup:**
- All pedestrians walk same direction
- Vary density by changing pedestrian count
- Average speeds over space and time

**Metrics:**
- Average speed vs. occupancy (fraction of area covered by bodies)
- Average body compression C vs. occupancy

#### Occupancy Calculation
```
Occupancy = Σ_i (π · r_i²) / (street_length × street_width)
```

### 3.6 Unidirectional Flow: Stop-and-Go Waves (Fig. 3B, C)

**Purpose:** Demonstrate emergence of backward-propagating waves.

Same setup as 3.5, analyze at intermediate densities.

**Metrics:**
- Space-time diagrams of local speed
- Correlation coefficient between V(x, t) and V(x-X, t+T)
  - X = 2 m
  - T = 3, 5, 7 s
- Identify occupancy range where waves occur (0.4 to 0.65)
- Wave propagation speed (~0.6 m/s)

#### Local Speed Calculation

```
V(x, t) = Σ_i ||v_i|| · f(d_ix) / Σ_i f(d_ix)
```

Where:
```
f(d) = (1 / πR²) · exp(-d² / R²)
```
With R = 0.7 m

### 3.7 Bottleneck: Crowd Turbulence (Fig. 4)

**Purpose:** Reproduce crowd disaster conditions.

| Parameter | Value |
|-----------|-------|
| Corridor length | 10 m |
| Corridor width | 6 m |
| Bottleneck width | 4 m |
| Number of pedestrians | 360 |
| Simulation time | 240 s |
| Boundary conditions | Periodic |
| Occupancy | 0.98 |

**Metrics:**
- Local body compression C(x)
- Crowd pressure P(x) = ρ(x) × Var(V(x,t))
- Displacement distribution (power law with exponent ~1.95)

#### Displacement Definition
Location change between two subsequent stops (when ||v_i|| < 0.05 m/s)

### 3.8 Turning Corridor (Fig. S4)

**Purpose:** Simulate 90° turn under high density.

| Parameter | Value |
|-----------|-------|
| Occupancy | 0.98 |

**Setup:**
- L-shaped corridor with 90° turn
- Unidirectional flow

**Metrics:**
- Crowd pressure map

### 3.9 Room Evacuation (Fig. S5)

**Purpose:** Validate evacuation times for different door widths.

| Parameter | Value |
|-----------|-------|
| Room width | 4 m |
| Room length | 10 m |
| Number of pedestrians | 80 |
| Door widths | 0.6 to 1.2 m |
| τ | 0.5 s |
| φ | 90° |
| d_max | 2 m |
| m_i | 60 kg (uniform) |
| k | 5 × 10³ |
| v0_i | 1.4 m/s |
| Replications | 50 per door size |

**Metrics:**
- Evacuation time vs. door width
- Mean ± standard deviation

---

## 4. Implementation Architecture

### 4.1 Project Structure

```
simple-rules-pedestrians/
├── SPEC.md                    # this file
├── README.md                  # project overview, setup instructions
├── package.json               # npm dependencies
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite bundler config
├── index.html                 # entry point
├── src/
│   ├── main.ts                # application entry
│   ├── simulation/
│   │   ├── types.ts           # interfaces and types
│   │   ├── pedestrian.ts      # Pedestrian class
│   │   ├── environment.ts     # Walls, boundaries
│   │   ├── vision.ts          # f(α) computation
│   │   ├── heuristics.ts      # direction/speed selection
│   │   ├── physics.ts         # contact forces
│   │   └── simulation.ts      # main simulation loop + integration
│   ├── scenarios/
│   │   ├── index.ts           # scenario registry
│   │   ├── base.ts            # base scenario class
│   │   ├── singlePedestrian.ts
│   │   ├── twoPedestrian.ts
│   │   ├── bidirectional.ts
│   │   ├── unidirectional.ts
│   │   ├── bottleneck.ts
│   │   ├── turningCorridor.ts
│   │   └── evacuation.ts
│   ├── metrics/
│   │   ├── index.ts
│   │   ├── localSpeed.ts
│   │   ├── compression.ts
│   │   ├── bandIndex.ts
│   │   └── displacement.ts
│   ├── rendering/
│   │   ├── renderer.ts        # Three.js scene setup
│   │   ├── pedestrianMesh.ts  # pedestrian visual representation
│   │   └── environmentMesh.ts # walls, floor rendering
│   ├── ui/
│   │   ├── controls.ts        # dat.gui parameter controls
│   │   ├── scenarioSelector.ts
│   │   └── metricsPanel.ts    # real-time stats display
│   └── utils/
│       ├── vector.ts          # 2D vector operations
│       └── geometry.ts        # line intersections, etc.
├── styles/
│   └── main.css
└── public/
    └── (static assets if any)
```

### 4.2 Core Types and Classes

#### Vector2D
```typescript
interface Vec2 {
  x: number;
  y: number;
}

// utility functions
const vec2 = {
  create: (x: number, y: number): Vec2 => ({ x, y }),
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  length: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vec2): Vec2 => {
    const len = vec2.length(v);
    return len > 0 ? vec2.scale(v, 1 / len) : { x: 0, y: 0 };
  },
  angle: (v: Vec2): number => Math.atan2(v.y, v.x),
  fromAngle: (angle: number, magnitude = 1): Vec2 => ({
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  }),
};
```

#### Pedestrian
```typescript
interface Pedestrian {
  id: number;
  position: Vec2;
  velocity: Vec2;
  mass: number;           // kg
  radius: number;         // m (derived: mass / 320)
  desiredSpeed: number;   // m/s
  destination: Vec2;
  direction: number;      // 1 or -1 for bidirectional scenarios
}
```

#### Wall
```typescript
interface Wall {
  start: Vec2;
  end: Vec2;
  // derived for line equation ax + by + c = 0
  a: number;
  b: number;
  c: number;
  normal: Vec2;  // unit normal pointing "inside"
}
```

#### Environment
```typescript
interface Environment {
  walls: Wall[];
  boundaryType: 'closed' | 'periodic' | 'open';
  bounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
}
```

#### Simulation Parameters
```typescript
interface SimulationParams {
  tau: number;              // relaxation time (s), default 0.5
  phi: number;              // vision half-angle (radians)
  dMax: number;             // horizon distance (m)
  k: number;                // contact stiffness, default 5000
  dt: number;               // time step (s), default 0.02
  angularResolution: number; // direction search step (radians)
}

const defaultParams: SimulationParams = {
  tau: 0.5,
  phi: Math.PI / 180 * 75,  // 75 degrees
  dMax: 10.0,
  k: 5000,
  dt: 0.02,
  angularResolution: Math.PI / 180,  // 1 degree
};
```

### 4.3 Application Architecture

```typescript
// main application state
interface AppState {
  simulation: Simulation;
  renderer: Renderer;
  scenario: Scenario;
  params: SimulationParams;
  isRunning: boolean;
  simulationTime: number;
}

// main loop using requestAnimationFrame
class App {
  private state: AppState;
  private lastFrameTime: number = 0;
  
  start(): void {
    this.state.isRunning = true;
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private loop(timestamp: number): void {
    if (!this.state.isRunning) return;
    
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    
    // run simulation steps (may run multiple steps per frame for speed)
    const stepsPerFrame = Math.max(1, Math.floor(deltaTime / this.state.params.dt));
    for (let i = 0; i < stepsPerFrame; i++) {
      this.state.simulation.step();
      this.state.simulationTime += this.state.params.dt;
    }
    
    // update visualization
    this.state.renderer.render(this.state.simulation.pedestrians);
    
    // update metrics display
    this.updateMetrics();
    
    requestAnimationFrame(this.loop.bind(this));
  }
  
  stop(): void {
    this.state.isRunning = false;
  }
  
  reset(): void {
    this.state.scenario.initialize(this.state.simulation);
    this.state.simulationTime = 0;
  }
}
```

### 4.4 Visualization Features

#### Three.js Renderer
```typescript
class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;  // 2D top-down view
  private renderer: THREE.WebGLRenderer;
  private pedestrianMeshes: Map<number, THREE.Mesh>;
  
  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    // orthographic camera for 2D view
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.OrthographicCamera(
      -10 * aspect, 10 * aspect, 10, -10, 0.1, 100
    );
    this.camera.position.z = 50;
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
  }
  
  render(pedestrians: Pedestrian[]): void {
    // update pedestrian positions
    for (const ped of pedestrians) {
      let mesh = this.pedestrianMeshes.get(ped.id);
      if (!mesh) {
        mesh = this.createPedestrianMesh(ped);
        this.pedestrianMeshes.set(ped.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(ped.position.x, ped.position.y, 0);
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}
```

#### Main View
- 2D top-down orthographic view of simulation area
- Pedestrians as circles (color-coded by flow direction or speed)
- Walls shown as thick lines
- Optional: velocity vectors, vision cones, destination markers

#### Controls Panel (dat.gui)
```typescript
import * as dat from 'dat.gui';

function setupControls(app: App, params: SimulationParams): dat.GUI {
  const gui = new dat.GUI();
  
  // scenario selection
  gui.add(app, 'scenario', [
    'Single Pedestrian',
    'Two Pedestrian (Static)',
    'Two Pedestrian (Moving)',
    'Bidirectional Flow',
    'Unidirectional Flow',
    'Bottleneck',
    'Turning Corridor',
    'Evacuation',
  ]).onChange((name) => app.loadScenario(name));
  
  // simulation controls
  const simFolder = gui.addFolder('Simulation');
  simFolder.add(app, 'start').name('▶ Start');
  simFolder.add(app, 'stop').name('⏸ Stop');
  simFolder.add(app, 'reset').name('↺ Reset');
  simFolder.add(app, 'step').name('→ Step');
  simFolder.open();
  
  // model parameters
  const paramFolder = gui.addFolder('Parameters');
  paramFolder.add(params, 'tau', 0.1, 2.0).name('τ (relaxation)');
  paramFolder.add(params, 'phi', 30, 120).name('φ° (vision)');
  paramFolder.add(params, 'dMax', 2, 20).name('d_max (horizon)');
  paramFolder.add(params, 'k', 1000, 20000).name('k (stiffness)');
  paramFolder.open();
  
  return gui;
}
```

#### Metrics Panel
- Real-time stats overlay (simulation time, pedestrian count, avg speed)
- Scenario-specific metrics (band index, occupancy, etc.)
- Optional: mini line chart for time-series data

---

## 5. Algorithm Details

### 5.1 Vision Function f(α) - Full Algorithm

```typescript
function computeFAlpha(
  pedestrian: Pedestrian,
  others: Pedestrian[],
  walls: Wall[],
  params: SimulationParams
): { angles: number[]; distances: number[] } {
  const angles: number[] = [];
  const distances: number[] = [];
  
  // direction to destination (line of sight)
  const toDestination = vec2.sub(pedestrian.destination, pedestrian.position);
  const heading = vec2.angle(toDestination);
  
  // iterate through all candidate directions
  for (let alpha = -params.phi; alpha <= params.phi; alpha += params.angularResolution) {
    angles.push(alpha);
    let minDist = params.dMax;
    
    // absolute direction for this candidate
    const absDirection = heading + alpha;
    
    // candidate velocity (if pedestrian moved in this direction)
    const vCandidate = vec2.fromAngle(absDirection, pedestrian.desiredSpeed);
    
    // check collision with each other pedestrian
    for (const other of others) {
      if (other.id === pedestrian.id) continue;
      const dist = collisionDistancePedestrian(pedestrian, other, vCandidate, params.dMax);
      minDist = Math.min(minDist, dist);
    }
    
    // check collision with each wall
    for (const wall of walls) {
      const dist = collisionDistanceWall(pedestrian, wall, vCandidate, params.dMax);
      minDist = Math.min(minDist, dist);
    }
    
    distances.push(minDist);
  }
  
  return { angles, distances };
}
```

### 5.2 Direction Selection

```typescript
function selectDirection(
  angles: number[],
  distances: number[],
  params: SimulationParams
): { alphaDes: number; distanceToObstacle: number } {
  // α₀ = 0 in local coordinates (directly toward destination)
  const alpha0 = 0;
  
  let minCost = Infinity;
  let bestIdx = 0;
  
  // compute d(α) for each candidate and find minimum
  for (let i = 0; i < angles.length; i++) {
    const alpha = angles[i];
    const f = distances[i];
    
    // cost function from paper: distance to destination via this path
    const cost = params.dMax * params.dMax 
               + f * f 
               - 2 * params.dMax * f * Math.cos(alpha0 - alpha);
    
    if (cost < minCost) {
      minCost = cost;
      bestIdx = i;
    }
  }
  
  return {
    alphaDes: angles[bestIdx],
    distanceToObstacle: distances[bestIdx],
  };
}
```

### 5.3 Speed Selection

```typescript
function selectSpeed(
  pedestrian: Pedestrian,
  distanceToObstacle: number,
  params: SimulationParams
): number {
  // heuristic 2: maintain safe braking distance
  return Math.min(pedestrian.desiredSpeed, distanceToObstacle / params.tau);
}
```

### 5.4 Contact Forces

```typescript
function computeContactForces(
  pedestrians: Pedestrian[],
  walls: Wall[],
  params: SimulationParams
): Vec2[] {
  const forces: Vec2[] = pedestrians.map(() => ({ x: 0, y: 0 }));
  
  for (let i = 0; i < pedestrians.length; i++) {
    const pi = pedestrians[i];
    
    // pedestrian-pedestrian contacts
    for (let j = i + 1; j < pedestrians.length; j++) {
      const pj = pedestrians[j];
      const delta = vec2.sub(pi.position, pj.position);
      const dist = vec2.length(delta);
      const overlap = pi.radius + pj.radius - dist;
      
      if (overlap > 0) {
        const normal = dist > 0 ? vec2.scale(delta, 1 / dist) : { x: 1, y: 0 };
        const force = vec2.scale(normal, params.k * overlap);
        forces[i] = vec2.add(forces[i], force);
        forces[j] = vec2.sub(forces[j], force);
      }
    }
    
    // pedestrian-wall contacts
    for (const wall of walls) {
      const { distance, normal } = distanceToWall(pi.position, wall);
      const overlap = pi.radius - distance;
      
      if (overlap > 0) {
        const force = vec2.scale(normal, params.k * overlap);
        forces[i] = vec2.add(forces[i], force);
      }
    }
  }
  
  return forces;
}
```

### 5.5 Collision Distance Helpers

```typescript
/**
 * Compute distance a pedestrian can travel in direction vCandidate
 * before colliding with another pedestrian.
 */
function collisionDistancePedestrian(
  pi: Pedestrian,
  pj: Pedestrian,
  vCandidate: Vec2,
  dMax: number
): number {
  // relative position and velocity
  const dx = pj.position.x - pi.position.x;
  const dy = pj.position.y - pi.position.y;
  const dvx = pj.velocity.x - vCandidate.x;
  const dvy = pj.velocity.y - vCandidate.y;
  
  // quadratic coefficients for ||p_i(t) - p_j(t)|| = r_i + r_j
  const A = dvx * dvx + dvy * dvy;
  const B = 2 * (dvx * dx + dvy * dy);
  const C = dx * dx + dy * dy - Math.pow(pi.radius + pj.radius, 2);
  
  // solve quadratic
  const discriminant = B * B - 4 * A * C;
  
  if (A < 1e-10) {
    // parallel motion, no collision or already colliding
    return C <= 0 ? 0 : dMax;
  }
  
  if (discriminant < 0) {
    // no real solution, no collision
    return dMax;
  }
  
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-B - sqrtDisc) / (2 * A);
  const t2 = (-B + sqrtDisc) / (2 * A);
  
  // take smallest positive time
  let tCollision = Infinity;
  if (t1 > 0) tCollision = t1;
  else if (t2 > 0) tCollision = t2;
  
  if (tCollision === Infinity) {
    return dMax;
  }
  
  // distance = speed * time
  const distance = vec2.length(vCandidate) * tCollision;
  return Math.min(distance, dMax);
}

/**
 * Compute distance to collision with a wall.
 */
function collisionDistanceWall(
  ped: Pedestrian,
  wall: Wall,
  vCandidate: Vec2,
  dMax: number
): number {
  const speed = vec2.length(vCandidate);
  if (speed < 1e-10) return dMax;
  
  // wall line: ax + by + c = 0
  const { a, b, c } = wall;
  const norm = Math.sqrt(a * a + b * b);
  
  // current signed distance to wall
  const d0 = (a * ped.position.x + b * ped.position.y + c) / norm;
  
  // rate of approach to wall
  const approach = (a * vCandidate.x + b * vCandidate.y) / norm;
  
  if (approach >= 0) {
    // moving away from or parallel to wall
    return dMax;
  }
  
  // time to reach distance r from wall
  const tCollision = (Math.abs(d0) - ped.radius) / Math.abs(approach);
  
  if (tCollision < 0) {
    // already past wall or inside
    return 0;
  }
  
  // check if collision point is within wall segment bounds
  const collisionPoint = {
    x: ped.position.x + vCandidate.x * tCollision,
    y: ped.position.y + vCandidate.y * tCollision,
  };
  
  if (!isPointOnWallSegment(collisionPoint, wall)) {
    return dMax;
  }
  
  const distance = speed * tCollision;
  return Math.min(distance, dMax);
}

/**
 * Distance from a point to a wall (for contact force calculation).
 */
function distanceToWall(
  position: Vec2,
  wall: Wall
): { distance: number; normal: Vec2 } {
  const { a, b, c } = wall;
  const norm = Math.sqrt(a * a + b * b);
  
  // signed distance
  const signedDist = (a * position.x + b * position.y + c) / norm;
  
  // normal pointing toward the pedestrian
  const normal = signedDist >= 0 
    ? { x: a / norm, y: b / norm }
    : { x: -a / norm, y: -b / norm };
  
  return {
    distance: Math.abs(signedDist),
    normal,
  };
}
```

### 5.6 Integration Step

```typescript
function step(
  pedestrians: Pedestrian[],
  walls: Wall[],
  params: SimulationParams
): void {
  // compute contact forces for all pedestrians
  const forces = computeContactForces(pedestrians, walls, params);
  
  for (let i = 0; i < pedestrians.length; i++) {
    const ped = pedestrians[i];
    
    // compute f(α) - visual information
    const { angles, distances } = computeFAlpha(ped, pedestrians, walls, params);
    
    // heuristic 1: select direction
    const { alphaDes, distanceToObstacle } = selectDirection(angles, distances, params);
    
    // heuristic 2: select speed
    const vDesMag = selectSpeed(ped, distanceToObstacle, params);
    
    // compute desired velocity vector
    const toDestination = vec2.sub(ped.destination, ped.position);
    const heading = vec2.angle(toDestination);
    const vDes = vec2.fromAngle(heading + alphaDes, vDesMag);
    
    // compute acceleration: relaxation + contact forces
    const relaxation = vec2.scale(
      vec2.sub(vDes, ped.velocity),
      1 / params.tau
    );
    const contactAccel = vec2.scale(forces[i], 1 / ped.mass);
    const acceleration = vec2.add(relaxation, contactAccel);
    
    // Euler integration
    ped.velocity = vec2.add(ped.velocity, vec2.scale(acceleration, params.dt));
    ped.position = vec2.add(ped.position, vec2.scale(ped.velocity, params.dt));
  }
}
```

---

## 6. Validation Criteria

For each scenario, the implementation should reproduce:

| Scenario | Validation Criterion |
|----------|---------------------|
| Single pedestrian | Speed reaches v0 with time constant ~τ |
| Two-pedestrian (static) | Trajectory matches Fig. 2A within experimental std |
| Two-pedestrian (moving) | Trajectory matches Fig. 2B within experimental std |
| Bidirectional | Band index Y(t) → ~1 within 30s |
| Unidirectional | Velocity-density curve matches empirical data (Fig. 3A) |
| Unidirectional | Stop-and-go waves at occupancy 0.4-0.65 |
| Bottleneck | Displacement power law exponent ~1.95 |
| Evacuation | Evacuation time vs. door width matches Fig. S5 |

---

## 7. Dependencies

### package.json
```json
{
  "name": "simple-rules-pedestrians",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "@types/dat.gui": "^0.7.12",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  },
  "dependencies": {
    "three": "^0.160.0",
    "dat.gui": "^0.7.9"
  }
}
```

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## 8. Notes and Clarifications

### 8.1 Paper Ambiguities Resolved

1. **Angular resolution:** Not specified in paper. Use 1° as reasonable default.

2. **Time step:** Not explicitly stated. Paper uses "continuous" relaxation, implying small dt. Use 0.02s (50 Hz).

3. **Vision of hidden pedestrians:** Paper states pedestrians behind others are not visible. Implementation should properly occlude.

4. **Periodic boundaries:** For periodic scenarios, pedestrians exiting one side appear on opposite side. Vision function must handle wrap-around.

5. **SI typo:** Equation for C in collision detection likely has typo (`r_i - r_j` should be `r_i + r_j`).

### 8.2 Performance Considerations

- f(α) computation is O(N × M × A) where N = pedestrians, M = walls, A = angular samples
- For large N (>100), consider spatial hashing to limit neighbor checks
- Use `requestAnimationFrame` for smooth 60 FPS rendering
- Run multiple simulation steps per frame to decouple physics rate from render rate
- Consider using Web Workers for heavy simulations to avoid blocking UI
- TypedArrays (Float32Array) can improve performance for large pedestrian counts

### 8.3 Future Enhancements (Optional)

- 3D camera perspective view
- Trajectory recording and playback
- Export to video
- Batch parameter sweeps
- Comparison overlay with empirical data
