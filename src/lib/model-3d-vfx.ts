import * as THREE from "three";

export type ModelVfxPresetId = "aether" | "cursed" | "fire" | "scifi";

export interface ModelVfxInput {
  name?: string | null | undefined;
  description?: string | null | undefined;
  tags?: readonly (string | null | undefined)[] | string | null | undefined;
}

export interface ModelVfxConfig {
  preset: ModelVfxPresetId;
  label: string;
  primaryHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  lightHex: string;
  matchedKeywords: string[];
}

export const MODEL_VFX_PRESETS: Record<
  ModelVfxPresetId,
  Omit<ModelVfxConfig, "matchedKeywords">
> = {
  aether: {
    preset: "aether",
    label: "Aether / Plasma Energy",
    primaryHex: "#38bdf8",
    secondaryHex: "#22d3ee",
    tertiaryHex: "#a5f3fc",
    lightHex: "#38bdf8",
  },
  cursed: {
    preset: "cursed",
    label: "Cursed Blood Aura",
    primaryHex: "#dc2626",
    secondaryHex: "#7f1d1d",
    tertiaryHex: "#f87171",
    lightHex: "#dc2626",
  },
  fire: {
    preset: "fire",
    label: "Pyre Ember Surge",
    primaryHex: "#f97316",
    secondaryHex: "#facc15",
    tertiaryHex: "#ea580c",
    lightHex: "#fb923c",
  },
  scifi: {
    preset: "scifi",
    label: "Tactical Sci-Fi Dust",
    primaryHex: "#7dd3fc",
    secondaryHex: "#cbd5e1",
    tertiaryHex: "#38bdf8",
    lightHex: "#7dd3fc",
  },
};

const CURSED_KEYWORDS = ["kara yazgi", "cursed", "blood", "dark"] as const;
const FIRE_KEYWORDS = ["fire", "flame", "burn"] as const;
const AETHER_KEYWORDS = ["aether", "plasma", "energy"] as const;

function normalizeSearchText(raw: string): string {
  return raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function collectMatches(text: string, keywords: readonly string[]): string[] {
  if (!text) return [];
  return keywords.filter((kw) => {
    if (kw === "fire") return /fire(?!s\b)/.test(text);
    return text.includes(kw);
  });
}

function flattenTags(
  tags: readonly (string | null | undefined)[] | string | null | undefined,
): string {
  if (!tags) return "";
  if (Array.isArray(tags)) {
    return tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).join(" ");
  }
  return typeof tags === "string" ? tags : "";
}

/**
 * Resolves the lore-accurate Three.js VFX preset from an item's name, description, and tags.
 * Checks primary identity fields (name + tags) before description so passing narrative words
 * don't override explicit item archetypes.
 */
export function resolveModelVfxPreset(input: ModelVfxInput): ModelVfxConfig {
  const primaryText = normalizeSearchText(`${input.name ?? ""} ${flattenTags(input.tags)}`);
  const descText = normalizeSearchText(input.description ?? "");

  const matchIn = (text: string): { preset: ModelVfxPresetId; matched: string[] } | null => {
    const cursed = collectMatches(text, CURSED_KEYWORDS);
    if (cursed.length > 0) return { preset: "cursed", matched: cursed };

    const fire = collectMatches(text, FIRE_KEYWORDS);
    if (fire.length > 0) return { preset: "fire", matched: fire };

    const aether = collectMatches(text, AETHER_KEYWORDS);
    if (aether.length > 0) return { preset: "aether", matched: aether };

    return null;
  };

  const primaryHit = matchIn(primaryText);
  if (primaryHit) {
    return {
      ...MODEL_VFX_PRESETS[primaryHit.preset],
      matchedKeywords: primaryHit.matched,
    };
  }

  const descHit = matchIn(descText);
  if (descHit) {
    return {
      ...MODEL_VFX_PRESETS[descHit.preset],
      matchedKeywords: descHit.matched,
    };
  }

  return {
    ...MODEL_VFX_PRESETS.scifi,
    matchedKeywords: [],
  };
}

// Pre-allocated scratch colors so update() allocates zero heap objects.
const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _colorC = new THREE.Color();
const _colorScratch = new THREE.Color();

function createRadialSpriteTexture(softness: number, opaqueCenter = true): THREE.Texture {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      if (opaqueCenter) {
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.28, `rgba(255,255,255,${softness})`);
        grad.addColorStop(0.65, `rgba(255,255,255,${softness * 0.28})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        grad.addColorStop(0, "rgba(255,255,255,0.65)");
        grad.addColorStop(0.45, "rgba(255,255,255,0.35)");
        grad.addColorStop(0.8, "rgba(255,255,255,0.1)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
  }

  // Headless / jsdom fallback DataTexture
  const size = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const alpha = Math.round(Math.pow(1 - dist, 2) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = alpha;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uPixelRatio;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = max(0.35, -mvPosition.z);
    gl_PointSize = clamp(aSize * uPixelRatio * (180.0 / dist), 1.5, 96.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uGlobalOpacity;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    float alpha = tex.a * vAlpha * uGlobalOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor * tex.rgb, alpha);
  }
`;

const DARK_AURA_VERTEX_SHADER = `
  varying vec3 vNormalDir;
  varying vec3 vViewPos;
  varying vec3 vLocalPos;
  uniform float uTime;

  void main() {
    vLocalPos = position;
    vec3 displaced = position;
    float ripple = sin(position.y * 5.0 - uTime * 2.4 + position.x * 3.5) * 0.045
                 + cos(position.z * 4.5 + uTime * 1.9) * 0.035;
    displaced += normal * ripple;

    vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
    vViewPos = -mvPos.xyz;
    vNormalDir = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const DARK_AURA_FRAGMENT_SHADER = `
  varying vec3 vNormalDir;
  varying vec3 vViewPos;
  varying vec3 vLocalPos;
  uniform float uTime;
  uniform float uPulse;

  void main() {
    vec3 viewDir = normalize(vViewPos);
    float ndotv = abs(dot(normalize(vNormalDir), viewDir));
    float fresnel = pow(1.0 - ndotv, 1.75);

    float swirl = 0.5 + 0.5 * sin(vLocalPos.y * 7.0 - uTime * 2.8 + sin(vLocalPos.x * 5.0 + uTime));
    float tendrils = smoothstep(0.25, 0.92, fresnel * 0.85 + swirl * 0.35);

    vec3 darkVoid = vec3(0.03, 0.01, 0.025);
    vec3 crimsonRim = vec3(0.72, 0.06, 0.1);
    vec3 color = mix(darkVoid, crimsonRim, pow(fresnel, 2.2) * (0.45 + 0.55 * uPulse));

    float alpha = tendrils * (0.34 + 0.18 * uPulse) * (1.0 - smoothstep(0.85, 1.0, ndotv) * 0.5);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.65));
  }
`;

interface ParticlePool {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  positions: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  colors: Float32Array;
  lifes: Float32Array;
  speeds: Float32Array;
  accels: Float32Array;
  radii: Float32Array;
  angles: Float32Array;
  phases: Float32Array;
  baseSizes: Float32Array;
  count: number;
}

function createParticlePool(
  count: number,
  texture: THREE.Texture,
  blending: THREE.Blending,
  pixelRatio: number,
  globalOpacity = 1,
): ParticlePool {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  const sizeAttr = new THREE.BufferAttribute(sizes, 1);
  sizeAttr.setUsage(THREE.DynamicDrawUsage);
  const alphaAttr = new THREE.BufferAttribute(alphas, 1);
  alphaAttr.setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);

  geometry.setAttribute("position", posAttr);
  geometry.setAttribute("aSize", sizeAttr);
  geometry.setAttribute("aAlpha", alphaAttr);
  geometry.setAttribute("aColor", colorAttr);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uPixelRatio: { value: pixelRatio },
      uGlobalOpacity: { value: globalOpacity },
    },
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = blending === THREE.AdditiveBlending ? 6 : 4;

  return {
    points,
    geometry,
    material,
    positions,
    sizes,
    alphas,
    colors,
    lifes: new Float32Array(count),
    speeds: new Float32Array(count),
    accels: new Float32Array(count),
    radii: new Float32Array(count),
    angles: new Float32Array(count),
    phases: new Float32Array(count),
    baseSizes: new Float32Array(count),
    count,
  };
}

function markPoolDirty(pool: ParticlePool) {
  (pool.geometry.attributes["position"] as THREE.BufferAttribute).needsUpdate = true;
  (pool.geometry.attributes["aSize"] as THREE.BufferAttribute).needsUpdate = true;
  (pool.geometry.attributes["aAlpha"] as THREE.BufferAttribute).needsUpdate = true;
  (pool.geometry.attributes["aColor"] as THREE.BufferAttribute).needsUpdate = true;
}

interface EnergyWispNode {
  container: THREE.Group;
  core: THREE.Mesh;
  halo: THREE.Sprite;
  orbitRadius: number;
  orbitSpeed: number;
  yAmp: number;
  yFreq: number;
  phase: number;
  tilt: number;
}

export interface ModelVfxSystem {
  group: THREE.Group;
  preset: ModelVfxPresetId;
  config: ModelVfxConfig;
  setBounds: (centerY: number, radius: number, height: number) => void;
  update: (dt: number, elapsed: number, intensityMultiplier?: number) => void;
  dispose: () => void;
}

export interface CreateModelVfxOptions {
  isSoftwareGl?: boolean;
  pixelRatio?: number;
  centerY?: number;
  radius?: number;
  height?: number;
}

/**
 * Builds a complete, zero-GC Three.js dynamic particle and aura system tailored to the
 * resolved lore preset (`aether`, `cursed`, `fire`, or `scifi`).
 */
export function createModelVfxSystem(
  config: ModelVfxConfig,
  options: CreateModelVfxOptions = {},
): ModelVfxSystem {
  const isSoftwareGl = options.isSoftwareGl ?? false;
  const pixelRatio = options.pixelRatio ?? (isSoftwareGl ? 1 : 1.5);

  let boundsCenterY = options.centerY ?? 0.95;
  let boundsRadius = Math.max(0.45, options.radius ?? 0.85);
  let boundsHeight = Math.max(0.9, options.height ?? 1.9);

  const group = new THREE.Group();
  group.name = `model-vfx-${config.preset}`;

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  const glowTex = track(createRadialSpriteTexture(0.72, true));
  const smokeTex = track(createRadialSpriteTexture(0.5, false));

  const auraLight = new THREE.PointLight(
    new THREE.Color(config.lightHex),
    config.preset === "scifi" ? 0.6 : 1.45,
    5.5,
    1.6,
  );
  auraLight.position.set(0, boundsCenterY, 0.35);
  group.add(auraLight);

  let primaryPool: ParticlePool | null = null;
  let secondaryPool: ParticlePool | null = null;
  let darkShroudMesh: THREE.Mesh | null = null;
  let darkShroudMat: THREE.ShaderMaterial | null = null;
  const wisps: EnergyWispNode[] = [];

  const seedRand = (idx: number, salt: number): number => {
    const x = Math.sin((idx + 1) * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  if (config.preset === "aether") {
    // 1. Floating blue/cyan glowing energy wisps
    const wispCount = isSoftwareGl ? 5 : 8;
    const wispCoreGeo = track(new THREE.SphereGeometry(0.036, 10, 10));
    const wispHaloMatA = track(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color("#38bdf8"),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const wispHaloMatB = track(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color("#22d3ee"),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const wispCoreMat = track(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#e0f2fe"),
      }),
    );

    for (let i = 0; i < wispCount; i++) {
      const container = new THREE.Group();
      const core = new THREE.Mesh(wispCoreGeo, wispCoreMat);
      const halo = new THREE.Sprite(i % 2 === 0 ? wispHaloMatA : wispHaloMatB);
      halo.scale.set(0.32, 0.32, 1);
      container.add(halo);
      container.add(core);
      group.add(container);

      wisps.push({
        container,
        core,
        halo,
        orbitRadius: 0.72 + seedRand(i, 1) * 0.52,
        orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.48 + seedRand(i, 2) * 0.45),
        yAmp: 0.25 + seedRand(i, 3) * 0.35,
        yFreq: 0.9 + seedRand(i, 4) * 0.8,
        phase: (i / wispCount) * Math.PI * 2,
        tilt: (seedRand(i, 5) - 0.5) * 0.45,
      });
    }

    // 2. Soft upward drifting cyan/blue particles
    const count = isSoftwareGl ? 45 : 96;
    primaryPool = createParticlePool(count, glowTex, THREE.AdditiveBlending, pixelRatio, 0.92);
    track(primaryPool.geometry);
    track(primaryPool.material);
    group.add(primaryPool.points);

    _colorA.set("#38bdf8");
    _colorB.set("#22d3ee");
    _colorC.set("#a5f3fc");

    for (let i = 0; i < count; i++) {
      primaryPool.lifes[i] = seedRand(i, 10);
      primaryPool.speeds[i] = 0.22 + seedRand(i, 11) * 0.26;
      primaryPool.accels[i] = 0.05;
      primaryPool.radii[i] = 0.32 + seedRand(i, 12) * 0.88;
      primaryPool.angles[i] = seedRand(i, 13) * Math.PI * 2;
      primaryPool.phases[i] = seedRand(i, 14) * Math.PI * 2;
      primaryPool.baseSizes[i] = 0.14 + seedRand(i, 15) * 0.18;

      const pick = seedRand(i, 16);
      _colorScratch.copy(pick < 0.4 ? _colorA : pick < 0.8 ? _colorB : _colorC);
      primaryPool.colors[i * 3] = _colorScratch.r;
      primaryPool.colors[i * 3 + 1] = _colorScratch.g;
      primaryPool.colors[i * 3 + 2] = _colorScratch.b;
    }
  } else if (config.preset === "cursed") {
    // 1. Dense dark aura shroud clinging tightly to the model
    const shroudGeo = track(new THREE.SphereGeometry(1, 24, 20));
    darkShroudMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0.5 },
        },
        vertexShader: DARK_AURA_VERTEX_SHADER,
        fragmentShader: DARK_AURA_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      }),
    );
    darkShroudMesh = new THREE.Mesh(shroudGeo, darkShroudMat);
    darkShroudMesh.position.set(0, boundsCenterY, 0);
    darkShroudMesh.scale.set(boundsRadius * 0.92, boundsHeight * 0.56, boundsRadius * 0.92);
    darkShroudMesh.renderOrder = 3;
    group.add(darkShroudMesh);

    // 2. Dense clinging dark miasma smoke particles
    const darkCount = isSoftwareGl ? 24 : 52;
    secondaryPool = createParticlePool(darkCount, smokeTex, THREE.NormalBlending, pixelRatio, 0.85);
    track(secondaryPool.geometry);
    track(secondaryPool.material);
    group.add(secondaryPool.points);

    _colorA.set("#090408");
    _colorB.set("#1f060c");
    for (let i = 0; i < darkCount; i++) {
      secondaryPool.lifes[i] = seedRand(i, 20);
      secondaryPool.speeds[i] = 0.25 + seedRand(i, 21) * 0.25;
      secondaryPool.radii[i] = 0.25 + seedRand(i, 22) * 0.55;
      secondaryPool.angles[i] = seedRand(i, 23) * Math.PI * 2;
      secondaryPool.phases[i] = seedRand(i, 24) * Math.PI * 2;
      secondaryPool.baseSizes[i] = 0.42 + seedRand(i, 25) * 0.36;

      _colorScratch.copy(i % 2 === 0 ? _colorA : _colorB);
      secondaryPool.colors[i * 3] = _colorScratch.r;
      secondaryPool.colors[i * 3 + 1] = _colorScratch.g;
      secondaryPool.colors[i * 3 + 2] = _colorScratch.b;
    }

    // 3. Heavy, pulsing crimson-red embers
    const emberCount = isSoftwareGl ? 44 : 100;
    primaryPool = createParticlePool(emberCount, glowTex, THREE.AdditiveBlending, pixelRatio, 0.95);
    track(primaryPool.geometry);
    track(primaryPool.material);
    group.add(primaryPool.points);

    _colorA.set("#dc2626");
    _colorB.set("#991b1b");
    _colorC.set("#f87171");

    for (let i = 0; i < emberCount; i++) {
      primaryPool.lifes[i] = seedRand(i, 30);
      primaryPool.speeds[i] = 0.12 + seedRand(i, 31) * 0.18;
      primaryPool.accels[i] = 2.6 + seedRand(i, 37) * 2.2; // pulse frequency
      primaryPool.radii[i] = 0.28 + seedRand(i, 32) * 0.72;
      primaryPool.angles[i] = seedRand(i, 33) * Math.PI * 2;
      primaryPool.phases[i] = seedRand(i, 34) * Math.PI * 2;
      primaryPool.baseSizes[i] = 0.16 + seedRand(i, 35) * 0.22;

      const pick = seedRand(i, 36);
      _colorScratch.copy(pick < 0.5 ? _colorA : pick < 0.82 ? _colorB : _colorC);
      primaryPool.colors[i * 3] = _colorScratch.r;
      primaryPool.colors[i * 3 + 1] = _colorScratch.g;
      primaryPool.colors[i * 3 + 2] = _colorScratch.b;
    }
  } else if (config.preset === "fire") {
    // 1. Rising orange/yellow ember particles with fast upward acceleration
    const emberCount = isSoftwareGl ? 52 : 120;
    primaryPool = createParticlePool(emberCount, glowTex, THREE.AdditiveBlending, pixelRatio, 0.98);
    track(primaryPool.geometry);
    track(primaryPool.material);
    group.add(primaryPool.points);

    for (let i = 0; i < emberCount; i++) {
      primaryPool.lifes[i] = seedRand(i, 40);
      primaryPool.speeds[i] = 0.45 + seedRand(i, 41) * 0.45;
      primaryPool.accels[i] = 2.4 + seedRand(i, 42) * 2.4; // fast acceleration
      primaryPool.radii[i] = 0.16 + seedRand(i, 43) * 0.72;
      primaryPool.angles[i] = seedRand(i, 44) * Math.PI * 2;
      primaryPool.phases[i] = seedRand(i, 45) * Math.PI * 2;
      primaryPool.baseSizes[i] = 0.13 + seedRand(i, 46) * 0.18;
    }

    // 2. Secondary warm flame core plumes
    const flameCount = isSoftwareGl ? 18 : 34;
    secondaryPool = createParticlePool(
      flameCount,
      smokeTex,
      THREE.AdditiveBlending,
      pixelRatio,
      0.55,
    );
    track(secondaryPool.geometry);
    track(secondaryPool.material);
    group.add(secondaryPool.points);

    _colorA.set("#fb923c");
    _colorB.set("#facc15");
    for (let i = 0; i < flameCount; i++) {
      secondaryPool.lifes[i] = seedRand(i, 50);
      secondaryPool.speeds[i] = 0.55 + seedRand(i, 51) * 0.45;
      secondaryPool.radii[i] = 0.14 + seedRand(i, 52) * 0.42;
      secondaryPool.angles[i] = seedRand(i, 53) * Math.PI * 2;
      secondaryPool.phases[i] = seedRand(i, 54) * Math.PI * 2;
      secondaryPool.baseSizes[i] = 0.34 + seedRand(i, 55) * 0.28;

      _colorScratch.copy(i % 2 === 0 ? _colorA : _colorB);
      secondaryPool.colors[i * 3] = _colorScratch.r;
      secondaryPool.colors[i * 3 + 1] = _colorScratch.g;
      secondaryPool.colors[i * 3 + 2] = _colorScratch.b;
    }
  } else {
    // 1. Clean default sci-fi particle dust
    const count = isSoftwareGl ? 36 : 78;
    primaryPool = createParticlePool(count, glowTex, THREE.AdditiveBlending, pixelRatio, 0.78);
    track(primaryPool.geometry);
    track(primaryPool.material);
    group.add(primaryPool.points);

    _colorA.set("#7dd3fc");
    _colorB.set("#cbd5e1");
    _colorC.set("#e2e8f0");

    for (let i = 0; i < count; i++) {
      primaryPool.lifes[i] = seedRand(i, 60);
      primaryPool.speeds[i] = 0.08 + seedRand(i, 61) * 0.12;
      primaryPool.radii[i] = 0.42 + seedRand(i, 62) * 0.98;
      primaryPool.angles[i] = seedRand(i, 63) * Math.PI * 2;
      primaryPool.phases[i] = seedRand(i, 64) * Math.PI * 2;
      primaryPool.baseSizes[i] = 0.07 + seedRand(i, 65) * 0.09;

      const pick = seedRand(i, 66);
      _colorScratch.copy(pick < 0.45 ? _colorA : pick < 0.8 ? _colorB : _colorC);
      primaryPool.colors[i * 3] = _colorScratch.r;
      primaryPool.colors[i * 3 + 1] = _colorScratch.g;
      primaryPool.colors[i * 3 + 2] = _colorScratch.b;
    }
  }

  const setBounds = (centerY: number, radius: number, height: number) => {
    boundsCenterY = Math.max(0.35, centerY);
    boundsRadius = Math.max(0.45, Math.min(2.2, radius));
    boundsHeight = Math.max(0.9, Math.min(3.5, height));
    auraLight.position.set(0, boundsCenterY, boundsRadius * 0.45);
    if (darkShroudMesh) {
      darkShroudMesh.position.set(0, boundsCenterY, 0);
      darkShroudMesh.scale.set(boundsRadius * 0.92, boundsHeight * 0.56, boundsRadius * 0.92);
    }
  };

  const update = (dt: number, elapsed: number, intensityMultiplier = 1) => {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.08);
    const mult = Math.max(0.5, intensityMultiplier);

    if (config.preset === "aether") {
      auraLight.intensity = (1.3 + Math.sin(elapsed * 2.2) * 0.25) * mult;

      // Update floating blue/cyan energy wisps
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i]!;
        const angle = elapsed * w.orbitSpeed * mult + w.phase;
        const r = boundsRadius * w.orbitRadius * (1 + 0.08 * Math.sin(elapsed * 1.4 + w.phase));
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y =
          boundsCenterY +
          Math.sin(elapsed * w.yFreq + w.phase) * (boundsHeight * 0.34 * w.yAmp) +
          Math.sin(angle) * w.tilt;
        w.container.position.set(x, y, z);

        const haloPulse = 0.28 + 0.1 * Math.sin(elapsed * 3.1 + w.phase);
        w.halo.scale.set(haloPulse * mult, haloPulse * mult, 1);
      }

      // Soft upward drifting particles
      if (primaryPool) {
        const { count, positions, sizes, alphas, lifes, speeds, radii, angles, phases, baseSizes } =
          primaryPool;
        const yMin = Math.max(0.05, boundsCenterY - boundsHeight * 0.52);
        const ySpan = boundsHeight * 1.15;

        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]! * mult;
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          const angle = angles[i]! + elapsed * 0.28 + Math.sin(elapsed * 1.1 + phases[i]!) * 0.25;
          const r = boundsRadius * radii[i]! * (1 + 0.1 * Math.sin(life * Math.PI));
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          const y = yMin + life * ySpan;

          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;

          const fade = Math.sin(life * Math.PI);
          alphas[i] = fade * 0.85;
          sizes[i] = baseSizes[i]! * (0.75 + 0.45 * fade) * mult;
        }
        markPoolDirty(primaryPool);
      }
    } else if (config.preset === "cursed") {
      const heartbeat = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 3.4), 2);
      auraLight.intensity = (1.05 + heartbeat * 1.15) * mult;

      if (darkShroudMat) {
        darkShroudMat.uniforms["uTime"]!.value = elapsed;
        darkShroudMat.uniforms["uPulse"]!.value = heartbeat;
      }

      // Clinging dark miasma clouds
      if (secondaryPool) {
        const { count, positions, sizes, alphas, lifes, speeds, radii, angles, phases, baseSizes } =
          secondaryPool;
        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]!;
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          const angle = angles[i]! + elapsed * (i % 2 === 0 ? 0.35 : -0.28);
          const r = boundsRadius * radii[i]! * (0.72 + 0.28 * Math.sin(elapsed * 1.2 + phases[i]!));
          const yOffset = (life - 0.5) * boundsHeight * 0.92;
          positions[i * 3] = Math.cos(angle) * r;
          positions[i * 3 + 1] = boundsCenterY + yOffset;
          positions[i * 3 + 2] = Math.sin(angle) * r;

          const fade = Math.sin(life * Math.PI);
          alphas[i] = fade * 0.58;
          sizes[i] = baseSizes[i]! * (0.85 + 0.3 * fade);
        }
        markPoolDirty(secondaryPool);
      }

      // Heavy pulsing crimson-red embers
      if (primaryPool) {
        const {
          count,
          positions,
          sizes,
          alphas,
          lifes,
          speeds,
          accels,
          radii,
          angles,
          phases,
          baseSizes,
        } = primaryPool;
        const yMin = Math.max(0.04, boundsCenterY - boundsHeight * 0.48);
        const ySpan = boundsHeight * 0.96;

        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]! * mult;
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          const angle = angles[i]! + elapsed * 0.22 + Math.sin(elapsed * 0.8 + phases[i]!) * 0.15;
          const r = boundsRadius * radii[i]! * (0.85 + 0.15 * Math.cos(elapsed * 1.5 + phases[i]!));
          // Heavy embers bob slowly and settle lower before drifting
          const y = yMin + (life * 0.72 + 0.12 * Math.sin(elapsed * 1.6 + phases[i]!)) * ySpan;

          positions[i * 3] = Math.cos(angle) * r;
          positions[i * 3 + 1] = Math.max(0.04, y);
          positions[i * 3 + 2] = Math.sin(angle) * r;

          const pulse =
            0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * accels[i]! + phases[i]!), 2);
          const fade = Math.sin(life * Math.PI);
          alphas[i] = fade * pulse;
          sizes[i] = baseSizes[i]! * (0.7 + 0.75 * pulse) * mult;
        }
        markPoolDirty(primaryPool);
      }
    } else if (config.preset === "fire") {
      const flicker = 0.75 + 0.25 * Math.sin(elapsed * 14.0) * Math.cos(elapsed * 9.3 + 0.7);
      auraLight.intensity = (1.55 * flicker + 0.3) * mult;

      _colorA.set("#fef08a"); // hot yellow-white core
      _colorB.set("#fb923c"); // bright orange
      _colorC.set("#dc2626"); // deep burnt ember

      // Rising orange/yellow embers with fast upward acceleration
      if (primaryPool) {
        const {
          count,
          positions,
          sizes,
          alphas,
          colors,
          lifes,
          speeds,
          accels,
          radii,
          angles,
          phases,
          baseSizes,
        } = primaryPool;
        const yBase = Math.max(0.05, boundsCenterY - boundsHeight * 0.52);

        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]! * (1.1 + mult * 0.35);
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          // Quadratic fast acceleration: y(t) = v0*t + 0.5*a*t^2
          const accelRise =
            (speeds[i]! * 0.65 * life + 0.5 * accels[i]! * life * life) * (boundsHeight * 0.68);
          const swirlAngle = angles[i]! + life * 2.4 + Math.sin(elapsed * 4.5 + phases[i]!) * 0.35;
          const r = boundsRadius * radii[i]! * (1.0 - life * 0.32);

          positions[i * 3] = Math.cos(swirlAngle) * r;
          positions[i * 3 + 1] = yBase + accelRise;
          positions[i * 3 + 2] = Math.sin(swirlAngle) * r;

          // Color shifts from hot yellow -> orange -> ember red as it rises
          if (life < 0.35) {
            _colorScratch.copy(_colorA).lerp(_colorB, life / 0.35);
          } else {
            _colorScratch.copy(_colorB).lerp(_colorC, (life - 0.35) / 0.65);
          }
          colors[i * 3] = _colorScratch.r;
          colors[i * 3 + 1] = _colorScratch.g;
          colors[i * 3 + 2] = _colorScratch.b;

          const fade = Math.sin(Math.min(1, life * 1.1) * Math.PI);
          alphas[i] = fade * (0.72 + 0.28 * flicker);
          sizes[i] = baseSizes[i]! * (1.2 - life * 0.65) * mult;
        }
        markPoolDirty(primaryPool);
      }

      if (secondaryPool) {
        const { count, positions, sizes, alphas, lifes, speeds, radii, angles, phases, baseSizes } =
          secondaryPool;
        const yBase = Math.max(0.06, boundsCenterY - boundsHeight * 0.45);
        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]!;
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          const rise = life * life * boundsHeight * 0.85;
          const ang = angles[i]! + Math.sin(elapsed * 3.2 + phases[i]!) * 0.4;
          const r = boundsRadius * radii[i]! * (1 - life * 0.45);
          positions[i * 3] = Math.cos(ang) * r;
          positions[i * 3 + 1] = yBase + rise;
          positions[i * 3 + 2] = Math.sin(ang) * r;

          const fade = Math.sin(life * Math.PI);
          alphas[i] = fade * 0.48;
          sizes[i] = baseSizes[i]! * (1.1 - life * 0.5) * mult;
        }
        markPoolDirty(secondaryPool);
      }
    } else {
      // Clean default sci-fi particle dust
      auraLight.intensity = 0.55 * mult;
      if (primaryPool) {
        const { count, positions, sizes, alphas, lifes, speeds, radii, angles, phases, baseSizes } =
          primaryPool;
        const yMin = Math.max(0.06, boundsCenterY - boundsHeight * 0.46);
        const ySpan = boundsHeight * 0.96;

        for (let i = 0; i < count; i++) {
          let life = lifes[i]! + safeDt * speeds[i]!;
          if (life >= 1) life -= Math.floor(life);
          lifes[i] = life;

          const angle = angles[i]! + elapsed * 0.12 + Math.sin(elapsed * 0.5 + phases[i]!) * 0.12;
          const r = boundsRadius * radii[i]!;
          const y = yMin + life * ySpan + Math.sin(elapsed * 0.9 + phases[i]!) * 0.06;

          positions[i * 3] = Math.cos(angle) * r;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = Math.sin(angle) * r;

          const twinkle = 0.55 + 0.45 * Math.sin(elapsed * 2.1 + phases[i]!);
          const fade = Math.sin(life * Math.PI);
          alphas[i] = fade * twinkle * 0.78;
          sizes[i] = baseSizes[i]! * (0.85 + 0.3 * twinkle);
        }
        markPoolDirty(primaryPool);
      }
    }
  };

  // Seed initial positions so first frame renders populated particles even on static/software GL
  update(0.016, 0.25, 1);

  return {
    group,
    preset: config.preset,
    config,
    setBounds,
    update,
    dispose: () => {
      for (const res of disposables) {
        res.dispose();
      }
    },
  };
}
