import * as THREE from "three";
import type { Tables } from "@/integrations/supabase/types";

type Artifact = Tables<"artifacts">;

export type AlloyFinishId = "obsidian" | "aether_gold" | "crimson_forged" | "cryo_platinum";

export interface AlloyFinishConfig {
  id: AlloyFinishId;
  label: string;
  primaryHex: string;
  secondaryHex: string;
  gripHex: string;
  metalness: number;
  roughness: number;
}

export const ALLOY_FINISHES: Record<AlloyFinishId, AlloyFinishConfig> = {
  obsidian: {
    id: "obsidian",
    label: "Obsidian Steel",
    primaryHex: "#8fa2bd",
    secondaryHex: "#1c2230",
    gripHex: "#13161d",
    metalness: 0.9,
    roughness: 0.2,
  },
  aether_gold: {
    id: "aether_gold",
    label: "Aether Gold",
    primaryHex: "#eab308",
    secondaryHex: "#2e2412",
    gripHex: "#1f1912",
    metalness: 0.94,
    roughness: 0.16,
  },
  crimson_forged: {
    id: "crimson_forged",
    label: "Crimson Forged",
    primaryHex: "#dc2626",
    secondaryHex: "#221216",
    gripHex: "#170e10",
    metalness: 0.88,
    roughness: 0.22,
  },
  cryo_platinum: {
    id: "cryo_platinum",
    label: "Cryo Platinum",
    primaryHex: "#cbe6ff",
    secondaryHex: "#1d3247",
    gripHex: "#131f2b",
    metalness: 0.95,
    roughness: 0.14,
  },
};

export type ArtifactArchetype = "blade" | "cube" | "stone" | "tech";

export function resolveArtifactArchetype(artifact: Artifact): ArtifactArchetype {
  const text = `${artifact.name} ${artifact.weapon_type ?? ""} ${artifact.category}`.toLowerCase();
  if (/cube|tesseract|box|architect|poly/.test(text)) return "cube";
  if (
    /stone|core|clover|orb|crystal|aether|heart|relic/.test(text) &&
    !/sword|katana|blade|dagger/.test(text)
  ) {
    return "stone";
  }
  if (/nano|suit|drone|probe|tech|serum|cyber|visor|gauntlet/.test(text)) return "tech";
  return "blade";
}

export interface ProceduralTextures {
  metalAlbedo: THREE.CanvasTexture;
  metalRoughness: THREE.CanvasTexture;
  runeDial: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Brushed Damascus metal albedo + roughness
  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = 512;
  albedoCanvas.height = 512;
  const actx = albedoCanvas.getContext("2d")!;
  actx.fillStyle = "#d9e1ec";
  actx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const wave = Math.sin(y * 0.14) * 14 + Math.cos(y * 0.05) * 10;
    const v = Math.round(205 + wave);
    actx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
    actx.fillRect(0, y, 512, 1.5);
  }
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    actx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(30,40,60,0.08)";
    actx.fillRect(x, y, 80, 1);
  }
  const metalAlbedo = new THREE.CanvasTexture(albedoCanvas);
  metalAlbedo.colorSpace = THREE.SRGBColorSpace;
  metalAlbedo.wrapS = THREE.RepeatWrapping;
  metalAlbedo.wrapT = THREE.RepeatWrapping;
  metalAlbedo.repeat.set(2, 2);
  metalAlbedo.anisotropy = maxAnisotropy;

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rctx = roughCanvas.getContext("2d")!;
  rctx.fillStyle = "#505050";
  rctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const shade = 72 + Math.round(Math.sin(y * 0.21) * 28);
    rctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    rctx.fillRect(0, y, 512, 1.5);
  }
  const metalRoughness = new THREE.CanvasTexture(roughCanvas);
  metalRoughness.colorSpace = THREE.NoColorSpace;
  metalRoughness.wrapS = THREE.RepeatWrapping;
  metalRoughness.wrapT = THREE.RepeatWrapping;
  metalRoughness.repeat.set(2, 2);
  metalRoughness.anisotropy = maxAnisotropy;

  // 2. Pedestal arcane/telemetry dial texture
  const runeCanvas = document.createElement("canvas");
  runeCanvas.width = 1024;
  runeCanvas.height = 1024;
  const dctx = runeCanvas.getContext("2d")!;
  dctx.fillStyle = "#0b0f19";
  dctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;
  const ringRadii = [470, 420, 340, 220];
  ringRadii.forEach((r, idx) => {
    dctx.strokeStyle = idx % 2 === 0 ? "rgba(125,211,252,0.55)" : "rgba(148,163,184,0.3)";
    dctx.lineWidth = idx === 0 ? 4 : 2;
    dctx.beginPath();
    dctx.arc(cx, cy, r, 0, Math.PI * 2);
    dctx.stroke();
  });

  // Radial calibration ticks
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const inner = i % 6 === 0 ? 392 : 408;
    const outer = 420;
    dctx.strokeStyle = i % 6 === 0 ? "rgba(224,242,254,0.85)" : "rgba(125,211,252,0.35)";
    dctx.lineWidth = i % 6 === 0 ? 3 : 1.5;
    dctx.beginPath();
    dctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    dctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    dctx.stroke();
  }

  // Hexagonal geometric lattice
  dctx.strokeStyle = "rgba(56,189,248,0.28)";
  dctx.lineWidth = 2;
  dctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * 336;
    const py = cy + Math.sin(a) * 336;
    if (i === 0) dctx.moveTo(px, py);
    else dctx.lineTo(px, py);
  }
  dctx.stroke();

  const runeDial = new THREE.CanvasTexture(runeCanvas);
  runeDial.colorSpace = THREE.SRGBColorSpace;
  runeDial.anisotropy = maxAnisotropy;

  // 3. Soft radial contact shadow
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext("2d")!;
  const grad = sctx.createRadialGradient(128, 128, 12, 128, 128, 122);
  grad.addColorStop(0, "rgba(0,0,0,0.85)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.38)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.NoColorSpace;

  return {
    metalAlbedo,
    metalRoughness,
    runeDial,
    contactShadow,
    dispose: () => {
      metalAlbedo.dispose();
      metalRoughness.dispose();
      runeDial.dispose();
      contactShadow.dispose();
    },
  };
}

function tagPart(obj: THREE.Object3D, label: string, explodeVec: THREE.Vector3, castShadow = true) {
  obj.userData["label"] = label;
  obj.userData["basePos"] = obj.position.clone();
  obj.userData["explodeVec"] = explodeVec;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = castShadow;
      child.receiveShadow = true;
    }
  });
  return obj;
}

export interface BuiltArtifactScene {
  root: THREE.Group;
  orbitRings: THREE.Object3D[];
  coreGlowMesh: THREE.Object3D | null;
  dispose: () => void;
}

export function buildArtifactAssembly(
  artifact: Artifact,
  finish: AlloyFinishConfig,
  auraHue: number,
  textures: ProceduralTextures,
  isSoftwareGl: boolean,
): BuiltArtifactScene {
  const root = new THREE.Group();
  const orbitRings: THREE.Object3D[] = [];
  let coreGlowMesh: THREE.Object3D | null = null;
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  const auraColor = new THREE.Color().setHSL((auraHue % 360) / 360, 0.88, 0.56);
  const primaryMat = track(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(finish.primaryHex),
      map: textures.metalAlbedo,
      roughnessMap: textures.metalRoughness,
      metalness: finish.metalness,
      roughness: finish.roughness,
      anisotropy: 0.78,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    }),
  );

  const darkTrimMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(finish.secondaryHex),
      metalness: 0.72,
      roughness: 0.48,
    }),
  );

  const gripMat = track(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(finish.gripHex),
      metalness: 0.08,
      roughness: 0.82,
    }),
  );

  const energyMat = track(
    new THREE.MeshStandardMaterial({
      color: auraColor,
      emissive: auraColor,
      emissiveIntensity: 1.45,
      metalness: 0.25,
      roughness: 0.25,
    }),
  );

  const crystalMat = track(
    new THREE.MeshPhysicalMaterial({
      color: auraColor.clone().lerp(new THREE.Color("#ffffff"), 0.35),
      metalness: 0.04,
      roughness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.48 : 1,
      ior: 1.72,
      thickness: 1.2,
      attenuationColor: auraColor,
      attenuationDistance: 1.6,
      clearcoat: 1,
      depthWrite: isSoftwareGl ? false : true,
    }),
  );

  // Pedestal base (grounded at y = 0)
  const plinthMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x101420,
      metalness: 0.45,
      roughness: 0.65,
    }),
  );
  const plinthGeo = track(new THREE.CylinderGeometry(1.75, 2.05, 0.22, 48));
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -0.11;
  plinth.receiveShadow = true;
  root.add(plinth);

  const dialMat = track(
    new THREE.MeshStandardMaterial({
      map: textures.runeDial,
      metalness: 0.35,
      roughness: 0.42,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const dialGeo = track(new THREE.CylinderGeometry(1.62, 1.64, 0.04, 48));
  const dialMesh = new THREE.Mesh(dialGeo, dialMat);
  dialMesh.position.y = 0.02;
  dialMesh.receiveShadow = true;
  root.add(dialMesh);

  // Soft contact shadow directly above plinth
  const contactGeo = track(new THREE.PlaneGeometry(3.1, 3.1));
  const contactMat = track(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  const contactPlane = new THREE.Mesh(contactGeo, contactMat);
  contactPlane.rotation.x = -Math.PI / 2;
  contactPlane.position.y = 0.045;
  contactPlane.renderOrder = 1;
  root.add(contactPlane);

  const archetype = resolveArtifactArchetype(artifact);
  const subject = new THREE.Group();
  subject.position.y = 0.05; // bottom-center contact just above dial surface
  root.add(subject);

  if (archetype === "blade") {
    // Grounded display cradle base
    const cradleGeo = track(new THREE.CylinderGeometry(0.45, 0.58, 0.14, 24));
    const cradle = new THREE.Mesh(cradleGeo, darkTrimMat);
    cradle.position.y = 0.07;
    subject.add(tagPart(cradle, "Sanctuary Stand", new THREE.Vector3(0, -0.35, 0)));

    // 1. Pommel (Kashira)
    const pommelPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.125, 0.08),
      new THREE.Vector2(0.09, 0.16),
      new THREE.Vector2(0, 0.16),
    ];
    const pommelGeo = track(new THREE.LatheGeometry(pommelPoints, 24));
    pommelGeo.computeTangents();
    const pommel = new THREE.Mesh(pommelGeo, primaryMat);
    pommel.position.y = 0.16;
    subject.add(tagPart(pommel, "Kashira Pommel", new THREE.Vector3(0, -0.6, 0)));

    // 2. Wrapped Grip (Tsuka)
    const gripGeo = track(new THREE.CylinderGeometry(0.085, 0.095, 0.65, 20));
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.64;
    subject.add(tagPart(grip, "Cord-Wrapped Grip", new THREE.Vector3(0, -0.25, 0.45)));

    // 3. Grip wrap accent rings
    const wrapRingGeo = track(new THREE.TorusGeometry(0.095, 0.015, 10, 24));
    const wrapGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(wrapRingGeo, energyMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.42 + i * 0.14;
      wrapGroup.add(ring);
    }
    subject.add(tagPart(wrapGroup, "Conductive Coils", new THREE.Vector3(-0.45, -0.1, 0)));

    // 4. Beveled Guard (Tsuba)
    const tsubaShape = new THREE.Shape();
    const lobes = 8;
    for (let i = 0; i <= lobes * 8; i++) {
      const a = (i / (lobes * 8)) * Math.PI * 2;
      const r = 0.34 + Math.cos(a * lobes) * 0.05;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) tsubaShape.moveTo(px, py);
      else tsubaShape.lineTo(px, py);
    }
    const tsubaGeo = track(
      new THREE.ExtrudeGeometry(tsubaShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.02,
        bevelSegments: 3,
      }),
    );
    tsubaGeo.center();
    tsubaGeo.rotateX(Math.PI / 2);
    tsubaGeo.computeTangents();
    const tsuba = new THREE.Mesh(tsubaGeo, darkTrimMat);
    tsuba.position.y = 1.02;
    subject.add(tagPart(tsuba, "Engraved Tsuba Guard", new THREE.Vector3(0, 0.05, 0.55)));

    // 5. Collar (Habaki)
    const habakiGeo = track(new THREE.BoxGeometry(0.16, 0.14, 0.09));
    const habaki = new THREE.Mesh(habakiGeo, primaryMat);
    habaki.position.y = 1.13;
    subject.add(tagPart(habaki, "Forged Habaki Collar", new THREE.Vector3(0.45, 0.15, 0)));

    // 6. Curved Beveled Blade
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-0.06, 0);
    bladeShape.lineTo(0.065, 0);
    bladeShape.quadraticCurveTo(0.11, 1.05, 0.02, 2.08);
    bladeShape.lineTo(-0.08, 2.25);
    bladeShape.quadraticCurveTo(-0.01, 1.1, -0.06, 0);
    const bladeGeo = track(
      new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.022,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.014,
        bevelSegments: 3,
      }),
    );
    bladeGeo.translate(0, 0, -0.011);
    bladeGeo.computeTangents();
    const blade = new THREE.Mesh(bladeGeo, primaryMat);
    blade.position.y = 1.2;
    subject.add(tagPart(blade, "Damascus Edge Blade", new THREE.Vector3(0, 0.65, 0)));

    // 7. Glowing Spine Fuller Channel
    const fullerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.015, 1.25, 0),
      new THREE.Vector3(0.015, 2.0, 0),
      new THREE.Vector3(-0.02, 2.85, 0),
    ]);
    const fullerGeo = track(new THREE.TubeGeometry(fullerCurve, 28, 0.016, 8, false));
    const fuller = new THREE.Mesh(fullerGeo, energyMat);
    coreGlowMesh = fuller;
    subject.add(tagPart(fuller, "Aether Spine Channel", new THREE.Vector3(-0.4, 0.7, 0.25)));

    // 8. Orbital Energy Ring around hilt
    const haloGeo = track(new THREE.TorusGeometry(0.92, 0.018, 12, 64));
    const halo = new THREE.Mesh(haloGeo, energyMat);
    halo.position.y = 1.75;
    halo.rotation.set(Math.PI / 2.6, 0.25, 0);
    orbitRings.push(halo);
    subject.add(tagPart(halo, "Elemental Resonance Ring", new THREE.Vector3(0, 0.2, -0.6), false));
  } else if (archetype === "cube") {
    // 1. Floating base cradle
    const cradleGeo = track(new THREE.CylinderGeometry(0.55, 0.72, 0.16, 8));
    const cradle = new THREE.Mesh(cradleGeo, darkTrimMat);
    cradle.position.y = 0.08;
    subject.add(tagPart(cradle, "Containment Base", new THREE.Vector3(0, -0.35, 0)));

    const centerY = 1.35;
    // 2. Transmissive Crystal Core
    const innerGeo = track(new THREE.OctahedronGeometry(0.54, 1));
    const innerCore = new THREE.Mesh(innerGeo, crystalMat);
    innerCore.position.y = centerY;
    innerCore.renderOrder = 2;
    coreGlowMesh = innerCore;
    subject.add(tagPart(innerCore, "Architect Prism Core", new THREE.Vector3(0, 0.4, 0)));

    // 3. Inner Luminous Heart
    const heartGeo = track(new THREE.IcosahedronGeometry(0.24, 0));
    const heart = new THREE.Mesh(heartGeo, energyMat);
    heart.position.y = centerY;
    subject.add(tagPart(heart, "Singularity Seed", new THREE.Vector3(0, 0.8, 0)));

    // 4-7. Segmented Cubic Armor Plates (4 corner brackets)
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-0.52, -0.52);
    plateShape.lineTo(0.52, -0.52);
    plateShape.lineTo(0.52, 0.52);
    plateShape.lineTo(-0.52, 0.52);
    plateShape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.26, -0.26);
    hole.lineTo(0.26, -0.26);
    hole.lineTo(0.26, 0.26);
    hole.lineTo(-0.26, 0.26);
    hole.closePath();
    plateShape.holes.push(hole);

    const frameGeo = track(
      new THREE.ExtrudeGeometry(plateShape, {
        depth: 0.09,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      }),
    );
    frameGeo.center();
    frameGeo.computeTangents();

    const faceDirs: Array<[number, number, number, number, number, number]> = [
      [0, 0, 0.58, 0, 0, 0],
      [0, 0, -0.58, 0, Math.PI, 0],
      [0.58, 0, 0, 0, Math.PI / 2, 0],
      [-0.58, 0, 0, 0, -Math.PI / 2, 0],
      [0, 0.58, 0, -Math.PI / 2, 0, 0],
      [0, -0.58, 0, Math.PI / 2, 0, 0],
    ];

    faceDirs.forEach(([dx, dy, dz, rx, ry, rz], idx) => {
      const face = new THREE.Mesh(frameGeo, idx % 2 === 0 ? primaryMat : darkTrimMat);
      face.position.set(dx, centerY + dy, dz);
      face.rotation.set(rx, ry, rz);
      subject.add(
        tagPart(face, `Aperture Frame ${idx + 1}`, new THREE.Vector3(dx * 0.9, dy * 0.9, dz * 0.9)),
      );
    });

    // 8. Gyroscope Rings
    const ringGeo = track(new THREE.TorusGeometry(1.12, 0.025, 14, 64));
    const ringA = new THREE.Mesh(ringGeo, energyMat);
    ringA.position.y = centerY;
    ringA.rotation.set(0.5, 0.3, 0);
    orbitRings.push(ringA);
    subject.add(tagPart(ringA, "Orbital Stabilizer", new THREE.Vector3(0, -0.25, 0.6), false));
  } else if (archetype === "stone") {
    // 1. Stepped Lathe Pedestal Collar
    const collarPts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.75, 0),
      new THREE.Vector2(0.68, 0.14),
      new THREE.Vector2(0.42, 0.24),
      new THREE.Vector2(0.46, 0.38),
      new THREE.Vector2(0.28, 0.48),
      new THREE.Vector2(0, 0.48),
    ];
    const collarGeo = track(new THREE.LatheGeometry(collarPts, 32));
    collarGeo.computeTangents();
    const collar = new THREE.Mesh(collarGeo, darkTrimMat);
    subject.add(tagPart(collar, "Reliquary Collar", new THREE.Vector3(0, -0.4, 0)));

    // 2. Faceted Gem Core
    const gemGeo = track(new THREE.OctahedronGeometry(0.52, 0));
    gemGeo.scale(0.85, 1.45, 0.85);
    const gem = new THREE.Mesh(gemGeo, crystalMat);
    gem.position.y = 1.48;
    gem.renderOrder = 2;
    coreGlowMesh = gem;
    subject.add(tagPart(gem, "Aether Crystal Core", new THREE.Vector3(0, 0.55, 0)));

    // 3. Radiant Inner Filament
    const seedGeo = track(new THREE.OctahedronGeometry(0.22, 1));
    const seed = new THREE.Mesh(seedGeo, energyMat);
    seed.position.y = 1.48;
    subject.add(tagPart(seed, "Resonance Heart", new THREE.Vector3(0, 0.9, 0)));

    // 4-6. 3 Curved Containment Prongs
    const prongCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.32, 0.42, 0),
      new THREE.Vector3(0.68, 1.05, 0),
      new THREE.Vector3(0.42, 1.85, 0),
      new THREE.Vector3(0.18, 2.22, 0),
    ]);
    const prongGeo = track(new THREE.TubeGeometry(prongCurve, 28, 0.045, 10, false));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const prong = new THREE.Mesh(prongGeo, primaryMat);
      prong.rotation.y = a;
      subject.add(
        tagPart(
          prong,
          `Containment Claw ${i + 1}`,
          new THREE.Vector3(Math.cos(a) * 0.55, 0.15, -Math.sin(a) * 0.55),
        ),
      );
    }

    // 7. Dual Halo Rings
    const haloGeoA = track(new THREE.TorusGeometry(0.95, 0.022, 12, 64));
    const haloA = new THREE.Mesh(haloGeoA, energyMat);
    haloA.position.y = 1.48;
    haloA.rotation.set(Math.PI / 3, 0.2, 0);
    orbitRings.push(haloA);
    subject.add(tagPart(haloA, "Primary Halo", new THREE.Vector3(0, 0.2, 0.6), false));

    const haloGeoB = track(new THREE.TorusGeometry(1.18, 0.016, 12, 64));
    const haloB = new THREE.Mesh(haloGeoB, primaryMat);
    haloB.position.y = 1.48;
    haloB.rotation.set(-Math.PI / 3.2, -0.35, 0.2);
    orbitRings.push(haloB);
    subject.add(tagPart(haloB, "Outer Celestial Ring", new THREE.Vector3(0, -0.2, -0.6), false));
  } else {
    // Tech / Suit / Serum Reactor Assembly (8 parts)
    const basePts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.85, 0),
      new THREE.Vector2(0.74, 0.15),
      new THREE.Vector2(0.52, 0.24),
      new THREE.Vector2(0, 0.24),
    ];
    const baseGeo = track(new THREE.LatheGeometry(basePts, 24));
    const mountBase = new THREE.Mesh(baseGeo, gripMat);
    subject.add(tagPart(mountBase, "Telemetry Dock", new THREE.Vector3(0, -0.35, 0)));

    // Chamfered hex housing
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 0.72;
      const y = Math.sin(a) * 0.72;
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.closePath();
    const housingGeo = track(
      new THREE.ExtrudeGeometry(hexShape, {
        depth: 0.26,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 3,
      }),
    );
    housingGeo.center();
    housingGeo.computeTangents();
    const housing = new THREE.Mesh(housingGeo, darkTrimMat);
    housing.position.y = 1.28;
    subject.add(tagPart(housing, "Armored Chassis", new THREE.Vector3(0, 0, -0.5)));

    // Reactor Lens & Core
    const coilGeo = track(new THREE.TorusGeometry(0.42, 0.055, 16, 48));
    const coil = new THREE.Mesh(coilGeo, primaryMat);
    coil.position.set(0, 1.28, 0.16);
    subject.add(tagPart(coil, "Magnetic Field Coil", new THREE.Vector3(0, 0.2, 0.5)));

    const lensGeo = track(new THREE.SphereGeometry(0.32, 32, 24));
    lensGeo.scale(1, 1, 0.45);
    const lens = new THREE.Mesh(lensGeo, crystalMat);
    lens.position.set(0, 1.28, 0.22);
    lens.renderOrder = 2;
    coreGlowMesh = lens;
    subject.add(tagPart(lens, "Quantum Optic Dome", new THREE.Vector3(0, 0, 0.8)));

    const coreGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24));
    coreGeo.rotateX(Math.PI / 2);
    const emitter = new THREE.Mesh(coreGeo, energyMat);
    emitter.position.set(0, 1.28, 0.08);
    subject.add(tagPart(emitter, "Plasma Emitter", new THREE.Vector3(0, 0.4, 0.35)));

    // Twin Shoulder Fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.28, 0.12);
    finShape.lineTo(0.18, 0.65);
    finShape.lineTo(-0.04, 0.5);
    finShape.closePath();
    const finGeo = track(
      new THREE.ExtrudeGeometry(finShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.015,
        bevelSegments: 2,
      }),
    );
    finGeo.center();
    [-1, 1].forEach((side, i) => {
      const fin = new THREE.Mesh(finGeo, primaryMat);
      fin.position.set(side * 0.78, 1.45, 0);
      fin.scale.x = side;
      subject.add(tagPart(fin, `Stabilizer Fin ${i + 1}`, new THREE.Vector3(side * 0.6, 0.3, 0)));
    });

    // Orbiting telemetry ring
    const scanGeo = track(new THREE.TorusGeometry(1.06, 0.016, 10, 64));
    const scanRing = new THREE.Mesh(scanGeo, energyMat);
    scanRing.position.y = 1.28;
    scanRing.rotation.x = Math.PI / 2.2;
    orbitRings.push(scanRing);
    subject.add(
      tagPart(scanRing, "Telemetry Scanner Ring", new THREE.Vector3(0, -0.35, 0.4), false),
    );
  }

  return {
    root,
    orbitRings,
    coreGlowMesh,
    dispose: () => {
      for (const item of disposables) item.dispose();
    },
  };
}
