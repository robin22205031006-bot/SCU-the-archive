import { useLocation } from "@tanstack/react-router";
import { useOptionalAuth } from "@/context/AuthContext";
import { useUiMode } from "@/hooks/use-ui-mode";
import { codexTabForPath } from "@/lib/codex-feed";

/** True when the Codex frame covers the page for this route (Codex style, signed in, Codex page). */
export function useCodexActive(): boolean {
  const { mode } = useUiMode();
  const auth = useOptionalAuth();
  const { pathname } = useLocation();
  return mode === "codex" && !!auth?.user && codexTabForPath(pathname) !== null;
}
