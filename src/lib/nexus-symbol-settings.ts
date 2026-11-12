export type SymbolStyle = { color?: string; anime?: boolean };
export type NexusSymbolSettings = { anime?: boolean; symbols?: Record<string, SymbolStyle> };
export const NEXUS_SYMBOL_SETTINGS_KEY = "nexus_symbol_presentation";
export function canEditEmblemColors(roles: readonly string[]) {
  return roles.includes("admin") || roles.includes("moderator");
}
export function symbolKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
export function resolveSymbolStyle(settings: NexusSymbolSettings, name: string) {
  const value = settings.symbols?.[symbolKey(name)];
  return {
    anime: value?.anime ?? settings.anime ?? false,
    color: /^#[\da-f]{6}$/i.test(value?.color ?? "") ? value?.color : undefined,
  };
}
export function tintMatrix(color: string) {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  return [
    ...channels.flatMap((c) => [0.2126 * c, 0.7152 * c, 0.0722 * c, 0, 0.1 * c]),
    0,
    0,
    0,
    1,
    0,
  ].join(" ");
}
