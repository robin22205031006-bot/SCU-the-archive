import { useSyncExternalStore } from "react";
import { resolveNexusTheme, type NexusTheme } from "@/lib/nexus-fx";
const KEY = "scu-nexus-theme";
const EVENT = "scu-nexus-theme-change";
export function setNexusTheme(theme: NexusTheme) {
  try { localStorage.setItem(KEY, theme); } catch { /* optional storage */ }
  window.dispatchEvent(new Event(EVENT));
}
export function useNexusTheme() {
  return useSyncExternalStore(cb => {
    const changed = (e: StorageEvent) => { if (e.key === KEY) cb(); };
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", changed);
    return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", changed); };
  }, () => { try { return resolveNexusTheme(localStorage.getItem(KEY)); } catch { return resolveNexusTheme(null); } }, () => resolveNexusTheme(null));
}