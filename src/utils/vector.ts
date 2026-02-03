// 2D vector operations for pedestrian simulation

export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = {
  create: (x: number, y: number): Vec2 => ({ x, y }),

  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),

  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),

  scale: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),

  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,

  length: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),

  lengthSquared: (v: Vec2): number => v.x * v.x + v.y * v.y,

  distance: (a: Vec2, b: Vec2): number => vec2.length(vec2.sub(a, b)),

  distanceSquared: (a: Vec2, b: Vec2): number => vec2.lengthSquared(vec2.sub(a, b)),

  normalize: (v: Vec2): Vec2 => {
    const len = vec2.length(v);
    return len > 1e-10 ? vec2.scale(v, 1 / len) : { x: 0, y: 0 };
  },

  angle: (v: Vec2): number => Math.atan2(v.y, v.x),

  fromAngle: (angle: number, magnitude = 1): Vec2 => ({
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  }),

  rotate: (v: Vec2, angle: number): Vec2 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },

  perpendicular: (v: Vec2): Vec2 => ({ x: -v.y, y: v.x }),

  lerp: (a: Vec2, b: Vec2, t: number): Vec2 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }),

  copy: (v: Vec2): Vec2 => ({ x: v.x, y: v.y }),

  zero: (): Vec2 => ({ x: 0, y: 0 }),

  // clamp magnitude to max
  clampLength: (v: Vec2, maxLength: number): Vec2 => {
    const len = vec2.length(v);
    if (len > maxLength && len > 1e-10) {
      return vec2.scale(v, maxLength / len);
    }
    return v;
  },
};
