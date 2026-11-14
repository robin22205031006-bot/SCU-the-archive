import * as THREE from "three";
import { normalizeThreeColor } from "@/lib/three-stage-utils";

export interface CelThemeConfig {
  enabled: boolean;
  /** True in Nexus mode: keep PBR metalness/roughness and only add neon rim outlines. */
  outlineOnly: boolean;
  gradientSteps: 2 | 3;
  /** Dark -> Mid -> Highlight stops sampled by MeshToonMaterial gradientMap. */
  stops: readonly [string, string, string];
  outlineColor: string;
  outlineWidth: number;
  /** Quantized frame rate ("on 2s" at 12fps in Manga/Anime modes, 0 = smooth 60fps). */
  steppedFps: number;
}

const OUTLINE_TAG = "__isCelOutline";
const ORIG_MAT_KEY = "__celOriginalMaterial";
const TOON_MAT_KEY = "__celToonMaterial";
const OUTLINE_MAT_KEY = "__celOutlineMaterial";

export function readLiveThemeIdentifiers(): {
  primarySystem: string;
  genreTheme: string;
  mangaSubTheme: string;
} {
  if (typeof document === "undefined") {
    return { primarySystem: "classic", genreTheme: "none", mangaSubTheme: "manga-ink" };
  }
  const d = document.documentElement.dataset;
  return {
    primarySystem: d["primarySystem"] || d["uiMode"] || "classic",
    genreTheme: d["genreTheme"] || "none",
    mangaSubTheme: d["mangaSubtheme"] || "manga-ink",
  };
}

export function resolveCelThemeConfig(
  primarySystem?: string | null,
  genreTheme?: string | null,
  mangaSubTheme?: string | null,
): CelThemeConfig {
  const live = readLiveThemeIdentifiers();
  const sys = primarySystem ?? live.primarySystem;
  const genre = genreTheme ?? live.genreTheme;
  const sub = mangaSubTheme ?? live.mangaSubTheme;

  if (sys === "minimal" || sys === "classic") {
    return {
      enabled: false,
      outlineOnly: false,
      gradientSteps: 3,
      stops: ["#333333", "#999999", "#ffffff"],
      outlineColor: "#0a0a0a",
      outlineWidth: 0,
      steppedFps: 0,
    };
  }

  if (sys === "nexus") {
    return {
      enabled: true,
      outlineOnly: true,
      gradientSteps: 3,
      stops: ["#183b4a", "#38bdf8", "#e0f2fe"],
      outlineColor: "#5ce1b8",
      outlineWidth: 0.014,
      steppedFps: 0,
    };
  }

  // Primary system is "manga" (or anime sub-engine)
  const key = sub && sub !== "manga-ink" ? sub : genre;

  switch (key) {
    case "fantasy":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#42574d", "#93b5a4", "#f5ebe6"],
        outlineColor: "#0c1410",
        outlineWidth: 0.018,
        steppedFps: 12,
      };
    case "darkFantasy":
    case "dark-fantasy":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#3b2c4e", "#8b5cf6", "#fde2e4"],
        outlineColor: "#08050d",
        outlineWidth: 0.02,
        steppedFps: 12,
      };
    case "anime":
    case "xianxia":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#2c594f", "#7cd4b8", "#fffbeb"],
        outlineColor: "#0b1713",
        outlineWidth: 0.017,
        steppedFps: 12,
      };
    case "manhwa":
    case "scifiAnime":
    case "cyber-anime":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#334155", "#7dd3fc", "#f8fafc"],
        outlineColor: "#070b18",
        outlineWidth: 0.016,
        steppedFps: 12,
      };
    case "isekai":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#5c4b37", "#e09f3e", "#fef3c7"],
        outlineColor: "#140f0a",
        outlineWidth: 0.018,
        steppedFps: 12,
      };
    case "ghibli":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#4d6b57", "#9ed5b0", "#fdfcf5"],
        outlineColor: "#1d2e23",
        outlineWidth: 0.014,
        steppedFps: 12,
      };
    case "shounen":
    case "shonen":
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 2,
        stops: ["#544943", "#f8fafc", "#ffffff"],
        outlineColor: "#0a0a0a",
        outlineWidth: 0.022,
        steppedFps: 12,
      };
    case "manga-ink":
    default:
      return {
        enabled: true,
        outlineOnly: false,
        gradientSteps: 3,
        stops: ["#303030", "#9e9e9e", "#fafafa"],
        outlineColor: "#080808",
        outlineWidth: 0.021,
        steppedFps: 12,
      };
  }
}

/**
 * Generates a crisp nearest-neighbor 2-tone or 3-tone DataTexture gradient ramp
 * for `THREE.MeshToonMaterial`. Uses RGBA alignment and linear `NoColorSpace`.
 */
export function createToonGradientMap(
  steps: 2 | 3 = 3,
  hexStops: readonly string[] = ["#3a4440", "#9aa8a1", "#ffffff"],
): THREE.DataTexture {
  const width = steps === 2 ? 2 : 3;
  const data = new Uint8Array(width * 4);
  const chosen =
    width === 2
      ? [hexStops[0] ?? "#3a4440", hexStops[hexStops.length - 1] ?? "#ffffff"]
      : [
          hexStops[0] ?? "#3a4440",
          hexStops[1] ?? "#9aa8a1",
          hexStops[2] ?? hexStops[1] ?? "#ffffff",
        ];

  const c = new THREE.Color();
  for (let i = 0; i < width; i++) {
    c.copy(normalizeThreeColor(chosen[i], "#ffffff"));
    const base = i * 4;
    data[base] = Math.round(THREE.MathUtils.clamp(c.r, 0, 1) * 255);
    data[base + 1] = Math.round(THREE.MathUtils.clamp(c.g, 0, 1) * 255);
    data[base + 2] = Math.round(THREE.MathUtils.clamp(c.b, 0, 1) * 255);
    data[base + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createOutlineMaterial(outlineColor: string, outlineWidth: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOutlineColor: { value: normalizeThreeColor(outlineColor, "#0a0a0a") },
      uOutlineWidth: { value: outlineWidth },
    },
    vertexShader: `
      uniform float uOutlineWidth;
      void main() {
        vec3 extruded = position + normalize(normal) * uOutlineWidth;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uOutlineColor;
      void main() {
        gl_FragColor = vec4(uOutlineColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: true,
    toneMapped: false,
  });
}

function cloneMaterialToToon(
  source: THREE.Material,
  gradientMap: THREE.DataTexture,
): THREE.MeshToonMaterial {
  const std = source as THREE.MeshStandardMaterial;
  const color = std.color instanceof THREE.Color ? std.color.clone() : new THREE.Color(0xffffff);
  const toon = new THREE.MeshToonMaterial({
    color,
    gradientMap,
    map: std.map ?? null,
    emissive:
      std.emissive instanceof THREE.Color ? std.emissive.clone() : new THREE.Color(0x000000),
    emissiveIntensity: typeof std.emissiveIntensity === "number" ? std.emissiveIntensity : 0,
    emissiveMap: std.emissiveMap ?? null,
    alphaMap: std.alphaMap ?? null,
    transparent: Boolean(source.transparent),
    opacity: typeof source.opacity === "number" ? source.opacity : 1,
    alphaTest: typeof source.alphaTest === "number" ? source.alphaTest : 0,
    side: source.side,
    vertexColors: Boolean(source.vertexColors),
  });
  return toon;
}

function disposeGeneratedToonResources(mesh: THREE.Mesh): void {
  const toonMat = mesh.userData[TOON_MAT_KEY] as THREE.Material | THREE.Material[] | undefined;
  if (toonMat) {
    const arr = Array.isArray(toonMat) ? toonMat : [toonMat];
    for (const m of arr) {
      if (m instanceof THREE.MeshToonMaterial && m.gradientMap) {
        m.gradientMap.dispose();
      }
      m.dispose();
    }
    delete mesh.userData[TOON_MAT_KEY];
  }

  for (let i = mesh.children.length - 1; i >= 0; i--) {
    const child = mesh.children[i];
    if (child && child.userData?.[OUTLINE_TAG]) {
      mesh.remove(child);
      if (child instanceof THREE.Mesh) {
        const mat = child.userData[OUTLINE_MAT_KEY] as THREE.Material | undefined;
        mat?.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }
  }
}

/**
 * Removes cel-shading materials & inverted-hull outlines from an Object3D subtree,
 * restoring original PBR materials cleanly.
 */
export function removeCelShading(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.userData?.[OUTLINE_TAG]) return;

    const orig = obj.userData[ORIG_MAT_KEY] as THREE.Material | THREE.Material[] | undefined;
    if (orig) {
      obj.material = orig;
      delete obj.userData[ORIG_MAT_KEY];
    }
    disposeGeneratedToonResources(obj);
  });
}

/**
 * Applies stylized cel-shading (`MeshToonMaterial` + quantized `DataTexture` ramp) and
 * inverted back-face hull ink outlines to an Object3D subtree without leaking GPU resources.
 */
export function applyCelShading(
  root: THREE.Object3D,
  config: CelThemeConfig = resolveCelThemeConfig(),
): void {
  removeCelShading(root);
  if (!config.enabled) return;

  const outlineMatShared =
    config.outlineWidth > 0
      ? createOutlineMaterial(config.outlineColor, config.outlineWidth)
      : null;

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.userData?.[OUTLINE_TAG]) return;

    const origMat = obj.material;
    if (!origMat) return;

    if (!config.outlineOnly) {
      obj.userData[ORIG_MAT_KEY] = origMat;
      const gMap = createToonGradientMap(config.gradientSteps, config.stops);
      if (Array.isArray(origMat)) {
        const toons = origMat.map((m) => cloneMaterialToToon(m, gMap));
        obj.userData[TOON_MAT_KEY] = toons;
        obj.material = toons;
      } else {
        const toon = cloneMaterialToToon(origMat, gMap);
        obj.userData[TOON_MAT_KEY] = toon;
        obj.material = toon;
      }
    }

    // Attach inverted-hull BackSide ink outline onto standard rigid meshes
    const isSkinned = "isSkinnedMesh" in obj && Boolean((obj as THREE.SkinnedMesh).isSkinnedMesh);
    if (
      outlineMatShared &&
      config.outlineWidth > 0 &&
      !isSkinned &&
      obj.geometry?.attributes?.normal
    ) {
      const outlineMat = outlineMatShared.clone();
      const outlineMesh = new THREE.Mesh(obj.geometry, outlineMat);
      outlineMesh.name = "__cel_outline";
      outlineMesh.userData[OUTLINE_TAG] = true;
      outlineMesh.userData[OUTLINE_MAT_KEY] = outlineMat;
      outlineMesh.castShadow = false;
      outlineMesh.receiveShadow = false;
      outlineMesh.renderOrder = -1;
      obj.add(outlineMesh);
    }
  });

  outlineMatShared?.dispose();
}

/**
 * Steps a `THREE.AnimationMixer` at a stylized "on 2s" frame rate (12 fps) when
 * Manga/Anime cel mode is active, or smoothly at native refresh rate otherwise.
 */
export function createSteppedMixerController(stepFps = 12) {
  let accumulator = 0;
  return {
    advance(mixer: THREE.AnimationMixer | null, rawDt: number, steppedActive: boolean) {
      if (!mixer) return;
      if (!steppedActive || stepFps <= 0) {
        accumulator = 0;
        mixer.update(rawDt);
        return;
      }
      const step = 1 / stepFps;
      accumulator += rawDt;
      if (accumulator >= step) {
        const ticks = Math.floor(accumulator / step);
        const advanceDt = ticks * step;
        accumulator -= advanceDt;
        mixer.update(advanceDt);
      }
    },
    reset() {
      accumulator = 0;
    },
  };
}

/** Returns true when an interactive dialog/drawer overlay covers the viewport. */
export function hasBlockingModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  const dialogs = document.querySelectorAll(
    '[role="dialog"]:not([hidden]), [aria-modal="true"]:not([hidden])',
  );
  for (const el of dialogs) {
    if (el instanceof HTMLElement) {
      const state = el.dataset["state"];
      if (state === "closed") continue;
      if (el.offsetParent !== null || el.getBoundingClientRect().height > 0) {
        return true;
      }
    }
  }
  return false;
}

/** Subscribes to DOM modal open/close transitions so 3D render loops pause cleanly. */
export function observeBlockingModal(onChange: (blocked: boolean) => void): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  let last = hasBlockingModalOpen();
  const check = () => {
    const next = hasBlockingModalOpen();
    if (next !== last) {
      last = next;
      onChange(next);
    }
  };
  const mo = new MutationObserver(check);
  mo.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state", "aria-modal", "hidden", "role"],
  });
  return () => mo.disconnect();
}
