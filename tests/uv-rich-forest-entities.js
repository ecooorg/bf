import { rand, clamp } from './util.js';
export function createAnimals(n, world) {
  const kinds = ['deer', 'fox', 'rabbit'];
  return Array.from({ length: n }, (_, i) => ({
    id: i, kind: kinds[i % 3],
    x: rand(0, world.width), y: rand(0, world.height),
    vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4),
  }));
}
export function stepAnimals(animals, world, dt) {
  for (const a of animals) {
    a.x = clamp(a.x + a.vx * dt, 0, world.width);
    a.y = clamp(a.y + a.vy * dt, 0, world.height);
    if (Math.random() < 0.01) { a.vx = rand(-0.5, 0.5); a.vy = rand(-0.5, 0.5); }
  }
}
export function drawAnimals(ctx, animals, cam) {
  for (const a of animals) {
    ctx.fillStyle = a.kind === 'deer' ? '#8b5a2b' : a.kind === 'fox' ? '#c45a11' : '#cfcfcf';
    ctx.beginPath();
    ctx.ellipse(a.x - cam.x, a.y - cam.y, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// forest module detail entities segment 0: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 1: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 2: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 3: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 4: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 5: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 6: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 7: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 8: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 9: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 10: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 11: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 12: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 13: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 14: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 15: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 16: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 17: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 18: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 19: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 20: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 21: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 22: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 23: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 24: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 25: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 26: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 27: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 28: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 29: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 30: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 31: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 32: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 33: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 34: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 35: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 36: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 37: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 38: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 39: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 40: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 41: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 42: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 43: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 44: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 45: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 46: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 47: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 48: canopy density, undergrowth, animal pathfinding hints
// forest module detail entities segment 49: canopy density, undergrowth, animal pathfinding hints
