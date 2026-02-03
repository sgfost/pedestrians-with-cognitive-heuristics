// Three.js renderer for pedestrian simulation

import * as THREE from 'three';
import { Pedestrian, Wall, Bounds } from '../simulation/types';
import { vec2 } from '../utils/vector';

export interface RendererOptions {
  showVelocityVectors?: boolean;
  showDestinations?: boolean;
  colorByDirection?: boolean;
  colorBySpeed?: boolean;
}

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private pedestrianGroup: THREE.Group;
  private wallGroup: THREE.Group;
  private velocityGroup: THREE.Group;
  
  private pedestrianMeshes: Map<number, THREE.Mesh> = new Map();
  private pedestrianGeometry: THREE.CircleGeometry;
  
  private options: RendererOptions = {
    showVelocityVectors: false,
    showDestinations: false,
    colorByDirection: true,
    colorBySpeed: false,
  };
  
  // color palette
  private readonly colors = {
    background: 0x1a1a2e,
    floor: 0x16213e,
    wall: 0x0f3460,
    pedestrianDefault: 0x4cc9f0,
    pedestrianDirection1: 0x4cc9f0,
    pedestrianDirection2: 0xf72585,
    velocity: 0xffd60a,
    destination: 0x80ed99,
  };
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.colors.background);
    
    // create groups for organization
    this.pedestrianGroup = new THREE.Group();
    this.wallGroup = new THREE.Group();
    this.velocityGroup = new THREE.Group();
    
    this.scene.add(this.pedestrianGroup);
    this.scene.add(this.wallGroup);
    this.scene.add(this.velocityGroup);
    
    // create camera (will be sized in resize())
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
    this.camera.position.z = 50;
    
    // create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // shared geometry for pedestrians
    this.pedestrianGeometry = new THREE.CircleGeometry(1, 32);
    
    // handle resize
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }
  
  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    
    // update camera aspect
    const aspect = width / height;
    const viewSize = 12;
    
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
  }
  
  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  // set camera to fit bounds
  fitToBounds(bounds: Bounds, padding = 1.0): void {
    const width = bounds.xMax - bounds.xMin + padding * 2;
    const height = bounds.yMax - bounds.yMin + padding * 2;
    const centerX = (bounds.xMin + bounds.xMax) / 2;
    const centerY = (bounds.yMin + bounds.yMax) / 2;
    
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const aspect = containerWidth / containerHeight;
    
    let viewWidth: number, viewHeight: number;
    
    if (width / height > aspect) {
      viewWidth = width;
      viewHeight = width / aspect;
    } else {
      viewHeight = height;
      viewWidth = height * aspect;
    }
    
    this.camera.left = centerX - viewWidth / 2;
    this.camera.right = centerX + viewWidth / 2;
    this.camera.top = centerY + viewHeight / 2;
    this.camera.bottom = centerY - viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }
  
  // clear all pedestrians
  clearPedestrians(): void {
    for (const mesh of this.pedestrianMeshes.values()) {
      this.pedestrianGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.pedestrianMeshes.clear();
  }
  
  // clear all walls
  clearWalls(): void {
    while (this.wallGroup.children.length > 0) {
      const child = this.wallGroup.children[0];
      this.wallGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }
  
  // render walls
  renderWalls(walls: Wall[]): void {
    this.clearWalls();
    
    const material = new THREE.LineBasicMaterial({
      color: this.colors.wall,
      linewidth: 3,
    });
    
    for (const wall of walls) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(wall.start.x, wall.start.y, 0),
        new THREE.Vector3(wall.end.x, wall.end.y, 0),
      ]);
      
      const line = new THREE.Line(geometry, material.clone());
      this.wallGroup.add(line);
    }
  }
  
  // render floor
  renderFloor(bounds: Bounds): void {
    const width = bounds.xMax - bounds.xMin;
    const height = bounds.yMax - bounds.yMin;
    const centerX = (bounds.xMin + bounds.xMax) / 2;
    const centerY = (bounds.yMin + bounds.yMax) / 2;
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: this.colors.floor,
      side: THREE.DoubleSide,
    });
    
    const floor = new THREE.Mesh(geometry, material);
    floor.position.set(centerX, centerY, -1);
    this.scene.add(floor);
  }
  
  // get color for pedestrian based on options
  private getPedestrianColor(ped: Pedestrian): number {
    if (this.options.colorBySpeed) {
      const speed = vec2.length(ped.velocity);
      const normalizedSpeed = Math.min(1, speed / ped.desiredSpeed);
      
      // green to yellow to red gradient
      if (normalizedSpeed < 0.5) {
        const t = normalizedSpeed * 2;
        return this.lerpColor(0xef476f, 0xffd60a, t);
      } else {
        const t = (normalizedSpeed - 0.5) * 2;
        return this.lerpColor(0xffd60a, 0x06d6a0, t);
      }
    }
    
    if (this.options.colorByDirection) {
      return ped.direction > 0 
        ? this.colors.pedestrianDirection1 
        : this.colors.pedestrianDirection2;
    }
    
    return this.colors.pedestrianDefault;
  }
  
  private lerpColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }
  
  // render pedestrians
  render(pedestrians: Pedestrian[]): void {
    // clear velocity vectors
    while (this.velocityGroup.children.length > 0) {
      const child = this.velocityGroup.children[0];
      this.velocityGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    
    // track which pedestrians are still active
    const activeIds = new Set<number>();
    
    for (const ped of pedestrians) {
      if (!ped.active) continue;
      activeIds.add(ped.id);
      
      let mesh = this.pedestrianMeshes.get(ped.id);
      
      if (!mesh) {
        // create new mesh
        const geometry = new THREE.CircleGeometry(ped.radius, 24);
        const material = new THREE.MeshBasicMaterial({
          color: this.getPedestrianColor(ped),
        });
        mesh = new THREE.Mesh(geometry, material);
        this.pedestrianMeshes.set(ped.id, mesh);
        this.pedestrianGroup.add(mesh);
      }
      
      // update position and color
      mesh.position.set(ped.position.x, ped.position.y, 0);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(
        this.getPedestrianColor(ped)
      );
      
      // draw velocity vector
      if (this.options.showVelocityVectors) {
        const speed = vec2.length(ped.velocity);
        if (speed > 0.01) {
          const endPoint = vec2.add(ped.position, vec2.scale(ped.velocity, 0.5));
          const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ped.position.x, ped.position.y, 0.1),
            new THREE.Vector3(endPoint.x, endPoint.y, 0.1),
          ]);
          const material = new THREE.LineBasicMaterial({
            color: this.colors.velocity,
          });
          const line = new THREE.Line(geometry, material);
          this.velocityGroup.add(line);
        }
      }
    }
    
    // remove meshes for inactive pedestrians
    for (const [id, mesh] of this.pedestrianMeshes) {
      if (!activeIds.has(id)) {
        this.pedestrianGroup.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.pedestrianMeshes.delete(id);
      }
    }
    
    // render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  // clean up resources
  dispose(): void {
    this.clearPedestrians();
    this.clearWalls();
    this.renderer.dispose();
    window.removeEventListener('resize', this.resize.bind(this));
  }
}
