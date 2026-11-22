/**
 * Browser-safe helpers for the admin welcome and the sign-in sound.
 *
 * Supabase emits SIGNED_IN on every page load, tab refocus and cross-tab broadcast,
 * so it cannot mean "the user just signed in". The access token carries a better
 * signal: `session_id` stays the same across token refreshes and reloads and changes
 * on every real sign-in, and `amr[].timestamp` records when the user authenticated.
 */

export interface SignInStamp {
  userId: string;
  sessionId: string;
  /** Seconds since epoch of the most recent real authentication. */
  authAt: number;
}

interface SessionLike {
  access_token?: string | null;
  user?: { id?: string; last_sign_in_at?: string | null } | null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            Array.from(
              atob(padded),
              (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"),
            ).join(""),
          )
        : "";
    return json ? (JSON.parse(json) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Identity of the current sign-in, or null when the session cannot tell us. */
export function readSignInStamp(session: SessionLike | null | undefined): SignInStamp | null {
  if (!session?.user?.id) return null;
  const payload = session.access_token ? decodeJwtPayload(session.access_token) : null;
  const userId = String(payload?.["sub"] ?? session.user.id);
  const amr = Array.isArray(payload?.["amr"])
    ? (payload["amr"] as Array<{ timestamp?: unknown }>)
    : [];
  const amrAt = Math.max(0, ...amr.map((a) => (typeof a.timestamp === "number" ? a.timestamp : 0)));
  const sessionId =
    typeof payload?.["session_id"] === "string" ? (payload["session_id"] as string) : "";
  if (sessionId && amrAt > 0) return { userId, sessionId, authAt: amrAt };
  // Fallback: the user record's last sign-in time identifies the sign-in.
  const last = session.user.last_sign_in_at;
  const lastMs = last ? Date.parse(last) : NaN;
  if (!Number.isFinite(lastMs)) return null;
  return { userId, sessionId: sessionId || last!, authAt: Math.floor(lastMs / 1000) };
}

/** True when the sign-in happened within the last `windowSec` seconds. */
export function isFreshSignIn(
  stamp: SignInStamp | null,
  nowMs: number = Date.now(),
  windowSec = 600,
): boolean {
  if (!stamp) return false;
  const age = nowMs / 1000 - stamp.authAt;
  return age >= -60 && age <= windowSec;
}

export function welcomeKey(stamp: SignInStamp, channel: "visual" | "sound" = "visual"): string {
  return `${channel}:${stamp.userId}:${stamp.sessionId}`;
}

const SEEN_KEY = "scu-admin-welcome-seen";
const memorySeen = new Set<string>();

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [...memorySeen];
  }
}

export function hasSeenWelcome(key: string): boolean {
  return memorySeen.has(key) || readSeen().includes(key);
}

/** Records a one-shot key (capped list, in-memory fallback when storage is blocked). */
export function markWelcomeSeen(key: string): void {
  memorySeen.add(key);
  try {
    const next = [key, ...readSeen().filter((k) => k !== key)].slice(0, 12);
    localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    /* memory fallback already holds it */
  }
}

/** Best display name: profile username, then the account's full name, then the email handle. */
export function resolveWelcomeName(
  profile: { display_name?: string | null } | null | undefined,
  user:
    { email?: string | null; user_metadata?: Record<string, unknown> | null } | null | undefined,
): string {
  const meta = user?.user_metadata ?? {};
  const candidates = [
    profile?.display_name,
    typeof meta["full_name"] === "string" ? meta["full_name"] : null,
    typeof meta["name"] === "string" ? meta["name"] : null,
    user?.email ? user.email.split("@")[0] : null,
  ];
  const name = candidates.find((c) => typeof c === "string" && c.trim().length > 0)?.trim() ?? "";
  return (name || "Archivist").slice(0, 32);
}

/** Time-of-day greeting in the reader's own clock. */
export function welcomeGreeting(hour: number = new Date().getHours()): string {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

export type WelcomeMotion = "animated" | "static";

/** Minimal, motion-off and reduced motion always get the calm static card. */
export function resolveWelcomeMotion(opts: {
  mode: string;
  animationsEnabled: boolean;
  reducedMotion: boolean;
}): WelcomeMotion {
  if (opts.mode === "minimal" || !opts.animationsEnabled || opts.reducedMotion) return "static";
  return "animated";
}
