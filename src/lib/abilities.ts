import {
  Bomb,
  BookOpen,
  Bot,
  CreditCard,
  Cpu,
  Crosshair,
  Crown,
  DoorOpen,
  Drama,
  Droplets,
  Expand,
  Eye,
  Flame,
  Footprints,
  Gauge,
  Ghost,
  Hash,
  HeartPulse,
  Landmark,
  Leaf,
  Locate,
  Moon,
  Mountain,
  Orbit,
  PawPrint,
  Rabbit,
  Radiation,
  Scale,
  Scroll,
  Shield,
  Shuffle,
  Snowflake,
  Sparkles,
  Swords,
  WandSparkles,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type AbilityTier =
  "Mythic" | "Legendary" | "Rare" | "Exceptional" | "Unique" | "Ancient" | "Standard" | "Role";
export type AbilityGroup = "power" | "beast" | "element" | "role" | "art";

export interface AbilityDef {
  key: string;
  label: string;
  tier: AbilityTier;
  group: AbilityGroup;
  color: string;
  icon: LucideIcon;
  description?: string;
}

const BEAST = "#f97316";
const GOLD = "#d4af37";
const STEEL = "#cbd5e1";

/** Official SCU ability registry — badge color/icon/tier per power. */
export const ABILITY_REGISTRY: AbilityDef[] = [
  // ---- Mythic (glowing red) ----
  {
    key: "athenas_judgement",
    label: "Athena's Judgement",
    tier: "Mythic",
    group: "power",
    color: "#ff2d2d",
    icon: Scale,
    description: "Sunburst gold judgement art — apex-tier destructive authority.",
  },
  {
    key: "aether_dominion",
    label: "Aether Dominion",
    tier: "Mythic",
    group: "power",
    color: "#9d4edd",
    icon: Orbit,
    description: "Neon violet void command over the aether.",
  },
  {
    key: "omni_ergon",
    label: "Omni-Ergon",
    tier: "Mythic",
    group: "power",
    color: "#7dd3fc",
    icon: Sparkles,
    description: "Iridescent prism-shift command of all elements combined.",
  },
  {
    key: "wind_guardian",
    label: "Wind Guardian",
    tier: "Mythic",
    group: "power",
    color: "#38bdf8",
    icon: Wind,
    description: "Elemental guardianship of wind — storm-crowned authority over gales and sky.",
  },
  {
    key: "water_guardian",
    label: "Water Guardian",
    tier: "Mythic",
    group: "power",
    color: "#0284c7",
    icon: Waves,
    description: "Elemental guardianship of water — unlocks Cryokinesis in guardian state.",
  },
  {
    key: "fire_guardian",
    label: "Fire Guardian",
    tier: "Mythic",
    group: "power",
    color: "#ef4444",
    icon: Flame,
    description: "Elemental guardianship of fire — inferno command.",
  },
  {
    key: "nature_guardian",
    label: "Nature Guardian",
    tier: "Mythic",
    group: "power",
    color: "#34d399",
    icon: Leaf,
    description: "Elemental guardianship of nature — verdant sphere techniques.",
  },
  {
    key: "sky_guardian",
    label: "Sky Guardian",
    tier: "Mythic",
    group: "power",
    color: "#a78bfa",
    icon: Orbit,
    description: "Elemental guardianship of the sky — aerial dominance.",
  },
  {
    key: "earth_guardian",
    label: "Earth Guardian",
    tier: "Mythic",
    group: "power",
    color: "#d97706",
    icon: Mountain,
    description: "Elemental guardianship of earth — terrain command.",
  },

  // ---- Legendary & cosmic arts ----
  {
    key: "qahr_al_wujud",
    label: "Qahr al-Wujud",
    tier: "Legendary",
    group: "power",
    color: GOLD,
    icon: Crown,
    description:
      "The Subjugation of Existence — Agnus imposes his will as the highest command; reality itself yields within his radius.",
  },
  {
    key: "omni_argon",
    label: "Omni Argon",
    tier: "Legendary",
    group: "power",
    color: "#7dd3fc",
    icon: Sparkles,
    description: "All-elements combined, iridescent/cyan treatment.",
  },
  {
    key: "reality_bend",
    label: "Reality Bend",
    tier: "Legendary",
    group: "power",
    color: "#dc2626",
    icon: Orbit,
    description: "Deep red/purple reality manipulation.",
  },
  {
    key: "astrapo_electrokinesis",
    label: "Astrapo-Electrokinesis",
    tier: "Legendary",
    group: "power",
    color: "#3b82f6",
    icon: Zap,
    description: "Storm-forged lightning command.",
  },
  {
    key: "aether",
    label: "Aether",
    tier: "Legendary",
    group: "power",
    color: "#a855f7",
    icon: Sparkles,
    description: "Xinea's purple aetheric power.",
  },
  {
    key: "blood_manipulation",
    label: "Blood Manipulation",
    tier: "Legendary",
    group: "power",
    color: "#b91c1c",
    icon: Droplets,
  },
  {
    key: "red_lightning",
    label: "Red Lightning",
    tier: "Legendary",
    group: "power",
    color: "#ef4444",
    icon: Zap,
  },
  {
    key: "demonic",
    label: "Demonic",
    tier: "Legendary",
    group: "power",
    color: "#7c3aed",
    icon: Ghost,
  },
  {
    key: "draconic_flame",
    label: "Draconic Flame",
    tier: "Legendary",
    group: "power",
    color: "#f97316",
    icon: Flame,
  },
  {
    key: "destructive_legendary",
    label: "Destructive (Legendary)",
    tier: "Legendary",
    group: "power",
    color: "#dc2626",
    icon: Bomb,
  },

  // ---- Rare ----
  {
    key: "arcane_magic",
    label: "Arcane Magic",
    tier: "Rare",
    group: "art",
    color: "#a855f7",
    icon: WandSparkles,
  },
  {
    key: "manipulation",
    label: "Manipulation",
    tier: "Rare",
    group: "power",
    color: "#c084fc",
    icon: WandSparkles,
  },
  {
    key: "regeneration",
    label: "Regeneration",
    tier: "Rare",
    group: "element",
    color: "#34d399",
    icon: HeartPulse,
  },
  {
    key: "super_speed",
    label: "Super Speed",
    tier: "Rare",
    group: "power",
    color: "#22d3ee",
    icon: Gauge,
  },
  {
    key: "wild_energy",
    label: "Wild Energy",
    tier: "Unique",
    group: "power",
    color: "#f97316",
    icon: Radiation,
  },
  {
    key: "chaos_magic",
    label: "Chaos Magic",
    tier: "Rare",
    group: "art",
    color: "#dc2626",
    icon: Shuffle,
  },
  {
    key: "dark_magic",
    label: "Dark Magic",
    tier: "Rare",
    group: "art",
    color: "#7c3aed",
    icon: Moon,
  },
  {
    key: "aerokinesis",
    label: "Aerokinesis",
    tier: "Rare",
    group: "power",
    color: "#00ff87",
    icon: Wind,
    description: "Emerald wind kinesis.",
  },
  {
    key: "hydrokinesis",
    label: "Hydrokinesis",
    tier: "Rare",
    group: "power",
    color: "#14b8a6",
    icon: Waves,
    description: "Abyssal teal water command.",
  },
  {
    key: "cryokinesis",
    label: "Cryokinesis",
    tier: "Rare",
    group: "power",
    color: "#7dd3fc",
    icon: Snowflake,
    description: "Ice-blue frost command.",
  },
  {
    key: "red_flame_magic",
    label: "Red Flame Magic",
    tier: "Rare",
    group: "art",
    color: "#dc2626",
    icon: Flame,
  },
  {
    key: "bestiakinesis",
    label: "Bestiakinesis",
    tier: "Rare",
    group: "power",
    color: "#f59e0b",
    icon: PawPrint,
    description: "Beast-mimic kinesis, amber gold.",
  },
  {
    key: "hyperkinesis",
    label: "Hyperkinesis",
    tier: "Rare",
    group: "power",
    color: "#fbbf24",
    icon: Zap,
  },
  {
    key: "hemokinesis",
    label: "Hemokinesis",
    tier: "Rare",
    group: "power",
    color: "#8b0000",
    icon: Droplets,
    description: "Deep crimson blood kinesis.",
  },
  {
    key: "sanguine_shift",
    label: "Sanguine Shift",
    tier: "Rare",
    group: "power",
    color: "#7f1d1d",
    icon: Droplets,
  },
  {
    key: "chaos_order",
    label: "Chaos & Order",
    tier: "Rare",
    group: "art",
    color: "#dc2626",
    icon: Drama,
    description: "Shinobi slate and ofuda red duality.",
  },
  {
    key: "tech_genius",
    label: "Tech Genius",
    tier: "Rare",
    group: "role",
    color: "#38bdf8",
    icon: Cpu,
  },
  {
    key: "long_range_overwatch",
    label: "Long-Range Overwatch",
    tier: "Rare",
    group: "role",
    color: "#1f2937",
    icon: Crosshair,
    description: "Sniper matte black overwatch.",
  },
  {
    key: "aldercrest_arcane",
    label: "Aldercrest Arcane Discipline",
    tier: "Rare",
    group: "art",
    color: "#1d4ed8",
    icon: WandSparkles,
    description: "Sorcerer navy with sigil gold.",
  },

  // ---- Exceptional ----
  {
    key: "gladiokinesis",
    label: "Gladiokinesis",
    tier: "Exceptional",
    group: "power",
    color: STEEL,
    icon: Swords,
    description: "Steel silver weapon kinesis with a crimson edge.",
  },
  {
    key: "crimson_astrapo",
    label: "Crimson Astrapo",
    tier: "Exceptional",
    group: "power",
    color: "#ff0033",
    icon: Zap,
  },
  {
    key: "duskmoor_blue_flame",
    label: "Duskmoor Blue Flame",
    tier: "Exceptional",
    group: "art",
    color: "#3b5bdb",
    icon: Flame,
    description: "Soul-erasing blue flame.",
  },
  {
    key: "white_lightning_drive",
    label: "White Lightning Drive",
    tier: "Exceptional",
    group: "power",
    color: "#f8fafc",
    icon: Zap,
    description: "Kinetic white spark drive.",
  },
  {
    key: "demonic_hemokinesis",
    label: "Demonic Hemokinesis",
    tier: "Exceptional",
    group: "power",
    color: "#991b1b",
    icon: Ghost,
    description: "Obsidian and scarlet demonic blood art.",
  },
  {
    key: "umbrakinesis",
    label: "Umbrakinesis",
    tier: "Exceptional",
    group: "power",
    color: "#312e81",
    icon: Moon,
  },
  {
    key: "psychokinetic_daggers",
    label: "Psychokinetic Spatial Daggers",
    tier: "Exceptional",
    group: "power",
    color: "#14b8a6",
    icon: Swords,
    description: "Portal teal psychokinetic blades.",
  },
  {
    key: "sentinel_frame_tech",
    label: "Sentinel Frame Tech",
    tier: "Exceptional",
    group: "role",
    color: "#60a5fa",
    icon: Bot,
    description: "Titanium gray frames with repulsor blue.",
  },
  {
    key: "vanguard_x_protocol",
    label: "Vanguard-X Protocol",
    tier: "Exceptional",
    group: "role",
    color: "#b45309",
    icon: Shield,
    description: "Frontline bronze with neural red.",
  },

  // ---- Unique ----
  {
    key: "domain_expansion",
    label: "Domain Expansion",
    tier: "Unique",
    group: "power",
    color: "#f59e0b",
    icon: Expand,
  },
  {
    key: "tech_suits",
    label: "Tech Suits",
    tier: "Unique",
    group: "role",
    color: "#64748b",
    icon: Shield,
  },
  {
    key: "kinetic_suits",
    label: "Kinetic Suits",
    tier: "Unique",
    group: "role",
    color: "#eab308",
    icon: Zap,
  },
  {
    key: "prismorph",
    label: "Prismorph Adaptive Shapeshifting",
    tier: "Unique",
    group: "power",
    color: "#d4af37",
    icon: Shuffle,
    description: "Hybrid silver-gold adaptive form.",
  },
  {
    key: "azure_revenant_state",
    label: "Azure Revenant State",
    tier: "Unique",
    group: "power",
    color: "#0891b2",
    icon: Ghost,
    description: "Cyan-violet revenant aura.",
  },
  {
    key: "paleborne_nightmare",
    label: "Paleborne Nightmare Dominion",
    tier: "Unique",
    group: "power",
    color: "#eab308",
    icon: Ghost,
    description: "Predatory red and yellow nightmare dominion.",
  },
  {
    key: "ghost_01_armament",
    label: "Ghost-01 Softcore Armament",
    tier: "Unique",
    group: "role",
    color: "#64748b",
    icon: Bot,
    description: "Tactical steel with hardening shimmer.",
  },
  {
    key: "architect_cube_guardian",
    label: "Architect Cube Guardian",
    tier: "Exceptional",
    group: "role",
    color: "#ff9f1c",
    icon: Crown,
    description: "Agnus-bound structural authority — architect amber / monolith gold.",
  },

  // ---- Ancient / special powers ----
  {
    key: "blood_art",
    label: "Blood Art",
    tier: "Ancient",
    group: "art",
    color: "#991b1b",
    icon: Scroll,
  },
  {
    key: "ancient_art",
    label: "Ancient Art",
    tier: "Ancient",
    group: "art",
    color: "#78716c",
    icon: BookOpen,
  },

  // ---- Elements ----
  {
    key: "flame",
    label: "Flame",
    tier: "Standard",
    group: "element",
    color: "#f97316",
    icon: Flame,
  },
  { key: "fire", label: "Fire", tier: "Standard", group: "element", color: "#ea580c", icon: Flame },
  {
    key: "earth",
    label: "Earth",
    tier: "Standard",
    group: "element",
    color: "#a16207",
    icon: Mountain,
  },
  {
    key: "nature",
    label: "Nature",
    tier: "Standard",
    group: "element",
    color: "#22c55e",
    icon: Leaf,
  },
  {
    key: "water",
    label: "Water",
    tier: "Standard",
    group: "element",
    color: "#0ea5e9",
    icon: Droplets,
  },
  { key: "wind", label: "Wind", tier: "Standard", group: "element", color: "#4ade80", icon: Wind },
  {
    key: "lightning",
    label: "Lightning",
    tier: "Standard",
    group: "element",
    color: "#eab308",
    icon: Zap,
  },
  {
    key: "purple_lightning",
    label: "Purple Lightning",
    tier: "Standard",
    group: "element",
    color: "#c084fc",
    icon: Zap,
  },
  {
    key: "healing",
    label: "Healing",
    tier: "Standard",
    group: "element",
    color: "#34d399",
    icon: HeartPulse,
  },
  {
    key: "speed",
    label: "Speed",
    tier: "Standard",
    group: "power",
    color: "#4ade80",
    icon: Rabbit,
  },

  // ---- Signature powers / techniques ----
  {
    key: "portal",
    label: "Portal",
    tier: "Standard",
    group: "power",
    color: "#38bdf8",
    icon: DoorOpen,
  },
  {
    key: "authority",
    label: "Authority",
    tier: "Standard",
    group: "power",
    color: "#eab308",
    icon: Crown,
  },
  {
    key: "destructive",
    label: "Destructive",
    tier: "Standard",
    group: "power",
    color: "#dc2626",
    icon: Bomb,
  },
  {
    key: "shadow_steps",
    label: "Shadow Steps",
    tier: "Standard",
    group: "art",
    color: "#64748b",
    icon: Footprints,
  },
  {
    key: "long_range",
    label: "Long Range",
    tier: "Standard",
    group: "art",
    color: "#94a3b8",
    icon: Locate,
  },
  {
    key: "rune_magic",
    label: "Rune Magic",
    tier: "Standard",
    group: "art",
    color: "#a78bfa",
    icon: Hash,
  },
  {
    key: "card_magic",
    label: "Card Magic",
    tier: "Standard",
    group: "art",
    color: "#f472b6",
    icon: CreditCard,
  },
  { key: "jester", label: "Jester", tier: "Role", group: "role", color: "#f472b6", icon: Drama },
  {
    key: "super_soldier",
    label: "Super Soldier",
    tier: "Standard",
    group: "role",
    color: "#60a5fa",
    icon: Shield,
  },

  // ---- Combat roles ----
  {
    key: "assassin",
    label: "Assassin",
    tier: "Role",
    group: "role",
    color: "#dc2626",
    icon: Crosshair,
  },
  { key: "spy", label: "Spy", tier: "Role", group: "role", color: "#64748b", icon: Eye },
  {
    key: "combat_specialist",
    label: "Combat Specialist",
    tier: "Role",
    group: "role",
    color: "#f97316",
    icon: Swords,
  },
  {
    key: "tactician",
    label: "Tactician",
    tier: "Role",
    group: "role",
    color: "#0ea5e9",
    icon: Landmark,
  },
  {
    key: "swordsman",
    label: "Swordsman",
    tier: "Role",
    group: "role",
    color: "#94a3b8",
    icon: Swords,
  },
  {
    key: "sword_master",
    label: "Sword Master",
    tier: "Role",
    group: "role",
    color: "#d4af37",
    icon: Swords,
  },
  {
    key: "beast_transformation",
    label: "Beast Transformation",
    tier: "Role",
    group: "role",
    color: BEAST,
    icon: PawPrint,
  },

  // ---- Beast classifications ----
  { key: "wolf", label: "Wolf", tier: "Standard", group: "beast", color: BEAST, icon: PawPrint },
  {
    key: "tiger",
    label: "Tiger",
    tier: "Standard",
    group: "beast",
    color: "#f59e0b",
    icon: PawPrint,
  },
  {
    key: "lion",
    label: "Lion",
    tier: "Standard",
    group: "beast",
    color: "#eab308",
    icon: PawPrint,
  },
  {
    key: "dragon",
    label: "Dragon",
    tier: "Standard",
    group: "beast",
    color: "#dc2626",
    icon: PawPrint,
  },
  {
    key: "hyena",
    label: "Hyena",
    tier: "Standard",
    group: "beast",
    color: "#92400e",
    icon: PawPrint,
  },
  {
    key: "snakes",
    label: "Snakes",
    tier: "Standard",
    group: "beast",
    color: "#16a34a",
    icon: PawPrint,
  },
  {
    key: "vampire",
    label: "Vampire",
    tier: "Standard",
    group: "beast",
    color: "#7f1d1d",
    icon: Moon,
  },
  {
    key: "vampire_hybrid",
    label: "Vampire Hybrid",
    tier: "Standard",
    group: "beast",
    color: "#9f1239",
    icon: Moon,
  },

  // ---- Missing combat & PDF lore abilities ----
  {
    key: "blades",
    label: "Twin Blades",
    tier: "Exceptional",
    group: "art",
    color: STEEL,
    icon: Swords,
    description: "Twin-blade evasion and close-quarters cutting art.",
  },
  {
    key: "energy",
    label: "Energy Manipulation",
    tier: "Rare",
    group: "power",
    color: "#38bdf8",
    icon: Sparkles,
    description: "Compressed energy orbs and defensive barrier counters.",
  },
  {
    key: "shishjutsu",
    label: "Shishjutsu",
    tier: "Unique",
    group: "art",
    color: "#dc2626",
    icon: Scroll,
    description:
      "Yoshiko's signature corpse manipulation through ofuda amulets, extending combat past death.",
  },
  {
    key: "ethereal_splicing",
    label: "Ethereal Splicing",
    tier: "Unique",
    group: "art",
    color: "#a855f7",
    icon: Orbit,
    description:
      "The Covenant's ritual-science fusing organic and synthetic life to overwrite memory and consciousness.",
  },
  {
    key: "omen_sight",
    label: "Omen Sight",
    tier: "Unique",
    group: "power",
    color: "#e11d48",
    icon: Eye,
    description: "Premonitory crimson sight revealing fractures in fate and bloodlines.",
  },
  {
    key: "wind_surge",
    label: "Wind Surge",
    tier: "Standard",
    group: "element",
    color: "#4ade80",
    icon: Wind,
    description: "Directed gale burst for agile traversal and close-range disruption.",
  },
  {
    key: "bloodbinding",
    label: "Bloodbinding",
    tier: "Rare",
    group: "art",
    color: "#991b1b",
    icon: Droplets,
    description: "Oath-forged blood pact binding targets and vitality across combat.",
  },
  {
    key: "umbra_control",
    label: "Umbra Control",
    tier: "Rare",
    group: "power",
    color: "#312e81",
    icon: Moon,
    description: "Shadow-forging dominion over surrounding darkness.",
  },
  {
    key: "errorcore",
    label: "Errorcore",
    tier: "Unique",
    group: "power",
    color: "#ef4444",
    icon: Radiation,
    description: "DEW prototype anomaly destabilizing cellular and bio-electric output.",
  },
  {
    key: "velocity_genome",
    label: "Velocity Genome",
    tier: "Rare",
    group: "power",
    color: "#22d3ee",
    icon: Gauge,
    description: "Engineered hyper-acceleration genome developed under D.E.W.",
  },
  {
    key: "mimic_form",
    label: "Mimic Form",
    tier: "Exceptional",
    group: "power",
    color: "#d97706",
    icon: Shuffle,
    description: "Aariz Maddox's adaptive beast-trait mimicry shifting form and strike weight.",
  },
];

export const ABILITY_GROUP_LABELS: Record<AbilityGroup, string> = {
  power: "Powers",
  beast: "Beast traits",
  element: "Elements",
  role: "Roles",
  art: "Arts & techniques",
};

export const TIER_ORDER: AbilityTier[] = [
  "Mythic",
  "Legendary",
  "Rare",
  "Exceptional",
  "Unique",
  "Ancient",
  "Standard",
  "Role",
];

export const TIER_LABELS: Record<AbilityTier, string> = {
  Mythic: "Mythic",
  Legendary: "Legendary",
  Rare: "Rare",
  Exceptional: "Exceptional",
  Unique: "Unique",
  Ancient: "Ancient",
  Standard: "Standard",
  Role: "Role",
};

/** "Omni Argon" / "omni-argon" / "omni_argon" all normalize the same way. */
export function normalizeAbilityKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Stored names that differ from the canonical registry label still resolve.
const ALIASES: Record<string, string> = {
  athenas_judgment: "athenas_judgement",
  athenas_judgement: "athenas_judgement",
  blue_flame: "duskmoor_blue_flame",
  blade: "gladiokinesis",
  combat_training: "combat_specialist",
  qahr: "qahr_al_wujud",
  twin_blades: "blades",
  energy_manipulation: "energy",
};

/** Canon ability assignments per canonical character name (lowercased). */
export const CANON_CHARACTER_ABILITIES: Record<string, string[]> = {
  ethan: ["aerokinesis", "wind_guardian", "energy", "wind_surge", "blood_manipulation"],
  "zayn hayes": ["astrapo_electrokinesis", "red_lightning", "crimson_astrapo", "lightning"],
  xinea: ["aether_dominion", "aether", "chaos_magic"],
  elizah: ["demonic_hemokinesis", "hemokinesis", "blood_manipulation", "omen_sight", "blood_art"],
  nilanjona: ["water_guardian", "hydrokinesis", "cryokinesis", "water"],
  grace: ["hydrokinesis", "athenas_judgement", "healing", "energy"],
  "ayaan siddique": ["super_speed", "tech_genius"],
  "samuel sterling": ["ghost_01_armament", "kinetic_suits", "combat_specialist"],
  david: ["destructive_legendary", "psychokinetic_daggers", "portal"],
  "alter david": ["ethereal_splicing", "reality_bend", "portal"],
  maliha: ["tech_genius", "healing", "psychokinetic_daggers"],
  "aariz maddox": ["bestiakinesis", "beast_transformation", "mimic_form", "nature_guardian"],
  saya: ["nature_guardian", "super_speed", "assassin"],
  "yoshiko arashi": ["draconic_flame", "shishjutsu", "chaos_order", "earth"],
  "kazumi kurahana": ["blades", "swordsman", "shadow_steps"],
  "mashiho kurohana": ["sword_master", "flame", "combat_specialist"],
  "kensho arashi": ["ancient_art", "tactician", "sword_master"],
  "altan el-mansur": ["qahr_al_wujud", "architect_cube_guardian", "gladiokinesis"],
  "silas duskmoor": ["demonic", "earth_guardian", "duskmoor_blue_flame"],
  "tedmond duskmoor": ["sword_master", "duskmoor_blue_flame", "authority"],
  "rowan colloway": ["duskmoor_blue_flame", "red_flame_magic", "flame"],
  "derek miles": ["vanguard_x_protocol", "super_soldier", "water_guardian"],
  "eldrich aldercrest": ["aldercrest_arcane", "cryokinesis", "ancient_art", "arcane_magic"],
  "damian brown": ["aldercrest_arcane", "rune_magic", "arcane_magic"],
  "steven aldercrest": ["architect_cube_guardian", "aldercrest_arcane", "authority"],
  khalid: ["gladiokinesis", "demonic_hemokinesis", "bloodbinding", "umbra_control", "errorcore"],
  "dorian cross": ["red_lightning", "astrapo_electrokinesis", "sword_master", "shadow_steps"],
  "weston hale": ["white_lightning_drive", "super_speed", "lightning"],
  lucas: ["super_speed", "velocity_genome", "wild_energy"],
  "lucan vale": ["velocity_genome", "super_speed", "lightning"],
  valeria: ["shadow_steps", "assassin", "gladiokinesis", "swordsman"],
  "elizabeth pristine": ["gladiokinesis", "prismorph", "vampire_hybrid"],
  arzuna: ["gladiokinesis", "blood_art", "destructive"],
  niharo: ["omni_ergon", "omni_argon", "draconic_flame"],
  arthur: ["dragon", "draconic_flame", "destructive_legendary"],
  "marcello corvani": ["combat_specialist", "tactician"],
  zaan: ["blood_art", "healing", "dark_magic", "assassin"],
  "alistair quinn": ["card_magic", "jester", "rune_magic"],
  "riven creed": ["errorcore", "tech_genius"],
  "ramiz al-ahd": ["architect_cube_guardian", "authority", "ancient_art"],
  "anna al-ahd": ["tactician", "combat_specialist"],
  "issabela al-ahd": ["rune_magic", "tactician"],
  norman: ["combat_specialist", "demonic"],
  nur: ["demonic", "shadow_steps"],
  asetra: ["domain_expansion", "reality_bend", "manipulation"],
  nytheris: ["nature_guardian", "nature", "healing"],
  "prince of demons (sparda)": ["demonic", "sword_master", "dark_magic"],
  diablo: ["demonic", "draconic_flame", "destructive_legendary"],
  orion: ["tech_suits", "kinetic_suits", "sentinel_frame_tech"],
  "aeric valenheart": ["portal", "psychokinetic_daggers"],
  stitch: ["tech_genius", "tactician", "sentinel_frame_tech"],
  mephisto: ["manipulation", "dark_magic", "card_magic"],
  pride: ["flame", "sword_master"],
  sloth: ["regeneration", "dark_magic"],
};

const CUSTOM_STORAGE_KEY = "scu_custom_abilities";

/** Admin-defined abilities persisted locally + mirrored to app_settings by the hub. */
export type CustomAbilityDef = AbilityDef;

export function getCustomAbilities(): CustomAbilityDef[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((a) => a && typeof a.label === "string") : [];
  } catch {
    return [];
  }
}

export function saveCustomAbility(def: CustomAbilityDef) {
  const list = getCustomAbilities().filter(
    (a) => normalizeAbilityKey(a.key) !== normalizeAbilityKey(def.key),
  );
  list.push(def);
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage optional */
  }
}

export function removeCustomAbility(key: string) {
  const list = getCustomAbilities().filter(
    (a) => normalizeAbilityKey(a.key) !== normalizeAbilityKey(key),
  );
  try {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage optional */
  }
}

// ---- Admin overrides: edit name/tier/color/description of ANY ability ----
const OVERRIDE_STORAGE_KEY = "scu_ability_overrides";

/** Partial def applied on top of the resolved registry/custom ability. */
export type AbilityOverride = Partial<Omit<AbilityDef, "key">>;

export function getAbilityOverrides(): Record<string, AbilityOverride> {
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAbilityOverride(key: string, override: AbilityOverride) {
  const map = getAbilityOverrides();
  map[normalizeAbilityKey(key)] = override;
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage optional */
  }
}

export function removeAbilityOverride(key: string) {
  const map = getAbilityOverrides();
  delete map[normalizeAbilityKey(key)];
  try {
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* storage optional */
  }
}

function applyOverride(def: AbilityDef): AbilityDef {
  const o = getAbilityOverrides()[normalizeAbilityKey(def.key)];
  return o ? { ...def, ...o } : def;
}

/** Registry + admin-defined customs, for pickers and the Abilities Hub. */
export function allAbilityDefs(): AbilityDef[] {
  return [...ABILITY_REGISTRY, ...getCustomAbilities()];
}

const BY_KEY = new Map(ABILITY_REGISTRY.map((a) => [a.key, a]));
const BY_LABEL = new Map(ABILITY_REGISTRY.map((a) => [a.label.toLowerCase(), a]));
const CUSTOM_KEY = new Map<string, AbilityDef>();
const CUSTOM_LABEL = new Map<string, AbilityDef>();

function refreshCustomMaps() {
  CUSTOM_KEY.clear();
  CUSTOM_LABEL.clear();
  for (const a of getCustomAbilities()) {
    CUSTOM_KEY.set(a.key, a);
    CUSTOM_LABEL.set(a.label.toLowerCase(), a);
  }
}

/** Resolve a stored ability string to its registry definition (or a generic fallback). */
export function lookupAbility(name: string): AbilityDef | null {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const key = normalizeAbilityKey(trimmed);
  refreshCustomMaps();
  const direct =
    BY_LABEL.get(lower) ?? BY_KEY.get(key) ?? CUSTOM_LABEL.get(lower) ?? CUSTOM_KEY.get(key);
  const alias = ALIASES[key];
  const base = direct ?? (alias ? (BY_KEY.get(alias) ?? null) : null);
  return base ? applyOverride(base) : null;
}

/** Fallback definition for custom abilities not in the registry. */
export function genericAbility(name: string): AbilityDef {
  return {
    key: normalizeAbilityKey(name),
    label: name,
    tier: "Standard",
    group: "power",
    color: "#8b93a7",
    icon: WandSparkles,
  };
}

export function abilityDef(name: string): AbilityDef {
  return lookupAbility(name) ?? genericAbility(name);
}

/** Sort abilities: highest tier first, then alpha. */
export function sortAbilities(names: string[]): string[] {
  const rank = (n: string) => {
    const t = abilityDef(n).tier;
    const i = TIER_ORDER.indexOf(t);
    return i < 0 ? TIER_ORDER.length : i;
  };
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Find every entity field (abilities + beast_traits) containing a name. */
export function entityHasAbility(
  e: { abilities?: string[] | null; beast_traits?: string[] | null },
  name: string,
): boolean {
  const key = normalizeAbilityKey(name);
  const has = (arr?: string[] | null) =>
    (arr ?? []).some((v) => {
      const d = abilityDef(v);
      return (
        normalizeAbilityKey(v) === key ||
        normalizeAbilityKey(d.label) === key ||
        normalizeAbilityKey(d.key) === key
      );
    });
  return has(e.abilities) || has(e.beast_traits);
}
