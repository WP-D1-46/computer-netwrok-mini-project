# NetRoute — Routing Algorithm Visualizer

NetRoute is a frontend-only educational Computer Networks simulator built with React, Vite, and JavaScript.

## Start locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

Run the automated tests with:

```bash
npm test
```

## Choose a routing simulation

On launch, select one of two simulation workspaces:

- **Dijkstra's algorithm (link-state):** Calculates shortest paths using the full topology and supports step-by-step inspection.
- **Bellman–Ford (distance-vector):** Simulates neighbor distance-vector updates and convergence rounds.

## Features

- Interactive weighted router topology
- Add/remove routers and create weighted connections
- Dijkstra shortest-path calculation and step controls
- Distance-vector routing table calculation
- Routing-table inspection per router
- Simulated packet forwarding
- Link failure / restoration and route recalculation
- Concept guide explaining routing fundamentals
- Simple, light topology canvas and a neutral page background

The bottom workspace contains only **Routing tables** and **Concept guide**. Demo scenario shortcuts and the simulation console tab have been removed.

## Notes

This is an educational simulator. It models routing and packet forwarding in the browser; it does not configure real routers or transmit actual network packets. The distance-vector implementation is a simplified convergence model.
