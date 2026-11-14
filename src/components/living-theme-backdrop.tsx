import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GenreThemeId } from "@/lib/genre-themes";
import { hasBlockingModalOpen, observeBlockingModal } from "@/lib/three-cel-shading";
import {
  createAfterDrawScheduler,
  createSafeWebGLRenderer,
  detectWebGLContext,
} from "@/lib/three-stage-utils";

interface BackdropPalette {
  foliageA: string;
  foliageB: string;
  waterA: string;
  waterB: string;
  moteColor: string;
  windSpeed: number;
  foliageAlpha: number;
}

function paletteForTheme(genre: GenreThemeId, subTheme?: string): BackdropPalette {
  const key = subTheme && subTheme !== "manga-ink" ? subTheme : genre;
  switch (key) {
    case "fantasy":
      return {
        foliageA: "#162d24",
        foliageB: "#2e5a52",
        waterA: "#11241e",
        waterB: "#5ce1b8",
        moteColor: "#c5a869",
        windSpeed: 1.0,
        foliageAlpha: 0.42,
      };
    case "darkFantasy":
    case "dark-fantasy":
      return {
        foliageA: "#180d28",
        foliageB: "#4c1d95",
        waterA: "#12081c",
        waterB: "#f43f5e",
        moteColor: "#fb7185",
        windSpeed: 0.85,
        foliageAlpha: 0.36,
      };
    case "anime":
    case "xianxia":
      return {
        foliageA: "#0f2922",
        foliageB: "#1e5e4e",
        waterA: "#0b1a16",
        waterB: "#34d399",
        moteColor: "#d6b26a",
        windSpeed: 1.15,
        foliageAlpha: 0.34,
      };
    case "ghibli":
      return {
        foliageA: "#4a8a5f",
        foliageB: "#96d1a4",
        waterA: "#bae6fd",
        waterB: "#fde68a",
        moteColor: "#fef08a",
        windSpeed: 0.9,
        foliageAlpha: 0.24,
      };
    case "isekai":
      return {
        foliageA: "#1d1a14",
        foliageB: "#2dd4bf",
        waterA: "#14110c",
        waterB: "#e09f3e",
        moteColor: "#5eead4",
        windSpeed: 1.0,
        foliageAlpha: 0.28,
      };
    case "manhwa":
    case "scifiAnime":
    case "cyber-anime":
      return {
        foliageA: "#0c142c",
        foliageB: "#38bdf8",
        waterA: "#090d1f",
        waterB: "#a78bfa",
        moteColor: "#7dd3fc",
        windSpeed: 1.35,
        foliageAlpha: 0.26,
      };
    case "shounen":
    case "shonen":
      return {
        foliageA: "#1e1b2e",
        foliageB: "#f97316",
        waterA: "#111827",
        waterB: "#facc15",
        moteColor: "#fdba74",
        windSpeed: 1.5,
        foliageAlpha: 0.28,
      };
    case "manga-ink":
    default:
      return {
        foliageA: "#1a1a1a",
        foliageB: "#525252",
        waterA: "#141414",
        waterB: "#d4d4d4",
        moteColor: "#e5e5e5",
        windSpeed: 0.7,
        foliageAlpha: 0.16,
      };
  }
}

/**
 * Full-viewport WebGL2 living anime environment shader canvas.
 * Renders vertex-shader swaying vines/foliage along edges, UV-panning water shimmer,
 * and drifting firefly motes at lightweight GPU cost while auto-pausing during modals.
 */
export function LivingThemeBackdrop({ genre }: { genre: GenreThemeId }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef(genre);
  genreRef.current = genre;

  const hooksRef = useRef<{
    applyPalette: (g: GenreThemeId, sub?: string) => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGLContext();
    if (!supported) return;

    const renderer = createSafeWebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      depth: false,
      stencil: false,
    });
    if (!renderer) return;

    const pixelRatio = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(Math.max(container.clientWidth, 320), Math.max(container.clientHeight, 320));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;

    const initialSub =
      typeof document !== "undefined"
        ? document.documentElement.dataset["mangaSubtheme"]
        : undefined;
    const initPal = paletteForTheme(genreRef.current, initialSub);

    // 1. UV-Panning Water / Mist Reflection Plane at lower viewport
    const waterGeo = new THREE.PlaneGeometry(2.2, 0.72, 24, 6);
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uWaterA: { value: new THREE.Color(initPal.waterA) },
        uWaterB: { value: new THREE.Color(initPal.waterB) },
        uSpeed: { value: initPal.windSpeed },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.y += sin(pos.x * 4.5 + uTime * 1.6 * uSpeed) * 0.015;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform vec3 uWaterA;
        uniform vec3 uWaterB;
        uniform float uSpeed;
        void main() {
          vec2 uv = vUv;
          float ripple1 = sin(uv.x * 26.0 - uTime * 1.4 * uSpeed + sin(uv.y * 12.0 + uTime));
          float ripple2 = sin(uv.x * 42.0 + uTime * 1.1 * uSpeed + uv.y * 18.0);
          float shimmer = smoothstep(0.58, 0.98, 0.5 * (ripple1 * 0.55 + ripple2 * 0.45) + 0.5);
          float fade = smoothstep(1.0, 0.0, uv.y) * 0.34;
          vec3 col = mix(uWaterA, uWaterB, shimmer * 0.72);
          gl_FragColor = vec4(col, fade * (0.35 + shimmer * 0.65));
        }
      `,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(0, -0.68, -0.4);
    scene.add(waterMesh);

    // 2. Vertex-Swaying Left & Right Botanical Vine/Foliage Ribbons
    const foliageUniforms = {
      uTime: { value: 0 },
      uSpeed: { value: initPal.windSpeed },
      uColA: { value: new THREE.Color(initPal.foliageA) },
      uColB: { value: new THREE.Color(initPal.foliageB) },
      uAlpha: { value: initPal.foliageAlpha },
    };
    const foliageMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: foliageUniforms,
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float sway = sin(uTime * 3.0 * uSpeed + pos.y * 2.4 + pos.x * 1.7) * 0.055;
          float tipWeight = smoothstep(0.0, 1.0, uv.x);
          pos.x += sway * tipWeight;
          pos.y += cos(uTime * 2.2 * uSpeed + pos.x * 3.0) * 0.018 * tipWeight;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColA;
        uniform vec3 uColB;
        uniform float uAlpha;
        void main() {
          float leafWave = 0.5 + 0.5 * sin(vUv.y * 36.0 + vUv.x * 5.0);
          float silhouette = smoothstep(1.0, 0.12, vUv.x + leafWave * 0.32);
          float edgeMask = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          vec3 col = mix(uColA, uColB, leafWave * 0.65 + (1.0 - vUv.x) * 0.25);
          gl_FragColor = vec4(col, silhouette * edgeMask * uAlpha);
        }
      `,
    });

    const leftVineGeo = new THREE.PlaneGeometry(0.46, 2.0, 8, 36);
    const leftVineMesh = new THREE.Mesh(leftVineGeo, foliageMat);
    leftVineMesh.position.set(-0.82, 0, -0.1);
    scene.add(leftVineMesh);

    const rightVineGeo = new THREE.PlaneGeometry(0.46, 2.0, 8, 36);
    const rightVineMesh = new THREE.Mesh(rightVineGeo, foliageMat);
    rightVineMesh.rotation.y = Math.PI;
    rightVineMesh.position.set(0.82, 0, -0.1);
    scene.add(rightVineMesh);

    // 3. Drifting Fireflies / Botanical Dust Motes
    const moteCount = isSoftwareGl ? 18 : 44;
    const motePositions = new Float32Array(moteCount * 3);
    const moteSeeds = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = (Math.random() - 0.5) * 2.0;
      motePositions[i * 3 + 1] = (Math.random() - 0.5) * 2.0;
      motePositions[i * 3 + 2] = 0.1 + (Math.random() - 0.5) * 0.2;
      moteSeeds[i * 3] = Math.random() * Math.PI * 2;
      moteSeeds[i * 3 + 1] = 0.4 + Math.random() * 0.9;
      moteSeeds[i * 3 + 2] = 3.0 + Math.random() * 4.5;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
    moteGeo.setAttribute("aSeed", new THREE.BufferAttribute(moteSeeds, 3));

    const moteMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uColor: { value: new THREE.Color(initPal.moteColor) },
      },
      vertexShader: `
        attribute vec3 aSeed;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.35 * aSeed.y + aSeed.x) * 0.08;
          pos.y = mod(pos.y + uTime * 0.045 * aSeed.y + 1.0, 2.0) - 1.0;
          vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.8 * aSeed.y + aSeed.x));
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSeed.z * uPixelRatio;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.05, dist) * vAlpha * 0.55;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    const motePoints = new THREE.Points(moteGeo, moteMat);
    scene.add(motePoints);

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

      waterMat.uniforms["uTime"]!.value = elapsed;
      foliageUniforms.uTime.value = elapsed;
      moteMat.uniforms["uTime"]!.value = elapsed;
      renderer.render(scene, camera);

      if (!document.hidden && !modalBlocked) {
        if (isSoftwareGl) {
          afterDraw(() => scheduleRender());
        } else {
          frameId = requestAnimationFrame(renderFrame);
        }
      }
    };

    const scheduleRender = () => {
      if (disposed || contextLost || modalBlocked || document.hidden || frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        renderFrame();
      });
    };

    hooksRef.current = {
      applyPalette: (g, sub) => {
        if (disposed) return;
        const p = paletteForTheme(g, sub);
        (waterMat.uniforms["uWaterA"]!.value as THREE.Color).set(p.waterA);
        (waterMat.uniforms["uWaterB"]!.value as THREE.Color).set(p.waterB);
        waterMat.uniforms["uSpeed"]!.value = p.windSpeed;
        foliageUniforms.uColA.value.set(p.foliageA);
        foliageUniforms.uColB.value.set(p.foliageB);
        foliageUniforms.uSpeed.value = p.windSpeed;
        foliageUniforms.uAlpha.value = p.foliageAlpha;
        (moteMat.uniforms["uColor"]!.value as THREE.Color).set(p.moteColor);
        scheduleRender();
      },
      requestRender: scheduleRender,
    };

    const stopModalObserver = observeBlockingModal((blocked) => {
      modalBlocked = blocked;
      if (blocked) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        window.clearTimeout(timeoutId);
      } else {
        lastTime = performance.now();
        scheduleRender();
      }
    });

    const handleVisibility = () => {
      if (!document.hidden && !modalBlocked && !disposed && !contextLost) {
        lastTime = performance.now();
        scheduleRender();
      }
    };
    const handleSubThemeEvent = (e: Event) => {
      const sub = (e as CustomEvent<string>).detail;
      hooksRef.current?.applyPalette(genreRef.current, sub);
    };
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      frameId = 0;
      window.clearTimeout(timeoutId);
    };
    const handleContextRestored = () => {
      contextLost = false;
      lastTime = performance.now();
      scheduleRender();
    };

    const ro = new ResizeObserver(() => {
      if (disposed || contextLost) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      renderer.setSize(w, h);
    });
    ro.observe(container);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("scu:manga-subtheme-change", handleSubThemeEvent);
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    renderFrame();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      stopModalObserver();
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("scu:manga-subtheme-change", handleSubThemeEvent);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      hooksRef.current = null;

      waterGeo.dispose();
      waterMat.dispose();
      leftVineGeo.dispose();
      rightVineGeo.dispose();
      foliageMat.dispose();
      moteGeo.dispose();
      moteMat.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    const sub =
      typeof document !== "undefined"
        ? document.documentElement.dataset["mangaSubtheme"]
        : undefined;
    hooksRef.current?.applyPalette(genre, sub);
  }, [genre]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      data-living-backdrop={genre}
      className="pointer-events-none fixed inset-0 z-0 opacity-90"
    />
  );
}
