import { adjacency } from '../simulation/networkModel.js';

// Synchronous Bellman-Ford-style distance-vector rounds for an educational model.
export function distanceVector(nodes, edges, maxRounds = 100) {
  const graph = adjacency(nodes, edges);
  const ids = nodes.map(n => n.id);
  let vectors = {};
  for (const id of ids) {
    vectors[id] = Object.fromEntries(ids.map(dest => [dest, dest === id ? 0 : (graph[id].find(x => x.to === dest)?.cost ?? Infinity)]));
  }
  const rounds = [{ round: 0, vectors: structuredClone(vectors), changes: [], message: 'Initialize each router with itself and its directly connected neighbors.' }];
  let converged = false;
  for (let round = 1; round <= maxRounds; round++) {
    const next = Object.fromEntries(ids.map(id => [id, { ...vectors[id] }]));
    const changes = [];
    for (const x of ids) {
      for (const y of ids) {
        let best = x === y ? 0 : Infinity;
        let bestHop = x === y ? 'Local' : '—';
        for (const neighbor of graph[x]) {
          const advertised = vectors[neighbor.to][y];
          const candidate = neighbor.cost + advertised;
          if (candidate < best) { best = candidate; bestHop = neighbor.to; }
        }
        if (next[x][y] !== best) changes.push({ router: x, destination: y, from: next[x][y], to: best, nextHop: bestHop });
        next[x][y] = best;
      }
    }
    vectors = next;
    rounds.push({ round, vectors: structuredClone(vectors), changes, message: changes.length ? `${changes.length} routing estimate(s) changed in round ${round}.` : `No estimates changed in round ${round}; network converged.` });
    if (changes.length === 0) { converged = true; break; }
  }
  const tables = {};
  for (const x of ids) {
    tables[x] = ids.map(y => {
      let nextHop = y === x ? 'Local' : '—';
      if (y !== x && Number.isFinite(vectors[x][y])) {
        for (const neighbor of graph[x]) if (neighbor.cost + vectors[neighbor.to][y] === vectors[x][y]) { nextHop = neighbor.to; break; }
      }
      return { destination: y, nextHop, cost: vectors[x][y], status: Number.isFinite(vectors[x][y]) ? 'Reachable' : 'Unreachable' };
    });
  }
  return { vectors, rounds, tables, converged, roundCount: rounds.length - 1 };
}
