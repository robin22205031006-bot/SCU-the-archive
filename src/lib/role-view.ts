import { useSyncExternalStore } from "react";

/**
 * "View as reader": an admin or moderator can preview the app exactly as a normal reader
 * sees it, then switch back. It only changes what this device shows; roles stay in
 * user_roles and every write is still checked server-side, so nothing can be escalated
 * or lost. Device-local (localStorage) and live across tabs.
 */
export const READER_VIEW_KEY = "scu-view-as-reader";
const EVENT = "scu:role-view-change";

function read(): boolean {
  try {
    return localStorage.getItem(READER_VIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReaderView(on: boolean): void {
  try {
    if (on) localStorage.setItem(READER_VIEW_KEY, "1");
    else localStorage.removeItem(READER_VIEW_KEY);
  } catch {
    /* storage optional */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
  }
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === READER_VIEW_KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useReaderView(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Roles the UI should act on: none while a staff member is viewing as a reader. */
export function effectiveRoles(real: readonly string[], readerView: boolean): string[] {
  const staff = real.some((r) => r === "admin" || r === "superadmin" || r === "moderator");
  return readerView && staff ? [] : [...real];
}
