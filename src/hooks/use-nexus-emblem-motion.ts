import { useSyncExternalStore } from "react";

export const NEXUS_STATIC_EMBLEMS_KEY = "scu-nexus-static-emblems";
const EVENT = "scu-nexus-emblem-motion-change";
export function resolveStaticEmblems(value: string | null) { return value === "true"; }
export function setStaticNexusEmblems(enabled: boolean) {
  try { localStorage.setItem(NEXUS_STATIC_EMBLEMS_KEY, String(enabled)); } catch { /* optional storage */ }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(notify: () => void) {
  const changed = (event: StorageEvent) => { if (event.key === NEXUS_STATIC_EMBLEMS_KEY || event.key === null) notify(); };
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", changed);
  return () => { window.removeEventListener(EVENT, notify); window.removeEventListener("storage", changed); };
}
export function useStaticNexusEmblems() {
  return useSyncExternalStore(subscribe, () => {
    try { return resolveStaticEmblems(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY)); } catch { return false; }
  }, () => false);
}
export function staticEmblemPresentation(preference: boolean, motionEnabled: boolean) {
  return preference || !motionEnabled;
}