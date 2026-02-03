// environment setup: walls and boundaries

import { Vec2, vec2 } from '../utils/vector';
import { lineFromPoints } from '../utils/geometry';
import { Wall, Environment, BoundaryType, Bounds } from './types';

export function createWall(start: Vec2, end: Vec2): Wall {
  const line = lineFromPoints(start, end);
  
  // normal points perpendicular to wall
  const normal = { x: line.a, y: line.b };
  
  return {
    start: vec2.copy(start),
    end: vec2.copy(end),
    a: line.a,
    b: line.b,
    c: line.c,
    normal,
  };
}

export function createRectangularRoom(
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number
): Wall[] {
  return [
    createWall({ x: xMin, y: yMin }, { x: xMax, y: yMin }), // bottom
    createWall({ x: xMax, y: yMin }, { x: xMax, y: yMax }), // right
    createWall({ x: xMax, y: yMax }, { x: xMin, y: yMax }), // top
    createWall({ x: xMin, y: yMax }, { x: xMin, y: yMin }), // left
  ];
}

export function createCorridor(
  length: number,
  width: number,
  centerY = 0
): Wall[] {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  
  return [
    // top wall
    createWall(
      { x: -halfLength, y: centerY + halfWidth },
      { x: halfLength, y: centerY + halfWidth }
    ),
    // bottom wall
    createWall(
      { x: halfLength, y: centerY - halfWidth },
      { x: -halfLength, y: centerY - halfWidth }
    ),
  ];
}

export function createCorridorWithDoor(
  length: number,
  width: number,
  doorWidth: number,
  doorPosition: 'left' | 'right' | 'center' = 'right'
): Wall[] {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const halfDoor = doorWidth / 2;
  
  const walls: Wall[] = [];
  
  // top wall
  walls.push(createWall(
    { x: -halfLength, y: halfWidth },
    { x: halfLength, y: halfWidth }
  ));
  
  // bottom wall
  walls.push(createWall(
    { x: halfLength, y: -halfWidth },
    { x: -halfLength, y: -halfWidth }
  ));
  
  // left end wall
  walls.push(createWall(
    { x: -halfLength, y: -halfWidth },
    { x: -halfLength, y: halfWidth }
  ));
  
  // right end with door
  if (doorPosition === 'right') {
    // upper part of right wall
    walls.push(createWall(
      { x: halfLength, y: halfWidth },
      { x: halfLength, y: halfDoor }
    ));
    // lower part of right wall
    walls.push(createWall(
      { x: halfLength, y: -halfDoor },
      { x: halfLength, y: -halfWidth }
    ));
  } else {
    walls.push(createWall(
      { x: halfLength, y: halfWidth },
      { x: halfLength, y: -halfWidth }
    ));
  }
  
  return walls;
}

export function createBottleneck(
  corridorLength: number,
  corridorWidth: number,
  bottleneckWidth: number,
  bottleneckPosition = 0.6 // fraction along corridor where bottleneck starts
): Wall[] {
  const halfWidth = corridorWidth / 2;
  const halfBottleneck = bottleneckWidth / 2;
  const halfLength = corridorLength / 2;
  const bottleneckX = -halfLength + bottleneckPosition * corridorLength;
  
  const walls: Wall[] = [];
  
  // top wall before bottleneck
  walls.push(createWall(
    { x: -halfLength, y: halfWidth },
    { x: bottleneckX, y: halfWidth }
  ));
  
  // top narrowing
  walls.push(createWall(
    { x: bottleneckX, y: halfWidth },
    { x: bottleneckX + 0.5, y: halfBottleneck }
  ));
  
  // top wall after bottleneck
  walls.push(createWall(
    { x: bottleneckX + 0.5, y: halfBottleneck },
    { x: halfLength, y: halfBottleneck }
  ));
  
  // bottom wall before bottleneck
  walls.push(createWall(
    { x: halfLength, y: -halfBottleneck },
    { x: bottleneckX + 0.5, y: -halfBottleneck }
  ));
  
  // bottom narrowing
  walls.push(createWall(
    { x: bottleneckX + 0.5, y: -halfBottleneck },
    { x: bottleneckX, y: -halfWidth }
  ));
  
  // bottom wall
  walls.push(createWall(
    { x: bottleneckX, y: -halfWidth },
    { x: -halfLength, y: -halfWidth }
  ));
  
  return walls;
}

export function createLShapedCorridor(
  width: number,
  legLength: number
): Wall[] {
  const walls: Wall[] = [];
  const halfWidth = width / 2;
  
  // outer walls
  walls.push(createWall(
    { x: 0, y: -legLength },
    { x: 0, y: halfWidth }
  ));
  walls.push(createWall(
    { x: 0, y: halfWidth },
    { x: legLength, y: halfWidth }
  ));
  walls.push(createWall(
    { x: legLength, y: halfWidth },
    { x: legLength, y: -halfWidth }
  ));
  walls.push(createWall(
    { x: legLength, y: -halfWidth },
    { x: width, y: -halfWidth }
  ));
  walls.push(createWall(
    { x: width, y: -halfWidth },
    { x: width, y: -legLength }
  ));
  walls.push(createWall(
    { x: width, y: -legLength },
    { x: 0, y: -legLength }
  ));
  
  return walls;
}

export function createEnvironment(
  walls: Wall[],
  bounds: Bounds,
  boundaryType: BoundaryType = 'closed'
): Environment {
  return {
    walls,
    boundaryType,
    bounds,
  };
}
