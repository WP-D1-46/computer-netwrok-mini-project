import { adjacency } from '../simulation/networkModel.js';

export function dijkstra(nodes, edges, source) {
  const graph = adjacency(nodes, edges);
  if (!graph[source]) throw new Error('Choose a source router that exists in the network.');
  const dist = Object.fromEntries(nodes.map(n => [n.id, Infinity]));
  const previous = Object.fromEntries(nodes.map(n => [n.id, null]));
  const visited = new Set();
  const steps = [];
  dist[source] = 0;
  steps.push({ type: 'init', current: null, dist: { ...dist }, previous: { ...previous }, visited: [], message: `Initialize all distances to ∞; source ${source} is 0.` });
  while (visited.size < nodes.length) {
    let current = null;
    for (const n of nodes) if (!visited.has(n.id) && (current === null || dist[n.id] < dist[current])) current = n.id;
    if (current === null || dist[current] === Infinity) break;
    visited.add(current);
    steps.push({ type: 'visit', current, dist: { ...dist }, previous: { ...previous }, visited: [...visited], message: `Select ${current}, the unvisited router with the lowest tentative distance (${dist[current]}).` });
    for (const neighbor of graph[current]) {
      if (visited.has(neighbor.to)) continue;
      const candidate = dist[current] + neighbor.cost;
      if (candidate < dist[neighbor.to]) {
        const old = dist[neighbor.to];
        dist[neighbor.to] = candidate;
        previous[neighbor.to] = current;
        steps.push({ type: 'relax', current, edgeId: neighbor.edgeId, neighbor: neighbor.to, dist: { ...dist }, previous: { ...previous }, visited: [...visited], message: `Update ${neighbor.to}: ${old === Infinity ? '∞' : old} → ${candidate} via ${current} (link cost ${neighbor.cost}).` });
      } else {
        steps.push({ type: 'check', current, edgeId: neighbor.edgeId, neighbor: neighbor.to, dist: { ...dist }, previous: { ...previous }, visited: [...visited], message: `Check ${current} → ${neighbor.to}: ${candidate} is not better than ${dist[neighbor.to]}.` });
      }
    }
  }
  steps.push({ type: 'done', current: null, dist: { ...dist }, previous: { ...previous }, visited: [...visited], message: 'Dijkstra finished. Routers with ∞ are unreachable from the source.' });
  return { source, dist, previous, visited: [...visited], steps };
}

export function reconstructPath(previous, source, destination) {
  if (source === destination) return [source];
  const path = []; let current = destination; const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current); path.unshift(current);
    if (current === source) return path;
    current = previous[current];
  }
  return [];
}

export function buildDijkstraTables(nodes, edges) {
  const tables = {};
  for (const node of nodes) {
    const result = dijkstra(nodes, edges, node.id);
    tables[node.id] = nodes.map(dest => {
      const path = reconstructPath(result.previous, node.id, dest.id);
      return { destination: dest.id, nextHop: dest.id === node.id ? 'Local' : (path.length > 1 ? path[1] : '—'), cost: result.dist[dest.id], status: Number.isFinite(result.dist[dest.id]) ? 'Reachable' : 'Unreachable', path };
    });
  }
  return tables;
}
