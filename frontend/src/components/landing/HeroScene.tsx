import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, MeshDistortMaterial, Sparkles, Trail } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';

const ROSE = '#D45060';
const MAROON = '#800020';
const BEIGE = '#F3E6D5';
const WHITE = '#FFF9F2';

const NODE_COUNT = 22;

function seeded(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function shellPoints(count: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const radius = 2.55 + seeded(i) * 0.7;
    const theta = golden * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius * 0.78, Math.sin(theta) * r * radius));
  }
  return pts;
}

function buildCurves(nodes: THREE.Vector3[]) {
  const seen = new Set<string>();
  const curves: THREE.QuadraticBezierCurve3[] = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: a.distanceToSquared(b) }))
      .filter((n) => n.j !== i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) return;
        seen.add(key);
        const b = nodes[j];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const ctrl = mid.clone().setLength(mid.length() * 1.28);
        curves.push(new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone()));
      });
  });
  return curves;
}

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fresnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
    float pulse = 0.85 + 0.15 * sin(uTime * 1.6);
    gl_FragColor = vec4(uColor * f * 1.6 * pulse, f * pulse);
  }
`;

function Core({ reduced }: { reduced: boolean }) {
  const shell = useRef<THREE.ShaderMaterial>(null);
  const cage = useRef<THREE.Mesh>(null);
  const energy = useRef<THREE.Points>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(ROSE) }, uTime: { value: 0 } }), []);

  const energyPositions = useMemo(() => {
    const n = 500;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 0.25 + seeded(i + 900) * 0.8;
      const t = seeded(i + 1900) * Math.PI * 2;
      const p = Math.acos(2 * seeded(i + 2900) - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      arr[i * 3 + 2] = r * Math.cos(p);
    }
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (shell.current) shell.current.uniforms.uTime.value = clock.getElapsedTime();
    if (reduced) return;
    if (cage.current) { cage.current.rotation.y -= delta * 0.18; cage.current.rotation.x += delta * 0.07; }
    if (energy.current) energy.current.rotation.y += delta * 0.6;
  });

  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.95, 12]} />
        <MeshDistortMaterial color={MAROON} emissive={MAROON} emissiveIntensity={0.55} roughness={0.2} metalness={0.8} distort={reduced ? 0 : 0.42} speed={1.8} />
      </mesh>
      <points ref={energy}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[energyPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.028} color={WHITE} transparent opacity={0.85} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh scale={1.22}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial ref={shell} vertexShader={fresnelVertex} fragmentShader={fresnelFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={cage} scale={1.42}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={BEIGE} wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

function Satellite({ radius, speed, phase, tilt, reduced }: { radius: number; speed: number; phase: number; tilt: THREE.Euler; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = reduced ? phase : clock.getElapsedTime() * speed + phase;
    v.set(Math.cos(t) * radius, Math.sin(t) * radius, 0).applyEuler(tilt);
    ref.current?.position.copy(v);
  });
  return (
    <Trail width={0.22} length={4} decay={1.5} color={ROSE} attenuation={(w) => w * w}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

function Orbits({ reduced }: { reduced: boolean }) {
  const rings = useMemo(
    () => [
      { r: 1.75, tilt: new THREE.Euler(1.2, 0.2, 0), speed: 0.9 },
      { r: 2.05, tilt: new THREE.Euler(-0.6, 0.9, 0.3), speed: -0.65 },
      { r: 2.3, tilt: new THREE.Euler(0.3, -0.5, 1.1), speed: 0.5 },
    ],
    []
  );
  return (
    <>
      {rings.map((ring, i) => (
        <group key={i}>
          <mesh rotation={ring.tilt}>
            <torusGeometry args={[ring.r, 0.006, 8, 200]} />
            <meshBasicMaterial color={i === 1 ? BEIGE : ROSE} transparent opacity={i === 1 ? 0.25 : 0.5} toneMapped={false} />
          </mesh>
          {[0, Math.PI].map((phase) => (
            <Satellite key={phase} radius={ring.r} speed={ring.speed} phase={phase + i} tilt={ring.tilt} reduced={reduced} />
          ))}
        </group>
      ))}
    </>
  );
}

function FlowEdge({ curve, reduced }: { curve: THREE.QuadraticBezierCurve3; reduced: boolean }) {
  const ref = useRef<Line2>(null);
  const points = useMemo(() => curve.getPoints(32), [curve]);
  useFrame((_, delta) => {
    if (reduced || !ref.current) return;
    ref.current.material.dashOffset -= delta * 0.6;
  });
  return <Line ref={ref} points={points} color={ROSE} lineWidth={0.9} dashed dashSize={0.1} gapSize={0.09} transparent opacity={0.4} />;
}

function Packet({ curve, offset, reduced }: { curve: THREE.QuadraticBezierCurve3; offset: number; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const k = reduced ? 0.5 : (clock.getElapsedTime() * 0.35 + offset) % 1;
    curve.getPoint(k, p);
    ref.current?.position.copy(p);
  });
  return (
    <Trail width={0.12} length={2.5} decay={1.5} color={ROSE} attenuation={(w) => w * w}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshBasicMaterial color={WHITE} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

function GraphNode({ position, i, reduced }: { position: THREE.Vector3; i: number; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const big = i % 5 === 0;
  const color = i % 3 === 0 ? BEIGE : ROSE;
  useFrame(({ clock }, delta) => {
    const m = ref.current;
    if (!m || reduced) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 2 + i) * 0.18;
    m.scale.setScalar(s);
    m.rotation.x += delta * 0.8;
    m.rotation.y += delta * 0.5;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[big ? 0.13 : 0.075, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={big ? 2.2 : 1.4} flatShading toneMapped={false} />
    </mesh>
  );
}

function Rig({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const startZ = reduced ? 7 : 13;
  useEffect(() => { camera.position.set(0, 0, startZ); }, [camera, startZ]);

  useFrame(({ clock, pointer }, delta) => {
    const g = group.current;
    if (!g) return;
    const scroll = Math.min(1, window.scrollY / window.innerHeight);
    const targetZ = 7 + scroll * 3;
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, delta * 1.6);
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * Math.min(1, delta * 2);
    camera.position.y += (pointer.y * 0.4 - camera.position.y) * Math.min(1, delta * 2);
    camera.lookAt(0, 0, 0);
    const base = reduced ? 0 : clock.getElapsedTime() * 0.1;
    g.rotation.y += (base + pointer.x * 0.35 - g.rotation.y) * Math.min(1, delta * 2.5);
    g.rotation.x += (-pointer.y * 0.25 + scroll * 0.4 - g.rotation.x) * Math.min(1, delta * 2.5);
  });

  return <group ref={group}>{children}</group>;
}

function Scene({ reduced, lite }: { reduced: boolean; lite: boolean }) {
  const nodes = useMemo(() => shellPoints(NODE_COUNT), []);
  const curves = useMemo(() => buildCurves(nodes), [nodes]);
  const packetCurves = useMemo(() => curves.filter((_, i) => i % 2 === 0).slice(0, lite ? 6 : 12), [curves, lite]);

  return (
    <Rig reduced={reduced}>
      <Core reduced={reduced} />
      <Orbits reduced={reduced} />
      {curves.map((c, i) => <FlowEdge key={i} curve={c} reduced={reduced} />)}
      {packetCurves.map((c, i) => <Packet key={i} curve={c} offset={i * 0.17} reduced={reduced} />)}
      {nodes.map((p, i) => <GraphNode key={i} position={p} i={i} reduced={reduced} />)}
      <Sparkles count={lite ? 60 : 140} scale={[11, 7, 8]} size={2.2} speed={reduced ? 0 : 0.35} color={BEIGE} opacity={0.55} />
    </Rig>
  );
}

export default function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const lite = useMemo(() => window.matchMedia('(max-width: 900px)').matches, []);

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
        dpr={[1, lite ? 1.5 : 1.75]}
        camera={{ position: [0, 0, 13], fov: 45 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        frameloop={visible ? 'always' : 'never'}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[4, 4, 5]} intensity={45} color={ROSE} />
        <pointLight position={[-5, -3, 3]} intensity={25} color={BEIGE} />
        <Scene reduced={reduced} lite={lite} />
        <EffectComposer multisampling={lite ? 0 : 4}>
          <Bloom mipmapBlur luminanceThreshold={0.25} luminanceSmoothing={0.3} intensity={1.15} radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
