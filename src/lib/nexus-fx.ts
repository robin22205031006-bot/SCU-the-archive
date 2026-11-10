export const NEXUS_THEMES = [
  { id: "fire", label: "Pyre · Fire" },
  { id: "water", label: "Tide · Water" },
  { id: "storm", label: "Voltage · Lightning" },
  { id: "frost", label: "Cryo · Ice" },
  { id: "wind", label: "Tempest · Wind" },
  { id: "nature", label: "Verdant · Life" },
  { id: "void", label: "Rift · Void" },
] as const;
export type NexusTheme = typeof NEXUS_THEMES[number]["id"];
export type NexusEffect = NexusTheme | "bloodline" | "organization" | "archive";
export function resolveNexusTheme(value: string | null): NexusTheme {
  return NEXUS_THEMES.find(t => t.id === value)?.id ?? "storm";
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