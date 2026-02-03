// main application entry point

import { Renderer, RendererOptions } from './rendering/renderer';
import { setupControls, updateGUIFromParams, AppState, AppCallbacks } from './ui/controls';
import { MetricsPanel } from './ui/metricsPanel';
import { initializeScenario, switchScenario, getScenarioNames, ScenarioState } from './ui/scenarioSelector';
import { BandIndexTracker, computeBandIndex } from './metrics/bandIndex';
import GUI from 'lil-gui';

class App {
  private renderer: Renderer;
  private metricsPanel: MetricsPanel;
  private state: ScenarioState;
  private gui: GUI | null = null;
  
  private isRunning = false;
  private lastFrameTime = 0;
  private animationId: number | null = null;
  
  private bandIndexTracker = new BandIndexTracker();
  
  private appState: AppState;
  private rendererOptions: RendererOptions = {
    showVelocityVectors: false,
    showDestinations: false,
    colorByDirection: true,
    colorBySpeed: false,
  };
  
  constructor() {
    // get container
    const container = document.getElementById('simulation-container');
    if (!container) {
      throw new Error('Simulation container not found');
    }
    
    // create renderer
    this.renderer = new Renderer(container);
    this.renderer.setOptions(this.rendererOptions);
    
    // create metrics panel
    this.metricsPanel = new MetricsPanel('metrics-content');
    
    // initialize with default scenario
    const scenarioNames = getScenarioNames();
    const defaultScenario = scenarioNames[0];
    this.state = initializeScenario(defaultScenario);
    
    // setup scene
    this.setupScene();
    
    // create app state for GUI binding
    this.appState = {
      scenario: defaultScenario,
      isRunning: false,
      playbackSpeed: 1,
      tau: this.state.params.tau,
      phiDegrees: (this.state.params.phi * 180) / Math.PI,
      dMax: this.state.params.dMax,
      k: this.state.params.k,
      dt: this.state.params.dt,
      showVelocity: false,
      colorByDirection: true,
      colorBySpeed: false,
    };
    
    // callbacks for GUI actions
    const callbacks: AppCallbacks = {
      start: () => this.start(),
      stop: () => this.stop(),
      reset: () => this.reset(),
      step: () => this.step(),
      onScenarioChange: (name) => this.loadScenario(name),
      onParamsChange: () => this.onParamsChange(),
    };
    
    // setup GUI controls
    this.gui = setupControls(
      this.appState,
      this.state.params,
      scenarioNames,
      callbacks,
      this.rendererOptions
    );
    
    // initial render
    this.render();
    
    // auto-start
    this.start();
  }
  
  private setupScene(): void {
    const { simulation } = this.state;
    const { walls, bounds } = simulation.environment;
    
    // render walls and floor
    this.renderer.clearWalls();
    this.renderer.renderWalls(walls);
    this.renderer.renderFloor(bounds);
    this.renderer.fitToBounds(bounds);
  }
  
  private loadScenario(name: string): void {
    this.stop();
    
    // switch scenario
    this.state = switchScenario(name);
    
    // update app state with new scenario's params
    this.appState.scenario = name;
    
    // reset trackers
    this.bandIndexTracker.clear();
    
    // setup new scene
    this.setupScene();
    
    // update GUI to reflect new params
    if (this.gui) {
      updateGUIFromParams(this.gui, this.appState, this.state.params);
    }
    
    // initial render
    this.render();
    
    // auto-start after switching
    this.start();
  }
  
  private onParamsChange(): void {
    // params are updated in-place by the GUI callbacks
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.appState.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }
  
  stop(): void {
    this.isRunning = false;
    this.appState.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  reset(): void {
    this.stop();
    this.state.currentScenario.reset(this.state.simulation);
    this.bandIndexTracker.clear();
    this.render();
  }
  
  step(): void {
    this.state.simulation.step();
    this.render();
    this.updateMetrics();
  }
  
  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;
    
    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    
    // calculate number of simulation steps based on playback speed
    const targetDt = this.state.params.dt;
    const scaledDelta = deltaTime * this.appState.playbackSpeed;
    const stepsPerFrame = Math.max(1, Math.round(scaledDelta / targetDt));
    
    // run simulation steps
    for (let i = 0; i < stepsPerFrame; i++) {
      this.state.simulation.step();
    }
    
    // update visualization
    this.render();
    
    // update metrics (less frequently for performance)
    this.updateMetrics();
    
    this.animationId = requestAnimationFrame(this.loop);
  };
  
  private render(): void {
    this.renderer.setOptions(this.rendererOptions);
    this.renderer.render(this.state.simulation.pedestrians);
  }
  
  private updateMetrics(): void {
    const { simulation, currentScenario } = this.state;
    
    // get base metrics
    const metrics = simulation.getMetrics();
    
    // add scenario-specific metrics
    let customMetrics = {};
    if (currentScenario.getCustomMetrics) {
      customMetrics = currentScenario.getCustomMetrics(simulation);
    }
    
    // track band index for bidirectional scenario
    if (currentScenario.info.name === 'Bidirectional Flow') {
      const bandIndex = computeBandIndex(
        simulation.pedestrians,
        simulation.environment.bounds
      );
      this.bandIndexTracker.record(simulation.time, bandIndex);
      customMetrics = { ...customMetrics, bandIndex };
    }
    
    // update panel
    this.metricsPanel.update({ ...metrics, ...customMetrics });
  }
}

// start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
