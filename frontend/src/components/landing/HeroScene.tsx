import { Canvas, useFrame } from '@react-three/fiber';
import { Line, MeshDistortMaterial } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const ROSE = '#D45060';
const MAROON = '#800020';
const BEIGE = '#F3E6D5';

const NODE_COUNT = 18;
const PARTICLE_COUNT = 1400;

type Vec3 = [number, number, number];

function fibonacciSphere(count: number, radius: number): Vec3[] {
  const pts: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const jitter = 1 + ((i * 37) % 11) / 40;
    pts.push([Math.cos(theta) * r * radius * jitter, y * radius * 0.82, Math.sin(theta) * r * radius * jitter]);
  }
  return pts;
}

function buildEdges(nodes: Vec3[]): [number, number][] {
  const edges = new Set<string>();
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 }))
      .filter((n) => n.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    nearest.forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  return [...edges].map((e) => e.split('-').map(Number) as [number, number]);
}

function Pulses({ nodes, edges, reduced }: { nodes: Vec3[]; edges: [number, number][]; reduced: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const lanes = useMemo(() => edges.filter((_, i) => i % 2 === 0).slice(0, 10), [edges]);

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.getElapsedTime();
    lanes.forEach(([a, b], i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const k = (t * 0.45 + i * 0.23) % 1;
      const pa = nodes[a];
      const pb = nodes[b];
      mesh.position.set(pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k);
    });
  });

  return (
    <>
      {lanes.map((_, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color={BEIGE} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Particles() {
  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 3.2 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color={BEIGE} transparent opacity={0.45} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Graph({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const nodes = useMemo(() => fibonacciSphere(NODE_COUNT, 2.5), []);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);

  useFrame(({ clock, pointer }, delta) => {
    const g = group.current;
    if (!g) return;
    const base = reduced ? 0 : clock.getElapsedTime() * 0.12;
    g.rotation.y += (base + pointer.x * 0.5 - g.rotation.y) * Math.min(1, delta * 3);
    g.rotation.x += (-pointer.y * 0.3 - g.rotation.x) * Math.min(1, delta * 3);
    if (ring.current && !reduced) ring.current.rotation.z += delta * 0.25;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.05, 8]} />
        <MeshDistortMaterial color={MAROON} emissive={MAROON} emissiveIntensity={0.35} roughness={0.25} metalness={0.7} distort={reduced ? 0 : 0.38} speed={1.6} />
      </mesh>
      <mesh scale={1.32}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color={BEIGE} wireframe transparent opacity={0.14} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.95, 0.008, 8, 160]} />
        <meshBasicMaterial color={ROSE} transparent opacity={0.6} toneMapped={false} />
      </mesh>

      {edges.map(([a, b]) => (
        <Line key={`${a}-${b}`} points={[nodes[a], nodes[b]]} color={ROSE} lineWidth={1} transparent opacity={0.35} />
      ))}

      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i % 5 === 0 ? 0.11 : 0.07, 16, 16]} />
          <meshStandardMaterial color={i % 3 === 0 ? BEIGE : ROSE} emissive={i % 3 === 0 ? BEIGE : ROSE} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}

      <Pulses nodes={nodes} edges={edges} reduced={reduced} />
    </group>
  );
}

export default function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="fx-scene" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        frameloop={visible ? 'always' : 'never'}
      >
        <ambientLight intensity={0.35} />
        <pointLight position={[4, 4, 5]} intensity={40} color={ROSE} />
        <pointLight position={[-5, -3, 3]} intensity={25} color={BEIGE} />
        <Graph reduced={reduced} />
        <Particles />
      </Canvas>
    </div>
  );
}
