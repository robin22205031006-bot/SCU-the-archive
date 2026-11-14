import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Box, Crosshair, Loader2, RotateCcw } from "lucide-react";
import {
  createModelVfxSystem,
  resolveModelVfxPreset,
  type ModelVfxConfig,
  type ModelVfxSystem,
} from "@/lib/model-3d-vfx";
import {
  applyCelShading,
  createSteppedMixerController,
  hasBlockingModalOpen,
  observeBlockingModal,
  removeCelShading,
  resolveCelThemeConfig,
} from "@/lib/three-cel-shading";
import {
  createAfterDrawScheduler,
  createConfiguredGltfLoader,
  createSafeWebGLRenderer,
  detectWebGLContext,
  disposeObjectTree,
  normalizeThreeColor,
} from "@/lib/three-stage-utils";

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
 * Interactive Three.js .glb/.gltf model stage with OrbitControls, Draco/Meshopt decoding,
 * PMREM RoomEnvironment reflections, 3-point warm/cool studio lighting, dynamic lore-driven
 * VFX particles/auras, software-WebGL pacing, context-loss recovery, and 2D fallback.
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
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-webgl" | "context-lost">(
    "loading",
  );
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

  const viewerHooksRef = useRef<{
    rebuildVfx: (cfg: ModelVfxConfig) => void;
    resetView: () => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !url) return;

    const { supported, isSoftwareGl } = detectWebGLContext();
    if (!supported) {
      setStatus("no-webgl");
      return;
    }

    setStatus("loading");

    const width = Math.max(container.clientWidth, 180);
    const height = Math.max(container.clientHeight, 180);

    const renderer = createSafeWebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    if (!renderer) {
      setStatus("no-webgl");
      return;
    }

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

    let envTex: THREE.Texture | null = null;
    try {
      const roomEnv = new RoomEnvironment();
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      pmremGenerator.dispose();
      roomEnv.dispose();
    } catch {
      envTex = null;
    }

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 60);
    const heroCameraPos = new THREE.Vector3(2.2, 1.45, 2.75);
    const heroTarget = new THREE.Vector3(0, 0.85, 0);
    camera.position.copy(heroCameraPos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(heroTarget);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.7;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 1.25;
    controls.update();

    const resolvedAccent = normalizeThreeColor(accentColor, "#38bdf8");

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

    const rimLight = new THREE.DirectionalLight(resolvedAccent, 1.45);
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
      color: normalizeThreeColor(vfxConfigRef.current.primaryHex, "#38bdf8"),
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.004;
    scene.add(ringMesh);

    let modelBounds = { centerY: 0.85, radius: 0.85, height: 1.85 };
    let vfxSystem: ModelVfxSystem | null = createModelVfxSystem(vfxConfigRef.current, {
      isSoftwareGl,
      pixelRatio,
      ...modelBounds,
    });
    scene.add(vfxSystem.group);

    let loadedModel: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let celConfig = resolveCelThemeConfig();
    const steppedMixer = createSteppedMixerController(celConfig.steppedFps || 12);
    let disposed = false;
    let contextLost = false;
    let modalBlocked = hasBlockingModalOpen();
    let frameId = 0;
    let timeoutId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const afterDraw = createAfterDrawScheduler(
      renderer,
      () => disposed || contextLost || modalBlocked,
      (id) => {
        timeoutId = id;
      },
    );

    const renderFrame = () => {
      if (disposed || contextLost || modalBlocked) {
        frameId = 0;
        return;
      }
      frameId = 0;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;
      elapsed += dt;

      if (mixer) {
        steppedMixer.advance(mixer, dt, celConfig.steppedFps > 0);
      }
      if (vfxSystem) vfxSystem.update(dt, elapsed, 1);
      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.update();
      renderer.render(scene, camera);

      const keepRunning = !isSoftwareGl && !document.hidden && !modalBlocked;
      if (keepRunning) {
        frameId = requestAnimationFrame(renderFrame);
      } else if (isSoftwareGl && autoRotateRef.current && !modalBlocked) {
        afterDraw(() => {
          if (!disposed && !contextLost && !modalBlocked && autoRotateRef.current) {
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

    viewerHooksRef.current = {
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
        ringMat.color.copy(normalizeThreeColor(cfg.primaryHex, accentColor));
        scheduleRender();
      },
      resetView: () => {
        if (disposed) return;
        camera.position.copy(heroCameraPos);
        controls.target.copy(heroTarget);
        controls.update();
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
      setStatus("context-lost");
    };

    const handleContextRestored = () => {
      if (disposed) return;
      contextLost = false;
      setStatus(loadedModel ? "ready" : "loading");
      scheduleRender();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !modalBlocked && !disposed && !contextLost) {
        lastTime = performance.now();
        scheduleRender();
      }
    };

    const handleThemeChange = () => {
      if (disposed) return;
      celConfig = resolveCelThemeConfig();
      if (loadedModel) {
        applyCelShading(loadedModel, celConfig);
      }
      scheduleRender();
    };

    const stopModalObserver = observeBlockingModal((blocked) => {
      modalBlocked = blocked;
      if (blocked) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        window.clearTimeout(timeoutId);
      } else if (!disposed && !contextLost) {
        lastTime = performance.now();
        scheduleRender();
      }
    });

    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("scu:ui-mode-change", handleThemeChange);
    window.addEventListener("scu:genre-theme-change", handleThemeChange);
    window.addEventListener("scu:manga-subtheme-change", handleThemeChange);

    const loader = createConfiguredGltfLoader();
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

        if (!box.isEmpty()) {
          box.getSize(size);
          box.getCenter(center);

          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const targetSpan = 1.9;
          const scale = targetSpan / maxDim;
          model.scale.setScalar(scale);

          box.setFromObject(model);
          box.getCenter(center);
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;

          box.setFromObject(model);
          box.getCenter(center);
          box.getSize(size);
        } else {
          size.set(1, 1.5, 1);
          center.set(0, 0.75, 0);
        }

        const radius = Math.max(Math.hypot(size.x, size.z) * 0.5, 0.45);
        const safeCenterY = Number.isFinite(center.y) ? Math.max(center.y, 0.25) : 0.85;
        const safeHeight = Number.isFinite(size.y) ? Math.max(size.y, 0.5) : 1.5;

        modelBounds = {
          centerY: safeCenterY,
          radius,
          height: safeHeight,
        };
        if (vfxSystem) {
          vfxSystem.setBounds(modelBounds.centerY, modelBounds.radius, modelBounds.height);
        }

        // Fit camera cleanly to the model bounding sphere so tall characters or wide weapons stay centered
        const fitRadius = Math.max(Math.hypot(size.x, size.y, size.z) * 0.5, 0.6);
        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const dist = (fitRadius / Math.sin(fovRad / 2)) * 1.15;
        heroTarget.set(0, safeCenterY, 0);
        heroCameraPos.set(dist * 0.62, safeCenterY + dist * 0.28, dist * 0.78);
        camera.position.copy(heroCameraPos);
        controls.target.copy(heroTarget);
        controls.minDistance = Math.max(0.4, fitRadius * 0.7);
        controls.maxDistance = Math.max(8, fitRadius * 8);
        controls.update();

        scene.add(model);
        loadedModel = model;
        celConfig = resolveCelThemeConfig();
        applyCelShading(model, celConfig);

        if (gltf.animations && gltf.animations.length > 0 && !isSoftwareGl) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach((clip) => mixer!.clipAction(clip).play());
        }

        if (!isSoftwareGl && !contextLost) {
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

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      stopModalObserver();
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("scu:ui-mode-change", handleThemeChange);
      window.removeEventListener("scu:genre-theme-change", handleThemeChange);
      window.removeEventListener("scu:manga-subtheme-change", handleThemeChange);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      viewerHooksRef.current = null;
      controls.dispose();
      if (mixer) mixer.stopAllAction();
      if (vfxSystem) {
        scene.remove(vfxSystem.group);
        vfxSystem.dispose();
        vfxSystem = null;
      }
      if (loadedModel) {
        removeCelShading(loadedModel);
        scene.remove(loadedModel);
        disposeObjectTree(loadedModel);
      }
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTex?.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [url, accentColor]);

  // Dynamically regenerate Three.js VFX if name, description, or tags change
  useEffect(() => {
    viewerHooksRef.current?.rebuildVfx(vfxConfig);
  }, [vfxConfig]);

  // Sync Auto / Paused button changes cleanly with renderer scheduling
  useEffect(() => {
    viewerHooksRef.current?.requestRender();
  }, [autoRotate]);

  const showFallback = status === "error" || status === "no-webgl" || status === "context-lost";

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
          <div className="pointer-events-auto absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-[#060a14]/92 px-2.5 py-1.5 text-[10px] text-zinc-200">
            <span>
              {status === "error"
                ? "3D model failed to load — showing 2D preview."
                : status === "context-lost"
                  ? "WebGL context was interrupted — showing 2D preview."
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#060a14]/85 text-xs text-zinc-200">
          <Loader2 className="size-5 animate-spin text-accent" />
          <span>Loading 3D model…</span>
        </div>
      )}

      {status === "ready" && !compact && (
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 text-[10px] text-zinc-300">
          <span className="rounded bg-[#060a14]/85 px-2 py-0.5">
            {vfxConfig.label} · Drag to orbit
          </span>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                viewerHooksRef.current?.resetView();
              }}
              aria-label="Reset 3D camera"
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-[#060a14]/90 px-2 py-0.5 text-[10px] hover:border-accent"
            >
              <Crosshair className="size-3" />
              Reset
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAutoRotate((v) => !v);
              }}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-[#060a14]/90 px-2 py-0.5 text-[10px] hover:border-accent"
            >
              <RotateCcw className="size-3" />
              {autoRotate ? "Auto" : "Paused"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
