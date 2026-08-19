import { heroGraph } from './graph';

/**
 * The static poster (FR-01). Server-rendered inline SVG, roughly 2KB, no
 * JavaScript — so the hero has its graphic in the first paint rather than
 * after a WebGL context has been acquired.
 *
 * It is also the FINAL state for two audiences the canvas never serves:
 * anyone who asked for reduced motion, and anyone on a narrow screen. Which
 * is why it is a real drawing of the graph and not a blurred placeholder.
 */

const W = 200;
const H = 140;

/** Graph space is x,y ∈ [-1,1]; the viewBox is not square, so map each axis. */
const px = (x: number) => W / 2 + x * (W / 2) * 0.86;
const py = (y: number) => H / 2 + y * (H / 2) * 0.86;

export function HeroPoster() {
  const { nodes, edges } = heroGraph;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
    >
      <g stroke="var(--rule-2)" strokeWidth="0.4" opacity="0.75">
        {edges.map((edge) => (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={px(nodes[edge.from].x)}
            y1={py(nodes[edge.from].y)}
            x2={px(nodes[edge.to].x)}
            y2={py(nodes[edge.to].y)}
          />
        ))}
      </g>

      {nodes.map((node, i) => (
        <circle
          key={i}
          cx={px(node.x)}
          cy={py(node.y)}
          r={node.accent ? 1.8 : 1.4}
          fill={node.accent ? 'var(--accent)' : 'var(--ink-3)'}
          opacity={node.accent ? 0.9 : 0.55}
        />
      ))}
    </svg>
  );
}
