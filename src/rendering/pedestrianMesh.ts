// pedestrian mesh utilities (optional enhanced rendering)

import * as THREE from 'three';
import { Pedestrian } from '../simulation/types';
import { vec2 } from '../utils/vector';

// create a more detailed pedestrian mesh with direction indicator
export function createDetailedPedestrianMesh(
  pedestrian: Pedestrian,
  color: number
): THREE.Group {
  const group = new THREE.Group();
  
  // body circle
  const bodyGeometry = new THREE.CircleGeometry(pedestrian.radius, 32);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);
  
  // direction indicator (small triangle)
  const indicatorSize = pedestrian.radius * 0.4;
  const indicatorShape = new THREE.Shape();
  indicatorShape.moveTo(indicatorSize, 0);
  indicatorShape.lineTo(-indicatorSize * 0.5, indicatorSize * 0.5);
  indicatorShape.lineTo(-indicatorSize * 0.5, -indicatorSize * 0.5);
  indicatorShape.closePath();
  
  const indicatorGeometry = new THREE.ShapeGeometry(indicatorShape);
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.8,
    transparent: true,
  });
  const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  indicator.position.z = 0.1;
  group.add(indicator);
  
  return group;
}

// update direction indicator rotation
export function updateDirectionIndicator(
  mesh: THREE.Group,
  velocity: { x: number; y: number }
): void {
  const speed = vec2.length(velocity);
  if (speed > 0.01) {
    const angle = Math.atan2(velocity.y, velocity.x);
    if (mesh.children.length > 1) {
      mesh.children[1].rotation.z = angle;
    }
  }
}

// create a vision cone mesh for debugging
export function createVisionConeMesh(
  position: { x: number; y: number },
  heading: number,
  phi: number,
  dMax: number
): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  
  // arc for vision cone
  const segments = 32;
  for (let i = 0; i <= segments; i++) {
    const angle = heading - phi + (2 * phi * i) / segments;
    const x = Math.cos(angle) * dMax;
    const y = Math.sin(angle) * dMax;
    if (i === 0) {
      shape.lineTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.1,
    transparent: true,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, -0.5);
  
  return mesh;
}
