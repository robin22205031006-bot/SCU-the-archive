/** Exact presentation identities precede broad elemental/icon fallbacks. */
export const NEXUS_DISTINCT_ART = [
  "sky-guardian", "reality-bend", "arcane-magic", "hemokinesis",
  "sanguine-shift", "chaos-magic", "chaos-order", "gladiokinesis",
  "domain-expansion", "demonic-hemokinesis", "kinetic-suits", "flame",
  "wind-guardian", "earth-guardian", "water-guardian", "nature-guardian",
  "cube-guardian", "shadow-steps", "combat-specialist", "assassin-role",
  "spy", "sword-master", "swordsman", "beast-transformation",
  "tiger", "lion", "dragon", "hyena",
  "snakes", "strategy", "magic-cast", "wild-accuracy",
  "short-range-brutal", "dagger-portals", "hand-to-hand", "superstrength",
  "supersoldier", "skilled-assassin", "combat-master", "athletic",
  "super-flexible", "stealth-kill", "brutal", "precise", "ghost",
] as const;
export type NexusDistinctArt = typeof NEXUS_DISTINCT_ART[number];

const aliases: Record<string, NexusDistinctArt> = {
  sanguinshift: "sanguine-shift", gladokinesis: "gladiokinesis",
  domainexpension: "domain-expansion", chaosandorder: "chaos-order",
  architectcubeguardian: "cube-guardian", swordman: "swordsman",
  dragoon: "dragon", snake: "snakes", tactician: "strategy",
  magiccasting: "magic-cast", handtohandfight: "hand-to-hand",
  handtohandcombat: "hand-to-hand", superstrength: "superstrength",
  psychokineticspatialdaggers: "dagger-portals", psychokineticdaggers: "dagger-portals",
  arcanemagiccasting: "arcane-magic",
};
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const exact = new Map<string, NexusDistinctArt>(NEXUS_DISTINCT_ART.map(key => [normalize(key), key]));
export function nexusDistinctArt(name: string): NexusDistinctArt | undefined {
  const key = normalize(name);
  return exact.get(key) ?? aliases[key];
}
export function nexusDistinctTile(art: string) {
  const index = NEXUS_DISTINCT_ART.findIndex(key => key === art);
  return index < 0 ? undefined : { sheet: Math.floor(index / 16), tile: index % 16 };
}