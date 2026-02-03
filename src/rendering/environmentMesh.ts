// environment mesh utilities

import * as THREE from 'three';
import { Wall, Bounds } from '../simulation/types';

// create thick wall mesh
export function createWallMesh(
  wall: Wall,
  thickness = 0.1,
  color = 0x0f3460
): THREE.Mesh {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  const geometry = new THREE.PlaneGeometry(length, thickness);
  const material = new THREE.MeshBasicMaterial({ color });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    (wall.start.x + wall.end.x) / 2,
    (wall.start.y + wall.end.y) / 2,
    0
  );
  mesh.rotation.z = angle;
  
  return mesh;
}

// create grid overlay for debugging
export function createGridMesh(
  bounds: Bounds,
  spacing = 1.0,
  color = 0x333333
): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color, opacity: 0.3, transparent: true });
  
  // vertical lines
  for (let x = Math.ceil(bounds.xMin); x <= bounds.xMax; x += spacing) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, bounds.yMin, -0.9),
      new THREE.Vector3(x, bounds.yMax, -0.9),
    ]);
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }
  
  // horizontal lines
  for (let y = Math.ceil(bounds.yMin); y <= bounds.yMax; y += spacing) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bounds.xMin, y, -0.9),
      new THREE.Vector3(bounds.xMax, y, -0.9),
    ]);
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }
  
  return group;
}

// create destination marker
export function createDestinationMarker(
  position: { x: number; y: number },
  size = 0.3,
  color = 0x80ed99
): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(size, 6);  // hexagon
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.5,
    transparent: true,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, -0.5);
  
  return mesh;
}

// create periodic boundary indicators
export function createPeriodicBoundaryIndicators(
  bounds: Bounds,
  color = 0x4cc9f0
): THREE.Group {
  const group = new THREE.Group();
  
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.3,
    gapSize: 0.2,
  });
  
  // left boundary
  const leftGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.xMin, bounds.yMin, 0),
    new THREE.Vector3(bounds.xMin, bounds.yMax, 0),
  ]);
  const leftLine = new THREE.Line(leftGeom, material);
  leftLine.computeLineDistances();
  group.add(leftLine);
  
  // right boundary
  const rightGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(bounds.xMax, bounds.yMin, 0),
    new THREE.Vector3(bounds.xMax, bounds.yMax, 0),
  ]);
  const rightLine = new THREE.Line(rightGeom, material);
  rightLine.computeLineDistances();
  group.add(rightLine);
  
  return group;
}
