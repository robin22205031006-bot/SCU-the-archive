import { useSyncExternalStore } from "react";

/** Reader-chosen interface style. "classic" = original cards, "nexus" = constellation UI. */
export type UiStyle = "classic" | "nexus";
const KEY = "scu-ui-style";
const listeners = new Set<() => void>();

function read(): UiStyle {
  try {
    return localStorage.getItem(KEY) === "nexus" ? "nexus" : "classic";
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
