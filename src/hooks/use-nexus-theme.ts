import { useSyncExternalStore } from "react";
import { resolveNexusTheme, type NexusTheme } from "@/lib/nexus-fx";

const KEY = "scu-nexus-theme";
const EVENT = "scu-nexus-theme-change";
const FX_3D_KEY = "scu-nexus-3d-fx";
const FX_3D_EVENT = "scu-nexus-3d-fx-change";

export function setNexusTheme(theme: NexusTheme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* optional storage */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useNexusTheme() {
  return useSyncExternalStore(
    (cb) => {
      const changed = (e: StorageEvent) => {
        if (e.key === KEY) cb();
      };
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", changed);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", changed);
      };
    },
    () => {
      try {
        return resolveNexusTheme(localStorage.getItem(KEY));
      } catch {
        return resolveNexusTheme(null);
      }
    },
    () => resolveNexusTheme(null),
  );
}

export function setNexus3dFxEnabled(enabled: boolean) {
  try {
    localStorage.setItem(FX_3D_KEY, enabled ? "on" : "off");
  } catch {
    /* optional storage */
  }
  window.dispatchEvent(new Event(FX_3D_EVENT));
}

export function useNexus3dFxEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const changed = (e: StorageEvent) => {
        if (e.key === FX_3D_KEY) cb();
      };
      window.addEventListener(FX_3D_EVENT, cb);
      window.addEventListener("storage", changed);
      return () => {
        window.removeEventListener(FX_3D_EVENT, cb);
        window.removeEventListener("storage", changed);
      };
    },
    () => {
      try {
        return localStorage.getItem(FX_3D_KEY) !== "off";
      } catch {
        return true;
      }
    },
    () => true,
  );
}
