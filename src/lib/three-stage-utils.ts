import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let sharedDracoLoader: DRACOLoader | null = null;

/**
 * Safely probe WebGL2 availability and whether rendering is software-backed
 * (e.g. SwiftShader, llvmpipe). Cleans up the probe context immediately.
 */
export function detectWebGLContext(): { supported: boolean; isSoftwareGl: boolean } {
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

/**
 * Normalizes modern CSS Color Level 4 strings (e.g. `hsl(210 85% 60%)`) into
 * comma-separated syntax that `THREE.Color` parses reliably without falling back to white.
 */
export function normalizeThreeColor(
  raw: string | null | undefined,
  fallbackHex = "#38bdf8",
): THREE.Color {
  if (!raw || typeof raw !== "string") return new THREE.Color(fallbackHex);
  const trimmed = raw.trim();
  if (!trimmed) return new THREE.Color(fallbackHex);

  const hslSpaceMatch = trimmed.match(
    /^hsla?\(\s*([\d.]+(?:deg|rad|turn)?)\s+([\d.]+%)\s+([\d.]+%)(?:\s*\/\s*[\d.%]+)?\s*\)$/i,
  );
  if (hslSpaceMatch) {
    const h = hslSpaceMatch[1]!.replace(/deg$/i, "");
    const s = hslSpaceMatch[2]!;
    const l = hslSpaceMatch[3]!;
    return new THREE.Color(`hsl(${h}, ${s}, ${l})`);
  }

  const rgbSpaceMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*[\d.%]+)?\s*\)$/i,
  );
  if (rgbSpaceMatch) {
    return new THREE.Color(`rgb(${rgbSpaceMatch[1]!}, ${rgbSpaceMatch[2]!}, ${rgbSpaceMatch[3]!})`);
  }

  try {
    return new THREE.Color(trimmed);
  } catch {
    return new THREE.Color(fallbackHex);
  }
}

/**
 * Creates a Three.js `WebGLRenderer` inside a try/catch so context creation
 * failures return `null` instead of crashing the React tree.
 */
export function createSafeWebGLRenderer(
  params: THREE.WebGLRendererParameters,
): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer(params);
  } catch {
    return null;
  }
}

/**
 * Creates a GLTFLoader preconfigured with local `/draco/` decoders (offline/PWA safe),
 * MeshoptDecoder, and anonymous cross-origin loading.
 */
export function createConfiguredGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.setCrossOrigin("anonymous");
  if (!sharedDracoLoader && typeof document !== "undefined") {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath("/draco/");
  }
  if (sharedDracoLoader) {
    loader.setDRACOLoader(sharedDracoLoader);
  }
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

function disposeMaterialWithTextures(mat: THREE.Material): void {
  for (const val of Object.values(mat)) {
    if (val instanceof THREE.Texture) {
      val.dispose();
    }
  }
  mat.dispose();
}

/**
 * Recursively disposes all geometries, materials, and textures attached to an Object3D subtree
 * (Mesh, Points, Line, LineSegments, Sprite).
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const geom = (obj as { geometry?: THREE.BufferGeometry }).geometry;
    if (geom && typeof geom.dispose === "function") {
      geom.dispose();
    }
    const rawMat = (obj as { material?: THREE.Material | THREE.Material[] }).material;
    if (rawMat) {
      const mats = Array.isArray(rawMat) ? rawMat : [rawMat];
      for (const m of mats) {
        if (m && typeof m.dispose === "function") {
          disposeMaterialWithTextures(m);
        }
      }
    }
  });
}

/**
 * Performs complete zero-leak Three.js teardown on unmount or route transition:
 * disposes scene objects, clears renderLists, detaches DOM canvas, and disposes renderer.
 */
export function disposeThreeRenderer(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene | null,
  container?: HTMLElement | null,
): void {
  if (scene) {
    disposeObjectTree(scene);
    scene.clear();
  }
  try {
    renderer.renderLists?.dispose();
  } catch {
    /* ignore renderLists errors during context loss */
  }
  try {
    renderer.dispose();
  } catch {
    /* ignore disposal errors if context already lost */
  }
  if (renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  if (container) {
    container.innerHTML = "";
  }
}

/**
 * Paces software-WebGL frames using `gl.fenceSync` when available, falling back
 * to a short timer when `fenceSync` is unavailable.
 */
export function createAfterDrawScheduler(
  renderer: THREE.WebGLRenderer,
  isDisposed: () => boolean,
  onTimeoutId: (id: number) => void,
): (cb: () => void) => void {
  return (cb: () => void) => {
    if (isDisposed()) return;
    const gl = renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== "function") {
      onTimeoutId(window.setTimeout(cb, 80));
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (isDisposed()) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.ALREADY_SIGNALED;
      if (state === gl.UNSIGNALED) {
        onTimeoutId(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        onTimeoutId(window.setTimeout(cb, 80));
      }
    };
    onTimeoutId(window.setTimeout(poll, 5));
  };
}
