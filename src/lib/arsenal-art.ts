/**
 * Browser-safe presentation map for Arsenal items: reference art, wielder forms,
 * canvas FX layers and emblem glyphs. Lore/stats stay in the artifacts table.
 */
import { ART, type ArtKey } from "@/lib/arsenal-images";

export type FxKind = "rays" | "arcs" | "rise" | "fall" | "orbit" | "ring" | "scan" | "motes" | "pulse";
/** One painter layer. x/y/r are fractions of the canvas; hue in degrees; n = particle density. */
export type FxLayer = { kind: FxKind; hue: number; sat?: number; light?: number; x?: number; y?: number; r?: number; n?: number; speed?: number };
export type Glyph = "sword" | "katana" | "greatsword" | "dagger" | "gun" | "shotgun" | "book" | "cube" | "gem" | "mask" | "chain" | "helm" | "drone" | "wolf" | "orb" | "vial" | "bow" | "egg" | "chip" | "fist" | "star" | "kunai" | "tie";
export type ArsenalForm = { label: string; wielder?: string; art?: ArtKey; crop?: "left" | "right"; fx: FxLayer[]; note?: string };
export type ArsenalArt = { glyph: Glyph; hue: number; forms: ArsenalForm[] };

const L = (kind: FxKind, hue: number, o: Partial<FxLayer> = {}): FxLayer => ({ kind, hue, ...o });

export const ARSENAL_ART: Record<string, ArsenalArt> = {
  "architect cube": { glyph: "cube", hue: 195, forms: [{ label: "Sealed core", art: "cube", fx: [L("rays", 195, { x: .53, y: .45, r: .38, n: 18 }), L("arcs", 190, { x: .53, y: .45, r: .26, n: 4 }), L("pulse", 195, { x: .53, y: .45, r: .2 }), L("motes", 200, { n: 24 })] }] },
  "ayaan's nano suit": { glyph: "helm", hue: 0, forms: [{ label: "Nano suit", wielder: "Ayaan Siddique", art: "nano-suit", fx: [L("pulse", 0, { x: .5, y: .19, r: .07, light: 55 }), L("scan", 0, { light: 55 }), L("fall", 210, { n: 40, sat: 10, light: 80, speed: 2.4 })], note: "Upgraded nano suit with many functions." }] },
  "ayaan's first combat suit": { glyph: "bow", hue: 200, forms: [{ label: "First combat suit", wielder: "Ayaan Siddique", art: "first-suit", fx: [L("scan", 190, { light: 75 }), L("motes", 25, { n: 26, light: 65 })] }] },
  "ayaan's wolf combat robot": { glyph: "wolf", hue: 0, forms: [{ label: "Combat mode", art: "wolf", fx: [L("pulse", 0, { x: .91, y: .42, r: .04, light: 55 }), L("scan", 185, { light: 60 })] }] },
  "ayaan's ai drone": { glyph: "drone", hue: 210, forms: [{ label: "AI online", art: "drone", fx: [L("pulse", 205, { x: .62, y: .3, r: .07 }), L("ring", 205, { x: .62, y: .3, r: .22 }), L("motes", 210, { n: 18 })] }] },
  "ayaan's spy spheres": { glyph: "orb", hue: 180, forms: [{ label: "Surveillance grid", art: "probes", fx: [L("pulse", 180, { x: .3, y: .53, r: .04 }), L("pulse", 180, { x: .57, y: .48, r: .035 }), L("pulse", 180, { x: .67, y: .58, r: .04 }), L("ring", 180, { x: .5, y: .55, r: .45 })] }] },
  "ichor serum": { glyph: "vial", hue: 185, forms: [{ label: "Stabilised serum", art: "ichor", fx: [L("rise", 185, { x: .5, y: .62, r: .14, n: 22, speed: .6, light: 70 }), L("pulse", 185, { x: .62, y: .28, r: .05 }), L("pulse", 185, { x: .36, y: .65, r: .05 })] }] },
  "occult twin pistols": { glyph: "gun", hue: 280, forms: [{ label: "Pentagram case", art: "pistols", fx: [L("orbit", 345, { x: .52, y: .5, r: .27, n: 10 }), L("pulse", 285, { x: .6, y: .24, r: .05 }), L("pulse", 0, { x: .45, y: .81, r: .05 }), L("motes", 300, { n: 20 })] }] },
  "aether-infused shotgun": { glyph: "shotgun", hue: 270, forms: [{ label: "Aether charge", art: "aether-shotgun", fx: [L("rise", 270, { x: .25, y: .25, r: .2, n: 34, speed: 1.2 }), L("arcs", 255, { x: .15, y: .15, r: .12, n: 2 }), L("motes", 275, { n: 22 })] }] },
  "spirit-flame revolver": { glyph: "gun", hue: 200, forms: [{ label: "Spirit smoke", art: "revolver", fx: [L("rise", 200, { x: .65, y: .33, r: .14, n: 26, speed: .7 }), L("pulse", 220, { x: .53, y: .43, r: .04 })] }] },
  "kara mask": { glyph: "mask", hue: 15, forms: [{ label: "Awakened", art: "mask", fx: [L("pulse", 12, { x: .48, y: .46, r: .08, light: 55 }), L("pulse", 12, { x: .86, y: .47, r: .05, light: 55 }), L("rise", 20, { x: .5, y: .5, r: .3, n: 22, light: 55, speed: .8 })] }] },
  "aldercrest celestial grimoire": { glyph: "book", hue: 200, forms: [{ label: "Spirit flame", art: "book-celestial", fx: [L("rise", 195, { x: .5, y: .3, r: .35, n: 30, speed: .9 }), L("pulse", 40, { x: .45, y: .48, r: .12 }), L("motes", 40, { n: 18 })] }] },
  "aldercrest dark grimoire": { glyph: "book", hue: 15, forms: [{ label: "Dark magic", art: "book-dark", fx: [L("pulse", 25, { x: .52, y: .32, r: .05 }), L("pulse", 25, { x: .33, y: .55, r: .05 }), L("pulse", 25, { x: .62, y: .45, r: .05 }), L("rise", 15, { x: .5, y: .7, r: .4, n: 30, light: 55 })] }] },
  "aldercrest clover grimoire": { glyph: "book", hue: 355, forms: [{ label: "Clover sigil", art: "book-clover", fx: [L("pulse", 355, { x: .59, y: .58, r: .14, light: 55 }), L("orbit", 355, { x: .5, y: .5, r: .38, n: 6, light: 60 })] }] },
  "kara yazgi": { glyph: "katana", hue: 355, forms: [
    { label: "Valeria's form", wielder: "Valeria", art: "kara-valeria", fx: [L("fall", 355, { n: 26, light: 50, speed: .8 }), L("pulse", 355, { x: .4, y: .3, r: .08, light: 50 })], note: "Silver blade with red spider lilies." },
    { label: "Anna's form", wielder: "Anna", art: "kara-crimson", fx: [L("pulse", 0, { x: .3, y: .62, r: .2, light: 50 }), L("fall", 260, { n: 14, sat: 10, light: 15, speed: .7 }), L("motes", 0, { n: 22, light: 55 })], note: "Blood-red blade, cracked black sheath, raven plumes." },
    { label: "Executioner form", wielder: "Saya", art: "kara-crimson", fx: [L("pulse", 0, { x: .3, y: .62, r: .26, light: 45 }), L("rise", 0, { x: .35, y: .62, r: .35, n: 26, light: 45 }), L("fall", 260, { n: 20, sat: 10, light: 15 })], note: "Taken when Valeria killed Khalid's final form; Saya carries it now." },
  ] },
  "david's twin daggers": { glyph: "dagger", hue: 280, forms: [{ label: "Portal edge", wielder: "David", art: "dagger-david", fx: [L("ring", 280, { x: .5, y: .62, r: .3 }), L("motes", 285, { n: 26 }), L("pulse", 285, { x: .2, y: .19, r: .03 }), L("pulse", 285, { x: .51, y: .22, r: .03 })] }] },
  "alter david's cursed twin daggers": { glyph: "dagger", hue: 220, forms: [{ label: "Cursed edge", wielder: "Alter David", art: "dagger-altdavid", fx: [L("arcs", 220, { x: .5, y: .6, r: .3, n: 3 }), L("pulse", 225, { x: .33, y: .32, r: .03 }), L("pulse", 225, { x: .67, y: .32, r: .03 }), L("motes", 215, { n: 26 })] }] },
  "aether stone": { glyph: "gem", hue: 270, forms: [
    { label: "Normal form", art: "aether-pure", fx: [L("orbit", 260, { x: .5, y: .45, r: .38, n: 7, light: 80 }), L("pulse", 265, { x: .5, y: .5, r: .2 })] },
    { label: "Obsidian-infused", art: "aether-infused", fx: [L("pulse", 35, { x: .48, y: .32, r: .14, light: 65 }), L("rays", 300, { x: .48, y: .35, r: .45, n: 14 }), L("motes", 190, { n: 34 })] },
  ] },
  "elizah's demonic sword": { glyph: "greatsword", hue: 0, forms: [{ label: "Demonic blade", wielder: "Elizah", art: "elizah", fx: [L("rise", 0, { x: .28, y: .65, r: .15, n: 30, light: 45, speed: .7 }), L("pulse", 0, { x: .6, y: .35, r: .07, light: 45 }), L("motes", 0, { n: 18, light: 50 })] }] },
  "khalid's cursed sword": { glyph: "sword", hue: 0, forms: [
    { label: "Black blade", wielder: "Khalid", art: "khalid-blade", crop: "right", fx: [L("arcs", 0, { x: .6, y: .66, r: .18, n: 3, light: 50 }), L("motes", 0, { n: 26, light: 50 })], note: "While Khalid held it." },
    { label: "White blade", wielder: "Alter David", art: "khalid-blade", crop: "left", fx: [L("pulse", 210, { x: .45, y: .5, r: .3, sat: 30, light: 85 }), L("motes", 210, { n: 26, sat: 30, light: 85 }), L("ring", 30, { x: .5, y: .45, r: .4, light: 60 })], note: "Turned white after Khalid's death, when Alter David took it." },
  ] },
  "rowan's greatsword": { glyph: "greatsword", hue: 195, forms: [{ label: "Blue Flame", wielder: "Rowan", art: "rowan-greatsword", fx: [L("rise", 195, { x: .7, y: .3, r: .2, n: 40, speed: 1.3, light: 70 }), L("pulse", 190, { x: .6, y: .35, r: .2 }), L("motes", 195, { n: 24 })] }] },
  "rowan's flame chain": { glyph: "chain", hue: 0, forms: [{ label: "Lashing chain", wielder: "Rowan", art: "rowan-chain", fx: [L("orbit", 0, { x: .5, y: .38, r: .28, n: 9, light: 55, speed: 1.6 }), L("pulse", 0, { x: .06, y: .93, r: .04, light: 55 }), L("motes", 10, { n: 18, light: 55 })] }] },
  "zayn's sword": { glyph: "sword", hue: 215, forms: [{ label: "Vapor & lightning", wielder: "Zayn Hayes", art: "zayn-sword", fx: [L("arcs", 215, { x: .6, y: .6, r: .28, n: 4, light: 80 }), L("rise", 215, { x: .55, y: .6, r: .3, n: 26, sat: 40, light: 80, speed: .6 }), L("motes", 210, { n: 20 })] }] },
  "anthony's combat chip": { glyph: "chip", hue: 175, forms: [{ label: "Neural link", wielder: "Anthony", art: "combat-chip", fx: [L("scan", 175), L("pulse", 175, { x: .5, y: .43, r: .12 }), L("rise", 180, { x: .5, y: .45, r: .2, n: 22, speed: .7 }), L("motes", 175, { n: 20 })] }] },
  "ayaan's gauntlet": { glyph: "fist", hue: 215, forms: [{ label: "Charged core", wielder: "Ayaan Siddique", art: "gauntlet", fx: [L("pulse", 215, { x: .45, y: .43, r: .12 }), L("arcs", 215, { x: .45, y: .43, r: .22, n: 4 }), L("pulse", 0, { x: .5, y: .75, r: .05, light: 55 }), L("motes", 210, { n: 22 })] }] },
  "corvani's combat knives and firearms": { glyph: "gun", hue: 25, forms: [{ label: "Field kit", wielder: "Corvani", art: "corvani", fx: [L("pulse", 25, { x: .64, y: .43, r: .04, light: 55 }), L("rise", 25, { x: .5, y: .9, r: .5, n: 22, light: 55, speed: .5 }), L("scan", 25, { light: 55 })] }] },
  "dagger wolf's twin energy daggers": { glyph: "dagger", hue: 185, forms: [{ label: "Spatial edge", wielder: "Dagger Wolf", art: "dagger-wolf", fx: [L("ring", 185, { x: .5, y: .5, r: .35 }), L("arcs", 185, { x: .5, y: .6, r: .3, n: 4 }), L("pulse", 185, { x: .16, y: .1, r: .03 }), L("pulse", 185, { x: .86, y: .12, r: .03 }), L("motes", 185, { n: 30 })] }] },
  "dragon eggs": { glyph: "egg", hue: 25, forms: [{ label: "Ember nest", art: "dragon-eggs", fx: [L("pulse", 28, { x: .53, y: .5, r: .14, light: 55 }), L("rise", 22, { x: .5, y: .75, r: .5, n: 36, light: 55, speed: .8 }), L("motes", 30, { n: 20, light: 55 })] }] },
  "grace's light bow": { glyph: "bow", hue: 45, forms: [{ label: "Radiant draw", wielder: "Grace", art: "light-bow", fx: [L("rays", 45, { x: .52, y: .42, r: .45, n: 16, light: 75 }), L("pulse", 45, { x: .52, y: .42, r: .07, light: 80 }), L("motes", 45, { n: 30, light: 75 })] }] },
  "samuel's tie": { glyph: "tie", hue: 210, forms: [{ label: "Living cloth", wielder: "Samuel", art: "samuel-tie", fx: [L("rise", 210, { x: .5, y: .6, r: .2, n: 22, sat: 30, light: 80, speed: .6 }), L("pulse", 210, { x: .78, y: .87, r: .05, light: 75 }), L("fall", 220, { n: 30, sat: 20, light: 75, speed: 2.2 })] }] },
  "saya's rifle": { glyph: "gun", hue: 0, forms: [{ label: "Overwatch", wielder: "Saya", art: "saya-rifle", fx: [L("pulse", 0, { x: .56, y: .42, r: .04, light: 55 }), L("scan", 0, { light: 55 }), L("motes", 0, { n: 16, light: 55 })] }] },
  "shadow kunai and senbon": { glyph: "kunai", hue: 0, forms: [{ label: "Shadow volley", art: "shadow-kunai", fx: [L("fall", 0, { n: 20, sat: 10, light: 70, speed: 2.4 }), L("rise", 270, { x: .35, y: .4, r: .4, n: 20, sat: 10, light: 15, speed: .6 }), L("motes", 0, { n: 16, light: 50 })] }] },
  "valeria's katana": { glyph: "katana", hue: 355, forms: [{ label: "Assassin's blade", wielder: "Valeria", art: "valeria-katana", fx: [L("fall", 355, { n: 28, light: 50, speed: .8 }), L("pulse", 210, { x: .8, y: .07, r: .07, sat: 20, light: 85 }), L("arcs", 210, { x: .6, y: .48, r: .25, n: 2, sat: 20, light: 85 })] }] },
  "yoshiko's ninja arsenal": { glyph: "kunai", hue: 35, forms: [{ label: "Full set", wielder: "Yoshiko", art: "yoshiko-arsenal", fx: [L("pulse", 35, { x: .05, y: .2, r: .06, light: 60 }), L("pulse", 35, { x: .51, y: .2, r: .05, light: 60 }), L("motes", 40, { n: 26, light: 65 }), L("scan", 210, { light: 80 })] }] },
};

/** Fallback art for items without reference pictures, chosen from category and type keywords. */
export function fallbackArt(name: string, type: string | null, category: string): ArsenalArt {
  const t = `${name} ${type ?? ""}`.toLowerCase();
  const pick = (glyph: Glyph, hue: number, fx: FxLayer[]): ArsenalArt => ({ glyph, hue, forms: [{ label: "Archive render", fx }] });
  if (/egg/.test(t)) return pick("egg", 30, [L("pulse", 30, { x: .5, y: .5, r: .25 }), L("rise", 20, { x: .5, y: .6, r: .2, n: 20 })]);
  if (/chip/.test(t)) return pick("chip", 160, [L("scan", 160), L("pulse", 160, { x: .5, y: .5, r: .18 })]);
  if (/gauntlet/.test(t)) return pick("fist", 205, [L("pulse", 205, { x: .5, y: .5, r: .22 }), L("arcs", 205, { x: .5, y: .5, r: .2, n: 2 })]);
  if (/bow/.test(t)) return pick("bow", 45, [L("rays", 45, { x: .5, y: .5, r: .4, n: 10 }), L("motes", 45, { n: 22 })]);
  if (/rifle|firearm|gun/.test(t)) return pick("gun", 30, [L("scan", 30), L("motes", 30, { n: 14 })]);
  if (/tie|cloth/.test(t)) return pick("tie", 220, [L("ring", 220, { x: .5, y: .5, r: .3 }), L("motes", 220, { n: 12, sat: 10 })]);
  if (/kunai|senbon|shuriken|ninja/.test(t)) return pick("kunai", 0, [L("fall", 0, { n: 14, sat: 10, light: 70, speed: 2 }), L("motes", 0, { n: 10 })]);
  if (/dagger/.test(t)) return pick("dagger", 280, [L("ring", 280, { x: .5, y: .5, r: .3 }), L("motes", 280, { n: 20 })]);
  if (/chain/.test(t)) return pick("chain", 15, [L("orbit", 15, { x: .5, y: .5, r: .3, n: 8 })]);
  if (/katana|sword|blade/.test(t)) return pick("katana", 210, [L("arcs", 210, { x: .5, y: .5, r: .3, n: 2 }), L("motes", 210, { n: 16 })]);
  if (/serum|vial/.test(t)) return pick("vial", 185, [L("rise", 185, { x: .5, y: .6, r: .15, n: 20 })]);
  if (category === "cosmic_object") return pick("star", 260, [L("rays", 260, { x: .5, y: .5, r: .4, n: 14 }), L("motes", 260, { n: 24 })]);
  if (category === "cursed_weapon") return pick("sword", 0, [L("rise", 0, { x: .5, y: .6, r: .3, n: 22, light: 45 })]);
  if (category === "relic") return pick("gem", 45, [L("pulse", 45, { x: .5, y: .5, r: .22 }), L("motes", 45, { n: 18 })]);
  return pick("star", 200, [L("motes", 200, { n: 18 })]);
}

export const normArtifact = (n: string) => n.trim().toLowerCase().replace(/[’`]/g, "'");
export function artFor(name: string, type: string | null, category: string): ArsenalArt {
  return ARSENAL_ART[normArtifact(name)] ?? fallbackArt(name, type, category);
}
export function artUrl(key?: ArtKey) { return key ? ART[key] : undefined; }
