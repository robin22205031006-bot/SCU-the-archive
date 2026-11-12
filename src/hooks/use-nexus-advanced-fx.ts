import { useSyncExternalStore } from "react";

export const NEXUS_ADVANCED_FX_KEY = "scu-nexus-advanced-fx";
const EVENT = "scu-nexus-advanced-fx-change";
export function setNexusAdvancedFx(on: boolean) {
  try {
    localStorage.setItem(NEXUS_ADVANCED_FX_KEY, on ? "on" : "off");
  } catch {
    /* optional */
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(n: () => void) {
  const s = (e: StorageEvent) => {
    if (e.key === NEXUS_ADVANCED_FX_KEY || e.key === null) n();
  };
  window.addEventListener(EVENT, n);
  window.addEventListener("storage", s);
  return () => {
    window.removeEventListener(EVENT, n);
    window.removeEventListener("storage", s);
  };
}
/** Device-local opt-in for the expanded ability FX showcase (off by default). */
export function useNexusAdvancedFx() {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(NEXUS_ADVANCED_FX_KEY) === "on";
      } catch {
        return false;
      }
    },
    () => false,
  );
}
