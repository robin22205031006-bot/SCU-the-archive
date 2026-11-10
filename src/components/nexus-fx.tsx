import { Component, createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, PerspectiveCamera, View } from "@react-three/drei";
import { AdditiveBlending, Color, Group, Mesh, ShaderMaterial } from "three";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useNexusTheme } from "@/hooks/use-nexus-theme";
import { nexusEffect, type NexusEffect } from "@/lib/nexus-fx";

const FxAvailable = createContext(false);
class FxBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
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

function Simulation({ effect, moving, background = false }: { effect: NexusEffect; moving: boolean; background?: boolean }) {
  const root = useRef<Group>(null);
  const flame = useRef<Mesh>(null);
  const time = useRef(0);
  const [tint, light] = usePalette(effect);
  const uniforms = useMemo(() => ({ time: { value: 0 }, tint: { value: tint }, light: { value: light } }), [tint, light]);
  useFrame((state, delta) => {
    if (!root.current) return;
    if (moving) time.current += Math.min(delta, 0.05);
    const t = time.current;
    root.current.rotation.y = t * (effect === "fire" ? .12 : .22);
    root.current.rotation.z = effect === "wind" ? t * .22 : Math.sin(t * .4) * .06;
    if (background) {
      root.current.position.x += ((state.pointer.x * .3) - root.current.position.x) * .03;
    }
    root.current.children.forEach((child, i) => {
      if (child.userData["spark"]) {
        const phase = ((t * .22 + i * .137) % 1);
        child.position.set(Math.sin(i * 2.4 + t) * (.25 + phase), phase * 3 - 1.4, Math.cos(i * 2.4) * .7);
        child.scale.setScalar(.4 + (1 - phase) * .6);
      }
    });
    const material = flame.current?.material;
    if (material instanceof ShaderMaterial && material.uniforms["time"]) material.uniforms["time"].value = t;
  });
  const emblem = effect === "organization" || effect === "archive";
  return <group ref={root} scale={background ? 1.85 : .88}>
    {effect === "fire" ? <mesh ref={flame}>
      <coneGeometry args={[.65, 2.2, 32, 20, true]} />
      <shaderMaterial uniforms={uniforms} vertexShader={flameVertex} fragmentShader={flameFragment} transparent depthWrite={false} side={2} blending={AdditiveBlending} />
    </mesh> : effect === "frost" || effect === "nature" ? Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.4) * .65, Math.cos(i * 1.4) * .4, Math.cos(i * 2.4) * .65]} rotation={[i * .2, i, .2]} scale={[.26, .6 + i * .04, .26]}><octahedronGeometry /><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={.25} roughness={.2} metalness={.45} /></mesh>) : effect === "bloodline" ? Array.from({ length: 20 }, (_, i) => {
      const a = i * .55; const y = i * .12 - 1.2;
      return <group key={i} position={[0, y, 0]} rotation={[0, a, 0]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.025, .025, 1.2, 6]} /><meshBasicMaterial color={light} /></mesh>{[-1, 1].map(s => <mesh key={s} position={[s * .6, 0, 0]}><sphereGeometry args={[.085, 8, 6]} /><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={.5} /></mesh>)}</group>;
    }) : effect === "storm" ? Array.from({ length: 3 }, (_, i) => <mesh key={i} rotation={[i * .7, i * 1.1, .3]}><torusKnotGeometry args={[.66, .018, 96, 4, 2 + i, 3]} /><meshBasicMaterial color={i ? tint : light} /></mesh>) : emblem ? <>
      <mesh rotation={[0, 0, Math.PI / 4]}><octahedronGeometry args={[.7]} /><meshStandardMaterial color={tint} metalness={.8} roughness={.25} emissive={tint} emissiveIntensity={.15} /></mesh>
      {[0, 1].map(i => <mesh key={i} rotation={[i * Math.PI / 2, .3, .2]}><torusGeometry args={[1, .025, 8, 64]} /><meshBasicMaterial color={tint} /></mesh>)}
    </> : Array.from({ length: 5 }, (_, i) => <mesh key={i} rotation={[Math.PI / 2 + i * .17, i * .3, 0]} position={[0, (i - 2) * .2, 0]}><torusGeometry args={[.55 + i * .12, effect === "void" ? .055 : .025, 8, 64]} /><meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={.35} roughness={.2} metalness={.6} /></mesh>)}
    {Array.from({ length: background ? 44 : 10 }, (_, i) => <mesh key={`spark-${i}`} userData={{ spark: true }} position={[Math.sin(i) * .7, (i % 7) * .4 - 1, Math.cos(i) * .7]}><sphereGeometry args={[.025, 5, 4]} /><meshBasicMaterial color={i % 3 ? tint : light} /></mesh>)}
  </group>;
}

function Ready({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  useFrame(() => { if (container.current) container.current.dataset["sceneReady"] = "true"; });
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
  return <FxAvailable.Provider value={supported}>
    <div ref={background} aria-hidden className="nexus-fx-background pointer-events-none fixed inset-0" data-fx-theme={theme}>
      {supported && <FxBoundary><Canvas dpr={[1, 1.25]} frameloop={moving && visible ? "always" : "demand"} camera={{ position: [0, 0, 7], fov: 45 }} gl={{ alpha: true, antialias: false }}>
        <ambientLight intensity={.65} /><Environment resolution={64}><Lightformer intensity={2} position={[0, 4, 3]} scale={8} /><Lightformer intensity={1} position={[-4, 0, 2]} scale={5} /></Environment>
        <Simulation key={theme} effect={theme} moving={moving && visible} background /><Ready container={background} />
      </Canvas></FxBoundary>}
    </div>
    {children}
    {supported && <div aria-hidden className="nexus-fx-symbols pointer-events-none fixed inset-0"><FxBoundary><Canvas dpr={1} frameloop={moving && visible ? "always" : "demand"} gl={{ alpha: true, antialias: false }}><View.Port /></Canvas></FxBoundary></div>}
  </FxAvailable.Provider>;
}

export function NexusSigil({ label, effect, className = "h-12 w-12", masked = false }: { label: string; effect?: NexusEffect; className?: string; masked?: boolean }) {
  const available = useContext(FxAvailable);
  const moving = useNexusMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [hiddenSpoiler, setHiddenSpoiler] = useState(false);
  const kind = masked ? "archive" : effect ?? nexusEffect(label);
  useEffect(() => {
    const target = ref.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(e => e.isIntersecting)), { rootMargin: "40px" });
    observer.observe(target);
    const updateMask = () => {
      const parent = target.closest("[data-spoiler]");
      const scope = parent?.getAttribute("data-spoiler");
      setHiddenSpoiler((scope === "char" && document.documentElement.hasAttribute("data-spoil-characters")) || (scope === "archive" && document.documentElement.hasAttribute("data-spoil-archive")));
    };
    updateMask();
    const maskObserver = new MutationObserver(updateMask);
    maskObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-spoil-characters", "data-spoil-archive"] });
    return () => { observer.disconnect(); maskObserver.disconnect(); };
  }, []);
  return <span ref={ref} aria-hidden data-nexus-sigil={kind} className={`nexus-sigil relative inline-block shrink-0 ${className}`}>
    {!hiddenSpoiler && (available && visible ? <View as="span" className="absolute inset-0 block" index={2}><PerspectiveCamera makeDefault position={[0, 0, 4.6]} fov={42} /><ambientLight intensity={1.4} /><directionalLight position={[3, 3, 3]} intensity={3} /><Simulation effect={kind} moving={moving} /></View> : <span className="nexus-sigil-fallback absolute inset-2" />)}
  </span>;
}