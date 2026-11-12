import { useSyncExternalStore } from "react";

/** Reader-chosen interface style. "classic" = original cards, "nexus" = constellation UI. */
export type UiStyle = "classic" | "nexus" | "minimal";
export const UI_STYLES = [
  { value: "classic", label: "Descrete" },
  { value: "nexus", label: "Nexus" },
  { value: "minimal", label: "Minimal" },
] as const;
export function resolveUiStyle(value: string | null): UiStyle {
  return value === "nexus" || value === "minimal" ? value : "classic";
}
const KEY = "scu-ui-style";
const listeners = new Set<() => void>();

function read(): UiStyle {
  try {
    return resolveUiStyle(localStorage.getItem(KEY));
  } catch {
    return "classic";
  }
}

export function setUiStyle(s: UiStyle) {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function useUiStyle(): UiStyle {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => "classic",
  );
}
