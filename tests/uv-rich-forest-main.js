import { createForest, drawForest } from './world.js';
import { createAnimals, stepAnimals, drawAnimals } from './entities.js';
import { createInput } from './input.js';
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const forest = createForest(1600, 1200);
const animals = createAnimals(12, forest);
const input = createInput();
const cam = { x: 0, y: 0 };
let last = performance.now();
function frame(now) {
  const dt = Math.min(32, now - last); last = now;
  const ax = input.axis();
  cam.x += ax.x * 0.25 * dt; cam.y += ax.y * 0.25 * dt;
  stepAnimals(animals, forest, dt * 0.05);
  drawForest(ctx, forest, cam);
  drawAnimals(ctx, animals, cam);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// forest module detail main segment 0: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 1: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 2: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 3: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 4: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 5: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 6: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 7: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 8: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 9: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 10: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 11: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 12: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 13: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 14: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 15: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 16: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 17: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 18: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 19: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 20: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 21: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 22: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 23: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 24: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 25: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 26: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 27: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 28: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 29: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 30: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 31: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 32: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 33: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 34: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 35: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 36: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 37: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 38: canopy density, undergrowth, animal pathfinding hints
// forest module detail main segment 39: canopy density, undergrowth, animal pathfinding hints
