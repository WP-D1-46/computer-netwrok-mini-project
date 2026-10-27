import { describe, it, expect } from 'vitest';
import { dijkstra, reconstructPath, buildDijkstraTables } from '../src/algorithms/dijkstra.js';
import { distanceVector } from '../src/algorithms/distanceVector.js';
import { simulatePacket } from '../src/simulation/packetForwarding.js';

const nodes = [{id:'A'},{id:'B'},{id:'C'},{id:'D'}];
const edges = [
 {id:'A-B',source:'A',target:'B',cost:1,active:true},
 {id:'B-C',source:'B',target:'C',cost:2,active:true},
 {id:'A-C',source:'A',target:'C',cost:8,active:true},
 {id:'C-D',source:'C',target:'D',cost:1,active:true}
];
describe('routing algorithms', () => {
 it('finds the lowest-cost path with Dijkstra', () => { const r=dijkstra(nodes,edges,'A'); expect(r.dist.D).toBe(4); expect(reconstructPath(r.previous,'A','D')).toEqual(['A','B','C','D']); });
 it('marks disconnected destinations unreachable', () => { const r=dijkstra(nodes,edges.filter(e=>e.id!=='C-D'),'A'); expect(r.dist.D).toBe(Infinity); });
 it('creates next-hop routing tables', () => { const t=buildDijkstraTables(nodes,edges); expect(t.A.find(x=>x.destination==='D').nextHop).toBe('B'); });
 it('converges distance-vector estimates to shortest costs', () => { const r=distanceVector(nodes,edges); expect(r.converged).toBe(true); expect(r.vectors.A.D).toBe(4); });
 it('simulates packet delivery using routing tables', () => { const t=buildDijkstraTables(nodes,edges); const p=simulatePacket(nodes,edges,t,'A','D'); expect(p.delivered).toBe(true); expect(p.path).toEqual(['A','B','C','D']); });
 it('rejects a packet route over a failed link', () => { const t=buildDijkstraTables(nodes,edges); const p=simulatePacket(nodes,edges.map(e=>e.id==='A-B'?{...e,active:false}:e),t,'A','D'); expect(p.delivered).toBe(false); });
});
