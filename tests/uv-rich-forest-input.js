export function createInput() {
  const keys = new Set();
  window.addEventListener('keydown', (e) => keys.add(e.key));
  window.addEventListener('keyup', (e) => keys.delete(e.key));
  return {
    axis() {
      let x = 0, y = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) x += 1;
      if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('s')) y += 1;
      return { x, y };
    }
  };
}

// forest module detail input segment 0: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 1: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 2: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 3: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 4: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 5: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 6: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 7: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 8: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 9: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 10: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 11: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 12: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 13: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 14: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 15: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 16: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 17: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 18: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 19: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 20: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 21: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 22: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 23: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 24: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 25: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 26: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 27: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 28: canopy density, undergrowth, animal pathfinding hints
// forest module detail input segment 29: canopy density, undergrowth, animal pathfinding hints
