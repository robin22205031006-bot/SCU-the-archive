import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import {
  ALLOY_FINISHES,
  buildArtifactAssembly,
  createProceduralTextures,
  resolveArtifactArchetype,
  type AlloyFinishId,
  type BuiltArtifactScene,
} from "@/lib/arsenal-three-models";
import {
  createModelVfxSystem,
  resolveModelVfxPreset,
  type ModelVfxSystem,
} from "@/lib/model-3d-vfx";
import { Button } from "@/components/ui/button";

type Artifact = Tables<"artifacts">;

export type CameraPresetId = "hero" | "top" | "detail" | "side";

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  hero: { label: "Hero", pos: [3.2, 2.35, 4.1], target: [0, 1.35, 0] },
  top: { label: "Top", pos: [0.05, 5.2, 1.15], target: [0, 1.25, 0] },
  detail: { label: "Close", pos: [1.55, 1.65, 2.05], target: [0, 1.35, 0] },
  side: { label: "Profile", pos: [4.6, 1.45, 0.2], target: [0, 1.35, 0] },
};

// Module-scope scratch math helpers so the render loop allocates zero heap objects.
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _scratchVec = new THREE.Vector3();

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  const probe = document.createElement("canvas");
  const gl = probe.getContext("webgl2");
  if (!gl) return { supported: false, isSoftwareGl: true };
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) ?? "");
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return {
    supported: true,
    isSoftwareGl: /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu),
  };
}

export function ArsenalThreeStage({
  artifact,
  auraHue,
  auraLabel,
  boostSurge,
  onPrev,
  onNext,
  onIgniteBurst,
  totalCount,
  currentIndex,
}: {
  artifact: Artifact;
  auraHue: number;
  auraLabel: string;
  boostSurge: boolean;
  onPrev: () => void;
  onNext: () => void;
  onIgniteBurst: () => void;
  totalCount: number;
  currentIndex: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [finishId, setFinishId] = useState<AlloyFinishId>("obsidian");
  const [explode, setExplode] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>("hero");
  const [dockOpen, setDockOpen] = useState(true);
  const [webglReady, setWebglReady] = useState(true);

  const vfxConfig = useMemo(
    () =>
      resolveModelVfxPreset({
        name: artifact.name,
        description: [artifact.how_it_works, artifact.lore, artifact.materials, artifact.colors]
          .filter(Boolean)
          .join(" "),
        tags: [
          artifact.category,
          artifact.weapon_type,
          ...(artifact.wielders ?? []),
          artifact.curse_level > 0 ? "cursed" : null,
        ],
      }),
    [artifact],
  );

  const stateRef = useRef({
    artifact,
    finishId,
    auraHue,
    explode,
    autoRotate,
    boostSurge,
    cameraPreset,
    presetAnimating: false,
    currentExplode: 0,
    vfxConfig,
  });

  stateRef.current.artifact = artifact;
  stateRef.current.finishId = finishId;
  stateRef.current.auraHue = auraHue;
  stateRef.current.explode = explode;
  stateRef.current.autoRotate = autoRotate;
  stateRef.current.boostSurge = boostSurge;
  stateRef.current.vfxConfig = vfxConfig;

  const sceneHooksRef = useRef<{
    rebuildModel: () => void;
    triggerPreset: (preset: CameraPresetId) => void;
    requestRender: () => void;
  } | null>(null);

  // Keyboard shortcut 'H' to toggle HUD drawer (Zen Mode)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "h" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        setDockOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Initialize Three.js WebGLRenderer & Scene ONCE in stable mount container
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectSoftwareWebGL();
    if (!supported) {
      setWebglReady(false);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 440);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = 0x060911;
    scene.background = new THREE.Color(horizonColor);
    scene.fog = new THREE.FogExp2(horizonColor, 0.05);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(...CAMERA_PRESETS.hero.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.hero.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.6;
    controls.maxDistance = 9.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotate = !isSoftwareGl && stateRef.current.autoRotate;
    controls.autoRotateSpeed = 1.15;
    controls.update();

    // Studio 3-point lighting with warm key + cool HemisphereLight fill + RectAreaLight softboxes
    const hemiLight = new THREE.HemisphereLight(0x9bd2ff, 0x0d111b, 0.78);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(4.5, 6.2, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.35);
    rimLight.position.set(-4.2, 3.8, -3.5);
    scene.add(rimLight);

    let softboxLeft: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      softboxLeft = new THREE.RectAreaLight(0xe0f2fe, 2.4, 3.2, 4.5);
      softboxLeft.position.set(-4.5, 2.8, 2.5);
      softboxLeft.lookAt(0, 1.3, 0);
      scene.add(softboxLeft);
    }

    // Horizon studio ground plane (y = -0.22 so pedestal sits cleanly atop it)
    const floorGeo = new THREE.CircleGeometry(28, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.78,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.22;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAnisotropy);
    let built: BuiltArtifactScene | null = null;
    let vfxSystem: ModelVfxSystem | null = null;
    let loadTicket = 0;

    const rebuildVfx = (centerY = 1.35, radius = 1.05, height = 2.4) => {
      if (vfxSystem) {
        scene.remove(vfxSystem.group);
        vfxSystem.dispose();
        vfxSystem = null;
      }
      vfxSystem = createModelVfxSystem(stateRef.current.vfxConfig, {
        isSoftwareGl,
        pixelRatio,
        centerY,
        radius,
        height,
      });
      scene.add(vfxSystem.group);
    };

    const mountProcedural = () => {
      const { artifact: a, finishId: fId, auraHue: hue } = stateRef.current;
      built = buildArtifactAssembly(a, ALLOY_FINISHES[fId], hue, textures, isSoftwareGl);
      scene.add(built.root);
      rebuildVfx(1.35, 1.05, 2.45);

      const exp = stateRef.current.currentExplode;
      built.root.traverse((obj) => {
        const base = obj.userData["basePos"] as THREE.Vector3 | undefined;
        const vec = obj.userData["explodeVec"] as THREE.Vector3 | undefined;
        if (base && vec) {
          _scratchVec.copy(vec).multiplyScalar(exp);
          obj.position.copy(base).add(_scratchVec);
        }
      });

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    };

    const rebuildModel = () => {
      loadTicket += 1;
      const ticket = loadTicket;
      if (built) {
        scene.remove(built.root);
        built.dispose();
        built = null;
      }

      const { artifact: a, auraHue: hue } = stateRef.current;
      const modelUrl = a.model_3d_url?.trim();
      if (!modelUrl) {
        mountProcedural();
        return;
      }
      rebuildVfx(1.2, 1.0, 2.1);

      // Mount a subtle glowing pedestal + loader for custom .glb asset, falling back cleanly on error
      const root = new THREE.Group();
      const ringGeo = new THREE.TorusGeometry(1.15, 0.025, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.85, 0.58),
        emissive: new THREE.Color().setHSL(hue / 360, 0.9, 0.45),
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.06;
      root.add(ring);

      let gltfScene: THREE.Object3D | null = null;
      built = {
        root,
        orbitRings: [ring],
        dispose: () => {
          ringGeo.dispose();
          ringMat.dispose();
          if (gltfScene) {
            gltfScene.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry?.dispose();
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) m?.dispose?.();
              }
            });
          }
        },
      };
      scene.add(root);

      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        modelUrl,
        (gltf) => {
          if (disposed || ticket !== loadTicket) {
            gltf.scene.traverse((obj) => {
              if (obj instanceof THREE.Mesh) obj.geometry?.dispose();
            });
            return;
          }
          const model = gltf.scene;
          model.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = !isSoftwareGl;
              obj.receiveShadow = !isSoftwareGl;
            }
          });
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          const scale = 2.0 / Math.max(size.x, size.y, size.z, 0.001);
          model.scale.setScalar(scale);
          box.setFromObject(model);
          box.getCenter(center);
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y += 0.2 - box.min.y;
          gltfScene = model;
          root.add(model);
          if (!isSoftwareGl) renderer.compile(scene, camera);
          requestRender();
        },
        undefined,
        () => {
          if (disposed || ticket !== loadTicket) return;
          if (built) {
            scene.remove(built.root);
            built.dispose();
            built = null;
          }
          mountProcedural();
          requestRender();
        },
      );
    };

    rebuildModel();

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let elapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepAndDraw(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      elapsed += dt;

      const s = stateRef.current;

      if (vfxSystem) {
        vfxSystem.update(dt, elapsed, s.boostSurge ? 1.85 : 1);
      }

      // Smoothly damp exploded assembly separation
      s.currentExplode = THREE.MathUtils.damp(s.currentExplode, s.explode, 8, dt);
      if (built) {
        built.root.traverse((obj) => {
          const base = obj.userData["basePos"] as THREE.Vector3 | undefined;
          const vec = obj.userData["explodeVec"] as THREE.Vector3 | undefined;
          if (base && vec) {
            _scratchVec.copy(vec).multiplyScalar(s.currentExplode);
            obj.position.copy(base).add(_scratchVec);
          }
        });

        // Subtle orbital ring spin when autoRotate is active on GPU
        if (s.autoRotate && !isSoftwareGl) {
          const speedMult = s.boostSurge ? 2.6 : 1;
          built.orbitRings.forEach((ring, idx) => {
            ring.rotation.z += dt * (idx % 2 === 0 ? 0.55 : -0.42) * speedMult;
          });
        }
      }

      // Smoothly damp camera preset transitions unless user grabbed OrbitControls
      if (s.presetAnimating) {
        const preset = CAMERA_PRESETS[s.cameraPreset];
        _targetCamPos.set(...preset.pos);
        _targetLookAt.set(...preset.target);
        const alpha = 1 - Math.exp(-7 * dt);
        camera.position.lerp(_targetCamPos, alpha);
        controls.target.lerp(_targetLookAt, alpha);
        if (
          camera.position.distanceTo(_targetCamPos) < 0.02 &&
          controls.target.distanceTo(_targetLookAt) < 0.02
        ) {
          camera.position.copy(_targetCamPos);
          controls.target.copy(_targetLookAt);
          s.presetAnimating = false;
        }
      }

      controls.autoRotate = !isSoftwareGl && s.autoRotate && !s.presetAnimating;
      controls.update();
      renderer.render(scene, camera);

      const settling = s.presetAnimating || Math.abs(s.currentExplode - s.explode) > 0.004;
      return settling || !isSoftwareGl || s.boostSurge;
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const keepGoing = stepAndDraw(now);
        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || keepGoing)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener("start", () => {
      stateRef.current.presetAnimating = false;
    });
    controls.addEventListener("change", () => {
      requestRender();
    });

    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = Math.max(container.clientWidth, 240);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    ro.observe(container);

    sceneHooksRef.current = {
      rebuildModel: () => {
        rebuildModel();
        requestRender();
      },
      triggerPreset: (preset) => {
        stateRef.current.cameraPreset = preset;
        stateRef.current.presetAnimating = true;
        requestRender();
      },
      requestRender,
    };

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      controls.dispose();
      if (vfxSystem) {
        scene.remove(vfxSystem.group);
        vfxSystem.dispose();
        vfxSystem = null;
      }
      if (built) built.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      textures.dispose();
      envTex.dispose();
      renderer.dispose();
      sceneHooksRef.current = null;
    };
  }, []);

  // Rebuild model when artifact, model_3d_url, alloy finish, or aura hue changes
  useEffect(() => {
    sceneHooksRef.current?.rebuildModel();
  }, [artifact.id, artifact.model_3d_url, finishId, auraHue]);

  // Trigger re-render when explode slider, autoRotate, or burst changes
  useEffect(() => {
    sceneHooksRef.current?.requestRender();
  }, [explode, autoRotate, boostSurge]);

  const archetype = resolveArtifactArchetype(artifact);

  return (
    <div
      data-vfx-preset={vfxConfig.preset}
      className="relative h-[560px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#060911] select-none sm:h-[620px]"
    >
      {/* Dedicated Three.js WebGL Mount Container */}
      <div
        ref={mountRef}
        aria-label={`Interactive 3D view of ${artifact.name}`}
        className="absolute inset-0 h-full w-full"
      />

      {!webglReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#060911] p-6 text-center text-sm text-zinc-300">
          WebGL2 is unavailable in this browser context. Switch to 2D Artwork view above.
        </div>
      )}

      {/* Minimal Top-Left Spec Badge (Unobstructed Center Viewport) */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl border border-white/15 bg-[#090d16]/85 px-3.5 py-2.5 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-sky-400">
          Three.js 3D Forge · {archetype} · {currentIndex + 1}/{totalCount}
        </p>
        <h2 className="mt-0.5 text-lg font-bold tracking-tight text-white sm:text-xl">
          {artifact.name}
        </h2>
        <p className="text-xs text-zinc-400">
          Aura: {auraLabel} ({vfxConfig.label}) · Drag to orbit, scroll to zoom
        </p>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Backdrop-Filter, Zero Side Clutter) */}
      <div
        className="absolute bottom-3 left-1/2 z-20 flex w-[min(920px,94%)] -translate-x-1/2 flex-col items-center transition-transform duration-300"
        style={{
          transform: dockOpen ? "translate(-50%, 0)" : "translate(-50%, calc(100% - 34px))",
        }}
      >
        <button
          type="button"
          onClick={() => setDockOpen((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0b101c]/95 px-3 py-1 text-[11px] font-medium text-zinc-200 hover:border-sky-400/60 hover:text-white"
        >
          {dockOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
          {dockOpen ? "Hide Controls (H)" : "Show Controls (H)"}
        </button>

        <div className="w-full rounded-2xl border border-white/15 bg-[#0a0f1a]/92 p-3 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Artifact Swap + Burst */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onPrev}
                aria-label="Previous relic"
                className="h-8 w-8 border-white/15 bg-[#111827] text-white hover:bg-[#1f2937]"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={onNext}
                aria-label="Next relic"
                className="h-8 w-8 border-white/15 bg-[#111827] text-white hover:bg-[#1f2937]"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onIgniteBurst}
                className={`h-8 text-xs font-semibold ${
                  boostSurge
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-red-600 text-white hover:bg-red-500"
                }`}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                {boostSurge ? "Surge Active" : "Ignite Surge"}
              </Button>
            </div>

            {/* Exploded View Slider */}
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <Layers className="h-3.5 w-3.5 text-sky-400" />
              <span>Explode</span>
              <input
                type="range"
                aria-label="Exploded view"
                min={0}
                max={1}
                step={0.02}
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
                className="h-1.5 w-24 cursor-pointer accent-sky-400"
              />
            </label>

            {/* Alloy Finish Swatches */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Alloy finish">
              {(Object.values(ALLOY_FINISHES) as Array<(typeof ALLOY_FINISHES)[AlloyFinishId]>).map(
                (fin) => (
                  <button
                    key={fin.id}
                    type="button"
                    title={fin.label}
                    aria-label={fin.label}
                    onClick={() => setFinishId(fin.id)}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      finishId === fin.id ? "border-white scale-110" : "border-white/25 opacity-80"
                    }`}
                    style={{ backgroundColor: fin.primaryHex }}
                  />
                ),
              )}
            </div>

            {/* Camera Presets + Orbit Toggle */}
            <div className="flex flex-wrap items-center gap-1">
              {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => {
                    setCameraPreset(pid);
                    sceneHooksRef.current?.triggerPreset(pid);
                  }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                    cameraPreset === pid
                      ? "bg-sky-500/25 text-sky-300 border border-sky-400/50"
                      : "bg-[#111827] text-zinc-400 border border-white/10 hover:text-white"
                  }`}
                >
                  {CAMERA_PRESETS[pid].label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium ${
                  autoRotate
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-[#111827] text-zinc-400"
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                {autoRotate ? "Orbit ON" : "Orbit OFF"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
