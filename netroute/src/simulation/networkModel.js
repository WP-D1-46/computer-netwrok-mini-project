export const starterNodes = [
  { id: 'R1', x: 90, y: 130 }, { id: 'R2', x: 270, y: 70 },
  { id: 'R3', x: 270, y: 220 }, { id: 'R4', x: 475, y: 70 },
  { id: 'R5', x: 475, y: 220 }, { id: 'R6', x: 650, y: 145 }
];
export const starterEdges = [
  { id: 'R1-R2', source: 'R1', target: 'R2', cost: 2, active: true },
  { id: 'R1-R3', source: 'R1', target: 'R3', cost: 4, active: true },
  { id: 'R2-R3', source: 'R2', target: 'R3', cost: 1, active: true },
  { id: 'R2-R4', source: 'R2', target: 'R4', cost: 3, active: true },
  { id: 'R3-R5', source: 'R3', target: 'R5', cost: 3, active: true },
  { id: 'R4-R5', source: 'R4', target: 'R5', cost: 2, active: true },
  { id: 'R4-R6', source: 'R4', target: 'R6', cost: 5, active: true },
  { id: 'R5-R6', source: 'R5', target: 'R6', cost: 1, active: true }
];
export function adjacency(nodes, edges) {
  const graph = Object.fromEntries(nodes.map(n => [n.id, []]));
  for (const e of edges) if (e.active && graph[e.source] && graph[e.target]) {
    graph[e.source].push({ to: e.target, cost: Number(e.cost), edgeId: e.id });
    graph[e.target].push({ to: e.source, cost: Number(e.cost), edgeId: e.id });
  }
  return graph;
}
export function validateLinkCost(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}
export function makeEdgeId(a, b) { return [a, b].sort().join('-'); }
