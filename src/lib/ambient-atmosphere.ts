import { useEffect, useSyncExternalStore } from "react";

export type AtmosphereWeather = "rain" | "snow" | "mist" | "embers" | "fireflies" | "ash" | "rift";

export interface LoreAtmosphereState {
  locationId: string;
  locationName: string;
  eraId: string;
  weather: AtmosphereWeather;
  weatherLabel: string;
}

export interface LoreAtmospherePreset {
  locationId: string;
  locationName: string;
  defaultEraId: string;
  weather: AtmosphereWeather;
  eraWeather?: Record<string, AtmosphereWeather>;
}

export const AMBIENT_ATMOSPHERE_STORAGE_KEY = "scu-ambient-atmosphere";
export const LORE_LOCATION_STORAGE_KEY = "scu-lore-location";

export const WEATHER_LABELS: Record<AtmosphereWeather, string> = {
  rain: "Rainfall",
  snow: "Snowfall",
  mist: "Drifting Mist",
  embers: "Rising Embers",
  fireflies: "Canopy Fireflies",
  ash: "Ash Fall",
  rift: "Temporal Rift",
};

export const LORE_ATMOSPHERE_PRESETS: readonly LoreAtmospherePreset[] = [
  {
    locationId: "istanbul-1417",
    locationName: "Istanbul",
    defaultEraId: "istanbul-present",
    weather: "rain",
    eraWeather: {
      "1417": "mist",
      "istanbul-present": "rain",
    },
  },
  {
    locationId: "nilanjona",
    locationName: "Nilanjona's Realm",
    defaultEraId: "nila-present",
    weather: "snow",
    eraWeather: {
      "pre-asetra": "mist",
      "nila-present": "snow",
    },
  },
  {
    locationId: "yasnaya",
    locationName: "Yasnaya",
    defaultEraId: "golden",
    weather: "fireflies",
    eraWeather: {
      ancient: "mist",
      golden: "fireflies",
      "redline-s2": "embers",
    },
  },
  {
    locationId: "aethmos",
    locationName: "Aethmos",
    defaultEraId: "enclave",
    weather: "rain",
    eraWeather: {
      enclave: "rain",
      exile: "fireflies",
    },
  },
  {
    locationId: "romania-15th",
    locationName: "Romania",
    defaultEraId: "romania-15th",
    weather: "rain",
    eraWeather: {
      "romania-15th": "rain",
    },
  },
  {
    locationId: "rome",
    locationName: "Rome",
    defaultEraId: "rome-15th",
    weather: "embers",
    eraWeather: {
      "rome-15th": "embers",
      "rome-present": "mist",
    },
  },
  {
    locationId: "ruincity",
    locationName: "RuinCity",
    defaultEraId: "post",
    weather: "ash",
    eraWeather: {
      pre: "rain",
      post: "ash",
    },
  },
  {
    locationId: "pocket-dimension",
    locationName: "Pocket Dimension",
    defaultEraId: "timeless",
    weather: "rift",
    eraWeather: {
      timeless: "rift",
    },
  },
] as const;

const PRESET_BY_ID = new Map<string, LoreAtmospherePreset>(
  LORE_ATMOSPHERE_PRESETS.map((p) => [p.locationId, p]),
);

const DEFAULT_SELECTION = {
  locationId: "nilanjona",
  eraId: "nila-present",
};

function normalizeLocationId(rawId: string | null | undefined): string {
  if (!rawId) return DEFAULT_SELECTION.locationId;
  const cleaned = rawId.trim().toLowerCase();
  if (PRESET_BY_ID.has(cleaned)) return cleaned;
  if (cleaned.includes("nilanjona") || cleaned.includes("water")) return "nilanjona";
  if (cleaned.includes("istanbul") || cleaned.includes("bosphorus")) return "istanbul-1417";
  if (cleaned.includes("yasnaya")) return "yasnaya";
  if (cleaned.includes("aethmos")) return "aethmos";
  if (cleaned.includes("romania") || cleaned.includes("carpathian")) return "romania-15th";
  if (cleaned.includes("rome")) return "rome";
  if (cleaned.includes("ruin")) return "ruincity";
  if (cleaned.includes("pocket") || cleaned.includes("rift")) return "pocket-dimension";
  return DEFAULT_SELECTION.locationId;
}

export function resolveLocationAtmosphere(
  locationId?: string | null,
  eraId?: string | null,
): LoreAtmosphereState {
  const normId = normalizeLocationId(locationId);
  const preset = PRESET_BY_ID.get(normId) ?? LORE_ATMOSPHERE_PRESETS[1]!;
  const resolvedEra = eraId?.trim() || preset.defaultEraId;
  const eraMatch = preset.eraWeather?.[resolvedEra];
  const weather = eraMatch ?? preset.weather;
  return {
    locationId: preset.locationId,
    locationName: preset.locationName,
    eraId: resolvedEra,
    weather,
    weatherLabel: WEATHER_LABELS[weather],
  };
}

export function readAmbientAtmosphere(): boolean {
  try {
    const raw = localStorage.getItem(AMBIENT_ATMOSPHERE_STORAGE_KEY);
    return raw === "on" || raw === "true";
  } catch {
    return false;
  }
}

export function readCurrentLoreLocation(): { locationId: string; eraId: string } {
  try {
    const raw = localStorage.getItem(LORE_LOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { locationId?: string; eraId?: string };
      const resolved = resolveLocationAtmosphere(parsed.locationId, parsed.eraId);
      return { locationId: resolved.locationId, eraId: resolved.eraId };
    }
  } catch {
    /* storage optional */
  }
  return { ...DEFAULT_SELECTION };
}

let cachedLocSnapshot: LoreAtmosphereState = resolveLocationAtmosphere(
  DEFAULT_SELECTION.locationId,
  DEFAULT_SELECTION.eraId,
);

function readLoreAtmosphereSnapshot(): LoreAtmosphereState {
  const cur = readCurrentLoreLocation();
  const next = resolveLocationAtmosphere(cur.locationId, cur.eraId);
  if (
    cachedLocSnapshot.locationId === next.locationId &&
    cachedLocSnapshot.eraId === next.eraId &&
    cachedLocSnapshot.weather === next.weather
  ) {
    return cachedLocSnapshot;
  }
  cachedLocSnapshot = next;
  return cachedLocSnapshot;
}

export function syncAmbientAtmosphereHtml(
  root: HTMLElement | undefined = typeof document !== "undefined"
    ? document.documentElement
    : undefined,
): void {
  if (!root) return;
  const enabled = readAmbientAtmosphere();
  const loc = readLoreAtmosphereSnapshot();
  root.dataset["ambientAtmosphere"] = enabled ? "on" : "off";
  root.dataset["loreLocation"] = loc.locationId;
  root.dataset["loreEra"] = loc.eraId;
  root.dataset["loreWeather"] = loc.weather;
}

export function setAmbientAtmosphere(enabled: boolean): void {
  try {
    localStorage.setItem(AMBIENT_ATMOSPHERE_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    /* storage optional */
  }
  syncAmbientAtmosphereHtml();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:ambient-atmosphere-change", { detail: enabled }));
  }
}

export function setCurrentLoreLocation(locationId: string, eraId?: string): void {
  const resolved = resolveLocationAtmosphere(locationId, eraId);
  try {
    localStorage.setItem(
      LORE_LOCATION_STORAGE_KEY,
      JSON.stringify({ locationId: resolved.locationId, eraId: resolved.eraId }),
    );
  } catch {
    /* storage optional */
  }
  cachedLocSnapshot = resolved;
  syncAmbientAtmosphereHtml();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:lore-location-change", { detail: resolved }));
  }
}

function subscribeAmbientAtmosphere(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === AMBIENT_ATMOSPHERE_STORAGE_KEY) cb();
  };
  window.addEventListener("scu:ambient-atmosphere-change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("scu:ambient-atmosphere-change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeLoreAtmosphere(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => cb();
  const onStorage = (e: StorageEvent) => {
    if (e.key === LORE_LOCATION_STORAGE_KEY) cb();
  };
  window.addEventListener("scu:lore-location-change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("scu:lore-location-change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAmbientAtmosphere(): [boolean, (next: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribeAmbientAtmosphere,
    readAmbientAtmosphere,
    () => false,
  );
  return [enabled, setAmbientAtmosphere];
}

const SERVER_LORE_SNAPSHOT: LoreAtmosphereState = resolveLocationAtmosphere(
  DEFAULT_SELECTION.locationId,
  DEFAULT_SELECTION.eraId,
);

export function useLoreAtmosphere(): LoreAtmosphereState {
  return useSyncExternalStore(
    subscribeLoreAtmosphere,
    readLoreAtmosphereSnapshot,
    () => SERVER_LORE_SNAPSHOT,
  );
}

export function useAmbientAtmosphereSync(): void {
  const [enabled] = useAmbientAtmosphere();
  const lore = useLoreAtmosphere();

  useEffect(() => {
    syncAmbientAtmosphereHtml();
  }, [enabled, lore.locationId, lore.eraId, lore.weather]);
}
