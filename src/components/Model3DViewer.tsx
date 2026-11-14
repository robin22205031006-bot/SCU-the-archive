import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Box, RotateCcw } from "lucide-react";
import { GlbModelViewer, type GlbModelViewerProps } from "@/components/glb-model-viewer";
import {
  createModelVfxSystem,
  resolveModelVfxPreset,
  type ModelVfxConfig,
  type ModelVfxSystem,
} from "@/lib/model-3d-vfx";
import {
  createAfterDrawScheduler,
  createSafeWebGLRenderer,
  detectWebGLContext,
  normalizeThreeColor,
} from "@/lib/three-stage-utils";

export interface Model3DViewerProps extends Omit<GlbModelViewerProps, "url" | "alt"> {
  url?: string | null;
  alt?: string;
  name?: string | null;
  description?: string | null;
  tags?: readonly (string | null | undefined)[] | string | null;
}

/**
 * Unified 3D Model Viewer with dynamic lore-driven Three.js particle & aura VFX.
 * When `url` is provided, renders the `.glb`/`.gltf` asset via `GlbModelViewer` with the
 * matched VFX aura; when `url` is omitted, renders a composite procedural relic core with
 * the same dynamic Three.js VFX system.
 */
export function Model3DViewer({
  url,
  alt,
  name,
  description,
  tags,
  fallbackImageUrl,
  accentColor,
  className = "",
  compact = false,
  onFallbackTo2d,
}: Model3DViewerProps) {
  const resolvedAlt = alt ?? name ?? "3D Model";
  const trimmedUrl = typeof url === "string" ? url.trim() : "";

  if (trimmedUrl) {
    return (
      <GlbModelViewer
        url={trimmedUrl}
        alt={resolvedAlt}
        name={name ?? resolvedAlt}
        description={description ?? null}
        tags={tags ?? null}
        fallbackImageUrl={fallbackImageUrl ?? null}
        className={className}
        compact={compact}
        {...(accentColor ? { accentColor } : {})}
        {...(onFallbackTo2d ? { onFallbackTo2d } : {})}
      />
    );
  }

  return (
    <ProceduralVfxStage
      alt={resolvedAlt}
      name={name ?? resolvedAlt}
      description={description ?? null}
      tags={tags ?? null}
      fallbackImageUrl={fallbackImageUrl ?? null}
      accentColor={accentColor}
      className={className}
      compact={compact}
      onFallbackTo2d={onFallbackTo2d}
    />
  );
}

function ProceduralVfxStage({
  alt,
  name,
  description,
  tags,
  fallbackImageUrl,
  accentColor,
  className = "",
  compact = false,
  onFallbackTo2d,
}: {
  alt: string;
  name: string;
  description: string | null;
  tags: readonly (string | null | undefined)[] | string | null;
  fallbackImageUrl: string | null;
  accentColor: string | undefined;
  className: string;
  compact: boolean;
  onFallbackTo2d: (() => void) | undefined;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglReady, setWebglReady] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const vfxConfig = useMemo<ModelVfxConfig>(
    () => resolveModelVfxPreset({ name, description, tags }),
    [name, description, tags],
  );
  const vfxConfigRef = useRef(vfxConfig);
  vfxConfigRef.current = vfxConfig;

  const vfxHooksRef = useRef<{
    rebuildVfx: (cfg: ModelVfxConfig) => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGLContext();
    if (!supported) {
      setWebglReady(false);
      return;
    }

    const width = Math.max(container.clientWidth, 180);
    const height = Math.max(container.clientHeight, 180);
    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const renderer = createSafeWebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    if (!renderer) {
      setWebglReady(false);
      return;
    }

    setWebglReady(true);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a14);

    let envTex: THREE.Texture | null = null;
    try {
      const roomEnv = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
      roomEnv.dispose();
    } catch {
      envTex = null;
    }

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    camera.position.set(2.2, 1.55, 2.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.95, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 1.25;
    controls.update();

    scene.add(new THREE.HemisphereLight(0x9bd2ff, 0x101827, 0.85));
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.1);
    keyLight.position.set(3.5, 5.2, 3.8);
    scene.add(keyLight);

    // Composite 4-part procedural relic core
    const relicGroup = new THREE.Group();
    const baseGeo = new THREE.CylinderGeometry(0.52, 0.68, 0.14, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.72,
      roughness: 0.35,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.07;
    relicGroup.add(baseMesh);

    const coreGeo = new THREE.OctahedronGeometry(0.42, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: normalizeThreeColor(accentColor ?? vfxConfigRef.current.primaryHex, "#38bdf8"),
      emissive: normalizeThreeColor(vfxConfigRef.current.primaryHex, "#38bdf8"),
      emissiveIntensity: 0.55,
      metalness: 0.2,
      roughness: 0.12,
      clearcoat: 1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 1.0;
    relicGroup.add(coreMesh);

    const ringGeo = new THREE.TorusGeometry(0.68, 0.022, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: normalizeThreeColor(vfxConfigRef.current.secondaryHex, "#22d3ee"),
      emissive: normalizeThreeColor(vfxConfigRef.current.primaryHex, "#38bdf8"),
      emissiveIntensity: 0.8,
      metalness: 0.85,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 1.0;
    ringMesh.rotation.set(Math.PI / 3, 0.25, 0);
    relicGroup.add(ringMesh);

    const outerRingGeo = new THREE.TorusGeometry(0.86, 0.014, 12, 48);
    const outerRing = new THREE.Mesh(outerRingGeo, ringMat);
    outerRing.position.y = 1.0;
    outerRing.rotation.set(-Math.PI / 3, -0.3, 0);
    relicGroup.add(outerRing);

    scene.add(relicGroup);

    let vfxSystem: ModelVfxSystem | null = createModelVfxSystem(vfxConfigRef.current, {
      isSoftwareGl,
      pixelRatio,
      centerY: 1.0,
      radius: 0.82,
      height: 1.7,
    });
    scene.add(vfxSystem.group);

    let disposed = false;
    let contextLost = false;
    let frameId = 0;
    let timeoutId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const afterDraw = createAfterDrawScheduler(
      renderer,
      () => disposed || contextLost,
      (id) => {
        timeoutId = id;
      },
    );

    const renderFrame = () => {
      if (disposed || contextLost) return;
      frameId = 0;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      elapsed += dt;

      coreMesh.rotation.y += dt * 0.65;
      ringMesh.rotation.z += dt * 0.45;
      outerRing.rotation.z -= dt * 0.35;
      if (vfxSystem) vfxSystem.update(dt, elapsed, 1);

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.update();
      renderer.render(scene, camera);

      const keepRunning = !isSoftwareGl && !document.hidden;
      if (keepRunning) {
        frameId = requestAnimationFrame(renderFrame);
      } else if (isSoftwareGl && autoRotateRef.current) {
        afterDraw(() => {
          if (!disposed && !contextLost && autoRotateRef.current) {
            scheduleRender();
          }
        });
      }
    };

    const scheduleRender = () => {
      if (disposed || contextLost || frameId) return;
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
          centerY: 1.0,
          radius: 0.82,
          height: 1.7,
        });
        scene.add(vfxSystem.group);
        coreMat.emissive.copy(normalizeThreeColor(cfg.primaryHex, "#38bdf8"));
        if (!accentColor) coreMat.color.copy(normalizeThreeColor(cfg.primaryHex, "#38bdf8"));
        ringMat.color.copy(normalizeThreeColor(cfg.secondaryHex, "#22d3ee"));
        ringMat.emissive.copy(normalizeThreeColor(cfg.primaryHex, "#38bdf8"));
        scheduleRender();
      },
      requestRender: scheduleRender,
    };

    controls.addEventListener("change", () => {
      if (!isSoftwareGl && !document.hidden) return;
      scheduleRender();
    });

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      frameId = 0;
      window.clearTimeout(timeoutId);
      setWebglReady(false);
    };

    const handleContextRestored = () => {
      if (disposed) return;
      contextLost = false;
      setWebglReady(true);
      scheduleRender();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !disposed && !contextLost) {
        lastTime = performance.now();
        scheduleRender();
      }
    };

    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const ro = new ResizeObserver(() => {
      if (disposed || contextLost) return;
      if (container.clientWidth === 0 || container.clientHeight === 0) return;
      const w = Math.max(container.clientWidth, 180);
      const h = Math.max(container.clientHeight, 180);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scheduleRender();
    });
    ro.observe(container);

    renderFrame();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      vfxHooksRef.current = null;
      controls.dispose();
      if (vfxSystem) {
        scene.remove(vfxSystem.group);
        vfxSystem.dispose();
      }
      baseGeo.dispose();
      baseMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      outerRingGeo.dispose();
      ringMat.dispose();
      envTex?.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [accentColor]);

  useEffect(() => {
    vfxHooksRef.current?.rebuildVfx(vfxConfig);
  }, [vfxConfig]);

  useEffect(() => {
    vfxHooksRef.current?.requestRender();
  }, [autoRotate]);

  return (
    <div
      data-testid="glb-model-viewer"
      data-vfx-preset={vfxConfig.preset}
      className={`relative h-full w-full overflow-hidden bg-[#060a14] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {webglReady ? (
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
          <div className="pointer-events-auto absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-[#060a14]/92 px-2.5 py-1.5 text-[10px] text-zinc-200">
            <span>3D stage initialized (WebGL context unavailable in this environment).</span>
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

      {webglReady && !compact && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-300">
          <span className="rounded bg-[#060a14]/85 px-2 py-0.5">
            {vfxConfig.label} · Drag to orbit
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAutoRotate((v) => !v);
            }}
            className="pointer-events-auto inline-flex items-center gap-1 rounded border border-white/15 bg-[#060a14]/90 px-2 py-0.5 text-[10px] hover:border-accent"
          >
            <RotateCcw className="size-3" />
            {autoRotate ? "Auto" : "Paused"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Model3DViewer;
