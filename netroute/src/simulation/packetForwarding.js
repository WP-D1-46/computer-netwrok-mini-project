export function simulatePacket(nodes, edges, table, source, destination) {
  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(source) || !nodeIds.has(destination)) return { delivered: false, path: [], cost: Infinity, message: 'Source or destination router does not exist.' };
  if (source === destination) return { delivered: true, path: [source], cost: 0, hops: 0, message: 'Source and destination are the same router.' };
  const path = [source], seen = new Set([source]); let current = source, cost = 0;
  for (let hop = 0; hop < nodes.length; hop++) {
    const entry = table[current]?.find(row => row.destination === destination);
    if (!entry || entry.nextHop === '—' || entry.status === 'Unreachable' || !Number.isFinite(entry.cost)) return { delivered: false, path, cost, hops: path.length - 1, message: `No route from ${current} to ${destination}.` };
    const next = entry.nextHop;
    if (next === 'Local') return { delivered: current === destination, path, cost, hops: path.length - 1, message: current === destination ? 'Packet delivered.' : 'Invalid local route.' };
    const edge = edges.find(e => e.active && ((e.source === current && e.target === next) || (e.source === next && e.target === current)));
    if (!edge) return { delivered: false, path, cost, hops: path.length - 1, message: `Next-hop link ${current}–${next} is unavailable.` };
    cost += Number(edge.cost); current = next; path.push(current);
    if (current === destination) return { delivered: true, path, cost, hops: path.length - 1, message: `Packet delivered to ${destination}.` };
    if (seen.has(current)) return { delivered: false, path, cost, hops: path.length - 1, message: `Routing loop detected at ${current}.` };
    seen.add(current);
  }
  return { delivered: false, path, cost, hops: path.length - 1, message: 'Maximum hop limit reached.' };
}
