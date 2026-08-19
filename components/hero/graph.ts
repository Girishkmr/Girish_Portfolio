/**
 * The hero's subject matter, as data.
 *
 * The hero graphic is a directed acyclic graph — the shape of the thing the
 * work is actually about — laid out left to right in layers, the way Airflow
 * draws a DAG. Both the static poster (SVG, server-rendered) and the WebGL
 * field read from this one generator, so they are the same graph and the
 * canvas fading in over the poster does not visibly jump.
 *
 * The layout is deterministic: a seeded PRNG rather than Math.random, because
 * the server-rendered poster and the client-mounted canvas must agree, and
 * because a graph that reshuffles on every reload is noise, not identity.
 */

export type GraphNode = {
  x: number;
  y: number;
  z: number;
  /** Which layer it belongs to, 0-indexed left to right. */
  layer: number;
  /** Phase offset so nodes drift independently rather than in lockstep. */
  phase: number;
  /** A few nodes are accented; the rest are recessive. */
  accent: boolean;
};

export type GraphEdge = {
  from: number;
  to: number;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/** mulberry32 — small, fast, and good enough for placing thirty dots. */
function makeRandom(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYER_SIZES = [2, 4, 5, 4, 5, 3];

export function buildGraph(seed = 20240618): Graph {
  const random = makeRandom(seed);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  /** Index of the first node in each layer, so edges can address layers. */
  const layerStart: number[] = [];

  LAYER_SIZES.forEach((count, layer) => {
    layerStart.push(nodes.length);

    const x = -1 + (2 * layer) / (LAYER_SIZES.length - 1);

    for (let i = 0; i < count; i += 1) {
      // Spread the layer vertically, then jitter so it does not read as a grid.
      const spread = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;

      nodes.push({
        x: x + (random() - 0.5) * 0.12,
        y: spread * 0.62 + (random() - 0.5) * 0.16,
        z: (random() - 0.5) * 0.7,
        layer,
        phase: random() * Math.PI * 2,
        accent: false,
      });
    }
  });

  // Every node in layer n gets one or two children in layer n+1, which is what
  // makes it a DAG rather than a particle cloud: edges only ever point right.
  for (let layer = 0; layer < LAYER_SIZES.length - 1; layer += 1) {
    const from = layerStart[layer];
    const nextFrom = layerStart[layer + 1];
    const nextCount = LAYER_SIZES[layer + 1];

    for (let i = 0; i < LAYER_SIZES[layer]; i += 1) {
      const fanOut = random() < 0.45 ? 2 : 1;
      const chosen = new Set<number>();

      for (let k = 0; k < fanOut; k += 1) {
        chosen.add(nextFrom + Math.floor(random() * nextCount));
      }

      chosen.forEach((to) => edges.push({ from: from + i, to }));
    }
  }

  // A handful of accented nodes — the sinks, the ones a run finishes on.
  const lastStart = layerStart[LAYER_SIZES.length - 1];
  for (let i = lastStart; i < nodes.length; i += 1) nodes[i].accent = true;

  return { nodes, edges };
}

export const heroGraph = buildGraph();
