import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncSessionCache } from "@/lib/session-cache";
import {
  hasSeenWelcome,
  isFreshSignIn,
  markWelcomeSeen,
  readSignInStamp,
  welcomeKey,
} from "@/lib/admin-welcome";
import { playWelcome } from "@/lib/scu-audio";

const AUTH_INIT_TIMEOUT_MS = 5_000;

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  refreshAuth: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | "__timeout__"> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<"__timeout__">((resolve) => setTimeout(() => resolve("__timeout__"), ms)),
  ]);
}

function logDailySignIn(userId: string) {
  const key = `scu-logged-${userId}-${new Date().toDateString()}`;
  try {
    if (typeof sessionStorage === "undefined" || sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setTimeout(() => {
      try {
        const res = supabase.from("activity_log").insert({ user_id: userId, action: "Signed in" });
        void Promise.resolve(res).catch(() => {});
      } catch {
        /* logging must never interrupt sign-in */
      }
    }, 0);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    return queryClient.getQueryData<User | null>(["session"]) ?? null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return queryClient.getQueryData<User | null>(["session"]) === undefined;
  });
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refreshAuth = useCallback(async (): Promise<User | null> => {
    try {
      let cachedUser: User | null = null;

      if (typeof supabase?.auth?.getSession === "function") {
        try {
          const sessionRes = await withTimeout(supabase.auth.getSession(), AUTH_INIT_TIMEOUT_MS);
          if (sessionRes !== "__timeout__" && !sessionRes.error) {
            const currentSession = sessionRes.data?.session ?? null;
            cachedUser = currentSession?.user ?? null;
            if (mountedRef.current) {
              setSession(currentSession);
              if (cachedUser) {
                setUser(cachedUser);
              }
            }
          }
        } catch {
          /* continue to getUser check */
        }
      }

      if (typeof supabase?.auth?.getUser === "function") {
        const userRes = await withTimeout(supabase.auth.getUser(), AUTH_INIT_TIMEOUT_MS);
        if (userRes === "__timeout__") {
          if (mountedRef.current) {
            setUser(cachedUser);
            setIsLoading(false);
          }
          syncSessionCache(queryClient, cachedUser);
          return cachedUser;
        }

        if (userRes.error) {
          const isAuthFailure =
            userRes.error.status === 401 ||
            userRes.error.status === 403 ||
            /invalid|expired|jwt|session/i.test(userRes.error.message);
          const resolvedUser = isAuthFailure ? null : cachedUser;
          if (mountedRef.current) {
            setUser(resolvedUser);
            if (isAuthFailure) setSession(null);
            setError(userRes.error.message);
            setIsLoading(false);
          }
          syncSessionCache(queryClient, resolvedUser);
          return resolvedUser;
        }

        const verifiedUser = userRes.data?.user ?? null;
        if (mountedRef.current) {
          setUser(verifiedUser);
          if (!verifiedUser) setSession(null);
          setError(null);
          setIsLoading(false);
        }
        syncSessionCache(queryClient, verifiedUser);
        return verifiedUser;
      }

      if (mountedRef.current) {
        setUser(cachedUser);
        setIsLoading(false);
      }
      syncSessionCache(queryClient, cachedUser);
      return cachedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify session.";
      if (mountedRef.current) {
        setError(message);
        setIsLoading(false);
      }
      return null;
    }
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      try {
        localStorage.removeItem("scu-rq-cache-v2");
      } catch {
        /* storage unavailable */
      }
      if (typeof supabase?.auth?.signOut === "function") {
        await supabase.auth.signOut();
      }
    } finally {
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
        setError(null);
        setIsLoading(false);
      }
      syncSessionCache(queryClient, null, true);
    }
  }, [queryClient]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshAuth();

    let unsubscribe: (() => void) | undefined;
    try {
      if (typeof supabase?.auth?.onAuthStateChange === "function") {
        const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
          if (
            event !== "INITIAL_SESSION" &&
            event !== "SIGNED_IN" &&
            event !== "SIGNED_OUT" &&
            event !== "USER_UPDATED" &&
            event !== "TOKEN_REFRESHED"
          ) {
            return;
          }

          const nextUser = nextSession?.user ?? null;
          if (mountedRef.current) {
            setSession(nextSession ?? null);
            setUser(nextUser);
            setError(null);
            setIsLoading(false);
          }

          const identityChanged = syncSessionCache(queryClient, nextUser, event === "USER_UPDATED");

          if (event === "SIGNED_OUT") {
            try {
              localStorage.removeItem("scu-rq-cache-v2");
            } catch {
              /* storage unavailable */
            }
          }

          if (identityChanged) {
            queueMicrotask(() => {
              void router.invalidate();
              if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
            });
          }

          if (event === "SIGNED_IN" && nextSession?.user) {
            // SIGNED_IN also fires on reloads, tab refocus and other tabs; play the
            // welcome sound only once, right after a real sign-in.
            const stamp = readSignInStamp(nextSession);
            if (stamp && isFreshSignIn(stamp) && document.visibilityState === "visible") {
              const key = welcomeKey(stamp, "sound");
              if (!hasSeenWelcome(key)) {
                markWelcomeSeen(key);
                setTimeout(() => playWelcome(), 400);
              }
            }
            logDailySignIn(nextSession.user.id);
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
      }
    } catch {
      if (mountedRef.current) setIsLoading(false);
    }

    return () => {
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [queryClient, refreshAuth, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      error,
      refreshAuth,
      signOut,
    }),
    [error, isLoading, refreshAuth, session, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
