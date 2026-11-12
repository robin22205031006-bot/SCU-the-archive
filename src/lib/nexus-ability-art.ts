import { NEXUS_DISTINCT_ART, nexusDistinctArt } from "@/lib/nexus-distinct-art";

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

/** Presentation classification only: never changes ability membership or lore. */
export function nexusAbilityArt(name: string, iconName = ""): NexusAbilityArt {
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
    [/spirit|ghost|revenant|demonic/, "spirit"],
    [/portal|door/, "portal"],
    [/destruct|bomb|qahr/, "destruction"],
    [/authority|crown/, "authority"],
    [/tactician|tactics|landmark/, "tactics"],
    [/tech|cpu|bot|circuit|frame/, "tech"],
    [/shield|suit|soldier|protocol/, "shield"],
    [/light\b|solar|sun/, "light"],
    [/ancient art|blood art|book|scroll/, "art"],
  ];
  return (
    rules.find(([pattern]) => pattern.test(s))?.[1] ??
    (iconName ? nexusAbilityArt(iconName) : "aether")
  );
}
