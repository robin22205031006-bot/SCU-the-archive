import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-admin";

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

function AuthPage() {
  const nav = useNavigate();
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
  const { next: rawNext } = Route.useSearch();
  const next = oauthReturnPath(rawNext);
  const hasNext = rawNext !== undefined && next !== "/";
  const [mode, setMode] = useState<"in" | "up">("in");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const { data: signedInUser } = useSession();
  useEffect(() => {
    if (!signedInUser) return;
    let destination: string | null = null;
    try { destination = sessionStorage.getItem("scu-oauth-next"); sessionStorage.removeItem("scu-oauth-next"); } catch { /* storage optional */ }
    if (destination) window.location.assign(oauthReturnPath(destination));
  }, [signedInUser]);
  const signInGoogle = async () => {
    setGoogleBusy(true);
    try {
      try { sessionStorage.setItem("scu-oauth-next", hasNext ? next : "/characters"); } catch { /* storage optional */ }
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) { toast.error(result.error.message); return; }
      if (result.redirected) return;
    } catch { toast.error("Google sign-in could not start. Please try again."); }
    finally { setGoogleBusy(false); }
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
        const { error } = await Promise.race([
          supabase.auth.signInWithPassword({ email: loginEmail, password }),
          deadline,
        ]);
        setBusy(false);
        if (error) {
          toast.error(error.message);
          return;
        }
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-8">
      <h1 className="text-4xl font-medium">{mode === "in" ? "Sign in" : "Create account"}</h1>
      <Button type="button" variant="outline" className="google-sign-in mt-6 w-full" disabled={googleBusy || busy} onClick={signInGoogle}>
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
        {googleBusy ? "Connecting…" : "Continue with Google"}
      </Button>
      <form onSubmit={submit} className="mt-8 grid gap-4">
        {mode === "in" ? (
          <div className="grid gap-1.5">
            <Label>Username or email</Label>
            <Input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label>Username</Label>
              <Input
                required
                minLength={3}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input
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
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
        </div>
        <Button disabled={busy}>{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
        {mode === "in" && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const id = identifier.trim();
              if (!id) {
                toast.error("Enter your username or email first.");
                return;
              }
              let email = id.includes("@") ? id : "";
              if (!email) {
                const { data } = await supabase.rpc("lookup_login_email", { p_username: id });
                email = data ?? "";
              }
              if (!email) {
                toast.error("Account not found.");
                return;
              }
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: new URL("/auth", window.location.origin).href,
              });
              if (error) toast.error(error.message);
              else toast.success("Password reset link sent — check your email.");
            }}
          >
            Forgot password?
          </button>
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
