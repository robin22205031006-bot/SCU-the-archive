import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box, Loader2, RotateCcw } from "lucide-react";
import {
  createModelVfxSystem,
  resolveModelVfxPreset,
  type ModelVfxConfig,
  type ModelVfxSystem,
} from "@/lib/model-3d-vfx";

function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  if (typeof document === "undefined") return { supported: false, isSoftwareGl: true };
  try {
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
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function disposeObjectTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        for (const val of Object.values(m)) {
          if (val instanceof THREE.Texture) val.dispose();
        }
        m.dispose();
      }
    }
  });
}

export interface GlbModelViewerProps {
  url: string;
  alt: string;
  name?: string | null;
  description?: string | null;
  tags?: readonly (string | null | undefined)[] | string | null;
  fallbackImageUrl?: string | null;
  accentColor?: string;
  className?: string;
  compact?: boolean;
  onFallbackTo2d?: () => void;
}

/**
 * Interactive Three.js .glb/.gltf model stage with OrbitControls, PMREM RoomEnvironment
 * reflections, 3-point warm/cool studio lighting, dynamic lore-driven VFX particles/auras,
 * software-WebGL guard, and 2D fallback.
 */
export function GlbModelViewer({
  url,
  alt,
  name,
  description,
  tags,
  fallbackImageUrl,
  accentColor = "#38bdf8",
  className = "",
  compact = false,
  onFallbackTo2d,
}: GlbModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-webgl">("loading");
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const vfxConfig = useMemo<ModelVfxConfig>(
    () =>
      resolveModelVfxPreset({
        name: name ?? alt,
        description,
        tags,
      }),
    [name, alt, description, tags],
  );
  const vfxConfigRef = useRef(vfxConfig);
  vfxConfigRef.current = vfxConfig;

  const vfxHooksRef = useRef<{ rebuildVfx: (cfg: ModelVfxConfig) => void } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !url) return;

    const { supported, isSoftwareGl } = detectSoftwareWebGL();
    if (!supported) {
      setStatus("no-webgl");
      return;
    }

    setStatus("loading");

    const width = Math.max(container.clientWidth, 180);
    const height = Math.max(container.clientHeight, 180);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
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
    scene.background = new THREE.Color(0x060a14);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    camera.position.set(2.2, 1.55, 2.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.9;
    controls.maxDistance = 8.0;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 1.25;
    controls.update();

    // 3-point warm key + cool Hemisphere fill + rim directional light
    const hemiLight = new THREE.HemisphereLight(0x9bd2ff, 0x101827, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(3.5, 5.2, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(new THREE.Color(accentColor), 1.45);
    rimLight.position.set(-3.4, 2.8, -3.0);
    scene.add(rimLight);

    // Ground contact pedestal disk
    const floorGeo = new THREE.CircleGeometry(2.6, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.72,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const ringGeo = new THREE.RingGeometry(0.95, 1.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(vfxConfigRef.current.primaryHex || accentColor),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.004;
    scene.add(ringMesh);

    let modelBounds = { centerY: 0.9, radius: 0.85, height: 1.85 };
    let vfxSystem: ModelVfxSystem | null = createModelVfxSystem(vfxConfigRef.current, {
      isSoftwareGl,
      pixelRatio,
      ...modelBounds,
    });
    scene.add(vfxSystem.group);

    let loadedModel: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = () => {
      if (disposed) return;
      frameId = 0;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      elapsed += dt;

      if (mixer) mixer.update(dt);
      if (vfxSystem) vfxSystem.update(dt, elapsed, 1);
      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.update();
      renderer.render(scene, camera);

      if (!isSoftwareGl) {
        frameId = requestAnimationFrame(renderFrame);
      }
    };

    const scheduleRender = () => {
      if (disposed || frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        renderFrame();
      });
    };

    vfxHooksRef.current = {
      rebuildVfx: (cfg: ModelVfxConfig) => {
        if (disposed) return;
        if (vfxSystem) {
          scene.remove(vfxSystem.group);
          vfxSystem.dispose();
        }
        vfxSystem = createModelVfxSystem(cfg, {
          isSoftwareGl,
          pixelRatio,
          ...modelBounds,
        });
        scene.add(vfxSystem.group);
        ringMat.color.set(cfg.primaryHex || accentColor);
        scheduleRender();
      },
    };

    controls.addEventListener("change", () => {
      if (!isSoftwareGl) return;
      scheduleRender();
    });

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) {
          disposeObjectTree(gltf.scene);
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
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const targetHeight = 1.9;
        const scale = targetHeight / maxDim;
        model.scale.setScalar(scale);

        box.setFromObject(model);
        box.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;

        box.setFromObject(model);
        box.getCenter(center);
        box.getSize(size);
        const radius = Math.max(size.x, size.z) * 0.55;
        modelBounds = {
          centerY: Math.max(center.y, 0.5),
          radius: Math.max(0.45, radius),
          height: Math.max(0.9, size.y),
        };
        if (vfxSystem) {
          vfxSystem.setBounds(modelBounds.centerY, modelBounds.radius, modelBounds.height);
        }

        controls.target.set(0, Math.max(center.y, 0.5), 0);
        controls.update();

        scene.add(model);
        loadedModel = model;

        if (gltf.animations && gltf.animations.length > 0 && !isSoftwareGl) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
        }

        if (!isSoftwareGl) {
          renderer.compile(scene, camera);
        }
        setStatus("ready");
        renderFrame();
      },
      undefined,
      () => {
        if (!disposed) {
          setStatus("error");
        }
      },
    );

    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const w = Math.max(container.clientWidth, 180);
      const h = Math.max(container.clientHeight, 180);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scheduleRender();
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      vfxHooksRef.current = null;
      controls.dispose();
      if (mixer) mixer.stopAllAction();
      if (vfxSystem) {
        scene.remove(vfxSystem.group);
        vfxSystem.dispose();
        vfxSystem = null;
      }
      if (loadedModel) {
        scene.remove(loadedModel);
        disposeObjectTree(loadedModel);
      }
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTex.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [url, accentColor]);

  // Dynamically regenerate Three.js VFX if name, description, or tags change
  useEffect(() => {
    vfxHooksRef.current?.rebuildVfx(vfxConfig);
  }, [vfxConfig]);

  const showFallback = status === "error" || status === "no-webgl";

  return (
    <div
      data-testid="glb-model-viewer"
      data-model-url={url}
      data-viewer-status={status}
      data-vfx-preset={vfxConfig.preset}
      className={`relative h-full w-full overflow-hidden bg-[#060a14] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {!showFallback ? (
        <div
          ref={mountRef}
          aria-label={`Interactive 3D model for ${alt}`}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />
      ) : (
        <div
          data-testid="glb-viewer-fallback"
          className="relative flex h-full w-full flex-col items-center justify-center bg-[#060a14] p-3 text-center"
        >
          {fallbackImageUrl ? (
            <img
              src={fallbackImageUrl}
              alt={alt}
              className="h-full w-full object-contain opacity-85"
            />
          ) : (
            <Box className="size-10 text-muted-foreground" />
          )}
          <div className="pointer-events-auto absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/75 px-2.5 py-1.5 text-[10px] text-zinc-200 backdrop-blur-sm">
            <span>
              {status === "error"
                ? "3D model failed to load — showing 2D preview."
                : "3D stage initialized (WebGL context unavailable in this environment)."}
            </span>
            {onFallbackTo2d && (
              <button
                type="button"
                onClick={onFallbackTo2d}
                className="shrink-0 rounded bg-accent/20 px-2 py-0.5 font-semibold text-accent hover:bg-accent/30"
              >
                Use 2D
              </button>
            )}
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 text-xs text-zinc-200 backdrop-blur-[2px]">
          <Loader2 className="size-5 animate-spin text-accent" />
          <span>Loading 3D model…</span>
        </div>
      )}

      {status === "ready" && !compact && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-300">
          <span className="rounded bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            {vfxConfig.label} · Drag to orbit
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAutoRotate((v) => !v);
            }}
            className="pointer-events-auto inline-flex items-center gap-1 rounded border border-white/15 bg-black/65 px-2 py-0.5 text-[10px] hover:border-accent"
          >
            <RotateCcw className="size-3" />
            {autoRotate ? "Auto" : "Paused"}
          </button>
        </div>
      )}
    </div>
  );
}
