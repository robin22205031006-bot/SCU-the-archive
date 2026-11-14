import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  TARGET_X,
  choreography,
  totalDuration,
  weaponFor,
  type Cam,
  type FightStyleId,
  type Gender,
  type Seg,
} from "@/lib/ability-action";
import { abilityFxRecipe } from "@/lib/ability-fx";
import { characterCombat, type CombatBackdrop, type CombatSceneId } from "@/lib/character-combat";
import { POSES, type P } from "@/components/fighter-rig";
import {
  applyCelShading,
  createToonGradientMap,
  hasBlockingModalOpen,
  observeBlockingModal,
  resolveCelThemeConfig,
} from "@/lib/three-cel-shading";
import {
  createAfterDrawScheduler,
  createSafeWebGLRenderer,
  detectWebGLContext,
  disposeObjectTree,
  normalizeThreeColor,
} from "@/lib/three-stage-utils";

export interface CelCombatStageProps {
  name: string;
  gender: Gender;
  style?: FightStyleId | undefined;
  backdrop?: CombatBackdrop | undefined;
  playing?: boolean | undefined;
  speed?: number | undefined;
  frame?: number | undefined;
  sceneId?: CombatSceneId | undefined;
  caption?: string | undefined;
  onPhase?: ((label: string, idx: number, total: number) => void) | undefined;
}

const BACKDROP_SKY: Record<CombatBackdrop, { bg: string; fog: string; floor: string }> = {
  rooftop: { bg: "#090d1a", fog: "#121a30", floor: "#1c243b" },
  water: { bg: "#07181d", fog: "#0e2d35", floor: "#13424d" },
  ocean: { bg: "#061526", fog: "#0b2942", floor: "#14496e" },
  shatter: { bg: "#141118", fog: "#241d29", floor: "#302736" },
  arena: { bg: "#0d131a", fog: "#19222d", floor: "#283340" },
  night: { bg: "#060814", fog: "#0f1429", floor: "#192038" },
  street: { bg: "#101218", fog: "#1e222b", floor: "#2c313d" },
  void: { bg: "#090412", fog: "#170929", floor: "#220f3a" },
  ember: { bg: "#160908", fog: "#29100c", floor: "#381812" },
};

const CAM_PRESETS: Record<Cam, { z: number; y: number; tilt: number; xBias: number }> = {
  wide: { z: 7.4, y: 2.35, tilt: 0, xBias: 0 },
  close: { z: 5.0, y: 1.9, tilt: 0.03, xBias: -0.3 },
  punch: { z: 4.5, y: 1.75, tilt: 0.07, xBias: 0.55 },
  track: { z: 5.8, y: 2.0, tilt: -0.04, xBias: 0 },
  low: { z: 5.2, y: 1.05, tilt: 0.08, xBias: 0.1 },
  air: { z: 6.2, y: 3.1, tilt: -0.07, xBias: 0.15 },
  orbit: { z: 6.0, y: 2.25, tilt: 0, xBias: 0 },
  overhead: { z: 5.8, y: 4.4, tilt: 0, xBias: 0 },
  rush: { z: 4.1, y: 1.65, tilt: -0.06, xBias: 0.4 },
  dutch: { z: 5.3, y: 1.85, tilt: 0.21, xBias: 0.25 },
};

// Scratch vectors for zero-GC render ticks
const _camTargetPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function camModeFor(sg: Seg): Cam {
  if (sg.cam) return sg.cam;
  const f = sg.fx ?? [];
  if (f.includes("impact") || f.includes("blast")) return "punch";
  if (f.includes("trail")) return "track";
  if (f.includes("charge")) return "close";
  if (f.includes("slash") || f.includes("fireCleave")) return "dutch";
  return "wide";
}

function easeCubic(x: number): number {
  const k = Math.max(0, Math.min(1, x));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

interface RigJoints {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armLA: THREE.Group;
  armLB: THREE.Group;
  armRA: THREE.Group;
  armRB: THREE.Group;
  legLA: THREE.Group;
  legLB: THREE.Group;
  legRA: THREE.Group;
  legRB: THREE.Group;
  weaponGroup: THREE.Group;
}

function buildSentinelRig(
  bodyColor: string,
  accentColor: string,
  gradMap: THREE.DataTexture,
  female: boolean,
  weapon: ReturnType<typeof weaponFor>,
): RigJoints {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshToonMaterial({
    color: normalizeThreeColor("#f0c8b0"),
    gradientMap: gradMap,
  });
  const suitMat = new THREE.MeshToonMaterial({
    color: normalizeThreeColor(bodyColor),
    gradientMap: gradMap,
  });
  const trimMat = new THREE.MeshToonMaterial({
    color: normalizeThreeColor(accentColor),
    emissive: normalizeThreeColor(accentColor),
    emissiveIntensity: 0.28,
    gradientMap: gradMap,
  });

  const hips = new THREE.Group();
  hips.position.y = 0.96;
  root.add(hips);

  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(female ? 0.16 : 0.19, 0.18, 0.22, 10),
    suitMat,
  );
  hips.add(pelvis);

  const torso = new THREE.Group();
  torso.position.y = 0.12;
  hips.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(female ? 0.34 : 0.42, 0.48, 0.24), suitMat);
  chest.position.y = 0.26;
  chest.castShadow = true;
  torso.add(chest);

  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), trimMat);
  chestCore.position.set(0, 0.32, 0.13);
  torso.add(chestCore);

  const head = new THREE.Group();
  head.position.y = 0.56;
  torso.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), skinMat);
  skull.position.y = 0.14;
  skull.castShadow = true;
  head.add(skull);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.14), trimMat);
  visor.position.set(0, 0.15, 0.1);
  head.add(visor);

  const makeLimb = (
    lenU: number,
    lenL: number,
    rad: number,
    upperMat: THREE.Material,
    lowerMat: THREE.Material,
  ) => {
    const upper = new THREE.Group();
    const uMesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.85, lenU, 8), upperMat);
    uMesh.position.y = -lenU * 0.5;
    uMesh.castShadow = true;
    upper.add(uMesh);

    const lower = new THREE.Group();
    lower.position.y = -lenU;
    const lMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rad * 0.85, rad * 0.72, lenL, 8),
      lowerMat,
    );
    lMesh.position.y = -lenL * 0.5;
    lMesh.castShadow = true;
    lower.add(lMesh);
    upper.add(lower);
    return { upper, lower };
  };

  const shoulderX = female ? 0.22 : 0.26;
  const armL = makeLimb(0.32, 0.3, 0.065, suitMat, skinMat);
  armL.upper.position.set(-shoulderX, 0.45, 0);
  torso.add(armL.upper);

  const armR = makeLimb(0.32, 0.3, 0.065, suitMat, trimMat);
  armR.upper.position.set(shoulderX, 0.45, 0);
  torso.add(armR.upper);

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.3, 0.05);
  armR.lower.add(weaponGroup);

  if (weapon !== "none") {
    const isLong = weapon === "spear" || weapon === "scythe" || weapon === "greatsword";
    const bladeLen = weapon === "daggers" ? 0.38 : isLong ? 1.15 : 0.82;
    const bladeGeo = new THREE.BoxGeometry(0.045, bladeLen, 0.1);
    const bladeMat = new THREE.MeshToonMaterial({
      color: normalizeThreeColor(accentColor),
      emissive: normalizeThreeColor(accentColor),
      emissiveIntensity: 0.45,
      gradientMap: gradMap,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0, bladeLen * 0.45);
    blade.rotation.x = Math.PI * 0.48;
    weaponGroup.add(blade);
  }

  const hipX = female ? 0.1 : 0.12;
  const legL = makeLimb(0.42, 0.44, 0.08, suitMat, trimMat);
  legL.upper.position.set(-hipX, -0.06, 0);
  hips.add(legL.upper);

  const legR = makeLimb(0.42, 0.44, 0.08, suitMat, trimMat);
  legR.upper.position.set(hipX, -0.06, 0);
  hips.add(legR.upper);

  return {
    root,
    hips,
    torso,
    head,
    armLA: armL.upper,
    armLB: armL.lower,
    armRA: armR.upper,
    armRB: armR.lower,
    legLA: legL.upper,
    legLB: legL.lower,
    legRA: legR.upper,
    legRB: legR.lower,
    weaponGroup,
  };
}

function applyPoseToRig(rig: RigJoints, pose: P, facing: 1 | -1): void {
  // P array indices: [torsoLean, kneeL, shinL, kneeR, shinR, armL, forearmL, armR, forearmR, head]
  const lean = pose[0] ?? 0;
  rig.hips.rotation.x = lean * 0.25;
  rig.torso.rotation.x = lean * 0.55;
  rig.head.rotation.x = (pose[9] ?? 0) * 0.45;
  rig.legLA.rotation.x = (pose[1] ?? 0) * 0.8;
  rig.legLB.rotation.x = (pose[2] ?? 0) * 0.8;
  rig.legRA.rotation.x = (pose[3] ?? 0) * 0.8;
  rig.legRB.rotation.x = (pose[4] ?? 0) * 0.8;
  rig.armLA.rotation.x = (pose[5] ?? 0) * 0.85;
  rig.armLB.rotation.x = (pose[6] ?? 0) * 0.75;
  rig.armRA.rotation.x = (pose[7] ?? 0) * 0.85;
  rig.armRB.rotation.x = (pose[8] ?? 0) * 0.75;
  rig.root.rotation.y = facing === 1 ? Math.PI * 0.5 : -Math.PI * 0.5;
}

/**
 * Stylized Three.js 60 FPS cel-shaded 3D combat stage.
 * Synchronizes directly with SCU choreography beats, adds anime slash ribbons,
 * camera swoops/Dutch tilts, 40ms Hit-Stop freeze, camera shake, and a 2-frame Impact Frame flash.
 */
export function CelCombatStage({
  name,
  gender,
  style = "auto",
  backdrop = "rooftop",
  playing = true,
  speed = 1,
  frame,
  sceneId,
  caption,
  onPhase,
}: CelCombatStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglReady, setWebglReady] = useState(true);
  const [impactFlash, setImpactFlash] = useState(false);

  const sceneSpec = useMemo(() => characterCombat(sceneId), [sceneId]);
  const segs = useMemo<Seg[]>(
    () => sceneSpec?.beats ?? choreography(name, gender, style),
    [sceneSpec, name, gender, style],
  );
  const recipe = useMemo(() => abilityFxRecipe(name), [name]);
  const activeBackdrop = sceneSpec?.backdrop ?? backdrop;
  const activeWeapon = sceneSpec?.weapon ?? weaponFor(name, gender);

  const stateRef = useRef({
    segs,
    recipe,
    gender,
    playing,
    speed,
    frame,
    backdrop: activeBackdrop,
    weapon: activeWeapon,
    onPhase,
  });
  stateRef.current = {
    segs,
    recipe,
    gender,
    playing,
    speed,
    frame,
    backdrop: activeBackdrop,
    weapon: activeWeapon,
    onPhase,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { supported, isSoftwareGl } = detectWebGLContext();
    if (!supported) {
      setWebglReady(false);
      return;
    }

    const renderer = createSafeWebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    if (!renderer) {
      setWebglReady(false);
      return;
    }
    setWebglReady(true);

    const w = Math.max(container.clientWidth, 320);
    const h = Math.max(container.clientHeight, 200);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bdPalette = BACKDROP_SKY[activeBackdrop] ?? BACKDROP_SKY.rooftop;
    scene.background = normalizeThreeColor(bdPalette.bg);
    scene.fog = new THREE.FogExp2(normalizeThreeColor(bdPalette.fog).getHex(), 0.045);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 60);
    camera.position.set(0, 2.3, 7.2);

    const celCfg = resolveCelThemeConfig();
    const gradMap = createToonGradientMap(
      3,
      celCfg.enabled ? celCfg.stops : ["#3a4440", "#9aa8a1", "#ffffff"],
    );

    // Key + Cool Hemi + Rim light rig for bold anime cel shading contrast
    const hemi = new THREE.HemisphereLight(0xcbe7ff, 0x10141f, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff6e5, 2.5);
    keyLight.position.set(4.5, 7.5, 5.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimColor = normalizeThreeColor(recipe.palette[0], "#5ce1b8");
    const rimLight = new THREE.DirectionalLight(rimColor, 1.85);
    rimLight.position.set(-4.5, 3.8, -4.0);
    scene.add(rimLight);

    // Arena floor & glowing tactical ring
    const floorGeo = new THREE.CircleGeometry(18, 48);
    const floorMat = new THREE.MeshToonMaterial({
      color: normalizeThreeColor(bdPalette.floor),
      gradientMap: gradMap,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.RingGeometry(2.6, 2.74, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: rimColor,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    scene.add(ring);

    // Hero & Opponent articulated rigs
    const fighterRig = buildSentinelRig(
      "#1c2738",
      recipe.palette[0],
      gradMap,
      gender === "female",
      activeWeapon,
    );
    const targetRig = buildSentinelRig("#2b1e24", "#94a3b8", gradMap, false, "none");
    scene.add(fighterRig.root);
    scene.add(targetRig.root);

    applyCelShading(fighterRig.root, {
      ...celCfg,
      enabled: true,
      outlineOnly: false,
      outlineWidth: Math.max(celCfg.outlineWidth, 0.015),
    });
    applyCelShading(targetRig.root, {
      ...celCfg,
      enabled: true,
      outlineOnly: false,
      outlineWidth: Math.max(celCfg.outlineWidth, 0.015),
    });

    // Stylized flat-shaded / additive PlaneGeometry anime slash ribbon
    const slashGeo = new THREE.PlaneGeometry(2.6, 1.4, 24, 1);
    const posAttr = slashGeo.attributes["position"]!;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const norm = x / 1.3;
      posAttr.setZ(i, Math.cos(norm * Math.PI * 0.5) * 0.9);
      posAttr.setY(i, y * (1 - norm * norm * 0.45));
    }
    slashGeo.computeVertexNormals();

    const slashMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uColorA: { value: normalizeThreeColor(recipe.palette[0], "#5ce1b8") },
        uColorB: { value: normalizeThreeColor(recipe.palette[2] ?? "#ffffff", "#ffffff") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uProgress;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        void main() {
          float crescent = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.45, vUv.x);
          float band = 1.0 - abs(vUv.y - 0.5) * 2.0;
          band = pow(max(band, 0.0), 1.8);
          float sweep = smoothstep(0.0, 0.25, uProgress) * smoothstep(1.0, 0.65, uProgress);
          float alpha = crescent * band * sweep * 0.92;
          vec3 col = mix(uColorA, uColorB, band * 0.85);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const slashMesh = new THREE.Mesh(slashGeo, slashMat);
    slashMesh.visible = false;
    scene.add(slashMesh);

    // Impact Spark Burst Points
    const sparkCount = isSoftwareGl ? 18 : 42;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      const ang = (i / sparkCount) * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.8;
      sparkVel[i * 3] = Math.cos(ang) * spd;
      sparkVel[i * 3 + 1] = 0.8 + Math.random() * 3.2;
      sparkVel[i * 3 + 2] = Math.sin(ang) * spd;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: normalizeThreeColor(recipe.palette[2] ?? recipe.palette[0], "#ffffff"),
      size: 0.14,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    let disposed = false;
    let contextLost = false;
    let modalBlocked = hasBlockingModalOpen();
    let frameId = 0;
    let timeoutId = 0;
    let lastTime = performance.now();
    let animTime = 0;
    let hitStopLeft = 0;
    let shakeTime = 0;
    let flashFramesLeft = 0;
    let lastBeatIdx = -1;
    let lastPhaseLabel = "";
    let stepAccum = 0;
    let orbitYaw = 0;

    const afterDraw = createAfterDrawScheduler(
      renderer,
      () => disposed || contextLost || modalBlocked,
      (id) => {
        timeoutId = id;
      },
    );

    const evaluateStateAt = (timeSec: number) => {
      const curSegs = stateRef.current.segs;
      const tot = Math.max(totalDuration(curSegs), 0.1);
      let tt = ((timeSec % tot) + tot) % tot;
      let prev = curSegs[curSegs.length - 1] ?? curSegs[0]!;
      for (let i = 0; i < curSegs.length; i++) {
        const sg = curSegs[i]!;
        const span = sg.d + (sg.hold ?? 0);
        if (tt <= span || i === curSegs.length - 1) {
          const raw = Math.min(1, tt / Math.max(sg.d, 0.001));
          const k = easeCubic(raw);
          const a = POSES[prev.pose];
          const b = POSES[sg.pose];
          const pose = a.map((v, j) => lerp(v, b[j] ?? v, k));
          const x = lerp(prev.x, sg.x, k);
          const y = lerp(prev.y ?? 0, sg.y ?? 0, Math.sin(raw * Math.PI) * 0.5 + k * 0.5);
          const roll = lerp(prev.roll ?? 0, sg.roll ?? 0, k);
          const ly = lerp(prev.launch ?? 0, sg.launch ?? 0, k);
          return { pose, x, y, roll, ly, sg, k: raw, idx: i };
        }
        tt -= span;
        prev = sg;
      }
      return {
        pose: POSES.stand,
        x: -0.32,
        y: 0,
        roll: 0,
        ly: 0,
        sg: curSegs[0]!,
        k: 0,
        idx: 0,
      };
    };

    const tick = () => {
      if (disposed || contextLost || modalBlocked) {
        frameId = 0;
        return;
      }
      frameId = 0;
      const now = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const {
        segs: curSegs,
        playing: isPlaying,
        speed: playSpeed,
        frame: scrubbedFrame,
        onPhase: phaseCb,
      } = stateRef.current;

      // 40ms Hit-Stop temporal freeze for heavy impact weight
      if (hitStopLeft > 0) {
        hitStopLeft = Math.max(0, hitStopLeft - rawDt);
      } else if (scrubbedFrame !== undefined) {
        animTime = scrubbedFrame / 24;
      } else if (isPlaying) {
        const liveTheme = resolveCelThemeConfig();
        const dtScaled = rawDt * playSpeed;
        if (liveTheme.steppedFps > 0 && !isSoftwareGl) {
          // Stepped character pose feel ("on 2s" at 12fps in Manga mode)
          const step = 1 / liveTheme.steppedFps;
          stepAccum += dtScaled;
          if (stepAccum >= step) {
            const ticks = Math.floor(stepAccum / step);
            animTime += ticks * step;
            stepAccum -= ticks * step;
          }
        } else {
          animTime += dtScaled;
        }
      }

      const st = evaluateStateAt(animTime);
      const fxList = st.sg.fx ?? [];

      // Trigger Hit-Stop (40ms), Screen Shake, & 2-Frame Impact Inversion Flash on impact beat onset
      if (st.idx !== lastBeatIdx) {
        lastBeatIdx = st.idx;
        if (fxList.includes("impact") || fxList.includes("blast")) {
          hitStopLeft = 0.04;
          shakeTime = 0.24;
          flashFramesLeft = 2;
          setImpactFlash(true);
        }
      }

      if (flashFramesLeft > 0) {
        flashFramesLeft -= 1;
        if (flashFramesLeft === 0) setImpactFlash(false);
      }

      if (phaseCb && st.sg.label !== lastPhaseLabel) {
        lastPhaseLabel = st.sg.label;
        phaseCb(st.sg.label, st.idx, curSegs.length);
      }

      // Position fighters in world meters (stage span [-3.6 .. +3.6])
      const fxWorld = st.x * 7.2;
      const fyWorld = st.y * 2.8;
      fighterRig.root.position.set(fxWorld, fyWorld, 0);
      fighterRig.root.rotation.z = st.roll;
      applyPoseToRig(fighterRig, st.pose, st.x > TARGET_X ? -1 : 1);

      const oppBaseX = TARGET_X * 7.2;
      const oppY = st.ly * 2.8;
      const recoil =
        fxList.includes("impact") || fxList.includes("blast") ? Math.sin(st.k * Math.PI) * 0.22 : 0;
      targetRig.root.position.set(oppBaseX + recoil, oppY, 0);
      applyPoseToRig(targetRig, POSES.guard, -1);

      // Update slash ribbon plane during slash/fireCleave beats
      const showSlash =
        fxList.includes("slash") || fxList.includes("shadowSlash") || fxList.includes("fireCleave");
      slashMesh.visible = showSlash;
      if (showSlash) {
        slashMesh.position.set((fxWorld + oppBaseX) * 0.5, fyWorld + 1.25, 0.25);
        slashMesh.rotation.set(0.35, -0.4, (st.idx % 2 === 0 ? 1 : -1) * 0.45);
        slashMat.uniforms["uProgress"]!.value = st.k;
      }

      // Update radial sparks on impact / shockwave / lightning beats
      const showSparks =
        fxList.includes("impact") ||
        fxList.includes("shockwave") ||
        fxList.includes("lightning") ||
        fxList.includes("blast");
      if (showSparks) {
        sparkMat.opacity = Math.max(0, 1 - st.k * 0.9);
        const burstT = st.k * 0.45;
        const posArr = sparkGeo.attributes["position"]!.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          posArr[i * 3] = oppBaseX + sparkVel[i * 3]! * burstT;
          posArr[i * 3 + 1] = 1.15 + oppY + sparkVel[i * 3 + 1]! * burstT - 2.4 * burstT * burstT;
          posArr[i * 3 + 2] = sparkVel[i * 3 + 2]! * burstT;
        }
        sparkGeo.attributes["position"]!.needsUpdate = true;
      } else {
        sparkMat.opacity = 0;
      }

      // Smooth 60 FPS Camera Director with Dutch Tilt + Procedural Impact Shake
      const camMode = camModeFor(st.sg);
      const preset = CAM_PRESETS[camMode];
      if (camMode === "orbit") orbitYaw += rawDt * 1.1;
      else orbitYaw = THREE.MathUtils.damp(orbitYaw, 0, 5, rawDt);

      const midX = (fxWorld + oppBaseX) * 0.45 + preset.xBias;
      const targetCamX = midX + Math.sin(orbitYaw) * preset.z * 0.55;
      const targetCamZ = Math.cos(orbitYaw) * preset.z;
      const targetCamY = preset.y + Math.max(fyWorld, oppY) * 0.55;

      _camTargetPos.set(targetCamX, targetCamY, targetCamZ);
      _lookTarget.set(midX * 0.75, 1.15 + Math.max(fyWorld, oppY) * 0.45, 0);

      camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * rawDt));

      if (shakeTime > 0) {
        shakeTime = Math.max(0, shakeTime - rawDt);
        const mag = shakeTime * 0.55;
        camera.position.x += (Math.random() - 0.5) * mag;
        camera.position.y += (Math.random() - 0.5) * mag;
      }

      camera.lookAt(_lookTarget);
      camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, preset.tilt, 7, rawDt);

      renderer.render(scene, camera);

      const keepRunning =
        !modalBlocked &&
        !document.hidden &&
        (isPlaying || hitStopLeft > 0 || shakeTime > 0 || flashFramesLeft > 0);
      if (keepRunning) {
        if (isSoftwareGl) {
          afterDraw(() => scheduleRender());
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }
    };

    const scheduleRender = () => {
      if (disposed || contextLost || modalBlocked || document.hidden || frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        tick();
      });
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

    const onVisibility = () => {
      if (!document.hidden && !modalBlocked && !disposed && !contextLost) {
        lastTime = performance.now();
        scheduleRender();
      }
    };

    const onThemeChange = () => {
      const nextCfg = resolveCelThemeConfig();
      applyCelShading(fighterRig.root, {
        ...nextCfg,
        enabled: true,
        outlineOnly: false,
        outlineWidth: Math.max(nextCfg.outlineWidth, 0.015),
      });
      applyCelShading(targetRig.root, {
        ...nextCfg,
        enabled: true,
        outlineOnly: false,
        outlineWidth: Math.max(nextCfg.outlineWidth, 0.015),
      });
      scheduleRender();
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      frameId = 0;
      window.clearTimeout(timeoutId);
    };

    const onContextRestored = () => {
      contextLost = false;
      lastTime = performance.now();
      scheduleRender();
    };

    const ro = new ResizeObserver(() => {
      if (disposed || contextLost) return;
      const rw = Math.max(container.clientWidth, 320);
      const rh = Math.max(container.clientHeight, 200);
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
      scheduleRender();
    });
    ro.observe(container);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scu:ui-mode-change", onThemeChange);
    window.addEventListener("scu:genre-theme-change", onThemeChange);
    window.addEventListener("scu:manga-subtheme-change", onThemeChange);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      stopModalObserver();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scu:ui-mode-change", onThemeChange);
      window.removeEventListener("scu:genre-theme-change", onThemeChange);
      window.removeEventListener("scu:manga-subtheme-change", onThemeChange);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);

      disposeObjectTree(fighterRig.root);
      disposeObjectTree(targetRig.root);
      floorGeo.dispose();
      floorMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      slashGeo.dispose();
      slashMat.dispose();
      sparkGeo.dispose();
      sparkMat.dispose();
      gradMap.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [name, gender, style, activeBackdrop, activeWeapon, recipe]);

  return (
    <div
      data-testid="cel-combat-stage"
      className="relative h-full w-full overflow-hidden bg-[#070a14] select-none"
    >
      <div
        ref={mountRef}
        aria-label={caption ? `3D Cel Combat Arena — ${caption}` : "3D Cel Combat Arena"}
        className="h-full w-full"
      />
      {impactFlash && (
        <div
          aria-hidden="true"
          className="cel-impact-flash pointer-events-none absolute inset-0 z-20"
        />
      )}
      {caption && (
        <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-white/15 bg-black/70 px-3 py-1 text-xs font-medium text-white">
          {caption}
        </span>
      )}
      {!webglReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#070a14] p-4 text-center text-xs text-zinc-300">
          WebGL2 unavailable in this environment — switch to 2D Canvas above.
        </div>
      )}
    </div>
  );
}
