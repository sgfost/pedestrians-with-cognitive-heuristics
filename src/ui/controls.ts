// lil-gui parameter controls

import GUI from 'lil-gui';
import { SimulationParams } from '../simulation/types';
import { RendererOptions } from '../rendering/renderer';

export interface AppState {
  scenario: string;
  isRunning: boolean;
  playbackSpeed: number;
  // param proxies for GUI display
  tau: number;
  phiDegrees: number;
  dMax: number;
  k: number;
  dt: number;
  // visualization
  showVelocity: boolean;
  colorByDirection: boolean;
  colorBySpeed: boolean;
}

export interface AppCallbacks {
  start: () => void;
  stop: () => void;
  reset: () => void;
  step: () => void;
  onScenarioChange: (name: string) => void;
  onParamsChange: () => void;
}

export function setupControls(
  appState: AppState,
  params: SimulationParams,
  scenarioNames: string[],
  callbacks: AppCallbacks,
  rendererOptions: RendererOptions
): GUI {
  const gui = new GUI({ width: 300, title: 'Pedestrian Simulation' });
  
  // sync appState with params
  appState.tau = params.tau;
  appState.phiDegrees = (params.phi * 180) / Math.PI;
  appState.dMax = params.dMax;
  appState.k = params.k;
  appState.dt = params.dt;
  appState.showVelocity = rendererOptions.showVelocityVectors ?? false;
  appState.colorByDirection = rendererOptions.colorByDirection ?? true;
  appState.colorBySpeed = rendererOptions.colorBySpeed ?? false;
  
  // scenario selection dropdown
  gui.add(appState, 'scenario', scenarioNames)
    .name('Scenario')
    .onChange((name: string) => {
      callbacks.onScenarioChange(name);
    });
  
  // simulation controls folder
  const simFolder = gui.addFolder('Simulation');
  simFolder.add(callbacks, 'start').name('▶ Start');
  simFolder.add(callbacks, 'stop').name('⏸ Pause');
  simFolder.add(callbacks, 'reset').name('↺ Reset');
  simFolder.add(callbacks, 'step').name('→ Step');
  simFolder.add(appState, 'playbackSpeed', 0.1, 5.0, 0.1).name('Speed');
  simFolder.open();
  
  // model parameters folder
  const paramFolder = gui.addFolder('Model Parameters');
  
  paramFolder.add(appState, 'tau', 0.1, 2.0, 0.01)
    .name('τ (relaxation, s)')
    .onChange((v: number) => {
      params.tau = v;
      callbacks.onParamsChange();
    });
  
  paramFolder.add(appState, 'phiDegrees', 30, 120, 1)
    .name('φ (vision, °)')
    .onChange((v: number) => {
      params.phi = (v * Math.PI) / 180;
      callbacks.onParamsChange();
    });
  
  paramFolder.add(appState, 'dMax', 2, 20, 0.5)
    .name('d_max (horizon, m)')
    .onChange((v: number) => {
      params.dMax = v;
      callbacks.onParamsChange();
    });
  
  paramFolder.add(appState, 'k', 1000, 20000, 100)
    .name('k (stiffness)')
    .onChange((v: number) => {
      params.k = v;
      callbacks.onParamsChange();
    });
  
  paramFolder.add(appState, 'dt', 0.005, 0.05, 0.005)
    .name('dt (time step, s)')
    .onChange((v: number) => {
      params.dt = v;
      callbacks.onParamsChange();
    });
  
  paramFolder.open();
  
  // visualization options folder
  const vizFolder = gui.addFolder('Visualization');
  
  vizFolder.add(appState, 'showVelocity')
    .name('Show Velocity')
    .onChange((v: boolean) => {
      rendererOptions.showVelocityVectors = v;
    });
  
  const colorDirController = vizFolder.add(appState, 'colorByDirection')
    .name('Color by Direction')
    .onChange((v: boolean) => {
      rendererOptions.colorByDirection = v;
      if (v) {
        appState.colorBySpeed = false;
        rendererOptions.colorBySpeed = false;
        colorSpeedController.updateDisplay();
      }
    });
  
  const colorSpeedController = vizFolder.add(appState, 'colorBySpeed')
    .name('Color by Speed')
    .onChange((v: boolean) => {
      rendererOptions.colorBySpeed = v;
      if (v) {
        appState.colorByDirection = false;
        rendererOptions.colorByDirection = false;
        colorDirController.updateDisplay();
      }
    });
  
  vizFolder.open();
  
  return gui;
}

// update GUI to reflect current params (e.g., after scenario change)
export function updateGUIFromParams(
  gui: GUI,
  appState: AppState,
  params: SimulationParams
): void {
  appState.tau = params.tau;
  appState.phiDegrees = (params.phi * 180) / Math.PI;
  appState.dMax = params.dMax;
  appState.k = params.k;
  appState.dt = params.dt;
  
  // refresh all controllers
  gui.controllersRecursive().forEach(c => c.updateDisplay());
}
