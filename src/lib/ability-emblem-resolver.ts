import type { NexusAbilityArt } from "@/lib/nexus-ability-art";

export type AbilityCustomEmblemKind =
  | "ofuda"
  | "dna-splice"
  | "omen-eye"
  | "blood-pact"
  | "umbra"
  | "error-glitch"
  | "velocity-helix"
  | "mimic-shift"
  | "twin-blades"
  | "energy-orb"
  | "wind-gale"
  | "time-hourglass"
  | "portal-rift"
  | "judgement-scales"
  | "authority-crown"
  | "sound-wave"
  | "shield-ward"
  | "cosmic-prism"
  | "alchemy-flask"
  | "ember-sigil"
  | "volt-coil"
  | "frost-crystal"
  | "cube-monolith"
  | "demonic-sigil"
  | "arcane-sigil"
  | "card-arcana"
  | "dragon-crest"
  | "serpent-fang"
  | "beast-claw"
  | "domain-mandala"
  | "cyber-core"
  | "tactical-reticle"
  | "vital-lotus"
  | "tidal-crest"
  | "terra-bastion"
  | "spatial-dagger"
  | "chaos-vortex"
  | "yin-yang-order";

interface SemanticRule {
  pattern: RegExp;
  custom: AbilityCustomEmblemKind;
  nexusArt: NexusAbilityArt;
}

const DESCRIPTION_AND_NAME_RULES: readonly SemanticRule[] = [
  {
    pattern: /shishjutsu|ofuda|amulet|corpse manipulation|past death|talisman|necromanc/i,
    custom: "ofuda",
    nexusArt: "spirit",
  },
  {
    pattern:
      /ethereal[\s_-]*splicing|splic|organic and synthetic|overwrite memory|consciousness|covenant.*ritual/i,
    custom: "dna-splice",
    nexusArt: "alchemy",
  },
  {
    pattern: /omen[\s_-]*sight|premonit|fractures in fate|fate|crimson sight|foresight|prophec/i,
    custom: "omen-eye",
    nexusArt: "psychic",
  },
  {
    pattern: /architect[\s_-]*cube|cube guardian|monolith gold|structural authority/i,
    custom: "cube-monolith",
    nexusArt: "cube-guardian",
  },
  {
    pattern: /chaos[\s_-]*(?:&|and)?[\s_-]*order|duality|shinobi slate/i,
    custom: "yin-yang-order",
    nexusArt: "chaos-order",
  },
  {
    pattern:
      /psychokinetic[\s_-]*(?:spatial[\s_-]*)?daggers?|spatial[\s_-]*blades?|dagger[\s_-]*portals?/i,
    custom: "spatial-dagger",
    nexusArt: "dagger-portals",
  },
  {
    pattern:
      /bloodbinding|oath-forged|blood pact|vitality across combat|crimson oath|binding ritual/i,
    custom: "blood-pact",
    nexusArt: "blood",
  },
  {
    pattern: /demonic[\s_-]*hemokinesis|demonic|paleborne|nightmare dominion|revenant|vampire/i,
    custom: "demonic-sigil",
    nexusArt: "demonic-hemokinesis",
  },
  {
    pattern: /blood[\s_-]*manipulation|hemokinesis|sanguine|blood[\s_-]*art/i,
    custom: "blood-pact",
    nexusArt: "hemokinesis",
  },
  {
    pattern:
      /umbra[\s_-]*control|umbrakinesis|shadow-forging|surrounding darkness|shadow[\s_-]*steps|umbra|umbral/i,
    custom: "umbra",
    nexusArt: "shadow",
  },
  {
    pattern:
      /errorcore|error[\s_-]*core|prototype anomaly|destabilizing.*bio-electric|glitch|corrupt/i,
    custom: "error-glitch",
    nexusArt: "tech",
  },
  {
    pattern:
      /sentinel[\s_-]*frame|ghost[\s_-]*01|tech[\s_-]*(?:genius|suits)|kinetic[\s_-]*suits|repulsor|hardening shimmer/i,
    custom: "cyber-core",
    nexusArt: "tech",
  },
  {
    pattern:
      /velocity[\s_-]*genome|hyper-acceleration|acceleration genome|d\.?e\.?w\.?.*speed|super[\s_-]*speed/i,
    custom: "velocity-helix",
    nexusArt: "speed",
  },
  {
    pattern: /mimic[\s_-]*form|beast-trait mimicry|adaptive.*mimic|shifting form|strike weight/i,
    custom: "mimic-shift",
    nexusArt: "shapeshift",
  },
  {
    pattern: /domain[\s_-]*expansion|reality[\s_-]*bend|manipulation/i,
    custom: "domain-mandala",
    nexusArt: "domain-expansion",
  },
  {
    pattern: /chaos[\s_-]*magic|wild[\s_-]*energy|entropy/i,
    custom: "chaos-vortex",
    nexusArt: "chaos-magic",
  },
  {
    pattern:
      /\btwin[\s_-]*blades?\b|twin-blade|close-quarters cutting|gladiokinesis|sword[\s_-]*master|swordsman/i,
    custom: "twin-blades",
    nexusArt: "sword",
  },
  {
    pattern:
      /^energy$|energy manipulation|compressed energy orbs|barrier counters|mana orb|aether(?! dominion)/i,
    custom: "energy-orb",
    nexusArt: "aether",
  },
  {
    pattern:
      /wind[\s_-]*surge|wind[\s_-]*guardian|aerokinesis|\bwind\b|gale burst|agile traversal|cyclone|zephyr/i,
    custom: "wind-gale",
    nexusArt: "wind",
  },
  {
    pattern: /card[\s_-]*magic|jester|tarot|playing card/i,
    custom: "card-arcana",
    nexusArt: "cards",
  },
  {
    pattern:
      /aldercrest|arcane|rune[\s_-]*magic|dark[\s_-]*magic|ancient[\s_-]*art|sorcerer|sigil/i,
    custom: "arcane-sigil",
    nexusArt: "arcane-magic",
  },
  {
    pattern: /draconic|dragon|wyrm/i,
    custom: "dragon-crest",
    nexusArt: "dragon",
  },
  {
    pattern: /snakes?|serpent|venom|viper/i,
    custom: "serpent-fang",
    nexusArt: "snakes",
  },
  {
    pattern: /bestiakinesis|beast|wolf|tiger|lion|hyena|feral|predator|claw|fang/i,
    custom: "beast-claw",
    nexusArt: "beast",
  },
  {
    pattern: /overwatch|long[\s_-]*range|assassin|\bspy\b|sniper|recon|stealth|precision|aim/i,
    custom: "tactical-reticle",
    nexusArt: "bow",
  },
  {
    pattern: /chrono|hourglass|temporal|time loop|rewinds|\btime\b/i,
    custom: "time-hourglass",
    nexusArt: "time",
  },
  {
    pattern: /portal|dimensional rift|spatial gate|warp gate|teleport/i,
    custom: "portal-rift",
    nexusArt: "portal",
  },
  {
    pattern: /judg(e)?ment|balance scales|verdict|retribution/i,
    custom: "judgement-scales",
    nexusArt: "judgement",
  },
  {
    pattern: /authority|sovereign|crown|commanding aura|imperial|qahr/i,
    custom: "authority-crown",
    nexusArt: "authority",
  },
  {
    pattern: /echo|rhythm|resonance|harmonic|ultrasonic|soundwave|acoustic|melody/i,
    custom: "sound-wave",
    nexusArt: "sound",
  },
  {
    pattern:
      /vanguard|aegis|bulwark|fortress|barrier|defensive dome|armor plate|super[\s_-]*soldier|tactician|combat[\s_-]*specialist/i,
    custom: "shield-ward",
    nexusArt: "shield",
  },
  {
    pattern:
      /prism|refract|spectral|light beam|prismorph|kaleidoscope|omni[\s_-]*(?:ergon|argon)|aether[\s_-]*dominion|sky[\s_-]*guardian/i,
    custom: "cosmic-prism",
    nexusArt: "omni-ergon",
  },
  {
    pattern: /alchem|serum|toxin|transmut|chemical|elixir/i,
    custom: "alchemy-flask",
    nexusArt: "alchemy",
  },
  {
    pattern: /ember|pyre|ignite|cinder|thermal|blaze|flame|fire|destructive/i,
    custom: "ember-sigil",
    nexusArt: "fire",
  },
  {
    pattern:
      /voltage|arc discharge|coronal|plasma|circuit|shock|electric|lightning|astrapo|hyperkinesis/i,
    custom: "volt-coil",
    nexusArt: "lightning",
  },
  {
    pattern: /frost|glacial|sub-zero|crystall|blizzard|cryokinesis|ice/i,
    custom: "frost-crystal",
    nexusArt: "ice",
  },
  {
    pattern: /healing|regenerat|vital|restor|nature[\s_-]*guardian|\bnature\b|botan|flora|verdant/i,
    custom: "vital-lotus",
    nexusArt: "healing",
  },
  {
    pattern: /water[\s_-]*guardian|hydrokinesis|\bwater\b|tidal|ocean|aquatic/i,
    custom: "tidal-crest",
    nexusArt: "water",
  },
  {
    pattern: /earth[\s_-]*guardian|\bearth\b|tectonic|seismic|boulder|terra|stone/i,
    custom: "terra-bastion",
    nexusArt: "earth",
  },
];

/**
 * Inspects both ability name AND description to derive a rich custom vector emblem kind
 * whenever an ability needs a distinct emblem tailored to its lore & mechanics.
 */
export function resolveCustomAbilityEmblem(
  name: string,
  description = "",
): AbilityCustomEmblemKind | null {
  const combined = `${name.replace(/[_-]/g, " ")} ${description}`.trim().toLowerCase();
  if (!combined) return null;
  for (const rule of DESCRIPTION_AND_NAME_RULES) {
    if (rule.pattern.test(combined)) {
      return rule.custom;
    }
  }
  return null;
}

/**
 * Inspects combined name + description text to resolve a valid `NexusAbilityArt` key
 * when direct name matching did not produce a match.
 */
export function resolveNexusArtFromDescription(
  name: string,
  description = "",
): NexusAbilityArt | null {
  const combined = `${name.replace(/[_-]/g, " ")} ${description}`.trim().toLowerCase();
  if (!combined) return null;
  for (const rule of DESCRIPTION_AND_NAME_RULES) {
    if (rule.pattern.test(combined)) {
      return rule.nexusArt;
    }
  }
  if (/heal|mend|vital|restor|sanctuary/.test(combined)) return "healing";
  if (/earth|tectonic|seismic|boulder|stone/.test(combined)) return "earth";
  if (/water|tide|ocean|wave|flood|aquatic/.test(combined)) return "water";
  if (/vine|thorn|botan|bloom|forest|spore/.test(combined)) return "nature";
  if (/wolf|claw|fang|feral|predator|beast|hunt/.test(combined)) return "beast";
  if (/strategy|tactic|command|formation|intel/.test(combined)) return "tactics";
  if (/stealth|infiltrat|conceal|cloak|ambush/.test(combined)) return "assassin";
  return null;
}
