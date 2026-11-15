import { NEXUS_DISTINCT_ART, nexusDistinctArt } from "@/lib/nexus-distinct-art";
import { abilityDef } from "@/lib/abilities";
import { resolveNexusArtFromDescription } from "@/lib/ability-emblem-resolver";

export const NEXUS_ABILITY_ART = [
  "fire",
  "water",
  "wind",
  "ice",
  "earth",
  "nature",
  "lightning",
  "light",
  "shadow",
  "aether",
  "time",
  "psychic",
  "sword",
  "bow",
  "alchemy",
  "shield",
  "blood",
  "beast",
  "tech",
  "speed",
  "art",
  "portal",
  "destruction",
  "judgement",
  "authority",
  "spirit",
  "cards",
  "sound",
  "tactics",
  "assassin",
  "healing",
  "shapeshift",
  "vampire",
  "aether-dominion",
  "omni-ergon",
  ...NEXUS_DISTINCT_ART,
] as const;
export type NexusAbilityArt = (typeof NEXUS_ABILITY_ART)[number];

/** Presentation classification only: inspects name, description, and icon before fallback. */
export function nexusAbilityArt(name: string, iconName = "", description = ""): NexusAbilityArt {
  const distinct = nexusDistinctArt(name);
  if (distinct) return distinct;
  const s = name.toLowerCase().replace(/[_-]/g, " ");
  const rules: Array<[RegExp, NexusAbilityArt]> = [
    [/aether dominion/, "aether-dominion"],
    [/omni (ergon|argon)/, "omni-ergon"],
    [/vampir/, "vampire"],
    [/ancient art|blood art|scroll/, "art"],
    [/judgement|judgment|scale/, "judgement"],
    [/card|jester|creditcard/, "cards"],
    [/dagger|assassin/, "assassin"],
    [/sword|gladio|combat|swords/, "sword"],
    [/bow|archer|overwatch|long range|crosshair|locate/, "bow"],
    [/flame|fire|pyro|inferno|ember/, "fire"],
    [/cryo|ice|frost|snow/, "ice"],
    [/astrapo|lightning|electro|thunder|volt|hyperkinesis|zap/, "lightning"],
    [/hemo|sanguine|blood/, "blood"],
    [/water|hydro|aqua|wave|droplet/, "water"],
    [/wind|aero|tempest|air\b/, "wind"],
    [/earth|mountain|rock|stone/, "earth"],
    [/healing|regenerat|heartpulse/, "healing"],
    [/nature|plant|leaf|forest/, "nature"],
    [/alchemy|potion|poison/, "alchemy"],
    [/time|chrono|hourglass/, "time"],
    [/psych|telepath|mind|eye/, "psychic"],
    [/sound|sonic|music/, "sound"],
    [/speed|swift|rabbit|gauge/, "speed"],
    [/shapeshift|prismorph|shuffle/, "shapeshift"],
    [/wolf|tiger|lion|dragon|hyena|snake|beast|paw/, "beast"],
    [/shadow|dark|umbra|moon|nightmare/, "shadow"],
    [/portal|door/, "portal"],
    [/ghost[\s_-]*01/, "ghost"],
    [/spirit|ghost|revenant|demonic/, "spirit"],
    [/destruct|bomb|qahr/, "destruction"],
    [/authority|crown/, "authority"],
    [/tactician|tactics|landmark/, "tactics"],
    [/tech|cpu|bot|circuit|frame/, "tech"],
    [/shield|suit|soldier|protocol/, "shield"],
    [/light\b|solar|sun/, "light"],
    [/ancient art|blood art|book|scroll/, "art"],
  ];
  const byName = rules.find(([pattern]) => pattern.test(s))?.[1];
  if (byName) return byName;

  const resolvedDesc = description || abilityDef(name).description || "";
  const byDescription = resolveNexusArtFromDescription(name, resolvedDesc);
  if (byDescription) return byDescription;

  return iconName ? nexusAbilityArt(iconName) : "aether";
}
