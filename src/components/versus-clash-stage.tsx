import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, type BloomEffect, type ChromaticAberrationEffect } from "postprocessing";
import * as THREE from "three";
import type { ClashPalette } from "@/lib/versus-clash";

const EMITTER_X = 3.1;
const CAMERA_BASE = new THREE.Vector3(0, 0.55, 6.2);

interface ClashState {
  clashX: number;
  trauma: number;
  surge: number;
  burstId: number;
  burstColor: THREE.Color;
}

export interface VersusClashStageProps {
  palette: ClashPalette;
  balance: number;
  clashId: number;
  impactColor?: string | null | undefined;
  motion: boolean;
}

function glow(color: string, boost: number) {
  return new THREE.Color(color).multiplyScalar(boost);
}

function Emitter({ side, color, motion }: { side: -1 | 1; color: string; motion: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 2.4 * side;
  });
  const emissive = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group position={[EMITTER_X * side, 0, 0]}>
      <Float enabled={motion} speed={2.2} rotationIntensity={0.6} floatIntensity={0.5}>
        <mesh>
          <icosahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={2.6}
            flatShading
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ring} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.58, 0.03, 8, 48]} />
          <meshBasicMaterial color={glow(color, 3)} toneMapped={false} />
        </mesh>
        <mesh position={[-0.55 * side, 0, 0]} rotation={[0, 0, (Math.PI / 2) * side]}>
          <coneGeometry args={[0.13, 0.7, 4]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={1.4}
            metalness={0.6}
            roughness={0.25}
            toneMapped={false}
          />
        </mesh>
      </Float>
    </group>
  );
}

function Beam({
  side,
  color,
  core,
  state,
}: {
  side: -1 | 1;
  color: string;
  core: string;
  state: React.RefObject<ClashState>;
}) {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const phase = side === -1 ? 0 : 1.7;
  useFrame(({ clock }) => {
    const s = state.current;
    const start = EMITTER_X * side - 0.85 * side;
    const len = Math.max(0.01, Math.abs(s.clashX - start));
    const mid = (s.clashX + start) / 2;
    const t = clock.elapsedTime;
    const flicker = 1 + Math.sin(t * 38 + phase) * 0.12 + Math.sin(t * 91 + phase) * 0.06;
    const thick = flicker * (1 + s.trauma * 0.9 + s.surge * 0.4);
    for (const [mesh, base] of [
      [outer.current, 0.17],
      [inner.current, 0.06],
    ] as const) {
      if (!mesh) continue;
      mesh.position.x = mid;
      mesh.scale.set(base * thick, len, base * thick);
    }
  });
  return (
    <group>
      <mesh ref={outer} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1, 1, 1, 20, 1, true]} />
        <meshBasicMaterial
          color={glow(color, 2.2)}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={inner} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshBasicMaterial color={glow(core, 4)} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ClashCore({
  palette,
  state,
}: {
  palette: ClashPalette;
  state: React.RefObject<ClashState>;
}) {
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const base = useMemo(() => glow(palette.core, 5), [palette.core]);
  useFrame(({ clock }) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const pulse = 0.32 + Math.sin(t * 24) * 0.04 + s.trauma * 0.75 + s.surge * 0.15;
    if (core.current) {
      core.current.position.x = s.clashX;
      core.current.scale.setScalar(pulse);
    }
    if (mat.current) mat.current.color.copy(base).lerp(s.burstColor, s.trauma * 0.6);
    if (light.current) {
      light.current.position.x = s.clashX;
      light.current.intensity = 6 + s.trauma * 40;
      light.current.color.copy(s.burstColor);
    }
  });
  return (
    <>
      <mesh ref={core}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial ref={mat} color={base} toneMapped={false} />
      </mesh>
      <pointLight ref={light} distance={9} decay={2} />
    </>
  );
}

function Shockwave({
  palette,
  state,
}: {
  palette: ClashPalette;
  state: React.RefObject<ClashState>;
}) {
  const count = palette.particles;
  const points = useRef<THREE.Points>(null);
  const pointsMat = useRef<THREE.PointsMaterial>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const lastBurst = useRef(state.current.burstId);
  const life = useRef(0);

  const { positions, velocities, colors } = useMemo(() => {
    const ca = new THREE.Color(palette.a);
    const cb = new THREE.Color(palette.b);
    const cc = new THREE.Color(palette.core);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const pick = i % 5 === 0 ? cc : i % 2 === 0 ? ca : cb;
      col.set([pick.r * 2.5, pick.g * 2.5, pick.b * 2.5], i * 3);
    }
    return {
      positions: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      colors: col,
    };
  }, [count, palette.a, palette.b, palette.core]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = state.current;
    if (s.burstId !== lastBurst.current) {
      lastBurst.current = s.burstId;
      life.current = 1;
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6.5;
        positions.set([s.clashX, 0, 0], i * 3);
        velocities.set(
          [
            Math.cos(theta) * speed,
            Math.sin(theta) * speed * 0.85,
            (Math.random() - 0.5) * speed * 0.7,
          ],
          i * 3,
        );
      }
      for (const ring of [ringA.current, ringB.current]) {
        if (ring) ring.position.x = s.clashX;
      }
    }
    if (life.current <= 0) {
      if (points.current) points.current.visible = false;
      if (ringA.current) ringA.current.visible = false;
      if (ringB.current) ringB.current.visible = false;
      return;
    }
    life.current = Math.max(0, life.current - dt * 0.85);
    const l = life.current;
    const drag = Math.pow(0.06, dt);
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const vx = (velocities[o] ?? 0) * drag;
      const vy = (velocities[o + 1] ?? 0) * drag - 1.1 * dt;
      const vz = (velocities[o + 2] ?? 0) * drag;
      velocities[o] = vx;
      velocities[o + 1] = vy;
      velocities[o + 2] = vz;
      positions[o] = (positions[o] ?? 0) + vx * dt;
      positions[o + 1] = (positions[o + 1] ?? 0) + vy * dt;
      positions[o + 2] = (positions[o + 2] ?? 0) + vz * dt;
    }
    if (points.current) {
      points.current.visible = true;
      const attr = points.current.geometry.getAttribute("position");
      if (attr) attr.needsUpdate = true;
    }
    if (pointsMat.current) {
      pointsMat.current.opacity = l;
      pointsMat.current.size = 0.05 + l * 0.07;
    }
    const grow = 1 - l;
    if (ringA.current) {
      ringA.current.visible = true;
      ringA.current.scale.setScalar(0.2 + grow * 5.5);
      (ringA.current.material as THREE.MeshBasicMaterial).opacity = l * l;
      (ringA.current.material as THREE.MeshBasicMaterial).color
        .copy(s.burstColor)
        .multiplyScalar(3);
    }
    if (ringB.current) {
      ringB.current.visible = true;
      ringB.current.scale.setScalar(0.2 + grow * 8);
      (ringB.current.material as THREE.MeshBasicMaterial).opacity = l * 0.8;
    }
  });

  return (
    <>
      <points ref={points} visible={false} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMat}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          toneMapped={false}
        />
      </points>
      <mesh ref={ringA} visible={false}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringB} visible={false} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <ringGeometry args={[0.96, 1, 64]} />
        <meshBasicMaterial
          color={glow(palette.core, 2)}
          transparent
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

function Director({
  palette,
  balance,
  motion,
  state,
}: {
  palette: ClashPalette;
  balance: number;
  motion: boolean;
  state: React.RefObject<ClashState>;
}) {
  const { camera } = useThree();
  const bloom = useRef<BloomEffect>(null);
  const aberration = useRef<ChromaticAberrationEffect>(null);
  const aberrationOffset = useMemo(
    () => new THREE.Vector2(palette.aberration, palette.aberration),
    [palette.aberration],
  );

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = state.current;
    const t = clock.elapsedTime;
    const push = balance * 1.5;
    const struggle = motion ? Math.sin(t * 1.6) * 0.14 + Math.sin(t * 4.3) * 0.05 : 0;
    const target = push + struggle + balance * s.surge * 0.9;
    s.clashX = motion ? THREE.MathUtils.lerp(s.clashX, target, 1 - Math.pow(0.02, dt)) : target;
    s.trauma = Math.max(0, s.trauma - dt * 1.3);
    s.surge = Math.max(0, s.surge - dt * 0.45);

    const shake = s.trauma * s.trauma * palette.shake * (motion ? 1 : 0);
    camera.position.set(
      CAMERA_BASE.x + shake * (Math.sin(t * 61) + Math.sin(t * 37) * 0.5),
      CAMERA_BASE.y + shake * (Math.sin(t * 53 + 1.3) + Math.sin(t * 29) * 0.5),
      CAMERA_BASE.z + shake * Math.sin(t * 47) * 0.4,
    );
    camera.rotation.z = shake * Math.sin(t * 43) * 0.08;
    camera.lookAt(0, 0, 0);

    if (bloom.current) bloom.current.intensity = palette.bloom * (1 + s.trauma * 1.8);
    if (aberration.current) {
      const amt = palette.aberration * (0.35 + s.trauma * 4);
      aberration.current.offset.set(amt, amt * 0.6);
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={bloom}
        intensity={palette.bloom}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
      <ChromaticAberration
        ref={aberration}
        blendFunction={BlendFunction.NORMAL}
        offset={aberrationOffset}
        radialModulation
        modulationOffset={0.15}
      />
    </EffectComposer>
  );
}

function ClashScene({ palette, balance, clashId, impactColor, motion }: VersusClashStageProps) {
  const invalidate = useThree((s) => s.invalidate);
  const state = useRef<ClashState>({
    clashX: balance * 1.5,
    trauma: 0,
    surge: 0,
    burstId: 0,
    burstColor: new THREE.Color(palette.core),
  });
  const seenClash = useRef(clashId);

  useEffect(() => {
    // clashId drops when a global AbilityImpact expires; only increases are new clashes.
    const isNewClash = clashId > seenClash.current;
    seenClash.current = clashId;
    if (!isNewClash) return;
    const s = state.current;
    s.trauma = 1;
    s.surge = 1;
    s.burstId += 1;
    s.burstColor.set(impactColor || palette.core);
    invalidate();
  }, [clashId, impactColor, palette.core, invalidate]);

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 7, 16]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 4, 5]} intensity={0.6} />
      <Emitter side={-1} color={palette.a} motion={motion} />
      <Emitter side={1} color={palette.b} motion={motion} />
      <Beam side={-1} color={palette.a} core={palette.core} state={state} />
      <Beam side={1} color={palette.b} core={palette.core} state={state} />
      <ClashCore palette={palette} state={state} />
      {motion && <Shockwave palette={palette} state={state} />}
      {palette.sparkles && motion && (
        <Sparkles
          count={60}
          scale={[9, 4, 4]}
          size={2}
          speed={0.4}
          color={palette.core}
          opacity={0.6}
        />
      )}
      <gridHelper args={[20, 28, palette.a, "#1f1f2e"]} position={[0, -0.9, 0]} />
      <Director palette={palette} balance={balance} motion={motion} state={state} />
    </>
  );
}

/** Immersive WebGL energy clash for the Versus Simulator (browser-only, lazy-loaded). */
export function VersusClashStage(props: VersusClashStageProps) {
  return (
    <Canvas
      frameloop={props.motion ? "always" : "demand"}
      dpr={[1, 1.75]}
      camera={{ position: CAMERA_BASE.toArray(), fov: 45, near: 0.1, far: 50 }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      aria-hidden="true"
    >
      <ClashScene {...props} />
    </Canvas>
  );
}
