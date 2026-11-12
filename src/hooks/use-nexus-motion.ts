import { useSyncExternalStore } from "react";
import { useAnimationsEnabled } from "@/lib/animations";

const subscribe = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
export function useNexusMotion() {
  const enabled = useAnimationsEnabled();
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  return enabled && !reduced;
}
