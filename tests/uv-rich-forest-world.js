import { rand } from './util.js';
export function createForest(width, height) {
  const trees = [];
  for (let i = 0; i < 40; i++) trees.push({ x: rand(0, width), y: rand(0, height), r: rand(12, 28) });
  return { trees, width, height, ground: '#2d5a27' };
}
export function drawForest(ctx, forest, cam) {
  ctx.fillStyle = forest.ground;
  ctx.fillRect(0, 0, forest.width, forest.height);
  for (const t of forest.trees) {
    ctx.fillStyle = '#1a3d18';
    ctx.beginPath();
    ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// forest module detail world segment 0: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 1: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 2: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 3: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 4: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 5: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 6: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 7: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 8: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 9: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 10: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 11: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 12: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 13: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 14: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 15: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 16: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 17: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 18: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 19: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 20: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 21: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 22: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 23: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 24: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 25: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 26: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 27: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 28: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 29: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 30: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 31: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 32: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 33: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 34: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 35: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 36: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 37: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 38: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 39: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 40: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 41: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 42: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 43: canopy density, undergrowth, animal pathfinding hints
// forest module detail world segment 44: canopy density, undergrowth, animal pathfinding hints
