import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  NEXUS_WALLPAPERS_SETTINGS_KEY,
  mergeNexusWallpapers,
  resolveActiveNexusWallpaper,
  sanitizeWallpaperSettings,
  type NexusWallpaperKind,
  type NexusWallpaperSettings,
} from "@/lib/nexus-wallpapers";

const CHOICE_KEY = "scu-nexus-wallpaper";
const CHOICE_EVENT = "scu-nexus-wallpaper-change";
const MODE_KEY = "scu-nexus-wallpaper-mode";
const MODE_EVENT = "scu-nexus-wallpaper-mode-change";

export const nexusWallpaperSettingsQuery = {
  queryKey: ["app-settings", NEXUS_WALLPAPERS_SETTINGS_KEY],
  staleTime: 30_000,
  queryFn: async (): Promise<NexusWallpaperSettings> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", NEXUS_WALLPAPERS_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    return sanitizeWallpaperSettings(data?.value);
  },
};

export function useNexusWallpaperSettings(): NexusWallpaperSettings {
  return useQuery(nexusWallpaperSettingsQuery).data ?? {};
}

export function setNexusWallpaperChoice(wallpaperId: string) {
  try {
    localStorage.setItem(CHOICE_KEY, wallpaperId);
  } catch {
    /* optional storage */
  }
  window.dispatchEvent(new Event(CHOICE_EVENT));
}

export function useNexusWallpaperChoice(): string {
  return useSyncExternalStore(
    (cb) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === CHOICE_KEY) cb();
      };
      window.addEventListener(CHOICE_EVENT, cb);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(CHOICE_EVENT, cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => {
      try {
        return localStorage.getItem(CHOICE_KEY) || "auto";
      } catch {
        return "auto";
      }
    },
    () => "auto",
  );
}

export function setNexusWallpaperPlayback(mode: NexusWallpaperKind) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* optional storage */
  }
  window.dispatchEvent(new Event(MODE_EVENT));
}

export function useNexusWallpaperPlayback(): NexusWallpaperKind {
  return useSyncExternalStore(
    (cb) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === MODE_KEY) cb();
      };
      window.addEventListener(MODE_EVENT, cb);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(MODE_EVENT, cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => {
      try {
        return localStorage.getItem(MODE_KEY) === "static" ? "static" : "live";
      } catch {
        return "live";
      }
    },
    () => "live",
  );
}

export function useActiveNexusWallpaper() {
  const settings = useNexusWallpaperSettings();
  const choice = useNexusWallpaperChoice();
  const playback = useNexusWallpaperPlayback();
  const wallpapers = mergeNexusWallpapers(settings, false);
  const wallpaper = resolveActiveNexusWallpaper(choice, settings);

  return {
    settings,
    choice,
    playback,
    wallpapers,
    wallpaper,
  };
}
