import { useSyncExternalStore } from "react";

export type NavMode = "standard" | "hud";
export const navMode = (): NavMode => {
  if (typeof window === "undefined") return "standard";
  try {
    const value = localStorage.getItem("scu-nav-mode");
    return value === "hud" || value === "1" ? "hud" : "standard";
  } catch {
    return "standard";
  }
};
export function setNavMode(mode: NavMode) {
  try {
    localStorage.setItem("scu-nav-mode", mode);
  } catch {
    /* Device storage unavailable. */
  }
  window.dispatchEvent(new Event("scu-nav-mode"));
}
function subscribe(listener: () => void) {
  window.addEventListener("scu-nav-mode", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("scu-nav-mode", listener);
    window.removeEventListener("storage", listener);
  };
}
export const useNavMode = () =>
  useSyncExternalStore(subscribe, navMode, () => "standard" as NavMode);
export const hudNavEnabled = () => navMode() === "hud";
export const setHudNav = (on: boolean) => setNavMode(on ? "hud" : "standard");
