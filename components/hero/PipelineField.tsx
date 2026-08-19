'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroGraph } from './graph';

/**
 * The hero's WebGL layer: the same DAG as the poster, breathing.
 *
 * What it does NOT do is as deliberate as what it does. There is no bloom, no
 * post-processing, no orbit control, no scroll hijack. The graph drifts, the
 * whole field leans a few degrees toward the pointer, and pulses travel along
 * the edges left to right — which is the one thing the still poster cannot
 * show, and the only reason the canvas earns its bundle.
 */

export type Palette = {
  /** Recessive node colour — an ink token, never the accent. */
  node: string;
  /** Sink nodes and the travelling pulses. */
  accent: string;
  edge: string;
};

/** Points render as squares by default; this makes them round. */
function useDotTexture() {
  return useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

/** How many pulses are in flight at once. Kept low — this is texture, not traffic. */
const PULSE_COUNT = 9;

function Field({ palette }: { palette: Palette }) {
  const dot = useDotTexture();
  const group = useRef<THREE.Group>(null);
  const nodeGeometry = useRef<THREE.BufferGeometry>(null);
  const edgeGeometry = useRef<THREE.BufferGeometry>(null);
  const pulseGeometry = useRef<THREE.BufferGeometry>(null);

  const { nodes, edges } = heroGraph;

  /* Buffers are allocated once and mutated in place every frame. Reallocating
     a Float32Array at 60fps is the classic way to make a small scene stutter. */
  const buffers = useMemo(() => {
    const nodePositions = new Float32Array(nodes.length * 3);
    const nodeColors = new Float32Array(nodes.length * 3);
    const edgePositions = new Float32Array(edges.length * 6);
    const pulsePositions = new Float32Array(PULSE_COUNT * 3);

    const base = new THREE.Color();
    const accent = new THREE.Color();
    base.set(palette.node);
    accent.set(palette.accent);

    nodes.forEach((node, i) => {
      const c = node.accent ? accent : base;
      nodeColors[i * 3] = c.r;
      nodeColors[i * 3 + 1] = c.g;
      nodeColors[i * 3 + 2] = c.b;
    });

    // Each pulse owns one edge and a speed, so they do not travel as a wave.
    const pulses = Array.from({ length: PULSE_COUNT }, (_, i) => ({
      edge: Math.floor((i / PULSE_COUNT) * edges.length),
      offset: i / PULSE_COUNT,
      speed: 0.18 + (i % 4) * 0.045,
    }));

    return { nodePositions, nodeColors, edgePositions, pulsePositions, pulses };
  }, [nodes, edges, palette.node, palette.accent]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { nodePositions, edgePositions, pulsePositions, pulses } = buffers;

    // --- nodes drift ------------------------------------------------------
    nodes.forEach((node, i) => {
      nodePositions[i * 3] = node.x;
      nodePositions[i * 3 + 1] = node.y + Math.sin(t * 0.35 + node.phase) * 0.035;
      nodePositions[i * 3 + 2] = node.z + Math.cos(t * 0.27 + node.phase) * 0.045;
    });

    // --- edges follow their endpoints -------------------------------------
    edges.forEach((edge, i) => {
      for (let axis = 0; axis < 3; axis += 1) {
        edgePositions[i * 6 + axis] = nodePositions[edge.from * 3 + axis];
        edgePositions[i * 6 + 3 + axis] = nodePositions[edge.to * 3 + axis];
      }
    });

    // --- pulses travel along their edge, left to right --------------------
    pulses.forEach((pulse, i) => {
      const frac = (t * pulse.speed + pulse.offset) % 1;
      const edge = edges[pulse.edge];

      for (let axis = 0; axis < 3; axis += 1) {
        const from = nodePositions[edge.from * 3 + axis];
        const to = nodePositions[edge.to * 3 + axis];
        pulsePositions[i * 3 + axis] = from + (to - from) * frac;
      }
    });

    if (nodeGeometry.current) nodeGeometry.current.attributes.position.needsUpdate = true;
    if (edgeGeometry.current) edgeGeometry.current.attributes.position.needsUpdate = true;
    if (pulseGeometry.current) pulseGeometry.current.attributes.position.needsUpdate = true;

    // --- the whole field leans toward the pointer -------------------------
    if (group.current) {
      const targetY = Math.sin(t * 0.11) * 0.16 + state.pointer.x * 0.16;
      const targetX = state.pointer.y * -0.1;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.03;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.03;
    }
  });

  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry ref={edgeGeometry}>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.edgePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={palette.edge}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </lineSegments>

      <points>
        <bufferGeometry ref={nodeGeometry}>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.nodePositions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[buffers.nodeColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          size={0.05}
          sizeAttenuation
          map={dot}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>

      <points>
        <bufferGeometry ref={pulseGeometry}>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.pulsePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={palette.accent}
          size={0.032}
          sizeAttenuation
          map={dot}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export function PipelineField({
  palette,
  onReady,
}: {
  palette: Palette;
  /** Fires once the GL context exists, so the poster can hand over. */
  onReady?: () => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.35], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
      onCreated={() => onReady?.()}
    >
      <Field palette={palette} />
    </Canvas>
  );
}

export default PipelineField;
