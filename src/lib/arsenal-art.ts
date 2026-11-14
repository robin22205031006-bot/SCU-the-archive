/**
 * Browser-safe presentation map for Arsenal items: reference art, wielder forms,
 * canvas FX layers and emblem glyphs. Lore/stats stay in the artifacts table.
 */
import { ART, type ArtKey } from "@/lib/arsenal-images";

export type FxKind =
  "rays" | "arcs" | "rise" | "fall" | "orbit" | "ring" | "scan" | "motes" | "pulse";
/** One painter layer. x/y/r are fractions of the canvas; hue in degrees; n = particle density. */
export type FxLayer = {
  kind: FxKind;
  hue: number;
  sat?: number;
  light?: number;
  x?: number;
  y?: number;
  r?: number;
  n?: number;
  speed?: number;
};
export type Glyph =
  | "sword"
  | "katana"
  | "greatsword"
  | "dagger"
  | "gun"
  | "shotgun"
  | "book"
  | "cube"
  | "gem"
  | "mask"
  | "chain"
  | "helm"
  | "drone"
  | "wolf"
  | "orb"
  | "vial"
  | "bow"
  | "egg"
  | "chip"
  | "fist"
  | "star"
  | "kunai"
  | "tie";
export type ArsenalForm = {
  label: string;
  wielder?: string;
  art?: ArtKey;
  crop?: "left" | "right";
  fx: FxLayer[];
  note?: string;
};
export type ArsenalArt = { glyph: Glyph; hue: number; forms: ArsenalForm[] };

const L = (kind: FxKind, hue: number, o: Partial<FxLayer> = {}): FxLayer => ({ kind, hue, ...o });

export const ARSENAL_ART: Record<string, ArsenalArt> = {
  "architect cube": {
    glyph: "cube",
    hue: 195,
    forms: [
      {
        label: "Sealed core",
        art: "cube",
        fx: [
          L("rays", 195, { x: 0.53, y: 0.45, r: 0.38, n: 18 }),
          L("arcs", 190, { x: 0.53, y: 0.45, r: 0.26, n: 4 }),
          L("pulse", 195, { x: 0.53, y: 0.45, r: 0.2 }),
          L("motes", 200, { n: 24 }),
        ],
      },
    ],
  },
  "ayaan's nano suit": {
    glyph: "helm",
    hue: 0,
    forms: [
      {
        label: "Nano suit",
        wielder: "Ayaan Siddique",
        art: "nano-suit",
        fx: [
          L("pulse", 0, { x: 0.5, y: 0.19, r: 0.07, light: 55 }),
          L("scan", 0, { light: 55 }),
          L("fall", 210, { n: 40, sat: 10, light: 80, speed: 2.4 }),
        ],
        note: "Upgraded nano suit with many functions.",
      },
    ],
  },
  "ayaan's first combat suit": {
    glyph: "bow",
    hue: 200,
    forms: [
      {
        label: "First combat suit",
        wielder: "Ayaan Siddique",
        art: "first-suit",
        fx: [L("scan", 190, { light: 75 }), L("motes", 25, { n: 26, light: 65 })],
      },
    ],
  },
  "ayaan's wolf combat robot": {
    glyph: "wolf",
    hue: 0,
    forms: [
      {
        label: "Combat mode",
        art: "wolf",
        fx: [
          L("pulse", 0, { x: 0.91, y: 0.42, r: 0.04, light: 55 }),
          L("scan", 185, { light: 60 }),
        ],
      },
    ],
  },
  "ayaan's ai drone": {
    glyph: "drone",
    hue: 210,
    forms: [
      {
        label: "AI online",
        art: "drone",
        fx: [
          L("pulse", 205, { x: 0.62, y: 0.3, r: 0.07 }),
          L("ring", 205, { x: 0.62, y: 0.3, r: 0.22 }),
          L("motes", 210, { n: 18 }),
        ],
      },
    ],
  },
  "ayaan's spy spheres": {
    glyph: "orb",
    hue: 180,
    forms: [
      {
        label: "Surveillance grid",
        art: "probes",
        fx: [
          L("pulse", 180, { x: 0.3, y: 0.53, r: 0.04 }),
          L("pulse", 180, { x: 0.57, y: 0.48, r: 0.035 }),
          L("pulse", 180, { x: 0.67, y: 0.58, r: 0.04 }),
          L("ring", 180, { x: 0.5, y: 0.55, r: 0.45 }),
        ],
      },
    ],
  },
  "ichor serum": {
    glyph: "vial",
    hue: 185,
    forms: [
      {
        label: "Stabilised serum",
        art: "ichor",
        fx: [
          L("rise", 185, { x: 0.5, y: 0.62, r: 0.14, n: 22, speed: 0.6, light: 70 }),
          L("pulse", 185, { x: 0.62, y: 0.28, r: 0.05 }),
          L("pulse", 185, { x: 0.36, y: 0.65, r: 0.05 }),
        ],
      },
    ],
  },
  "occult twin pistols": {
    glyph: "gun",
    hue: 280,
    forms: [
      {
        label: "Pentagram case",
        art: "pistols",
        fx: [
          L("orbit", 345, { x: 0.52, y: 0.5, r: 0.27, n: 10 }),
          L("pulse", 285, { x: 0.6, y: 0.24, r: 0.05 }),
          L("pulse", 0, { x: 0.45, y: 0.81, r: 0.05 }),
          L("motes", 300, { n: 20 }),
        ],
      },
    ],
  },
  "aether-infused shotgun": {
    glyph: "shotgun",
    hue: 270,
    forms: [
      {
        label: "Aether charge",
        art: "aether-shotgun",
        fx: [
          L("rise", 270, { x: 0.25, y: 0.25, r: 0.2, n: 34, speed: 1.2 }),
          L("arcs", 255, { x: 0.15, y: 0.15, r: 0.12, n: 2 }),
          L("motes", 275, { n: 22 }),
        ],
      },
    ],
  },
  "spirit-flame revolver": {
    glyph: "gun",
    hue: 200,
    forms: [
      {
        label: "Spirit smoke",
        art: "revolver",
        fx: [
          L("rise", 200, { x: 0.65, y: 0.33, r: 0.14, n: 26, speed: 0.7 }),
          L("pulse", 220, { x: 0.53, y: 0.43, r: 0.04 }),
        ],
      },
    ],
  },
  "kara mask": {
    glyph: "mask",
    hue: 15,
    forms: [
      {
        label: "Awakened",
        art: "mask",
        fx: [
          L("pulse", 12, { x: 0.48, y: 0.46, r: 0.08, light: 55 }),
          L("pulse", 12, { x: 0.86, y: 0.47, r: 0.05, light: 55 }),
          L("rise", 20, { x: 0.5, y: 0.5, r: 0.3, n: 22, light: 55, speed: 0.8 }),
        ],
      },
    ],
  },
  "aldercrest celestial grimoire": {
    glyph: "book",
    hue: 200,
    forms: [
      {
        label: "Spirit flame",
        art: "book-celestial",
        fx: [
          L("rise", 195, { x: 0.5, y: 0.3, r: 0.35, n: 30, speed: 0.9 }),
          L("pulse", 40, { x: 0.45, y: 0.48, r: 0.12 }),
          L("motes", 40, { n: 18 }),
        ],
      },
    ],
  },
  "aldercrest dark grimoire": {
    glyph: "book",
    hue: 15,
    forms: [
      {
        label: "Dark magic",
        art: "book-dark",
        fx: [
          L("pulse", 25, { x: 0.52, y: 0.32, r: 0.05 }),
          L("pulse", 25, { x: 0.33, y: 0.55, r: 0.05 }),
          L("pulse", 25, { x: 0.62, y: 0.45, r: 0.05 }),
          L("rise", 15, { x: 0.5, y: 0.7, r: 0.4, n: 30, light: 55 }),
        ],
      },
    ],
  },
  "aldercrest clover grimoire": {
    glyph: "book",
    hue: 355,
    forms: [
      {
        label: "Clover sigil",
        art: "book-clover",
        fx: [
          L("pulse", 355, { x: 0.59, y: 0.58, r: 0.14, light: 55 }),
          L("orbit", 355, { x: 0.5, y: 0.5, r: 0.38, n: 6, light: 60 }),
        ],
      },
    ],
  },
  "kara yazgi": {
    glyph: "katana",
    hue: 355,
    forms: [
      {
        label: "Valeria's form",
        wielder: "Valeria",
        art: "kara-valeria",
        fx: [
          L("fall", 355, { n: 26, light: 50, speed: 0.8 }),
          L("pulse", 355, { x: 0.4, y: 0.3, r: 0.08, light: 50 }),
        ],
        note: "Silver blade with red spider lilies.",
      },
      {
        label: "Anna's form",
        wielder: "Anna",
        art: "kara-crimson",
        fx: [
          L("pulse", 0, { x: 0.3, y: 0.62, r: 0.2, light: 50 }),
          L("fall", 260, { n: 14, sat: 10, light: 15, speed: 0.7 }),
          L("motes", 0, { n: 22, light: 55 }),
        ],
        note: "Blood-red blade, cracked black sheath, raven plumes.",
      },
      {
        label: "Executioner form",
        wielder: "Saya",
        art: "kara-crimson",
        fx: [
          L("pulse", 0, { x: 0.3, y: 0.62, r: 0.26, light: 45 }),
          L("rise", 0, { x: 0.35, y: 0.62, r: 0.35, n: 26, light: 45 }),
          L("fall", 260, { n: 20, sat: 10, light: 15 }),
        ],
        note: "Taken when Valeria killed Khalid's final form; Saya carries it now.",
      },
    ],
  },
  "david's twin daggers": {
    glyph: "dagger",
    hue: 280,
    forms: [
      {
        label: "Portal edge",
        wielder: "David",
        art: "dagger-david",
        fx: [
          L("ring", 280, { x: 0.5, y: 0.62, r: 0.3 }),
          L("motes", 285, { n: 26 }),
          L("pulse", 285, { x: 0.2, y: 0.19, r: 0.03 }),
          L("pulse", 285, { x: 0.51, y: 0.22, r: 0.03 }),
        ],
      },
    ],
  },
  "alter david's cursed twin daggers": {
    glyph: "dagger",
    hue: 220,
    forms: [
      {
        label: "Cursed edge",
        wielder: "Alter David",
        art: "dagger-altdavid",
        fx: [
          L("arcs", 220, { x: 0.5, y: 0.6, r: 0.3, n: 3 }),
          L("pulse", 225, { x: 0.33, y: 0.32, r: 0.03 }),
          L("pulse", 225, { x: 0.67, y: 0.32, r: 0.03 }),
          L("motes", 215, { n: 26 }),
        ],
      },
    ],
  },
  "aether stone": {
    glyph: "gem",
    hue: 270,
    forms: [
      {
        label: "Normal form",
        art: "aether-pure",
        fx: [
          L("orbit", 260, { x: 0.5, y: 0.45, r: 0.38, n: 7, light: 80 }),
          L("pulse", 265, { x: 0.5, y: 0.5, r: 0.2 }),
        ],
      },
      {
        label: "Obsidian-infused",
        art: "aether-infused",
        fx: [
          L("pulse", 35, { x: 0.48, y: 0.32, r: 0.14, light: 65 }),
          L("rays", 300, { x: 0.48, y: 0.35, r: 0.45, n: 14 }),
          L("motes", 190, { n: 34 }),
        ],
      },
    ],
  },
  "elizah's demonic sword": {
    glyph: "greatsword",
    hue: 0,
    forms: [
      {
        label: "Demonic blade",
        wielder: "Elizah",
        art: "elizah",
        fx: [
          L("rise", 0, { x: 0.28, y: 0.65, r: 0.15, n: 30, light: 45, speed: 0.7 }),
          L("pulse", 0, { x: 0.6, y: 0.35, r: 0.07, light: 45 }),
          L("motes", 0, { n: 18, light: 50 }),
        ],
      },
    ],
  },
  "khalid's cursed sword": {
    glyph: "sword",
    hue: 0,
    forms: [
      {
        label: "Black blade",
        wielder: "Khalid",
        art: "khalid-blade",
        crop: "right",
        fx: [
          L("arcs", 0, { x: 0.6, y: 0.66, r: 0.18, n: 3, light: 50 }),
          L("motes", 0, { n: 26, light: 50 }),
        ],
        note: "While Khalid held it.",
      },
      {
        label: "White blade",
        wielder: "Alter David",
        art: "khalid-blade",
        crop: "left",
        fx: [
          L("pulse", 210, { x: 0.45, y: 0.5, r: 0.3, sat: 30, light: 85 }),
          L("motes", 210, { n: 26, sat: 30, light: 85 }),
          L("ring", 30, { x: 0.5, y: 0.45, r: 0.4, light: 60 }),
        ],
        note: "Turned white after Khalid's death, when Alter David took it.",
      },
    ],
  },
  "rowan's greatsword": {
    glyph: "greatsword",
    hue: 195,
    forms: [
      {
        label: "Blue Flame",
        wielder: "Rowan",
        art: "rowan-greatsword",
        fx: [
          L("rise", 195, { x: 0.7, y: 0.3, r: 0.2, n: 40, speed: 1.3, light: 70 }),
          L("pulse", 190, { x: 0.6, y: 0.35, r: 0.2 }),
          L("motes", 195, { n: 24 }),
        ],
      },
    ],
  },
  "rowan's flame chain": {
    glyph: "chain",
    hue: 0,
    forms: [
      {
        label: "Lashing chain",
        wielder: "Rowan",
        art: "rowan-chain",
        fx: [
          L("orbit", 0, { x: 0.5, y: 0.38, r: 0.28, n: 9, light: 55, speed: 1.6 }),
          L("pulse", 0, { x: 0.06, y: 0.93, r: 0.04, light: 55 }),
          L("motes", 10, { n: 18, light: 55 }),
        ],
      },
    ],
  },
  "zayn's sword": {
    glyph: "sword",
    hue: 215,
    forms: [
      {
        label: "Vapor & lightning",
        wielder: "Zayn Hayes",
        art: "zayn-sword",
        fx: [
          L("arcs", 215, { x: 0.6, y: 0.6, r: 0.28, n: 4, light: 80 }),
          L("rise", 215, { x: 0.55, y: 0.6, r: 0.3, n: 26, sat: 40, light: 80, speed: 0.6 }),
          L("motes", 210, { n: 20 }),
        ],
      },
    ],
  },
  "anthony's combat chip": {
    glyph: "chip",
    hue: 175,
    forms: [
      {
        label: "Neural link",
        wielder: "Anthony",
        art: "combat-chip",
        fx: [
          L("scan", 175),
          L("pulse", 175, { x: 0.5, y: 0.43, r: 0.12 }),
          L("rise", 180, { x: 0.5, y: 0.45, r: 0.2, n: 22, speed: 0.7 }),
          L("motes", 175, { n: 20 }),
        ],
      },
    ],
  },
  "ayaan's gauntlet": {
    glyph: "fist",
    hue: 215,
    forms: [
      {
        label: "Charged core",
        wielder: "Ayaan Siddique",
        art: "gauntlet",
        fx: [
          L("pulse", 215, { x: 0.45, y: 0.43, r: 0.12 }),
          L("arcs", 215, { x: 0.45, y: 0.43, r: 0.22, n: 4 }),
          L("pulse", 0, { x: 0.5, y: 0.75, r: 0.05, light: 55 }),
          L("motes", 210, { n: 22 }),
        ],
      },
    ],
  },
  "corvani's combat knives and firearms": {
    glyph: "gun",
    hue: 25,
    forms: [
      {
        label: "Field kit",
        wielder: "Corvani",
        art: "corvani",
        fx: [
          L("pulse", 25, { x: 0.64, y: 0.43, r: 0.04, light: 55 }),
          L("rise", 25, { x: 0.5, y: 0.9, r: 0.5, n: 22, light: 55, speed: 0.5 }),
          L("scan", 25, { light: 55 }),
        ],
      },
    ],
  },
  "dagger wolf's twin energy daggers": {
    glyph: "dagger",
    hue: 185,
    forms: [
      {
        label: "Spatial edge",
        wielder: "Dagger Wolf",
        art: "dagger-wolf",
        fx: [
          L("ring", 185, { x: 0.5, y: 0.5, r: 0.35 }),
          L("arcs", 185, { x: 0.5, y: 0.6, r: 0.3, n: 4 }),
          L("pulse", 185, { x: 0.16, y: 0.1, r: 0.03 }),
          L("pulse", 185, { x: 0.86, y: 0.12, r: 0.03 }),
          L("motes", 185, { n: 30 }),
        ],
      },
    ],
  },
  "dragon eggs": {
    glyph: "egg",
    hue: 25,
    forms: [
      {
        label: "Ember nest",
        art: "dragon-eggs",
        fx: [
          L("pulse", 28, { x: 0.53, y: 0.5, r: 0.14, light: 55 }),
          L("rise", 22, { x: 0.5, y: 0.75, r: 0.5, n: 36, light: 55, speed: 0.8 }),
          L("motes", 30, { n: 20, light: 55 }),
        ],
      },
    ],
  },
  "grace's light bow": {
    glyph: "bow",
    hue: 45,
    forms: [
      {
        label: "Radiant draw",
        wielder: "Grace",
        art: "light-bow",
        fx: [
          L("rays", 45, { x: 0.52, y: 0.42, r: 0.45, n: 16, light: 75 }),
          L("pulse", 45, { x: 0.52, y: 0.42, r: 0.07, light: 80 }),
          L("motes", 45, { n: 30, light: 75 }),
        ],
      },
    ],
  },
  "samuel's tie": {
    glyph: "tie",
    hue: 210,
    forms: [
      {
        label: "Living cloth",
        wielder: "Samuel",
        art: "samuel-tie",
        fx: [
          L("rise", 210, { x: 0.5, y: 0.6, r: 0.2, n: 22, sat: 30, light: 80, speed: 0.6 }),
          L("pulse", 210, { x: 0.78, y: 0.87, r: 0.05, light: 75 }),
          L("fall", 220, { n: 30, sat: 20, light: 75, speed: 2.2 }),
        ],
      },
    ],
  },
  "saya's rifle": {
    glyph: "gun",
    hue: 0,
    forms: [
      {
        label: "Overwatch",
        wielder: "Saya",
        art: "saya-rifle",
        fx: [
          L("pulse", 0, { x: 0.56, y: 0.42, r: 0.04, light: 55 }),
          L("scan", 0, { light: 55 }),
          L("motes", 0, { n: 16, light: 55 }),
        ],
      },
    ],
  },
  "shadow kunai and senbon": {
    glyph: "kunai",
    hue: 0,
    forms: [
      {
        label: "Shadow volley",
        art: "shadow-kunai",
        fx: [
          L("fall", 0, { n: 20, sat: 10, light: 70, speed: 2.4 }),
          L("rise", 270, { x: 0.35, y: 0.4, r: 0.4, n: 20, sat: 10, light: 15, speed: 0.6 }),
          L("motes", 0, { n: 16, light: 50 }),
        ],
      },
    ],
  },
  "valeria's katana": {
    glyph: "katana",
    hue: 355,
    forms: [
      {
        label: "Assassin's blade",
        wielder: "Valeria",
        art: "valeria-katana",
        fx: [
          L("fall", 355, { n: 28, light: 50, speed: 0.8 }),
          L("pulse", 210, { x: 0.8, y: 0.07, r: 0.07, sat: 20, light: 85 }),
          L("arcs", 210, { x: 0.6, y: 0.48, r: 0.25, n: 2, sat: 20, light: 85 }),
        ],
      },
    ],
  },
  "yoshiko's ninja arsenal": {
    glyph: "kunai",
    hue: 35,
    forms: [
      {
        label: "Full set",
        wielder: "Yoshiko",
        art: "yoshiko-arsenal",
        fx: [
          L("pulse", 35, { x: 0.05, y: 0.2, r: 0.06, light: 60 }),
          L("pulse", 35, { x: 0.51, y: 0.2, r: 0.05, light: 60 }),
          L("motes", 40, { n: 26, light: 65 }),
          L("scan", 210, { light: 80 }),
        ],
      },
    ],
  },
};

/** Fallback art for items without reference pictures, chosen from category and type keywords. */
export function fallbackArt(name: string, type: string | null, category: string): ArsenalArt {
  const t = `${name} ${type ?? ""}`.toLowerCase();
  const pick = (glyph: Glyph, hue: number, fx: FxLayer[]): ArsenalArt => ({
    glyph,
    hue,
    forms: [{ label: "Archive render", fx }],
  });
  if (/egg/.test(t))
    return pick("egg", 30, [
      L("pulse", 30, { x: 0.5, y: 0.5, r: 0.25 }),
      L("rise", 20, { x: 0.5, y: 0.6, r: 0.2, n: 20 }),
    ]);
  if (/chip/.test(t))
    return pick("chip", 160, [L("scan", 160), L("pulse", 160, { x: 0.5, y: 0.5, r: 0.18 })]);
  if (/gauntlet/.test(t))
    return pick("fist", 205, [
      L("pulse", 205, { x: 0.5, y: 0.5, r: 0.22 }),
      L("arcs", 205, { x: 0.5, y: 0.5, r: 0.2, n: 2 }),
    ]);
  if (/bow/.test(t))
    return pick("bow", 45, [
      L("rays", 45, { x: 0.5, y: 0.5, r: 0.4, n: 10 }),
      L("motes", 45, { n: 22 }),
    ]);
  if (/rifle|firearm|gun/.test(t))
    return pick("gun", 30, [L("scan", 30), L("motes", 30, { n: 14 })]);
  if (/tie|cloth/.test(t))
    return pick("tie", 220, [
      L("ring", 220, { x: 0.5, y: 0.5, r: 0.3 }),
      L("motes", 220, { n: 12, sat: 10 }),
    ]);
  if (/kunai|senbon|shuriken|ninja/.test(t))
    return pick("kunai", 0, [
      L("fall", 0, { n: 14, sat: 10, light: 70, speed: 2 }),
      L("motes", 0, { n: 10 }),
    ]);
  if (/dagger/.test(t))
    return pick("dagger", 280, [
      L("ring", 280, { x: 0.5, y: 0.5, r: 0.3 }),
      L("motes", 280, { n: 20 }),
    ]);
  if (/chain/.test(t)) return pick("chain", 15, [L("orbit", 15, { x: 0.5, y: 0.5, r: 0.3, n: 8 })]);
  if (/katana|sword|blade/.test(t))
    return pick("katana", 210, [
      L("arcs", 210, { x: 0.5, y: 0.5, r: 0.3, n: 2 }),
      L("motes", 210, { n: 16 }),
    ]);
  if (/serum|vial/.test(t))
    return pick("vial", 185, [L("rise", 185, { x: 0.5, y: 0.6, r: 0.15, n: 20 })]);
  if (category === "cosmic_object")
    return pick("star", 260, [
      L("rays", 260, { x: 0.5, y: 0.5, r: 0.4, n: 14 }),
      L("motes", 260, { n: 24 }),
    ]);
  if (category === "cursed_weapon")
    return pick("sword", 0, [L("rise", 0, { x: 0.5, y: 0.6, r: 0.3, n: 22, light: 45 })]);
  if (category === "relic")
    return pick("gem", 45, [
      L("pulse", 45, { x: 0.5, y: 0.5, r: 0.22 }),
      L("motes", 45, { n: 18 }),
    ]);
  return pick("star", 200, [L("motes", 200, { n: 18 })]);
}

export const normArtifact = (n: string) => n.trim().toLowerCase().replace(/[’`]/g, "'");
export function artFor(name: string, type: string | null, category: string): ArsenalArt {
  return ARSENAL_ART[normArtifact(name)] ?? fallbackArt(name, type, category);
}
export function artUrl(key?: ArtKey) {
  return key ? ART[key] : undefined;
}

import type { Tables } from "@/integrations/supabase/types";

export const DEFAULT_ARTIFACTS: Tables<"artifacts">[] = ([
  {
    id: "art-kara-yazgi",
    name: "Kara Yazgi",
    category: "cursed_weapon",
    weapon_type: "Katana",
    wielders: ["Valeria", "Anna", "Saya"],
    materials: "Ancient forged steel, red spider lily lacquer",
    colors: "Crimson, black, silver",
    curse_level: 5,
    how_it_works:
      "A cursed blade whose fate binds to whoever claims it; unleashes crescent shadow slashes and blood-tinted petal arcs.",
    lore: "Forged in the Pocket Dimension by Aeric Valenheart in 1354. Guarded by Anna until Khalid killed her. Later claimed by Valeria (Ravenblade) to defeat Khalid's final form, and now carried by Saya.",
    source: "Kara Yazgi.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-architect-cube",
    name: "Architect Cube",
    category: "cosmic_object",
    weapon_type: "Cube",
    wielders: ["Francisco Nasab", "Ramiz"],
    materials: "Prismatic dimensional crystal",
    colors: "Cyan, deep sapphire",
    curse_level: 3,
    how_it_works:
      "Sealed core projecting geometric forcefields, space-warping conduits, and celestial blueprint energy.",
    lore: "An ancient relic of the Architects. Francisco and Ramiz hunted its fragments in Ottoman Istanbul during 1417.",
    source: "Canons_duskmoor_origin.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-aether-stone",
    name: "Aether Stone",
    category: "cosmic_object",
    weapon_type: "Gem",
    wielders: [],
    materials: "Solidified pure aether crystal",
    colors: "Violet, radiant gold",
    curse_level: 2,
    how_it_works:
      "High-density cosmic energy node; radiates raw aether waves and can be corrupted by Obsidian forces.",
    lore: "One of the fundamental cosmic objects from the dawn era of the SCU.",
    source: "Cores.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-rowan-greatsword",
    name: "Rowan's Greatsword",
    category: "weapon",
    weapon_type: "Greatsword",
    wielders: ["Rowan"],
    materials: "Blackened heavy alloy",
    colors: "Deep azure, charcoal",
    curse_level: 0,
    how_it_works:
      "Specially forged to channel Rowan's Blue Flame along its massive edge, releasing fiery cleaving shockwaves.",
    lore: "Rowan's signature weapon throughout his battles in the Duskmoor saga.",
    source: "Arthur_vs_Rowan.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-rowan-chain",
    name: "Rowan's Flame Chain",
    category: "weapon",
    weapon_type: "Chain",
    wielders: ["Rowan"],
    materials: "Tempered chain links",
    colors: "Crimson, burning ember",
    curse_level: 0,
    how_it_works:
      "A heavy chain that ignites on contact, granting orbital control and sweeping sweeps against swarming foes.",
    lore: "Secondary armament used by Rowan for mid-range zone denial.",
    source: "Arthur_vs_Rowan.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-nano-suit",
    name: "Ayaan's Nano Suit",
    category: "serum_tech",
    weapon_type: "Armor",
    wielders: ["Ayaan Siddique"],
    materials: "Self-healing carbon nanites",
    colors: "Obsidian black, neon blue",
    curse_level: 0,
    how_it_works:
      "Adaptive nanite carapace providing kinetic dampening, environmental isolation, and sensor overlays.",
    lore: "Advanced combat chassis developed by Ayaan to push human physical limits.",
    source: "rise_of_ayaan_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-first-suit",
    name: "Ayaan's First Combat Suit",
    category: "serum_tech",
    weapon_type: "Armor",
    wielders: ["Ayaan Siddique"],
    materials: "Composite ballistic weave",
    colors: "Steel grey, cyan",
    curse_level: 0,
    how_it_works: "Early generation reinforced tactical suit with integrated shock absorption.",
    lore: "The prototype exoskeleton constructed by Ayaan during his early vigilante operations.",
    source: "rise_of_ayaan_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-wolf-robot",
    name: "Ayaan's Wolf Combat Robot",
    category: "serum_tech",
    weapon_type: "Automaton",
    wielders: ["Ayaan Siddique"],
    materials: "Titanium alloy chassis",
    colors: "Matte black, crimson sensors",
    curse_level: 0,
    how_it_works:
      "Autonomous quad-pedal combat drone acting as a flanking hunter and defensive bulwark.",
    lore: "Engineered by Ayaan for urban tactical suppression and tracking.",
    source: "Dagger_Wolf_1.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-ai-drone",
    name: "Ayaan's AI Drone",
    category: "serum_tech",
    weapon_type: "Drone",
    wielders: ["Ayaan Siddique"],
    materials: "Aero-grade carbon composite",
    colors: "Cobalt blue, silver",
    curse_level: 0,
    how_it_works:
      "High-agility aerial drone delivering aerial reconnaissance, electronic jamming, and targeting telemetry.",
    lore: "Ayaan's aerial eyes across metropolitan combat zones.",
    source: "rise_of_ayaan_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-spy-spheres",
    name: "Ayaan's Spy Spheres",
    category: "serum_tech",
    weapon_type: "Surveillance",
    wielders: ["Ayaan Siddique"],
    materials: "Miniaturized optic spheres",
    colors: "Chrome, teal",
    curse_level: 0,
    how_it_works:
      "Micro-probes forming an encrypted sensor net for 360-degree environmental surveillance.",
    lore: "Deployed ahead of strikes to detect enemy thermal and kinetic signatures.",
    source: "rise_of_ayaan_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ichor-serum",
    name: "Ichor Serum",
    category: "serum_tech",
    weapon_type: "Serum",
    wielders: ["Vanguard"],
    materials: "Bio-engineered metabolic compound",
    colors: "Luminescent amber, cyan",
    curse_level: 1,
    how_it_works:
      "Chemically supercharges muscle density, cellular regeneration, and concussive power output.",
    lore: "The proprietary super-soldier compound that transformed Vanguard into a living battering ram.",
    source: "Vanguard_x_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-occult-pistols",
    name: "Occult Twin Pistols",
    category: "weapon",
    weapon_type: "Handgun",
    wielders: [],
    materials: "Inscribed gunmetal, bone inlays",
    colors: "Violet, gunmetal",
    curse_level: 2,
    how_it_works:
      "Dual sidearms chambering demon-banishing kinetic rounds inscribed with warding sigils.",
    lore: "Crafted during the border conflicts to pierce demonic carapaces.",
    source: "corvani_and_orion_things.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-aether-shotgun",
    name: "Aether-Infused Shotgun",
    category: "weapon",
    weapon_type: "Shotgun",
    wielders: [],
    materials: "Heavy tactical barrel, aether induction chamber",
    colors: "Deep purple, brass",
    curse_level: 1,
    how_it_works:
      "Fires wide spreads of supercharged aether particles capable of shattering energy barriers.",
    lore: "Special weapons development built from harvested aether fragments.",
    source: "Cores.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-spirit-revolver",
    name: "Spirit-Flame Revolver",
    category: "weapon",
    weapon_type: "Revolver",
    wielders: [],
    materials: "Soul-tempered iron",
    colors: "Ethereal blue, silver",
    curse_level: 2,
    how_it_works:
      "Chambers condensed spirit wisps that pass through physical armor and burn internal vital cores.",
    lore: "Rare antique firearm from the eastern sanctuaries.",
    source: "The_throne_legacy.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-kara-mask",
    name: "Kara Mask",
    category: "relic",
    weapon_type: "Mask",
    wielders: ["Valeria", "Kara Yazgi Guardians"],
    materials: "Lacquered porcelain, cursed wood",
    colors: "Ivory, vermillion",
    curse_level: 4,
    how_it_works:
      "Conceals wearer's spiritual presence and synchronizes vision with shadow dimensions.",
    lore: "The ceremonial mask worn by the assassins of the Kara bloodline.",
    source: "Kara_Yazgi.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-aldercrest-celestial-grimoire",
    name: "Aldercrest Celestial Grimoire",
    category: "relic",
    weapon_type: "Grimoire",
    wielders: ["Eldrich", "Liam"],
    materials: "Celestial parchment, star-gold leaf",
    colors: "Gold, azure",
    curse_level: 0,
    how_it_works: "Codex of celestial incantations, light warding, and spirit flame manifestation.",
    lore: "One of the three ancestral tomes held by the Aldercrest clan masters.",
    source: "Inhertances_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-aldercrest-dark-grimoire",
    name: "Aldercrest Dark Grimoire",
    category: "cursed_weapon",
    weapon_type: "Grimoire",
    wielders: ["Damian"],
    materials: "Void-treated vellum",
    colors: "Blood-black, violet",
    curse_level: 4,
    how_it_works: "Contains forbidden shadow binding, blood decay, and dark translocation seals.",
    lore: "The forbidden tome of the Aldercrest line, sealed after the early wars.",
    source: "DAMIAN_BROWN_Ability.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-aldercrest-clover-grimoire",
    name: "Aldercrest Clover Grimoire",
    category: "relic",
    weapon_type: "Grimoire",
    wielders: ["Soa"],
    materials: "Woven plant fiber, emerald lacquer",
    colors: "Emerald green, bronze",
    curse_level: 0,
    how_it_works: "Focuses nature energy, restorative surges, and living barrier growth.",
    lore: "The vitality grimoire of the Aldercrest lineage, passed down through healers.",
    source: "soa_and_elina.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-david-twin-daggers",
    name: "David's Twin Daggers",
    category: "weapon",
    weapon_type: "Dagger",
    wielders: ["David"],
    materials: "Folded spatial Damascus",
    colors: "Amethyst, silver",
    curse_level: 1,
    how_it_works: "Allows micro-range portal strikes that slip behind physical shields.",
    lore: "Twin blades forged to complement David's elusive translocation combat style.",
    source: "david_and_maliha_tragedy_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-alter-david-daggers",
    name: "Alter David's Cursed Twin Daggers",
    category: "cursed_weapon",
    weapon_type: "Dagger",
    wielders: ["Alter David"],
    materials: "Void-warped crystal",
    colors: "Pale blue, ash grey",
    curse_level: 4,
    how_it_works:
      "Blades that weep freezing void mist, freezing tissues on contact and tearing spacetime rifts.",
    lore: "The twisted reflection of David's blades borne from trauma and corruption.",
    source: "Alt_david.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-elizah-demonic-sword",
    name: "Elizah's Demonic Sword",
    category: "cursed_weapon",
    weapon_type: "Greatsword",
    wielders: ["Elizah"],
    materials: "Demonic bone-metal alloy",
    colors: "Blood crimson, iron black",
    curse_level: 5,
    how_it_works:
      "Heavier with every drop of blood spilled, erupting crimson spikes upon impacting earth.",
    lore: "Manifested through Elizah's ferocious demonic bloodline to tear through armies.",
    source: "zayn_and_elizah_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-khalid-cursed-sword",
    name: "Khalid's Cursed Sword",
    category: "cursed_weapon",
    weapon_type: "Sword",
    wielders: ["Khalid", "Alter David"],
    materials: "Decay-imbued dark steel",
    colors: "Pitch black / bleached white",
    curse_level: 5,
    how_it_works:
      "Rots protective auras and breaks defensive barriers; transformed from black to radiant white upon Khalid's fall.",
    lore: "The sword carried by Khalid in his conquest of the throne, later taken by Alter David.",
    source: "KHALID_2_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-zayn-sword",
    name: "Zayn's Sword",
    category: "weapon",
    weapon_type: "Sword",
    wielders: ["Zayn Hayes"],
    materials: "High-conductivity aerodynamic alloy",
    colors: "Electric red, silver",
    curse_level: 0,
    how_it_works:
      "Conducts red lightning discharge into blade slashes, launching electrical arcs across mid-range.",
    lore: "Zayn's customized blade paired with his aerial lightning martial style.",
    source: "ZAAN_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-anthony-chip",
    name: "Anthony's Combat Chip",
    category: "serum_tech",
    weapon_type: "Chip",
    wielders: ["Anthony"],
    materials: "Neural silicon, superconducting pathways",
    colors: "Emerald green, copper",
    curse_level: 0,
    how_it_works:
      "Direct brain-stem interface that forecasts enemy attack trajectories in milliseconds.",
    lore: "Experimental military augment turning pure instinct into cold mathematical precision.",
    source: "behave_of_characters.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-ayaan-gauntlet",
    name: "Ayaan's Gauntlet",
    category: "weapon",
    weapon_type: "Gauntlet",
    wielders: ["Ayaan Siddique"],
    materials: "Reinforced kinetic carbide",
    colors: "Electric blue, gunmetal",
    curse_level: 0,
    how_it_works:
      "Stores concussive kinetic energy from blocked blows and releases it in devastating counter-punches.",
    lore: "Signature offensive armament mounted on Ayaan's combat armor.",
    source: "rise_of_ayaan_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-corvani-kit",
    name: "Corvani's Combat Knives and Firearms",
    category: "weapon",
    weapon_type: "Arsenal",
    wielders: ["Corvani"],
    materials: "Hardened military carbon steel",
    colors: "Olive drab, matte black",
    curse_level: 0,
    how_it_works:
      "Pure professional soldier equipment: tactical combat knives, high-caliber sidearms, and flash ordnance.",
    lore: "Demonstrates that discipline and human skill can match super-powered entities.",
    source: "whale.freaking_corvani.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-dagger-wolf",
    name: "Dagger Wolf's Twin Energy Daggers",
    category: "weapon",
    weapon_type: "Dagger",
    wielders: ["Dagger Wolf"],
    materials: "Hard-light plasma matrix",
    colors: "Teal, electric white",
    curse_level: 1,
    how_it_works:
      "Twin high-frequency energy daggers capable of shearing through dense composite plate.",
    lore: "Wielded by Dagger Wolf during covert inter-realm strikes.",
    source: "Dagger_Wolf_1.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-dragon-eggs",
    name: "Dragon Eggs",
    category: "relic",
    weapon_type: "Egg",
    wielders: ["Freya", "Arthur"],
    materials: "Living obsidian scales",
    colors: "Molten gold, deep ember",
    curse_level: 0,
    how_it_works:
      "Pulsing primordial dragon eggs emitting ancient draconic warmth and spiritual pressure.",
    lore: "The miraculous eggs that began Arthur's lineage and preserved the dragon race.",
    source: "Dragons_and_their_cons.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-grace-bow",
    name: "Grace's Light Bow",
    category: "weapon",
    weapon_type: "Bow",
    wielders: ["Grace"],
    materials: "Solidified sunlight crystal",
    colors: "Radiant gold, ivory",
    curse_level: 0,
    how_it_works:
      "Draws back radiant energy strings to unleash laser-precise light arrows that pierce darkness.",
    lore: "The sacred bow carried by Grace in her defense of the sanctuary.",
    source: "Grace_basic_plot_1_.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-samuel-tie",
    name: "Samuel's Tie",
    category: "relic",
    weapon_type: "Cloth",
    wielders: ["Samuel"],
    materials: "Kinetic weave silk",
    colors: "Dark navy, subtle silver",
    curse_level: 0,
    how_it_works:
      "Living nano-cloth woven with kinetic deflection threads that stiffen under high-speed impacts.",
    lore: "Samuel's trademark professional necktie, secretly concealing agent-grade defensive armor.",
    source: "Samuel_fighting_style.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-saya-rifle",
    name: "Saya's Rifle",
    category: "weapon",
    weapon_type: "Rifle",
    wielders: ["Saya"],
    materials: "Lightweight composite alloy, thermal scope",
    colors: "Shadow grey, midnight purple",
    curse_level: 0,
    how_it_works: "Extreme-range kinetic sniper platform firing silent hypersonic darts.",
    lore: "Saya's primary overwatch weapon before she inherited the executioner form of Kara Yazgi.",
    source: "behave_of_characters.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-shadow-kunai",
    name: "Shadow Kunai and Senbon",
    category: "weapon",
    weapon_type: "Kunai",
    wielders: ["Valeria", "Yoshiko"],
    materials: "Shadow-forged blackened iron",
    colors: "Matte black, violet sheen",
    curse_level: 1,
    how_it_works:
      "Concealed throwing implements that dissolve into shadow mist after striking, leaving no trajectory.",
    lore: "Standard assassin kit used by the Kurohana and Ravenblade shadow operatives.",
    source: "Slaughter_of_Kurohana_clan_-twin_x_Mashiho.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-valeria-katana",
    name: "Valeria's Katana",
    category: "weapon",
    weapon_type: "Katana",
    wielders: ["Valeria"],
    materials: "Folded high-carbon steel",
    colors: "Midnight black, silver edge",
    curse_level: 0,
    how_it_works: "Master assassin's katana balanced for immediate draw-and-counter parry strikes.",
    lore: "Valeria's training katana carried prior to claiming Kara Yazgi.",
    source: "Kara_Yazgi.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "art-yoshiko-arsenal",
    name: "Yoshiko's Ninja Arsenal",
    category: "weapon",
    weapon_type: "Ninja Arsenal",
    wielders: ["Yoshiko"],
    materials: "Tempered kunai, explosive tags, wire reels",
    colors: "Charcoal, amber trim",
    curse_level: 0,
    how_it_works:
      "Comprehensive shinobi toolkit allowing rapid battlefield preparation, tripwires, and stun volleys.",
    lore: "Yoshiko's master ninja kit tested across countless covert encounters.",
    source: "yoshiko.pdf",
    created_at: "2026-11-10T00:00:00Z",
    updated_at: "2026-11-10T00:00:00Z",
  },
] as Omit<Tables<"artifacts">, "model_3d_url">[]).map((a) => ({ ...a, model_3d_url: null }));
