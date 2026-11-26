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
/**
 * Visual modes that reuse Classic page layouts (Codex reuses them for app-only pages such as
 * Map, Story and Admin; its own pages render in the Codex frame): the legacy picker stores "classic"
 * for them, so a legacy "classic" event must not knock the reader out of them.
 */
export function isClassicBackedMode(mode: string | null | undefined): boolean {
  return mode === "classic" || mode === "manga" || mode === "codex";
}
export const UI_STYLE_KEY = "scu-ui-style";
const KEY = UI_STYLE_KEY;
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:ui-style-change", { detail: s }));
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
