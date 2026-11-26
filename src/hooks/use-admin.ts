import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureSuperadminAccess } from "@/lib/roles.functions";
import { isVerifiedSuperadmin } from "@/lib/roles";
import { effectiveRoles, useReaderView } from "@/lib/role-view";

const SESSION_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | "__timeout__"> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<"__timeout__">((r) => setTimeout(() => r("__timeout__"), ms)),
  ]);
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      // Never let a slow or failing Supabase round-trip pin the app or throw an unhandled error.
      try {
        const res = await withTimeout(supabase.auth.getUser(), SESSION_TIMEOUT_MS);
        if (res !== "__timeout__") {
          if (!res.error) return res.data.user ?? null;
          const isAuthFailure =
            res.error.status === 401 ||
            res.error.status === 403 ||
            /invalid|expired|jwt|session/i.test(res.error.message);
          if (isAuthFailure) return null;
        }
        if (typeof supabase.auth.getSession === "function") {
          const fallback = await withTimeout(supabase.auth.getSession(), 2_000);
          if (fallback !== "__timeout__" && !fallback.error) {
            return fallback.data.session?.user ?? null;
          }
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}

/** Roles actually held (from user_roles), ignoring "view as reader". */
export function useRealRoles() {
  const { data: user } = useSession();
  const q = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return [];
      const superadmin = isVerifiedSuperadmin(user);
      if (superadmin) {
        // Bootstrap a real `admin` row so RLS-protected writes keep working.
        try {
          await withTimeout(ensureSuperadminAccess({ data: {} }), SESSION_TIMEOUT_MS);
        } catch {
          // Fail closed; only persisted role rows grant access below.
        }
      }
      // Read privileges only from the protected role table.
      let roles: string[] = [];
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (error) throw error;
        roles = (data ?? []).map((r) => r.role as string);
      } catch {
        roles = [];
      }
      if (superadmin && roles.includes("admin")) return [...roles, "superadmin"];
      return roles;
    },
  });
  return user ? (q.data ?? []) : [];
}

/**
 * Roles the UI acts on. While a staff member has switched to "view as reader" this is empty,
 * so every style hides staff controls; writes stay checked server-side either way.
 */
export function useRoles() {
  const real = useRealRoles();
  const readerView = useReaderView();
  return effectiveRoles(real, readerView);
}

/** True for admins, superadmins and moderators by their real roles (even in reader view). */
export function useIsRealStaff() {
  const roles = useRealRoles();
  return roles.includes("admin") || roles.includes("superadmin") || roles.includes("moderator");
}

export function useIsSuperadmin() {
  return useRoles().includes("superadmin");
}

/** Utility hook returning whether the signed-in user has admin privileges (including superadmin). */
export function useIsAdmin() {
  const roles = useRoles();
  return roles.includes("admin") || roles.includes("superadmin");
}

export function useIsStaff() {
  const roles = useRoles();
  return roles.includes("admin") || roles.includes("superadmin") || roles.includes("moderator");
}

/** Structured permission flags for conditional admin/delete UI and handler guards. */
export function useAdminPermissions() {
  const roles = useRoles();
  const isSuperadmin = roles.includes("superadmin");
  const isAdmin = isSuperadmin || roles.includes("admin");
  const isStaff = isAdmin || roles.includes("moderator");
  return {
    isAdmin,
    isStaff,
    isSuperadmin,
    canDelete: isAdmin,
  };
}
