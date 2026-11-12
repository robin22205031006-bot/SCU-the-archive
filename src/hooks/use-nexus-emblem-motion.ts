import { useSyncExternalStore } from "react";

export const NEXUS_STATIC_EMBLEMS_KEY = "scu-nexus-static-emblems";
const EVENT = "scu-nexus-emblem-motion-change";
export type NexusEmblemMotion = "system" | "static";
export function resolveNexusEmblemMotion(value: string | null): NexusEmblemMotion {
  return value === "true" || value === "static" ? "static" : "system";
}
export function resolveStaticEmblems(value: string | null) {
  return value === "true";
}
export function setNexusEmblemMotion(mode: NexusEmblemMotion) {
  try {
    localStorage.setItem(NEXUS_STATIC_EMBLEMS_KEY, mode === "static" ? "true" : "system");
  } catch {
    /* optional storage */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function setStaticNexusEmblems(enabled: boolean) {
  setNexusEmblemMotion(enabled ? "static" : "system");
}
function subscribe(notify: () => void) {
  const changed = (event: StorageEvent) => {
    if (event.key === NEXUS_STATIC_EMBLEMS_KEY || event.key === null) notify();
  };
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", changed);
  };
}
export function useNexusEmblemMotion() {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return resolveNexusEmblemMotion(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY));
      } catch {
        return "system" as const;
      }
    },
    () => "system" as const,
  );
}
export function useStaticNexusEmblems() {
  return useNexusEmblemMotion() === "static";
}
export function staticEmblemPresentation(preference: boolean, motionEnabled: boolean) {
  return preference || !motionEnabled;
}
