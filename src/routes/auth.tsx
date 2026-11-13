import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import {
  SCU_OAUTH_CALLBACK_EVENT,
  SCU_OAUTH_CHANNEL_NAME,
  applyOAuthCallbackPayload,
  checkGoogleOAuthAvailability,
  getSupabaseBaseUrl,
  lovable,
  parseOAuthCallbackPayload,
} from "@/integrations/lovable";
import { useSession } from "@/hooks/use-admin";
import { syncSessionCache } from "@/lib/session-cache";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string; banned?: string } => ({
    ...(typeof s["next"] === "string" ? { next: s["next"] } : {}),
    ...(typeof s["banned"] === "string" ? { banned: s["banned"] } : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sign in — SCU Archive" },
      { name: "description", content: "Sign in to read and explore the SCU archive." },
      { property: "og:title", content: "Sign in — SCU Archive" },
      { property: "og:description", content: "Sign in to read and explore the SCU archive." },
    ],
  }),
  component: AuthPage,
});

function readStoredOAuthDestination(fallback: string): string {
  try {
    const raw = sessionStorage.getItem("scu-oauth-next");
    sessionStorage.removeItem("scu-oauth-next");
    if (raw) return oauthReturnPath(raw);
  } catch {
    /* storage optional */
  }
  return fallback;
}

function AuthPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  // Swipe right anywhere on the auth screen returns to the app.
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
    };
    const end = (e: TouchEvent) => {
      const s = touchStart.current;
      touchStart.current = null;
      const t = e.changedTouches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (dx > 90 && Math.abs(dx) > Math.abs(dy) * 1.5) nav({ to: "/" });
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
    };
  }, [nav]);

  const { next: rawNext, banned } = Route.useSearch();
  const next = oauthReturnPath(rawNext);
  const hasNext = rawNext !== undefined && next !== "/";
  const defaultDestination = hasNext ? next : "/characters";

  const [mode, setMode] = useState<"in" | "up">("in");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [isPopupBridge, setIsPopupBridge] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<{
    message: string;
    missingSecret?: boolean | undefined;
    fallbackUrl?: string | undefined;
  } | null>(null);

  const { data: signedInUser } = useSession();

  // Handle OAuth callbacks:
  // 1) If loaded inside an OAuth popup, forward tokens/code/errors back to the iframe opener and close.
  // 2) If loaded in a top-level tab after redirect, apply the session/error cleanly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      hash: window.location.hash,
      search: window.location.search,
    };
    const parsed = parseOAuthCallbackPayload(payload);
    if (!parsed.hasPayload) return;

    const isPopup =
      (window.opener !== null && window.opener !== window) || window.name === "scu-google-oauth";
    if (isPopup) {
      setIsPopupBridge(true);
      const message = {
        type: SCU_OAUTH_CALLBACK_EVENT,
        hash: payload.hash,
        search: payload.search,
      };
      try {
        window.opener?.postMessage(message, window.location.origin);
      } catch {
        /* ignore postMessage failure */
      }
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const channel = new BroadcastChannel(SCU_OAUTH_CHANNEL_NAME);
          channel.postMessage(message);
          channel.close();
        } catch {
          /* ignore BroadcastChannel failure */
        }
      }
      try {
        window.close();
      } catch {
        /* ignore close failure */
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const cleanPath = hasNext ? `/auth?next=${encodeURIComponent(next)}` : "/auth";
      try {
        window.history.replaceState({}, "", cleanPath);
      } catch {
        /* ignore history error */
      }

      const applied = await applyOAuthCallbackPayload(payload);
      if (cancelled) return;

      if (applied.error) {
        setOauthNotice({ message: applied.error.message });
        toast.error(applied.error.message);
        return;
      }

      if (applied.signedIn) {
        const { data: userData } = await supabase.auth.getUser();
        syncSessionCache(queryClient, userData.user ?? null);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        const destination = readStoredOAuthDestination(defaultDestination);
        window.location.assign(destination);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultDestination, hasNext, next, queryClient]);

  // Pre-check whether Google OAuth is configured on the Supabase backend so clicking
  // "Continue with Google" gives instant feedback instead of opening a failing 400 popup.
  useEffect(() => {
    if (typeof window === "undefined" || isPopupBridge) return;
    let active = true;
    void checkGoogleOAuthAvailability(`${window.location.origin}/auth`).then((avail) => {
      if (!active || avail.available) return;
      setOauthNotice({
        message: avail.message || "Google sign-in is unavailable.",
        missingSecret: avail.reason === "missing_oauth_secret",
      });
    });
    return () => {
      active = false;
    };
  }, [isPopupBridge]);

  useEffect(() => {
    if (!signedInUser || isPopupBridge || banned === "1") return;
    const destination = readStoredOAuthDestination(defaultDestination);
    if (destination.includes("?") || destination.includes("#")) {
      window.location.assign(destination);
    } else {
      void nav({ to: destination as never });
    }
  }, [banned, defaultDestination, isPopupBridge, nav, signedInUser]);

  const signInGoogle = async () => {
    if (googleBusy || busy) return;
    if (oauthNotice?.missingSecret) {
      toast.error(oauthNotice.message);
      return;
    }
    setGoogleBusy(true);
    setOauthNotice(null);
    try {
      try {
        sessionStorage.setItem("scu-oauth-next", defaultDestination);
      } catch {
        /* storage optional */
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.redirected) return;
      if (result.error) {
        setOauthNotice({
          message: result.error.message,
          missingSecret: result.missingSecret,
          fallbackUrl: result.fallbackUrl,
        });
        toast.error(result.error.message);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        syncSessionCache(queryClient, userData.user);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        const destination = readStoredOAuthDestination(defaultDestination);
        window.location.assign(destination);
      }
    } catch {
      const msg = "Google sign-in could not start. Please try again.";
      setOauthNotice({ message: msg });
      toast.error(msg);
    } finally {
      setGoogleBusy(false);
    }
  };

  const sendMagicLink = async () => {
    if (magicBusy || busy) return;
    const raw = (mode === "in" ? identifier : email).trim();
    if (!raw) {
      toast.error("Enter your Gmail or email address first.");
      return;
    }
    setMagicBusy(true);
    try {
      let targetEmail = raw;
      if (!targetEmail.includes("@")) {
        const { data } = await supabase.rpc("lookup_login_email", { p_username: targetEmail });
        targetEmail = (data as string | null) ?? "";
      }
      if (!targetEmail || !targetEmail.includes("@")) {
        toast.error("Enter a valid email address (or an existing username).");
        return;
      }
      try {
        sessionStorage.setItem("scu-oauth-next", defaultDestination);
      } catch {
        /* storage optional */
      }
      const redirectTo =
        new URL("/auth", window.location.origin).href +
        (hasNext ? `?next=${encodeURIComponent(next)}` : "");
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Sign-in link sent to ${targetEmail}. Check your Gmail inbox.`);
    } catch {
      toast.error("Unable to send sign-in link right now.");
    } finally {
      setMagicBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // Never leave the form spinning forever on a stalled network.
      const deadline = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("timeout")), 10_000),
      );
      if (mode === "in") {
        // Username-first: resolve username → email via the lookup RPC; "@" means email.
        let loginEmail = identifier.trim();
        if (!loginEmail.includes("@")) {
          const { data: resolved, error: lookupErr } = await Promise.race([
            supabase.rpc("lookup_login_email", { p_username: loginEmail }),
            deadline,
          ]);
          if (lookupErr || !resolved) {
            setBusy(false);
            toast.error(
              lookupErr
                ? "Username lookup unavailable — sign in with your email."
                : "No account found for that username.",
            );
            return;
          }
          loginEmail = resolved as string;
        }
        const { data: signInData, error } = await Promise.race([
          supabase.auth.signInWithPassword({ email: loginEmail, password }),
          deadline,
        ]);
        setBusy(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        syncSessionCache(queryClient, signInData.user ?? null);
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        if (hasNext) window.location.assign(next);
        else nav({ to: "/characters" });
      } else {
        const { data: signUpData, error } = await Promise.race([
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                new URL("/auth", window.location.origin).href +
                (hasNext ? `?next=${encodeURIComponent(next)}` : ""),
            },
          }),
          deadline,
        ]);
        setBusy(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        // Best-effort: stamp the username onto the profile (works when email confirmation is off).
        const uname = username.trim();
        const uid = signUpData.user?.id;
        if (uname && uid) {
          const { error: profErr } = await supabase
            .from("profiles")
            .update({ display_name: uname })
            .eq("id", uid);
          if (profErr) toast.message("Account created — set your username later in Profile.");
        }
        toast.success("Check your email to confirm your account.");
      }
    } catch {
      toast.error("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isPopupBridge) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-8 text-center">
        <h1 className="text-2xl font-medium">Completing Google sign-in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Returning your session to the SCU Archive. You can close this window if it stays open.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-8">
      <h1 className="text-4xl font-medium">{mode === "in" ? "Sign in" : "Create account"}</h1>

      {banned === "1" && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
        >
          This account has been suspended and cannot access restricted archive tools.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="google-sign-in mt-6 w-full"
        disabled={googleBusy || busy}
        onClick={signInGoogle}
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
          />
        </svg>
        {googleBusy ? "Connecting…" : "Continue with Google"}
      </Button>

      {oauthNotice && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200"
        >
          <p>{oauthNotice.message}</p>
          {oauthNotice.missingSecret && (
            <p className="mt-1.5 text-[11px] text-amber-300/90">
              Callback URL:{" "}
              <code className="break-all font-mono">{getSupabaseBaseUrl()}/auth/v1/callback</code>
            </p>
          )}
          {oauthNotice.fallbackUrl && (
            <a
              href={oauthNotice.fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block font-medium text-amber-100 underline hover:text-white"
            >
              Open Google Sign-In in new tab
            </a>
          )}
        </div>
      )}

      <form onSubmit={submit} className="mt-8 grid gap-4">
        {mode === "in" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="auth-identifier">Username or email</Label>
            <Input
              id="auth-identifier"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="auth-username">Username</Label>
              <Input
                id="auth-username"
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </>
        )}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="auth-password">Password</Label>
            <span
              data-testid="show-pass-status"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Show pass: {showPassword ? "On" : "Off"}
            </span>
          </div>
          <PasswordInput
            id="auth-password"
            showPassword={showPassword}
            onShowPasswordChange={setShowPassword}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </div>
        <Button disabled={busy}>{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
        {mode === "in" && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={magicBusy || busy}
              onClick={sendMagicLink}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5" />
              {magicBusy ? "Sending link…" : "Email sign-in link (Gmail)"}
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                const id = identifier.trim();
                if (!id) {
                  toast.error("Enter your username or email first.");
                  return;
                }
                let targetEmail = id.includes("@") ? id : "";
                if (!targetEmail) {
                  const { data } = await supabase.rpc("lookup_login_email", { p_username: id });
                  targetEmail = data ?? "";
                }
                if (!targetEmail) {
                  toast.error("Account not found.");
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
                  redirectTo: new URL("/auth", window.location.origin).href,
                });
                if (error) toast.error(error.message);
                else toast.success("Password reset link sent — check your email.");
              }}
            >
              Forgot password?
            </button>
          </div>
        )}
      </form>
      <button
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "in" ? "First time? Create your account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
