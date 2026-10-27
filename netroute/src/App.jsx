import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownUp, CheckCircle2, CircleHelp, GitCompare, Network, Pause, Play, Plus, RotateCcw, Router, Send, Trash2, Unplug, Wifi, Zap } from 'lucide-react';
import { starterNodes, starterEdges, makeEdgeId, validateLinkCost } from './simulation/networkModel.js';
import { dijkstra, reconstructPath, buildDijkstraTables } from './algorithms/dijkstra.js';
import { distanceVector } from './algorithms/distanceVector.js';
import { simulatePacket } from './simulation/packetForwarding.js';

const clone = x => JSON.parse(JSON.stringify(x));
const examples = {
  'Shortest path': [starterNodes, starterEdges],
  'Link failure': [starterNodes, starterEdges.map(e => e.id === 'R2-R4' ? {...e, active:false} : {...e})],
  'Disconnected': [[...starterNodes], starterEdges.map(e => e.id === 'R4-R5' || e.id === 'R4-R6' || e.id === 'R5-R6' ? {...e, active:false} : {...e})]
};

export default function App() {
  const [nodes, setNodes] = useState(clone(starterNodes));
  const [edges, setEdges] = useState(clone(starterEdges));
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [hasChosenAlgorithm, setHasChosenAlgorithm] = useState(false);
  const [source, setSource] = useState('R1');
  const [destination, setDestination] = useState('R6');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState(['Network initialized with 6 routers and 8 links.', 'Choose an algorithm and run a simulation.']);
  const [packet, setPacket] = useState(null);
  const [tab, setTab] = useState('routing');
  const [showHelp, setShowHelp] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [pendingLink, setPendingLink] = useState(null);
  const [newCost, setNewCost] = useState('2');
  const [newRouterName, setNewRouterName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [costEditor, setCostEditor] = useState(null);
  const [costDraft, setCostDraft] = useState('2');
  const [packetProgress, setPacketProgress] = useState(0);

  const dijkstraResult = useMemo(() => dijkstra(nodes, edges, source), [nodes, edges, source]);
  const dvResult = useMemo(() => distanceVector(nodes, edges), [nodes, edges]);
  const dijkstraTables = useMemo(() => buildDijkstraTables(nodes, edges), [nodes, edges]);
  const activeResult = algorithm === 'dijkstra' ? dijkstraResult : null;
  const currentStep = activeResult?.steps[Math.min(step, activeResult.steps.length - 1)];
  const route = algorithm === 'dijkstra' ? reconstructPath(dijkstraResult.previous, source, destination) : shortestFromDv(source, destination, dvResult.tables);
  const routeEdges = new Set(route.slice(1).map((id, i) => makeEdgeId(route[i], id)));
  const nodesById = Object.fromEntries(nodes.map(n => [n.id, n]));
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStep(current => {
        const last = Math.max(0, dijkstraResult.steps.length - 1);
        if (current >= last) {
          window.clearInterval(timer);
          setIsPlaying(false);
          if (algorithm === 'dijkstra') {
            const result = simulatePacket(nodes, edges, dijkstraTables, source, destination);
            setPacket(result);
            setPacketProgress(1);
            log(`Shortest path found. Forwarding packet from ${source} to ${destination}.`);
          }
          return last;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [isPlaying, dijkstraResult.steps.length, algorithm, nodes, edges, dijkstraTables, source, destination]);

  useEffect(() => {
    if (!packet?.delivered || packetProgress >= packet.path.length) return;
    const timer = window.setTimeout(() => {
      setPacketProgress(v => v + 1);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [packet, packetProgress, nodes, edges, algorithm, dijkstraTables, dvResult.tables, source, destination]);

  const log = (message) => setLogs(prev => [{message, time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}, ...prev].slice(0, 80));

  function runAlgorithm() {
    setStep(0); setPacket(null); setPacketProgress(0);
    if (algorithm === 'dijkstra') {
      setIsPlaying(true);
      log(`Dijkstra started from ${source}. Watch the visited routers and tentative distances update in real time.`);
    } else {
      setIsPlaying(false);
      const result = simulatePacket(nodes, edges, dvResult.tables, source, destination);
      setPacket(result); setPacketProgress(result.path.length);
      log(`Distance-vector simulation completed in ${dvResult.roundCount} rounds. ${dvResult.converged ? 'Converged.' : 'Round limit reached.'}`);
      log(`Packet ${result.delivered ? 'delivered' : 'failed'}: ${result.path.join(' → ') || 'no path'}. ${result.message}`);
    }
  }
  function loadExample(name) {
    const [ns, es] = examples[name]; setNodes(clone(ns)); setEdges(clone(es)); setSelected(null); setStep(0); setPacket(null); setIsPlaying(false); log(`Loaded ${name} example topology.`);
  }
  function addRouter() {
    const id = newRouterName.trim().toUpperCase() || `R${Math.max(0, ...nodes.map(n => Number(n.id.replace(/\D/g,'')) || 0)) + 1}`;
    if (nodes.some(n => n.id === id)) { log(`Router ${id} already exists.`); return; }
    const n = {id, x:90 + (nodes.length % 4) * 145, y:60 + Math.floor(nodes.length / 4) * 115};
    setNodes(prev => [...prev, n]); setSource(id); setSelected({type:'node', id}); setNewRouterName(''); log(`Added router ${id}.`);
  }
  function removeSelected() {
    if (!selected) return;
    if (selected.type === 'node') {
      const id = selected.id; if (nodes.length <= 1) { log('At least one router must remain.'); return; }
      setNodes(prev => prev.filter(n => n.id !== id)); setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
      if (source === id) setSource(nodes.find(n => n.id !== id)?.id || ''); if (destination === id) setDestination(nodes.find(n => n.id !== id)?.id || ''); log(`Removed router ${id} and its links.`);
    } else { setEdges(prev => prev.filter(e => e.id !== selected.id)); log(`Removed link ${selected.id}.`); }
    setSelected(null); setPacket(null);
  }
  function clickNode(id) {
    setSelected({type:'node', id});
    if (linkMode) {
      if (!pendingLink) { setPendingLink(id); log(`Select a second router to connect to ${id}.`); }
      else if (pendingLink === id) { setPendingLink(null); log('Link creation cancelled.'); }
      else { openCostEditor(pendingLink, id); setPendingLink(null); setLinkMode(false); }
    }
  }
  function openCostEditor(a, b) {
    if (a === b) return;
    const id = makeEdgeId(a, b);
    if (edges.some(e => e.id === id)) { log(`Link ${id} already exists.`); return; }
    const na = nodes.find(n => n.id === a), nb = nodes.find(n => n.id === b);
    setCostDraft('2'); setCostEditor({ source:a, target:b, id, x:(na.x+nb.x)/2, y:(na.y+nb.y)/2 });
  }
  function saveNewConnection() {
    const cost = Number(costDraft);
    if (!costEditor || !validateLinkCost(cost)) { log('Link cost must be a positive number.'); return; }
    setEdges(prev => [...prev, { id:costEditor.id, source:costEditor.source, target:costEditor.target, cost, active:true }]);
    log(`Created link ${costEditor.id} with cost ${cost}.`); setCostEditor(null); setPacket(null);
  }
  function editCost(edgeId, value) {
    if (!validateLinkCost(value)) { log('Link cost must be a positive number.'); return; }
    setEdges(prev => prev.map(e => e.id === edgeId ? {...e, cost:Number(value)} : e)); log(`Updated ${edgeId} cost to ${value}.`);
  }
  function toggleEdge(edge) {
    setEdges(prev => prev.map(e => e.id === edge.id ? {...e, active:!e.active} : e)); setPacket(null); log(`${edge.id} ${edge.active ? 'failed' : 'restored'}. Re-run routing to calculate updated paths.`);
  }
  function sendPacket() {
    const tables = algorithm === 'dijkstra' ? dijkstraTables : dvResult.tables;
    const result = simulatePacket(nodes, edges, tables, source, destination);
    setPacket(result); setPacketProgress(result.path.length); log(`Packet ${result.delivered ? 'delivered' : 'failed'}: ${result.path.join(' → ') || 'no path'}. ${result.message}`);
  }
  function reset() { setNodes(clone(starterNodes)); setEdges(clone(starterEdges)); setSource('R1'); setDestination('R6'); setAlgorithm('dijkstra'); setSelected(null); setStep(0); setPacket(null); setIsPlaying(false); setConnectFrom(null); setCostEditor(null); setPacketProgress(0); setLogs([{message:'Simulation reset to default topology.', time:new Date().toLocaleTimeString()}]); }
  function moveNode(id, e) {
    const rect = e.currentTarget.closest('.canvas').getBoundingClientRect();
    const x = Math.max(38, Math.min(710, e.clientX - rect.left)); const y = Math.max(38, Math.min(270, e.clientY - rect.top));
    setNodes(prev => prev.map(n => n.id === id ? {...n,x,y} : n));
  }
  const selectedEdge = selected?.type === 'edge' ? edges.find(e => e.id === selected.id) : null;

  if (!hasChosenAlgorithm) return <div className="algorithm-welcome">
    <div className="welcome-brand"><div className="brand-mark"><Network size={24}/></div><div><div className="brand-name">NetRoute <span>LAB</span></div><div className="brand-sub">COMPUTER NETWORKS ROUTING SIMULATOR</div></div></div>
    <section className="welcome-card"><span className="eyebrow">CHOOSE YOUR SIMULATION</span><h1>How would you like to route data?</h1><p>Select a routing method to open its dedicated simulation workspace. You can explore weighted paths, routing tables, and packet forwarding.</p>
      <div className="welcome-options">
        <button className="welcome-option" onClick={()=>{setAlgorithm('dijkstra');setHasChosenAlgorithm(true);setTab('routing')}}><span className="welcome-option-icon"><Network size={25}/></span><strong>Dijkstra's Algorithm</strong><small>Link-state routing</small><p>Calculate shortest paths from a source router using the full network topology. Step through visited routers and distance updates.</p><span className="welcome-cta">Open link-state simulation →</span></button>
        <button className="welcome-option" onClick={()=>{setAlgorithm('dv');setHasChosenAlgorithm(true);setTab('routing')}}><span className="welcome-option-icon"><ArrowDownUp size={25}/></span><strong>Bellman–Ford</strong><small>Distance-vector routing</small><p>Simulate neighbor-to-neighbor distance updates, routing-table changes, and convergence across the network.</p><span className="welcome-cta">Open distance-vector simulation →</span></button>
      </div><div className="welcome-note">Educational simulation · No real network traffic is transmitted</div>
    </section>
  </div>;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Network size={21}/></div><div><div className="brand-name">NetRoute <span>LAB</span></div><div className="brand-sub">COMPUTER NETWORKS SIMULATOR</div></div></div><div className="top-status"><span className="live-dot"/> Simulation environment <span className="status-divider"/> <span>{nodes.length} routers</span><span>{edges.filter(e=>e.active).length} active links</span></div><div className="top-actions"><button className="icon-button" title="Help" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={17}/></button><button className="button subtle" onClick={reset}><RotateCcw size={15}/> Reset</button></div></header>
    <main className="layout">
      <aside className="left-panel panel"><div className="panel-heading"><div><span className="eyebrow">WORKSPACE</span><h2>Network tools</h2></div><Network size={18}/></div>
        <section className="tool-section"><div className="section-label">TOPOLOGY</div><div className="tool-grid"><button className="tool-card" onClick={addRouter}><Plus size={18}/><span>Add router</span></button><button className={`tool-card ${linkMode?'selected-tool':''}`} onClick={()=>{setLinkMode(v=>!v);setPendingLink(null)}}><Unplug size={18}/><span>{linkMode?'Cancel link':'Add connection'}</span></button><button className="tool-card" onClick={removeSelected} disabled={!selected}><Trash2 size={18}/><span>Delete selected</span></button><button className="tool-card" onClick={()=>{setNodes(clone(starterNodes));setEdges(clone(starterEdges));setSource('R1');setDestination('R6');setStep(0);setPacket(null);setIsPlaying(false);log('Default network loaded.')}}><Network size={18}/><span>Load example</span></button></div>
          {linkMode && <div className="inline-form"><label>New link cost</label><input value={newCost} onChange={e=>setNewCost(e.target.value)} type="number" min="0.1" step="0.5"/><small>{pendingLink?`Now click a second router (from ${pendingLink})`:'Click a router, then another router.'}</small></div>}
          <div className="inline-form"><label>Router ID (optional)</label><div className="input-row"><input placeholder="e.g. R7" value={newRouterName} onChange={e=>setNewRouterName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRouter()}/><button className="mini-button" onClick={addRouter}><Plus size={15}/></button></div></div>
        </section>
        <div className="sidebar-footer"><span className="green-dot"/> Local simulation only <span className="version">v1.0</span></div>
      </aside>

      <section className="center-column"><div className="workspace-header"><div><span className="eyebrow">TOPOLOGY EDITOR</span><h1>Network overview</h1><p>Build a topology, run routing algorithms, and inspect packet paths.</p></div><div className="canvas-legend"><span><i className="legend-line active-line"/> Active link</span><span><i className="legend-line route-line"/> Selected route</span><span><i className="legend-line failed-line"/> Failed link</span></div></div>
        <div className="canvas-wrap"><div className="canvas-toolbar"><span className="canvas-title"><span className="green-dot"/> LIVE TOPOLOGY</span><span className="canvas-hint">{connectFrom?`DRAG FROM ${connectFrom} TO ANOTHER ROUTER`:linkMode?'LINK MODE · Select two routers':'Drag routers to reposition · Double-click a router to start a connection'}</span><button className="tiny-action" onClick={()=>{setNodes(clone(starterNodes));log('Router positions reset.')}}>Reset layout</button></div>
          <div className="canvas" onClick={()=>{if(!linkMode) setSelected(null)}}><svg className="edges-svg" viewBox="0 0 750 310" preserveAspectRatio="none">{edges.map(e=>{const a=nodesById[e.source],b=nodesById[e.target]; if(!a||!b)return null;const isRoute=routeEdges.has(e.id);const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;return <g key={e.id} onClick={ev=>{ev.stopPropagation();setSelected({type:'edge',id:e.id});setNewCost(String(e.cost))}} className="edge-group"><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`edge ${!e.active?'failed':isRoute?'route':'normal'} ${selected?.id===e.id?'edge-selected':''}`}/><rect x={midX-14} y={midY-11} width="28" height="20" rx="6" className={`cost-pill ${!e.active?'cost-failed':isRoute?'cost-route':''}`}/><text x={midX} y={midY+3} textAnchor="middle" className="cost-label">{e.cost}</text><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="18" className="edge-hit"/></g>})}</svg>
            {nodes.map(n=>{const isCurrent=currentStep?.current===n.id;const isVisited=currentStep?.visited?.includes(n.id);const isOnRoute=route.includes(n.id);const isPacket=packet?.path?.slice(0, packetProgress).includes(n.id);return <div key={n.id} className={`router-node ${selected?.type==='node'&&selected.id===n.id?'node-selected':''} ${isCurrent?'node-current':''} ${isVisited?'node-visited':''} ${isOnRoute?'node-route':''} ${isPacket?'node-packet':''} ${pendingLink===n.id?'node-pending':''}`} style={{left:`${n.x/750*100}%`,top:`${n.y/310*100}%`}} data-router-id={n.id} onDoubleClick={e=>{e.stopPropagation();setConnectFrom(n.id);setSelected({type:'node',id:n.id});log(`Connection started from ${n.id}. Drag this router onto another router.`)}} onClick={e=>{e.stopPropagation();clickNode(n.id)}} onPointerDown={e=>{if(linkMode)return; const startX=e.clientX,startY=e.clientY,origX=n.x,origY=n.y,rect=e.currentTarget.closest('.canvas').getBoundingClientRect(); let moved=false; const onMove=ev=>{if(connectFrom===n.id){moved=true;return;} if(Math.abs(ev.clientX-startX)+Math.abs(ev.clientY-startY)>4)moved=true; setNodes(prev=>prev.map(v=>v.id===n.id?{...v,x:Math.max(38,Math.min(710,origX+(ev.clientX-startX)*750/rect.width)),y:Math.max(38,Math.min(280,origY+(ev.clientY-startY)*310/rect.height))}:v))}; const onUp=ev=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp); if(connectFrom===n.id){const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-router-id]')?.getAttribute('data-router-id'); if(target&&target!==n.id){openCostEditor(n.id,target);setConnectFrom(null);} else if(target===n.id){log('Drag the router onto a different router to create a connection.');}}}; window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp)}}><div className="router-icon"><Router size={19}/></div><span className="router-id">{n.id}</span><span className="router-state">{isCurrent?'PROCESSING':isOnRoute?'ON ROUTE': 'ROUTER'}</span></div>})}
            {costEditor&&<div className="cost-editor" style={{left:`${costEditor.x/750*100}%`,top:`${costEditor.y/310*100}%`}} onPointerDown={e=>e.stopPropagation()}><b>{costEditor.source} ↔ {costEditor.target}</b><label>Link cost / weight</label><div><input type="number" min="0.1" step="0.5" value={costDraft} onChange={e=>setCostDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveNewConnection()}/><button onClick={saveNewConnection}>Add link</button><button className="cost-cancel" onClick={()=>setCostEditor(null)}>×</button></div></div>}
            {packet?.path?.length>1&&<div className="packet-banner"><span className={packet.delivered?'green-dot':'red-dot'}/>{packet.delivered?'PACKET DELIVERED':'PACKET FAILED'} <span>{packet.path.join(' → ')}</span></div>}
          </div><div className="canvas-bottom"><span><b>{nodes.length}</b> nodes</span><span><b>{edges.filter(e=>e.active).length}</b> active links</span><span><b>{edges.filter(e=>!e.active).length}</b> failed links</span><span className="canvas-bottom-right">Undirected weighted graph <span className="status-pill">SIMULATED</span></span></div></div>
        <div className="bottom-panel panel"><div className="bottom-tabs"><span className="tab-label tab-active">Route path &amp; link costs</span></div>
          <div className="table-content"><div className="table-top"><div><h3>Route breakdown</h3><p>{algorithm==='dijkstra'?'Dijkstra shortest path':'Bellman–Ford distance-vector route'} from {source} to {destination}.</p></div><div className="route-total"><span>TOTAL COST</span><strong>{route.length ? route.slice(1).reduce((sum, id, i) => { const edge = edges.find(e => e.active && e.id === makeEdgeId(route[i], id)); return sum + (edge ? Number(edge.cost) : 0); }, 0) : (source===destination ? 0 : '∞')}</strong></div></div>
            <div className="table-scroll"><table><thead><tr><th>FROM ROUTER</th><th>TO ROUTER</th><th>LINK WEIGHT</th><th>RUNNING COST</th></tr></thead><tbody>{route.length > 1 ? route.slice(1).map((to, i) => { const from = route[i]; const edge = edges.find(e => e.active && e.id === makeEdgeId(from, to)); const runningCost = route.slice(1, i + 2).reduce((sum, next, j) => { const prev = route[j]; const link = edges.find(e => e.active && e.id === makeEdgeId(prev, next)); return sum + (link ? Number(link.cost) : 0); }, 0); return <tr key={`${from}-${to}-${i}`}><td><span className="destination-dot"/>{from}</td><td>{to}</td><td className="cost-cell">{edge ? edge.cost : '—'}</td><td className="cost-cell">{runningCost}</td></tr>; }) : source === destination ? <tr><td>{source}</td><td>{destination}</td><td className="cost-cell">0</td><td className="cost-cell">0</td></tr> : <tr><td colSpan="4" className="empty-route">No route exists between {source} and {destination}.</td></tr>}</tbody><tfoot><tr><th colSpan="3">TOTAL SOURCE → DESTINATION COST</th><th className="cost-cell">{route.length ? route.slice(1).reduce((sum, id, i) => { const edge = edges.find(e => e.active && e.id === makeEdgeId(route[i], id)); return sum + (edge ? Number(edge.cost) : 0); }, 0) : (source===destination ? 0 : '∞')}</th></tr></tfoot></table></div>
          </div>
        </div>
      </section>

      <aside className="right-panel panel"><div className="panel-heading"><div><span className="eyebrow">CONTROL CENTER</span><h2>Simulation controls</h2></div><Zap size={18}/></div>
        <section className="control-section"><label className="field-label">ROUTING ALGORITHM</label><div className="algorithm-switch"><button className={algorithm==='dijkstra'?'algorithm-active':''} onClick={()=>{setAlgorithm('dijkstra');setHasChosenAlgorithm(true);setStep(0);setPacket(null)}}><Network size={16}/><span><b>Link-state</b><small>Dijkstra's algorithm</small></span></button><button className={algorithm==='dv'?'algorithm-active':''} onClick={()=>{setAlgorithm('dv');setHasChosenAlgorithm(true);setStep(0);setPacket(null)}}><ArrowDownUp size={16}/><span><b>Distance-vector</b><small>Bellman-Ford updates</small></span></button></div></section>
        <section className="control-section"><div className="field-row"><div className="field"><label className="field-label">SOURCE ROUTER</label><select value={source} onChange={e=>{setSource(e.target.value);setStep(0);setPacket(null)}}>{nodes.map(n=><option key={n.id}>{n.id}</option>)}</select></div><div className="field"><label className="field-label">DESTINATION</label><select value={destination} onChange={e=>{setDestination(e.target.value);setPacket(null)}}>{nodes.map(n=><option key={n.id}>{n.id}</option>)}</select></div></div><button className="button primary full" onClick={runAlgorithm}><Play size={15} fill="currentColor"/> Run simulation</button>
          {algorithm==='dijkstra'?<div className="step-controls"><button className="button subtle" disabled={step===0} onClick={()=>setStep(v=>Math.max(0,v-1))}>Previous</button><div className="step-count">STEP <b>{Math.min(step+1,dijkstraResult.steps.length)}</b> / {dijkstraResult.steps.length}</div><button className="button subtle" disabled={step>=dijkstraResult.steps.length-1} onClick={()=>setStep(v=>Math.min(dijkstraResult.steps.length-1,v+1))}>Next <span>→</span></button></div>:<div className="convergence-note"><CheckCircle2 size={15}/><span>{dvResult.converged?'Converged':'Round limit reached'} in {dvResult.roundCount} rounds</span></div>}
        </section>
        <section className="control-section"><div className="section-title-row"><label className="field-label">ROUTE ANALYSIS</label><span className="tiny-tag">LIVE RESULTS</span></div><div className="metric-grid"><div className="metric-card"><span>SHORTEST COST</span><strong>{algorithm==='dijkstra'?(Number.isFinite(dijkstraResult.dist[destination])?dijkstraResult.dist[destination]:'∞'):(Number.isFinite(dvResult.vectors[source]?.[destination])?dvResult.vectors[source][destination]:'∞')}</strong><small>{source} → {destination}</small></div><div className="metric-card"><span>HOPS</span><strong>{route.length?route.length-1:'—'}</strong><small>{route.length?'Optimal path':'No route found'}</small></div></div><div className="route-preview"><div className="route-preview-title"><span>SELECTED ROUTE</span><span className="green-dot"/></div>{route.length?<div className="route-chips">{route.map((r,i)=><React.Fragment key={r}><span className="route-chip">{r}</span>{i<route.length-1&&<span className="route-arrow">→</span>}</React.Fragment>)}</div>:<p className="muted-small">No path connects these routers.</p>}</div><button className="button secondary full" onClick={sendPacket}><Send size={15}/> Send test packet</button>{packet&&<div className={`packet-result ${packet.delivered?'packet-success':'packet-error'}`}><b>{packet.delivered?'Delivery successful':'Delivery failed'}</b><p>{packet.message}</p><small>Path cost: {Number.isFinite(packet.cost)?packet.cost:'∞'} · Hops: {packet.hops??0}</small></div>}</section>
        <div className="right-footer"><Wifi size={14}/> Simulated routing · No real packets transmitted</div>
      </aside>
    </main>
    {showHelp&&<div className="modal-backdrop" onClick={()=>setShowHelp(false)}><div className="help-modal" onClick={e=>e.stopPropagation()}><div className="modal-title"><div><span className="eyebrow">QUICK GUIDE</span><h2>How to use NetRoute</h2></div><button className="icon-button" onClick={()=>setShowHelp(false)}>×</button></div><ol><li>Choose a routing algorithm in the Control Center.</li><li>Select source and destination routers.</li><li>Click <b>Run simulation</b>, then step through Dijkstra's execution.</li><li>Click a link to edit its cost or simulate a link failure.</li><li>Use <b>Send test packet</b> to trace forwarding using the calculated tables.</li><li>Review each hop and its link weight in the route breakdown table.</li></ol><p>This is an educational simulation. Link-state and distance-vector behavior are simplified models, not real router implementations.</p></div></div>}
    <footer className="mobile-footer">NETROUTE LAB · COMPUTER NETWORKS EDUCATION</footer>
  </div>;
}

function shortestFromDv(source, destination, tables) {
  // Reconstruct a path by repeatedly following each router's own next-hop entry.
  if (source===destination) return [source];
  const path=[source], seen=new Set([source]); let current=source;
  for(let i=0;i<100;i++) { const entry=tables[current]?.find(r=>r.destination===destination); if(!entry||entry.nextHop==='—'||entry.status==='Unreachable'||entry.nextHop==='Local') return []; current=entry.nextHop; path.push(current); if(current===destination)return path; if(seen.has(current))return []; seen.add(current); }
  return [];
}
