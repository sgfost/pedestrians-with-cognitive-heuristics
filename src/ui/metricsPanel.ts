// real-time metrics display panel

import { SimulationMetrics } from '../simulation/types';

export class MetricsPanel {
  private container: HTMLElement;
  private rows: Map<string, HTMLElement> = new Map();
  
  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container #${containerId} not found`);
    }
    this.container = container;
  }
  
  // update all metrics
  update(metrics: SimulationMetrics & Record<string, unknown>): void {
    const displayOrder = [
      'time',
      'pedestrianCount',
      'averageSpeed',
      'occupancy',
      'bandIndex',
      'averageCompression',
      'evacuatedCount',
      'remainingCount',
    ];
    
    const labels: Record<string, string> = {
      time: 'Time',
      pedestrianCount: 'Pedestrians',
      averageSpeed: 'Avg Speed',
      occupancy: 'Occupancy',
      bandIndex: 'Band Index',
      averageCompression: 'Avg Compression',
      evacuatedCount: 'Evacuated',
      remainingCount: 'Remaining',
    };
    
    const formatters: Record<string, (v: unknown) => string> = {
      time: (v) => `${(v as number).toFixed(2)} s`,
      pedestrianCount: (v) => String(v),
      averageSpeed: (v) => `${(v as number).toFixed(3)} m/s`,
      occupancy: (v) => `${((v as number) * 100).toFixed(1)}%`,
      bandIndex: (v) => (v as number).toFixed(3),
      averageCompression: (v) => `${((v as number) * 1000).toFixed(1)} mm`,
      evacuatedCount: (v) => String(v),
      remainingCount: (v) => String(v),
    };
    
    for (const key of displayOrder) {
      const value = metrics[key as keyof typeof metrics];
      if (value === undefined || value === null) continue;
      
      let row = this.rows.get(key);
      
      if (!row) {
        row = document.createElement('div');
        row.className = 'metric-row';
        row.innerHTML = `
          <span class="metric-label">${labels[key] || key}</span>
          <span class="metric-value" data-key="${key}"></span>
        `;
        this.container.appendChild(row);
        this.rows.set(key, row);
      }
      
      const valueSpan = row.querySelector('.metric-value') as HTMLElement;
      const formatter = formatters[key] || ((v: unknown) => String(v));
      valueSpan.textContent = formatter(value);
    }
    
    // hide rows for metrics not in current metrics
    for (const [key, row] of this.rows) {
      if (metrics[key as keyof typeof metrics] === undefined) {
        row.style.display = 'none';
      } else {
        row.style.display = '';
      }
    }
  }
  
  // clear all metrics
  clear(): void {
    this.container.innerHTML = '';
    this.rows.clear();
  }
  
  // add custom metric
  addCustomMetric(key: string, label: string, value: string): void {
    let row = this.rows.get(key);
    
    if (!row) {
      row = document.createElement('div');
      row.className = 'metric-row';
      row.innerHTML = `
        <span class="metric-label">${label}</span>
        <span class="metric-value" data-key="${key}"></span>
      `;
      this.container.appendChild(row);
      this.rows.set(key, row);
    }
    
    const valueSpan = row.querySelector('.metric-value') as HTMLElement;
    valueSpan.textContent = value;
  }
}
