import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureSuperadminAccess } from "@/lib/roles.functions";
import { isVerifiedSuperadmin } from "@/lib/roles";

const SESSION_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | "__timeout__"> {
  return Promise.race([
    p,
    new Promise<"__timeout__">((r) => setTimeout(() => r("__timeout__"), ms)),
  ]);
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      // Never let a slow Supabase round-trip pin the app in a loading state:
      // on timeout we resolve with no session and let RLS/public UI render.
      const res = await withTimeout(supabase.auth.getUser(), SESSION_TIMEOUT_MS);
      if (res === "__timeout__") return null;
      return res.data.user ?? null;
    },
    staleTime: 60_000,
  });
}

export function useRoles() {
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

export function useIsSuperadmin() {
  return useRoles().includes("superadmin");
}

export function useIsAdmin() {
  return useRoles().includes("admin");
}

export function useIsStaff() {
  const r = useRoles();
  return r.includes("admin") || r.includes("moderator");
}
