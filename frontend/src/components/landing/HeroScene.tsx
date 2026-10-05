import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, MeshDistortMaterial } from '@react-three/drei';
import { Bloom, EffectComposer, SMAA } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const ROSE = '#D45060';
const MAROON = '#800020';
const BEIGE = '#F3E6D5';
const WHITE = '#FFF9F2';

const NODE_COUNT = 22;

// Cap per-frame deltas so the scene never lurches after the tab/canvas was paused.
const dtOf = (delta: number) => Math.min(delta, 0.05);

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
    float f = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
    float breathe = 0.94 + 0.06 * sin(uTime * 0.7);
    gl_FragColor = vec4(uColor * f * 1.15 * breathe, f * 0.9 * breathe);
  }
`;

function Core({ reduced }: { reduced: boolean }) {
  const shell = useRef<THREE.ShaderMaterial>(null);
  const cage = useRef<THREE.Mesh>(null);
  const energy = useRef<THREE.Points>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(ROSE) }, uTime: { value: 0 } }), []);

  const energyPositions = useMemo(() => {
    const n = 420;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 0.25 + seeded(i + 900) * 0.7;
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
    const dt = dtOf(delta);
    if (cage.current) { cage.current.rotation.y -= dt * 0.08; cage.current.rotation.x += dt * 0.03; }
    if (energy.current) energy.current.rotation.y += dt * 0.22;
  });

  return (
    <group>
      <mesh>
        <icosahedronGeometry args={[0.95, 10]} />
        {/* Non-metallic + self-lit: a metal with no environment map renders black. */}
        <MeshDistortMaterial color={MAROON} emissive="#a3112f" emissiveIntensity={0.7} roughness={0.55} metalness={0.1} distort={reduced ? 0 : 0.28} speed={0.9} />
      </mesh>
      <points ref={energy}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[energyPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.03} color={BEIGE} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
      </points>
      <mesh scale={1.2}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial ref={shell} vertexShader={fresnelVertex} fragmentShader={fresnelFragment} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={cage} scale={1.42}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={BEIGE} wireframe transparent opacity={0.1} />
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
    <mesh ref={ref}>
      <sphereGeometry args={[0.065, 16, 16]} />
      <meshBasicMaterial color={WHITE} toneMapped={false} />
    </mesh>
  );
}

function Orbits({ reduced }: { reduced: boolean }) {
  const rings = useMemo(
    () => [
      { r: 1.75, tilt: new THREE.Euler(1.2, 0.2, 0), speed: 0.45 },
      { r: 2.05, tilt: new THREE.Euler(-0.6, 0.9, 0.3), speed: -0.32 },
      { r: 2.3, tilt: new THREE.Euler(0.3, -0.5, 1.1), speed: 0.25 },
    ],
    []
  );
  return (
    <>
      {rings.map((ring, i) => (
        <group key={i}>
          {/* tube is thick enough to antialias cleanly; hairline geometry shimmers as it rotates */}
          <mesh rotation={ring.tilt}>
            <torusGeometry args={[ring.r, 0.012, 8, 220]} />
            <meshBasicMaterial color={i === 1 ? BEIGE : ROSE} transparent opacity={i === 1 ? 0.18 : 0.38} />
          </mesh>
          <Satellite radius={ring.r} speed={ring.speed} phase={i * 1.3} tilt={ring.tilt} reduced={reduced} />
        </group>
      ))}
    </>
  );
}

function FlowEdge({ curve }: { curve: THREE.QuadraticBezierCurve3 }) {
  const points = useMemo(() => curve.getPoints(40), [curve]);
  return <Line points={points} color={ROSE} lineWidth={1.4} transparent opacity={0.3} />;
}

function Packet({ curve, offset, reduced }: { curve: THREE.QuadraticBezierCurve3; offset: number; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const k = reduced ? 0.5 : (clock.getElapsedTime() * 0.16 + offset) % 1;
    curve.getPoint(k, p);
    ref.current?.position.copy(p);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 14, 14]} />
      <meshBasicMaterial color={BEIGE} toneMapped={false} />
    </mesh>
  );
}

function GraphNode({ position, i }: { position: THREE.Vector3; i: number }) {
  const big = i % 5 === 0;
  const color = i % 3 === 0 ? BEIGE : ROSE;
  return (
    <mesh position={position}>
      {/* unlit + smooth: lit, flat-shaded facets flash as they move */}
      <icosahedronGeometry args={[big ? 0.12 : 0.07, 2]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Stars({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4.2 + seeded(i + 40) * 4;
      const t = seeded(i + 140) * Math.PI * 2;
      const p = Math.acos(2 * seeded(i + 240) - 1);
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.7;
      arr[i * 3 + 2] = r * Math.cos(p);
    }
    return arr;
  }, [count]);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += dtOf(delta) * 0.02; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.026} color={BEIGE} transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rig({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const startZ = reduced ? 7 : 12;
  useEffect(() => { camera.position.set(0, 0, startZ); }, [camera, startZ]);

  useFrame(({ clock, pointer }, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = dtOf(delta);
    const scroll = Math.min(1, window.scrollY / window.innerHeight);
    const targetZ = 7 + scroll * 3;
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 1.2);
    camera.position.x += (pointer.x * 0.5 - camera.position.x) * Math.min(1, dt * 1.5);
    camera.position.y += (pointer.y * 0.35 - camera.position.y) * Math.min(1, dt * 1.5);
    camera.lookAt(0, 0, 0);
    const base = reduced ? 0 : clock.getElapsedTime() * 0.06;
    g.rotation.y += (base + pointer.x * 0.25 - g.rotation.y) * Math.min(1, dt * 1.8);
    g.rotation.x += (-pointer.y * 0.18 + scroll * 0.4 - g.rotation.x) * Math.min(1, dt * 1.8);
  });

  return <group ref={group}>{children}</group>;
}

function Scene({ reduced, lite }: { reduced: boolean; lite: boolean }) {
  const nodes = useMemo(() => shellPoints(NODE_COUNT), []);
  const curves = useMemo(() => buildCurves(nodes), [nodes]);
  const packetCurves = useMemo(() => curves.filter((_, i) => i % 2 === 0).slice(0, lite ? 5 : 8), [curves, lite]);

  return (
    <Rig reduced={reduced}>
      <Core reduced={reduced} />
      <Orbits reduced={reduced} />
      {curves.map((c, i) => <FlowEdge key={i} curve={c} />)}
      {packetCurves.map((c, i) => <Packet key={i} curve={c} offset={i * 0.21} reduced={reduced} />)}
      {nodes.map((p, i) => <GraphNode key={i} position={p} i={i} />)}
      <Stars count={lite ? 220 : 420} />
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
        dpr={[1, lite ? 1.5 : 2]}
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        frameloop={visible ? 'always' : 'never'}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 4, 5]} intensity={40} color={ROSE} />
        <pointLight position={[-5, -3, 3]} intensity={22} color={BEIGE} />
        <Scene reduced={reduced} lite={lite} />
        {/* multisampling must stay 0: MSAA on the half-float composer target renders the scene black on some
            GPU/driver paths (seen on ANGLE + D3D11). SMAA does the anti-aliasing instead. High bloom threshold
            keeps small highlights from twinkling. */}
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.7} luminanceSmoothing={0.5} intensity={0.75} radius={0.65} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
