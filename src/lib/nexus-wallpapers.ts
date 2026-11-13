export type NexusWallpaperKind = "live" | "static";

export interface NexusWallpaperItem {
  id: string;
  label: string;
  kind: NexusWallpaperKind;
  mediaUrl: string;
  posterUrl?: string | undefined;
  sourceUrl?: string | undefined;
  accentColor?: string | undefined;
  builtin?: boolean | undefined;
}

export interface NexusWallpaperSettings {
  defaultWallpaperId?: string | null | undefined;
  custom?: NexusWallpaperItem[] | undefined;
  disabledIds?: string[] | undefined;
}

export const NEXUS_WALLPAPERS_SETTINGS_KEY = "nexus_wallpapers";

export const BUILTIN_NEXUS_WALLPAPERS: readonly NexusWallpaperItem[] = [
  {
    id: "ae6787-galaxy",
    label: "AE6787 Cyber Galaxy",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/0f/88/56/0f8856bc8561c9018d93e4cdd560df11.mp4",
    posterUrl: "https://i.pinimg.com/originals/af/aa/1c/afaa1c7d1ea2779c792b6fba2a6714dc.jpg",
    sourceUrl: "https://pin.it/2yGVLpn2D",
    accentColor: "#38bdf8",
    builtin: true,
  },
  {
    id: "violet-butterfly",
    label: "Violet Morpho Motion",
    kind: "live",
    mediaUrl:
      "https://v1.pinimg.com/videos/iht/expMp4/34/ba/7e/34ba7e1c0b059d7d0bef9da79694fcde_720w.mp4",
    posterUrl: "https://i.pinimg.com/originals/94/23/9b/94239b3ece981a6674f3588ac31e1776.jpg",
    sourceUrl: "https://pin.it/4xbTozMmh",
    accentColor: "#a855f7",
    builtin: true,
  },
  {
    id: "twilight-clouds",
    label: "Crimson Twilight Clouds",
    kind: "live",
    mediaUrl:
      "https://v1.pinimg.com/videos/iht/expMp4/af/c4/43/afc44389b0d11b1a7d9afab83d23a56f_720w.mp4",
    posterUrl: "https://i.pinimg.com/originals/44/e9/a0/44e9a070794efd6d5bccd8cbf447f3c9.jpg",
    sourceUrl: "https://pin.it/32UdiSzPg",
    accentColor: "#f43f5e",
    builtin: true,
  },
  {
    id: "plexus-walloop",
    label: "Plexus Mesh Live",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/c0/76/1e/c0761e29d2259d9624a7fe3ef1467d34.mp4",
    posterUrl: "https://i.pinimg.com/originals/db/36/4a/db364ab7e844e393e2edd9abfc975e65.jpg",
    sourceUrl: "https://pin.it/6QZdObkl9",
    accentColor: "#22d3ee",
    builtin: true,
  },
  {
    id: "ascension-sky",
    label: "Ascension Night Sky",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/e6/30/a3/e630a37f11294054bb1434bfeb708956.mp4",
    posterUrl: "https://i.pinimg.com/originals/ba/fd/bf/bafdbfccbd88b6de699515efbf3d897b.jpg",
    sourceUrl: "https://pin.it/2zlQ3DgfM",
    accentColor: "#818cf8",
    builtin: true,
  },
  {
    id: "coolacloy-nebula",
    label: "Coolacloy Teal Nebula",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/2d/c6/e6/2dc6e669309baabd21cc1a114a225546.mp4",
    posterUrl: "https://i.pinimg.com/originals/51/7a/7a/517a7a76395fcaba6bc22dd493899862.jpg",
    sourceUrl: "https://pin.it/7GmIkqTW1",
    accentColor: "#2dd4bf",
    builtin: true,
  },
  {
    id: "fire-planet",
    label: "Crimson Fire Planet",
    kind: "live",
    mediaUrl:
      "https://v1.pinimg.com/videos/iht/expMp4/2a/02/53/2a02533e81a4077793c05783c03f162b_720w.mp4",
    posterUrl: "https://i.pinimg.com/originals/d2/62/5d/d2625daa76243777cfadbce53b7b9ea0.jpg",
    sourceUrl: "https://pin.it/Q08q0WqO5",
    accentColor: "#fb7185",
    builtin: true,
  },
  {
    id: "deep-space",
    label: "Deep Space Horizon",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/68/df/52/68df52519de11ed3663c1ec6e62c0e75.mp4",
    posterUrl: "https://i.pinimg.com/originals/fb/43/29/fb4329c7afb3ca7436324301248c37f3.jpg",
    sourceUrl: "https://pin.it/7jgYrNHxm",
    accentColor: "#60a5fa",
    builtin: true,
  },
  {
    id: "neon-void-galaxy",
    label: "Neon Void Galaxy",
    kind: "live",
    mediaUrl: "https://v1.pinimg.com/videos/mc/720p/4d/09/3a/4d093a35bdb725a32b1d7900bbe17f34.mp4",
    posterUrl: "https://i.pinimg.com/originals/d9/18/56/d91856fe55e449e88080b9c376735c24.jpg",
    sourceUrl: "https://pin.it/kbybNMgdJ",
    accentColor: "#c084fc",
    builtin: true,
  },
];

export function sanitizeWallpaperUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (
    /^data:(?:image\/(?:png|jpeg|jpg|webp|gif)|video\/(?:mp4|webm));base64,[a-z0-9+/=]+$/i.test(
      trimmed,
    )
  ) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function isVideoMediaUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:video/")) return true;
  if (/\.(mp4|webm|mov|m4v)(?:[?#].*)?$/.test(lower)) return true;
  return false;
}

export function isPinterestPinUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    return host === "pin.it" || host.endsWith(".pinterest.com") || host === "pinterest.com";
  } catch {
    return false;
  }
}

export function sanitizeWallpaperItem(raw: unknown): NexusWallpaperItem | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const id = typeof rec["id"] === "string" ? rec["id"].trim().slice(0, 80) : "";
  const label = typeof rec["label"] === "string" ? rec["label"].trim().slice(0, 80) : "";
  const mediaUrl = sanitizeWallpaperUrl(rec["mediaUrl"]);
  if (!id || !label || !mediaUrl) return null;
  const kind: NexusWallpaperKind =
    rec["kind"] === "static" || rec["kind"] === "live"
      ? rec["kind"]
      : isVideoMediaUrl(mediaUrl) || /\.gif(?:[?#].*)?$/i.test(mediaUrl)
        ? "live"
        : "static";
  const posterUrl = sanitizeWallpaperUrl(rec["posterUrl"]) ?? undefined;
  const sourceUrl = sanitizeWallpaperUrl(rec["sourceUrl"]) ?? undefined;
  const accentColor =
    typeof rec["accentColor"] === "string" && /^#[0-9a-f]{3,8}$/i.test(rec["accentColor"].trim())
      ? rec["accentColor"].trim()
      : undefined;

  return {
    id,
    label,
    kind,
    mediaUrl,
    ...(posterUrl ? { posterUrl } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(accentColor ? { accentColor } : {}),
    builtin: false,
  };
}

export function sanitizeWallpaperSettings(raw: unknown): NexusWallpaperSettings {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const defaultWallpaperId =
    typeof rec["defaultWallpaperId"] === "string" && rec["defaultWallpaperId"].trim()
      ? rec["defaultWallpaperId"].trim().slice(0, 80)
      : rec["defaultWallpaperId"] === null
        ? null
        : undefined;

  const customRaw = Array.isArray(rec["custom"]) ? rec["custom"] : [];
  const custom: NexusWallpaperItem[] = [];
  const seen = new Set<string>(BUILTIN_NEXUS_WALLPAPERS.map((w) => w.id));
  for (const entry of customRaw) {
    const clean = sanitizeWallpaperItem(entry);
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id);
      custom.push(clean);
    }
  }

  const disabledIds = Array.isArray(rec["disabledIds"])
    ? rec["disabledIds"]
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
    : undefined;

  return {
    ...(defaultWallpaperId !== undefined ? { defaultWallpaperId } : {}),
    ...(custom.length > 0 ? { custom } : {}),
    ...(disabledIds && disabledIds.length > 0 ? { disabledIds } : {}),
  };
}

export function mergeNexusWallpapers(
  settings?: NexusWallpaperSettings | null,
  includeDisabled = false,
): NexusWallpaperItem[] {
  const clean = sanitizeWallpaperSettings(settings);
  const disabled = new Set(clean.disabledIds ?? []);
  const builtins = includeDisabled
    ? [...BUILTIN_NEXUS_WALLPAPERS]
    : BUILTIN_NEXUS_WALLPAPERS.filter((w) => !disabled.has(w.id));
  const custom = (clean.custom ?? []).filter((w) => includeDisabled || !disabled.has(w.id));
  return [...builtins, ...custom];
}

export function resolveActiveNexusWallpaper(
  localChoice: string | null | undefined,
  settings?: NexusWallpaperSettings | null,
): NexusWallpaperItem | null {
  const available = mergeNexusWallpapers(settings, false);
  const choice = localChoice?.trim() || "auto";
  if (choice === "none") return null;
  if (choice !== "auto") {
    return available.find((w) => w.id === choice) ?? null;
  }
  const adminDefault = settings?.defaultWallpaperId;
  if (!adminDefault || adminDefault === "none") return null;
  return available.find((w) => w.id === adminDefault) ?? null;
}
