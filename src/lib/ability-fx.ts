/** Browser-safe recipes for the Nexus advanced ability FX showcase. */
import { abilityDef, type AbilityTier } from "@/lib/abilities";

export type FxMotif =
  | "flame" | "lightning" | "water" | "wind" | "earth" | "nature" | "frost" | "blood" | "void"
  | "arcane" | "chrono" | "beam" | "blade" | "beast" | "heal" | "shadow" | "tech" | "chaos"
  | "prism" | "judgement" | "portal" | "impact" | "ghost" | "mind";

export interface FxRecipe {
  key: string;
  motif: FxMotif;
  /** Geometry variant inside the motif, so two abilities never share a choreography. */
  variant: number;
  palette: [string, string, string];
  /** Cycle length in seconds. */
  tempo: number;
  /** 1 (Standard) .. 8 (Mythic apex). */
  power: number;
  note: string;
}

const P = (a: string, b: string, c: string): [string, string, string] => [a, b, c];
type Row = [FxMotif, number, [string, string, string], number, string];

/** Every registry ability gets its own motif+variant pair. */
const TABLE: Record<string, Row> = {
  // Flame lineage: flame -> red flame -> duskmoor blue flame -> draconic flame
  flame: ["flame", 0, P("#ffb347", "#ff6a00", "#fff3c4"), 1.6, "Loose campfire tongues, wild and unshaped."],
  fire: ["flame", 1, P("#ff9a3c", "#e2470b", "#ffe1a8"), 1.4, "A bursting flare that licks outward."],
  fire_guardian: ["flame", 2, P("#ff7a1a", "#b91c1c", "#ffd27a"), 2.2, "A guarding wall of fire ringing the wielder."],
  red_flame_magic: ["flame", 3, P("#ff2b2b", "#7f0000", "#ffb4a2"), 1.3, "Condensed red flame spun into spell sigils."],
  duskmoor_blue_flame: ["flame", 4, P("#4fc3ff", "#1e3a8a", "#e0f7ff"), 1.8, "Silent soul-erasing blue fire, colder than ice."],
  draconic_flame: ["flame", 5, P("#ffcc33", "#c2410c", "#fff7d6"), 2.4, "A dragon's breath column with scale-shaped embers."],
  // Lightning lineage: lightning -> blue (astrapo) -> purple -> red (Dorian's apex)
  lightning: ["lightning", 0, P("#fff36b", "#facc15", "#ffffff"), 1.1, "Raw erratic yellow-white arcs."],
  astrapo_electrokinesis: ["lightning", 1, P("#38bdf8", "#1d4ed8", "#e0f2fe"), 1.0, "Tight blue plasma coils commanded at will."],
  purple_lightning: ["lightning", 2, P("#c084fc", "#6d28d9", "#f5e8ff"), 1.0, "A dense violet storm sphere with coronal discharge."],
  red_lightning: ["lightning", 3, P("#ff1f3d", "#3a0008", "#ffd1d8"), 0.9, "Dorian's apex: black core, crimson destruction bolts."],
  crimson_astrapo: ["lightning", 4, P("#ff4d6d", "#7f1d1d", "#ffe4e6"), 1.0, "Astrapo control fused with crimson charge."],
  white_lightning_drive: ["lightning", 5, P("#ffffff", "#94a3b8", "#e2e8f0"), 0.8, "Kinetic white sparks trailing the body's drive."],
  hyperkinesis: ["lightning", 6, P("#a3e635", "#3f6212", "#f7fee7"), 0.7, "Overcharged motion crackling at every step."],
  // Blood lineage
  blood_manipulation: ["blood", 0, P("#dc2626", "#450a0a", "#fecaca"), 2.0, "Blood droplets lifted and steered."],
  blood_art: ["blood", 1, P("#e11d48", "#4c0519", "#ffe4e6"), 2.2, "Blood painted into floating calligraphy."],
  hemokinesis: ["blood", 2, P("#b91c1c", "#2a0505", "#fca5a5"), 1.6, "Arterial needles erupt and retract."],
  sanguine_shift: ["blood", 3, P("#f43f5e", "#3b0716", "#ffe4e6"), 1.4, "The body dissolves into a blood mist and reforms."],
  demonic_hemokinesis: ["blood", 4, P("#ff003c", "#120004", "#ff8aa0"), 1.5, "Blood scythes with a demonic black core."],
  vampire: ["blood", 5, P("#be123c", "#18000a", "#fda4af"), 2.6, "Fanged crescent drain pulling life inward."],
  vampire_hybrid: ["blood", 6, P("#9f1239", "#1e1b4b", "#fbcfe8"), 2.4, "Half-drain, half-beast pulse."],
  // Aether / apex
  aether: ["void", 0, P("#a78bfa", "#312e81", "#ede9fe"), 3.0, "Soft aether current drifting in orbit."],
  aether_dominion: ["void", 1, P("#9333ea", "#0b0019", "#f0abfc"), 3.2, "A cosmic singularity crown commanding all aether."],
  omni_ergon: ["prism", 0, P("#ff6a00", "#38bdf8", "#4ade80"), 3.0, "All elements orbit and collapse into a prismatic core."],
  omni_argon: ["prism", 1, P("#facc15", "#60a5fa", "#f472b6"), 3.0, "Elemental rings locked in perfect balance."],
  prismorph: ["prism", 2, P("#f0abfc", "#22d3ee", "#fde68a"), 2.2, "Refracted shards morph into new shapes."],
  athenas_judgement: ["judgement", 0, P("#ffd54a", "#a16207", "#fffbeb"), 2.4, "Sunburst gold judgement descending from above."],
  authority: ["judgement", 1, P("#fbbf24", "#78350f", "#fef3c7"), 2.8, "A crown seal pressing the field into obedience."],
  qahr_al_wujud: ["void", 2, P("#e5e7eb", "#000000", "#fca5a5"), 2.6, "Existence itself crushed inward to a point."],
  destructive_legendary: ["impact", 0, P("#f97316", "#1c1917", "#fde68a"), 1.6, "Legendary shockwave that cracks the ground."],
  destructive: ["impact", 1, P("#fb923c", "#292524", "#ffedd5"), 1.4, "Raw destruction rings."],
  // Guardians
  wind_guardian: ["wind", 0, P("#86efac", "#166534", "#f0fdf4"), 2.0, "Cyclone blades circling the guardian."],
  aerokinesis: ["wind", 1, P("#a7f3d0", "#0f766e", "#ecfeff"), 1.6, "Directed gusts in long flowing ribbons."],
  wind: ["wind", 2, P("#bbf7d0", "#15803d", "#ffffff"), 2.4, "A gentle breeze of drifting streaks."],
  sky_guardian: ["wind", 3, P("#7dd3fc", "#0c4a6e", "#f0f9ff"), 2.6, "Wings of sky-current spreading upward."],
  water_guardian: ["water", 0, P("#38bdf8", "#075985", "#e0f2fe"), 2.2, "A protective tidal dome."],
  hydrokinesis: ["water", 1, P("#22d3ee", "#155e75", "#ecfeff"), 1.6, "Water ribbons whipped into strikes."],
  water: ["water", 2, P("#60a5fa", "#1e3a8a", "#eff6ff"), 1.8, "Splash bursts with foam crests."],
  cryokinesis: ["frost", 0, P("#bae6fd", "#0369a1", "#ffffff"), 2.0, "Ice crystals growing in hexagonal spikes."],
  earth_guardian: ["earth", 0, P("#d6a76c", "#57361a", "#fef3c7"), 2.4, "Stone plates rising into a fortress ring."],
  earth: ["earth", 1, P("#a8a29e", "#44403c", "#f5f5f4"), 2.0, "Jagged rock rupture with dust rings."],
  nature_guardian: ["nature", 0, P("#4ade80", "#14532d", "#fef9c3"), 2.6, "Vines and leaves weaving a living shield."],
  nature: ["nature", 1, P("#86efac", "#166534", "#fde047"), 2.8, "Blooming petals rising from roots."],
  architect_cube_guardian: ["tech", 0, P("#67e8f9", "#164e63", "#f0fdfa"), 2.2, "Cubes assemble into a guarding lattice."],
  // Magic
  arcane_magic: ["arcane", 0, P("#818cf8", "#1e1b4b", "#e0e7ff"), 2.6, "Rotating rune rings and floating sigils."],
  aldercrest_arcane: ["arcane", 1, P("#a5b4fc", "#312e81", "#fde68a"), 2.8, "Aldercrest triple-circle arcane seal."],
  rune_magic: ["arcane", 2, P("#facc15", "#422006", "#fef9c3"), 3.0, "Runes inscribed one by one, then ignite."],
  card_magic: ["arcane", 3, P("#f472b6", "#500724", "#fdf2f8"), 1.8, "Spell cards fan out and fire."],
  dark_magic: ["shadow", 0, P("#7c3aed", "#0a0014", "#c4b5fd"), 2.4, "Black-violet smoke tendrils curling inward."],
  umbrakinesis: ["shadow", 1, P("#4c1d95", "#000000", "#a78bfa"), 2.2, "Shadows lifted from the ground as blades."],
  shadow_steps: ["shadow", 2, P("#6366f1", "#020617", "#c7d2fe"), 0.9, "Blink trails between shadow pools."],
  demonic: ["shadow", 3, P("#ef4444", "#0c0000", "#f97316"), 2.0, "Demonic horned aura flaring outward."],
  chaos_magic: ["chaos", 0, P("#ec4899", "#4a044e", "#a3e635"), 1.4, "Unstable shards spinning in random orbits."],
  chaos_order: ["chaos", 1, P("#f8fafc", "#0f172a", "#ef4444"), 2.4, "Chaos and order split into twin halves that trade places."],
  wild_energy: ["chaos", 2, P("#fde047", "#ea580c", "#f0abfc"), 1.1, "Untamed energy bursts in every direction."],
  manipulation: ["mind", 0, P("#e879f9", "#581c87", "#fae8ff"), 2.6, "Puppet threads tugging from an eye sigil."],
  reality_bend: ["chrono", 0, P("#c4b5fd", "#1e1b4b", "#fef3c7"), 2.8, "Space folds into rippling rings and snaps back."],
  domain_expansion: ["chrono", 1, P("#f8fafc", "#000000", "#fbbf24"), 3.2, "A boundary sphere expands and locks space."],
  portal: ["portal", 0, P("#a78bfa", "#1e1b4b", "#67e8f9"), 2.0, "A spiral gate tears open."],
  psychokinetic_daggers: ["portal", 1, P("#22d3ee", "#0f172a", "#e0f2fe"), 1.2, "Daggers orbit, align, then fire through portals."],
  gladiokinesis: ["blade", 0, P("#e2e8f0", "#334155", "#38bdf8"), 1.6, "A storm of conjured swords circling inward."],
  regeneration: ["heal", 0, P("#4ade80", "#064e3b", "#ecfdf5"), 2.6, "Green aurora threads stitching wounds."],
  healing: ["heal", 1, P("#86efac", "#14532d", "#fef9c3"), 2.4, "A sacred cross seal with rising light pillars."],
  // Beast
  bestiakinesis: ["beast", 0, P("#f97316", "#431407", "#fed7aa"), 1.6, "Command over beasts: paw sigils stamp inward."],
  beast_transformation: ["beast", 1, P("#fb923c", "#3b0764", "#fde68a"), 1.8, "A predatory aura flare reshaping the body."],
  wolf: ["beast", 2, P("#cbd5e1", "#1e293b", "#f1f5f9"), 1.4, "Triple claw slash with a howling arc."],
  tiger: ["beast", 3, P("#f59e0b", "#1c1917", "#fef3c7"), 1.2, "Striped claw rake, fast and heavy."],
  lion: ["beast", 4, P("#facc15", "#78350f", "#fef9c3"), 2.0, "Roar shockwave with a mane of flame."],
  dragon: ["beast", 5, P("#ef4444", "#14532d", "#fde68a"), 2.4, "Coiling dragon body around a fireball."],
  hyena: ["beast", 6, P("#d97706", "#292524", "#fef3c7"), 1.0, "Jittering pack bites from all sides."],
  snakes: ["beast", 7, P("#84cc16", "#14532d", "#ecfccb"), 1.8, "Serpents spiral and strike forward."],
  // Tech / combat
  tech_genius: ["tech", 1, P("#22d3ee", "#0c4a6e", "#f0f9ff"), 2.4, "Circuit lines compile into a blueprint."],
  sentinel_frame_tech: ["tech", 2, P("#60a5fa", "#0f172a", "#e2e8f0"), 2.0, "Sentinel frame armor plates locking on."],
  vanguard_x_protocol: ["tech", 3, P("#f87171", "#111827", "#fecaca"), 1.6, "Targeting HUD sweeps then fires protocol X."],
  tech_suits: ["tech", 4, P("#94a3b8", "#0f172a", "#38bdf8"), 2.0, "Suit panels fold around a reactor core."],
  kinetic_suits: ["tech", 5, P("#fbbf24", "#1f2937", "#fde68a"), 1.4, "Kinetic charge stored then released as a pulse."],
  ghost_01_armament: ["ghost", 0, P("#e2e8f0", "#020617", "#7dd3fc"), 2.2, "Phase-cloaked armament flickering in and out."],
  azure_revenant_state: ["ghost", 1, P("#38bdf8", "#082f49", "#e0f2fe"), 2.6, "An azure revenant silhouette rising."],
  paleborne_nightmare: ["ghost", 2, P("#f1f5f9", "#18181b", "#a1a1aa"), 2.8, "Pale nightmare faces swirling around the core."],
  long_range_overwatch: ["beam", 0, P("#f87171", "#1f2937", "#fee2e2"), 1.8, "Scope reticle locks, a needle beam fires."],
  long_range: ["beam", 1, P("#fca5a5", "#334155", "#ffffff"), 2.0, "Long arrow trail with spiral air."],
  super_speed: ["beam", 2, P("#fde047", "#a16207", "#ffffff"), 0.6, "Afterimage streaks across the frame."],
  speed: ["beam", 3, P("#facc15", "#854d0e", "#fef9c3"), 0.8, "Speed lines and dust kick."],
  ancient_art: ["arcane", 4, P("#d4af37", "#3f2d0d", "#fef3c7"), 3.0, "Ancient glyph circle slowly awakening."],
  jester: ["mind", 1, P("#f472b6", "#3b0764", "#fde047"), 1.4, "Juggled masks tumbling and grinning."],
  super_soldier: ["impact", 2, P("#93c5fd", "#1e3a8a", "#ffffff"), 1.4, "Heavy punch shockwave with armor glint."],
  assassin: ["blade", 1, P("#94a3b8", "#020617", "#ef4444"), 0.9, "One silent cut, a red line, then nothing."],
  spy: ["mind", 2, P("#64748b", "#020617", "#e2e8f0"), 2.4, "A scanning eye that fades into static."],
  combat_specialist: ["impact", 3, P("#fbbf24", "#292524", "#fef3c7"), 1.1, "A combo of rapid hit sparks."],
  tactician: ["mind", 3, P("#38bdf8", "#0f172a", "#f8fafc"), 2.6, "A strategy grid with moving pieces."],
  swordsman: ["blade", 2, P("#e5e7eb", "#1f2937", "#fde68a"), 1.2, "Clean crescent slash with afterimage."],
  sword_master: ["blade", 3, P("#fde68a", "#422006", "#ffffff"), 1.4, "Triple master slashes forming a star."],
};

const TIER_POWER: Record<AbilityTier, number> = { Mythic: 8, Legendary: 7, Rare: 5, Exceptional: 6, Unique: 4, Ancient: 4, Standard: 2, Role: 1 };
const FALLBACK: [RegExp, FxMotif][] = [
  [/flame|fire|pyro|ember/, "flame"], [/lightning|electro|volt|thunder/, "lightning"], [/blood|hemo|sangu/, "blood"],
  [/water|hydro|tide/, "water"], [/wind|aero|air|sky/, "wind"], [/ice|cryo|frost/, "frost"], [/earth|stone|geo/, "earth"],
  [/nature|plant|vine/, "nature"], [/shadow|umbra|dark/, "shadow"], [/heal|regen/, "heal"], [/sword|blade|dagger/, "blade"],
  [/beast|wolf|tiger|lion|dragon/, "beast"], [/tech|suit|cyber/, "tech"], [/portal|gate/, "portal"], [/time|reality|space/, "chrono"],
];

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

export function abilityFxRecipe(name: string): FxRecipe {
  const def = abilityDef(name);
  const power = TIER_POWER[def.tier] ?? 2;
  const row = TABLE[def.key];
  if (row) return { key: def.key, motif: row[0], variant: row[1], palette: row[2], tempo: row[3], power, note: row[4] };
  const s = `${def.key} ${def.label}`.toLowerCase();
  const motif = FALLBACK.find(([re]) => re.test(s))?.[1] ?? "arcane";
  const h = hash(def.key);
  return { key: def.key, motif, variant: 20 + (h % 40), palette: P(def.color, "#0b0b12", "#ffffff"), tempo: 1.4 + (h % 15) / 10, power, note: def.description ?? "Archive energy signature." };
}

export function fxSignature(r: FxRecipe) { return `${r.motif}:${r.variant}`; }
export const FX_TABLE_KEYS = Object.keys(TABLE);

/** Upgrade lineages from lore: lowest rank first, apex last. */
export const FX_LINEAGES: { id: string; label: string; steps: string[] }[] = [
  { id: "lightning", label: "Lightning ascension", steps: ["lightning", "astrapo_electrokinesis", "purple_lightning", "red_lightning"] },
  { id: "flame", label: "Flame ascension", steps: ["flame", "red_flame_magic", "duskmoor_blue_flame", "draconic_flame"] },
  { id: "blood", label: "Blood ascension", steps: ["blood_manipulation", "hemokinesis", "sanguine_shift", "demonic_hemokinesis"] },
  { id: "aether", label: "Aether ascension", steps: ["aether", "aether_dominion"] },
  { id: "elements", label: "Elemental convergence", steps: ["fire_guardian", "water_guardian", "wind_guardian", "earth_guardian", "omni_ergon"] },
  { id: "blade", label: "Blade ascension", steps: ["swordsman", "sword_master", "gladiokinesis"] },
];

export function abilityLineage(name: string) {
  const key = abilityDef(name).key;
  return FX_LINEAGES.find(l => l.steps.includes(key)) ?? null;
}
