export const NEXUS_THEMES = [
  { id: "fire", label: "Pyre · Fire", base: "fire" },
  { id: "water", label: "Tide · Water", base: "water" },
  { id: "storm", label: "Voltage · Lightning", base: "storm" },
  { id: "frost", label: "Cryo · Ice", base: "frost" },
  { id: "wind", label: "Tempest · Wind", base: "wind" },
  { id: "nature", label: "Verdant · Life", base: "nature" },
  { id: "void", label: "Rift · Void", base: "void" },
  { id: "duskmoor", label: "Duskmoor · Blue Pyre", base: "fire" },
  { id: "draconic", label: "Draconic · Dragon Flame", base: "fire" },
  { id: "whiteline", label: "White Lightning Drive", base: "storm" },
  { id: "crimson", label: "Crimson Astrapo", base: "storm" },
  { id: "karayazgi", label: "Kara Yazgi · Cursed Blade", base: "void" },
  { id: "hemokinesis", label: "Demonic Blood", base: "void" },
  { id: "aether", label: "Aether Dominion", base: "void" },
  { id: "skyguardian", label: "Sky Guardian · Halo", base: "wind" },
  { id: "aethmos", label: "Aethmos · Dreamwood", base: "nature" },
  { id: "glacier", label: "Glacial Sanctuary", base: "frost" },
  { id: "ruincity", label: "RuinCity · Warzone", base: "storm" },
] as const;
export type NexusBaseEffect = "fire" | "water" | "storm" | "frost" | "wind" | "nature" | "void";
/** Lore themes reuse one of the background simulations but carry their own palette and ambient layer. */
export function nexusThemeBase(theme: string): NexusBaseEffect {
  return (NEXUS_THEMES.find((t) => t.id === theme)?.base ?? "storm") as NexusBaseEffect;
}
export type NexusTheme = (typeof NEXUS_THEMES)[number]["id"];
export type NexusEffect = NexusBaseEffect | "bloodline" | "organization" | "archive";
export function resolveNexusTheme(value: string | null): NexusTheme {
  return NEXUS_THEMES.find((t) => t.id === value)?.id ?? "storm";
}
/** Classify visible labels only; never feed masked character abilities into effects. */
export function nexusEffect(label: string): NexusEffect {
  const s = label.toLowerCase();
  if (/fire|flame|pyro|ember|inferno|burn|solar/.test(s)) return "fire";
  if (/ice|frost|cryo|glacier|snow/.test(s)) return "frost";
  if (/thunder|lightning|electric|storm|voltage/.test(s)) return "storm";
  if (/water|tide|ocean|aqua|hydro/.test(s)) return "water";
  if (/wind|air|aero|tempest/.test(s)) return "wind";
  if (/bloodline|lineage|blood|clan/.test(s)) return "bloodline";
  if (/organization|organisation|faction|cult|guild|order/.test(s)) return "organization";
  if (/heal|life|nature|plant|forest/.test(s)) return "nature";
  if (/void|shadow|dark|space|gravity/.test(s)) return "void";
  return "archive";
}
