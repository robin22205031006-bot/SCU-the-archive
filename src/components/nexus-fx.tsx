import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { AdditiveBlending, Color, Group, Mesh, ShaderMaterial } from "three";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useNexusTheme } from "@/hooks/use-nexus-theme";
import { type NexusEffect, nexusThemeBase } from "@/lib/nexus-fx";

class FxBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
function usePalette(effect: NexusEffect) {
  const [colors, setColors] = useState<[Color, Color]>(() => [new Color(), new Color()]);
  useEffect(() => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    const css = getComputedStyle(document.documentElement);
    const read = (role: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css.getPropertyValue(role).trim();
      context.fillRect(0, 0, 1, 1);
      const p = context.getImageData(0, 0, 1, 1).data;
      return new Color(`rgb(${p[0]},${p[1]},${p[2]})`);
    };
    setColors([read(`--fx-${effect}`), read("--fx-highlight")]);
  }, [effect]);
  return colors;
}

const flameVertex = `uniform float time; varying vec3 pos; void main(){pos=position; vec3 p=position; float h=p.y+1.0; p.x+=sin(h*5.0+time*3.0)*h*.12; p.z+=cos(h*4.0+time*2.0)*h*.13; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`;
const flameFragment = `uniform float time; uniform vec3 tint; uniform vec3 light; varying vec3 pos; void main(){float waves=sin(pos.y*15.0+pos.x*9.0-time*6.0)*.5+.5; float fade=clamp(1.0-(pos.y+1.0)*.42,0.0,1.0); gl_FragColor=vec4(mix(tint,light,pow(fade,3.0)),(.18+waves*.45)*fade);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }`;

function Simulation({
  effect,
  moving,
  background = false,
}: {
  effect: NexusEffect;
  moving: boolean;
  background?: boolean;
}) {
  const root = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  const time = useRef(0);
  const [tint, light] = usePalette(effect);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, tint: { value: tint }, light: { value: light } }),
    [tint, light],
  );
  useFrame((state, delta) => {
    if (!root.current) return;
    if (moving) time.current += Math.min(delta, 0.05);
    const t = time.current;
    root.current.rotation.y = t * (effect === "fire" ? 0.12 : 0.22);
    root.current.rotation.z = effect === "wind" ? t * 0.22 : Math.sin(t * 0.4) * 0.06;
    if (background) {
      root.current.position.x += (state.pointer.x * 0.3 - root.current.position.x) * 0.03;
    }
    root.current.children.forEach((child, i) => {
      if (child.userData["spark"]) {
        const phase = (t * 0.22 + i * 0.137) % 1;
        child.position.set(
          Math.sin(i * 2.4 + t) * (0.25 + phase),
          phase * 3 - 1.4,
          Math.cos(i * 2.4) * 0.7,
        );
        child.scale.setScalar(0.4 + (1 - phase) * 0.6);
      }
    });
    const material = flame.current?.material;
    if (material instanceof ShaderMaterial && material.uniforms["time"])
      material.uniforms["time"].value = t;
  });
  const emblem = effect === "organization" || effect === "archive";
  return (
    <group ref={root} scale={background ? 1.85 : 0.88}>
      {effect === "fire" ? (
        <mesh ref={flame}>
          <coneGeometry args={[0.65, 2.2, 32, 20, true]} />
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={flameVertex}
            fragmentShader={flameFragment}
            transparent
            depthWrite={false}
            side={2}
            blending={AdditiveBlending}
          />
        </mesh>
      ) : effect === "frost" || effect === "nature" ? (
        Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 2.4) * 0.65, Math.cos(i * 1.4) * 0.4, Math.cos(i * 2.4) * 0.65]}
            rotation={[i * 0.2, i, 0.2]}
            scale={[0.26, 0.6 + i * 0.04, 0.26]}
          >
            <octahedronGeometry />
            <meshStandardMaterial
              color={tint}
              emissive={tint}
              emissiveIntensity={0.25}
              roughness={0.2}
              metalness={0.45}
            />
          </mesh>
        ))
      ) : effect === "bloodline" ? (
        Array.from({ length: 20 }, (_, i) => {
          const a = i * 0.55;
          const y = i * 0.12 - 1.2;
          return (
            <group key={i} position={[0, y, 0]} rotation={[0, a, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
                <meshBasicMaterial color={light} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.6, 0, 0]}>
                  <sphereGeometry args={[0.085, 8, 6]} />
                  <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.5} />
                </mesh>
              ))}
            </group>
          );
        })
      ) : effect === "storm" ? (
        Array.from({ length: 3 }, (_, i) => (
          <mesh key={i} rotation={[i * 0.7, i * 1.1, 0.3]}>
            <torusKnotGeometry args={[0.66, 0.018, 96, 4, 2 + i, 3]} />
            <meshBasicMaterial color={i ? tint : light} />
          </mesh>
        ))
      ) : emblem ? (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.7]} />
            <meshStandardMaterial
              color={tint}
              metalness={0.8}
              roughness={0.25}
              emissive={tint}
              emissiveIntensity={0.15}
            />
          </mesh>
          {[0, 1].map((i) => (
            <mesh key={i} rotation={[(i * Math.PI) / 2, 0.3, 0.2]}>
              <torusGeometry args={[1, 0.025, 8, 64]} />
              <meshBasicMaterial color={tint} />
            </mesh>
          ))}
        </>
      ) : (
        Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            rotation={[Math.PI / 2 + i * 0.17, i * 0.3, 0]}
            position={[0, (i - 2) * 0.2, 0]}
          >
            <torusGeometry args={[0.55 + i * 0.12, effect === "void" ? 0.055 : 0.025, 8, 64]} />
            <meshStandardMaterial
              color={tint}
              emissive={tint}
              emissiveIntensity={0.35}
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
        ))
      )}
      {Array.from({ length: background ? 44 : 10 }, (_, i) => (
        <mesh
          key={`spark-${i}`}
          userData={{ spark: true }}
          position={[Math.sin(i) * 0.7, (i % 7) * 0.4 - 1, Math.cos(i) * 0.7]}
        >
          <sphereGeometry args={[0.025, 5, 4]} />
          <meshBasicMaterial color={i % 3 ? tint : light} />
        </mesh>
      ))}
    </group>
  );
}

function Ready({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  useFrame(() => {
    if (container.current) container.current.dataset["sceneReady"] = "true";
  });
  return null;
}
export function NexusFxLayer({ children }: { children: ReactNode }) {
  const moving = useNexusMotion();
  const theme = useNexusTheme();
  const background = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(!!gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <>
      <div
        ref={background}
        aria-hidden
        className="nexus-fx-background pointer-events-none fixed inset-0"
        data-fx-theme={theme}
      >
        {supported && (
          <FxBoundary>
            <Canvas
              dpr={[1, 1.25]}
              frameloop={moving && visible ? "always" : "demand"}
              camera={{ position: [0, 0, 7], fov: 45 }}
              gl={{ alpha: true, antialias: false }}
            >
              <ambientLight intensity={0.65} />
              <Environment resolution={64}>
                <Lightformer intensity={2} position={[0, 4, 3]} scale={8} />
                <Lightformer intensity={1} position={[-4, 0, 2]} scale={5} />
              </Environment>
              <Simulation
                key={theme}
                effect={nexusThemeBase(theme)}
                moving={moving && visible}
                background
              />
              <Ready container={background} />
            </Canvas>
          </FxBoundary>
        )}
      </div>
      {children}
    </>
  );
}
