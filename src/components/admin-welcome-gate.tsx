import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useOptionalAuth } from "@/context/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin";
import { useOptionalUiMode } from "@/hooks/use-ui-mode";
import { supabase } from "@/integrations/supabase/client";
import { useAnimationsEnabled } from "@/lib/animations";
import {
  hasSeenWelcome,
  isFreshSignIn,
  markWelcomeSeen,
  readSignInStamp,
  resolveWelcomeMotion,
  resolveWelcomeName,
  welcomeGreeting,
  welcomeKey,
  type WelcomeMotion,
} from "@/lib/admin-welcome";
import type { WelcomeFlavor } from "@/components/admin-welcome";

const AdminWelcome = lazy(() => import("@/components/admin-welcome"));

interface Ready {
  name: string;
  role: string;
  greeting: string;
  flavor: WelcomeFlavor;
  motion: WelcomeMotion;
}

/**
 * Decides whether to play the admin welcome: only after a real, recent sign-in
 * (token session id + auth time, not Supabase's repeated SIGNED_IN event), only once
 * that sign-in is confirmed as an admin, never on /auth, only in a visible tab and
 * once per sign-in. The animation itself is a lazy chunk, so this costs nothing at
 * startup for everyone else.
 */
export function AdminWelcomeGate() {
  const auth = useOptionalAuth();
  const session = auth?.session ?? null;
  const user = auth?.user ?? null;
  const { isAdmin, isSuperadmin } = useAdminPermissions();
  const { pathname } = useLocation();
  const uiMode = useOptionalUiMode();
  const animationsEnabled = useAnimationsEnabled();
  const [ready, setReady] = useState<Ready | null>(null);

  // Same key and shape as SiteNav's profile query, so it is shared, not refetched.
  const { data: profile, isFetched: profileFetched } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id && isAdmin,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (ready || !session || !user || !isAdmin || !profileFetched) return;
    if (pathname === "/auth" || pathname.startsWith("/auth/")) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const stamp = readSignInStamp(session);
    if (!stamp || !isFreshSignIn(stamp)) return;
    const key = welcomeKey(stamp, "visual");
    if (hasSeenWelcome(key)) return;
    markWelcomeSeen(key);
    // One welcome slot: keep the Classic welcome splash from stacking on top.
    try {
      sessionStorage.setItem("scu-welcomed-vfx", "1");
    } catch {
      /* storage optional */
    }
    const mode = uiMode?.mode ?? "classic";
    const reducedMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setReady({
      name: resolveWelcomeName(profile, user),
      role: isSuperadmin ? "Superadmin" : "Admin",
      greeting: welcomeGreeting(),
      flavor: (["classic", "nexus", "manga", "codex", "minimal"].includes(mode)
        ? mode
        : "classic") as WelcomeFlavor,
      motion: resolveWelcomeMotion({ mode, animationsEnabled, reducedMotion }),
    });
  }, [
    ready,
    session,
    user,
    isAdmin,
    isSuperadmin,
    profile,
    profileFetched,
    pathname,
    uiMode?.mode,
    animationsEnabled,
  ]);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <AdminWelcome {...ready} onDone={() => setReady(null)} />
    </Suspense>
  );
}
