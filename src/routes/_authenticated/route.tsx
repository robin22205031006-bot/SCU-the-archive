import { useEffect } from "react";
import {
  createFileRoute,
  isRedirect,
  Navigate,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useOptionalAuth } from "@/context/AuthContext";
import { useSession } from "@/hooks/use-admin";
import { hasSupabaseConfig, supabase } from "@/integrations/supabase/client";

const AUTH_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | "__timeout__"> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<"__timeout__">((r) => setTimeout(() => r("__timeout__"), ms)),
  ]);
}

function AuthLoadingFallback({ message = "Checking your session…" }: { message?: string }) {
  return (
    <main
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-3 px-5 py-16 text-center"
    >
      <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </main>
  );
}

function AuthenticatedLayout() {
  // Call all React hooks unconditionally at the top before any conditional returns.
  const location = useLocation();
  const auth = useOptionalAuth();
  const sessionQuery = useSession();

  const user = auth ? (auth.user ?? sessionQuery.data ?? null) : (sessionQuery.data ?? null);
  const isLoading = auth ? auth.isLoading && !user : sessionQuery.isLoading && !user;
  const backendConfigured = hasSupabaseConfig();

  useEffect(() => {
    if (auth && !auth.isLoading && !auth.user && backendConfigured) {
      void auth.refreshAuth();
    }
  }, [auth, backendConfigured, location.pathname]);

  if (isLoading) {
    return <AuthLoadingFallback />;
  }

  if (backendConfigured && !user) {
    return <Navigate to="/auth" search={{ next: location.pathname }} replace />;
  }

  return (
    // Render protected child route outlet after hooks resolve
    <Outlet />
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingComponent: AuthLoadingFallback,
  beforeLoad: async ({ location }) => {
    // In offline/unconfigured test mode without VITE_SUPABASE_URL/SUPABASE_URL,
    // allow rendering while component-level guards still verify active mocks.
    if (!hasSupabaseConfig()) return;

    try {
      const auth = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);
      let user = auth !== "__timeout__" ? (auth.data?.user ?? null) : null;

      if (auth === "__timeout__") {
        const fallback =
          typeof supabase.auth.getSession === "function"
            ? await withTimeout(supabase.auth.getSession(), 2_000)
            : "__timeout__";
        if (fallback !== "__timeout__" && fallback.data?.session?.user) {
          user = fallback.data.session.user;
          return;
        }
      }

      if (!user) {
        throw redirect({ to: "/auth", search: { next: location.pathname } });
      }

      try {
        const ban = await withTimeout(
          supabase.rpc("is_banned", { _uid: user.id }),
          AUTH_TIMEOUT_MS,
        );
        if (ban !== "__timeout__" && ban.data) {
          await supabase.auth.signOut().catch(() => {});
          throw redirect({ to: "/auth", search: { banned: "1" } });
        }
      } catch (banErr) {
        if (isRedirect(banErr)) throw banErr;
        // Transient RPC errors should not falsely lock out valid sessions.
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }
  },
  component: AuthenticatedLayout,
});
