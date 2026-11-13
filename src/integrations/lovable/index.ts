import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import type { OAuthProvider } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";
import { ARCHIVE_BACKEND } from "../../../archive-backend";

const lovableAuth = createLovableAuth();

const LOVABLE_HOST_ZONES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "lovable.app",
  "gpt-eng.com",
  "gptengineer.run",
];

export const SCU_OAUTH_CALLBACK_EVENT = "SCU_OAUTH_CALLBACK";
export const SCU_OAUTH_CHANNEL_NAME = "scu-oauth-callback";

export type SignInOptions = {
  redirect_uri?: string | undefined;
  extraParams?: Record<string, string> | undefined;
};

export type OAuthCallbackPayload = {
  hash?: string | undefined;
  search?: string | undefined;
};

export type ParsedOAuthCallback = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
  hasPayload: boolean;
};

export type GoogleOAuthAvailability = {
  available: boolean;
  reason?: "missing_oauth_secret" | "provider_error" | undefined;
  message?: string | undefined;
};

export type OAuthSignInResult = {
  error?: Error | null | undefined;
  redirected?: boolean | undefined;
  tokens?: { access_token: string; refresh_token: string } | undefined;
  exchanged?: boolean | undefined;
  missingSecret?: boolean | undefined;
  popupBlocked?: boolean | undefined;
  fallbackUrl?: string | undefined;
};

export function isLovableHostedSurface(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return LOVABLE_HOST_ZONES.some((zone) => host === zone || host.endsWith(`.${zone}`));
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getSupabaseBaseUrl(): string {
  const envUrl =
    typeof import.meta !== "undefined"
      ? (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)
      : undefined;
  if (
    envUrl &&
    !envUrl.includes("placeholder") &&
    !envUrl.includes("2c3743b4-a0ff-4079-b412-eba03e4ddcc7")
  ) {
    return envUrl.replace(/\/+$/, "");
  }
  return ARCHIVE_BACKEND.url;
}

export function parseOAuthCallbackPayload(payload: OAuthCallbackPayload): ParsedOAuthCallback {
  const rawSearch = (payload.search ?? "").replace(/^\?/, "");
  const rawHash = (payload.hash ?? "").replace(/^#/, "");
  const searchParams = new URLSearchParams(rawSearch);
  const hashParams = new URLSearchParams(rawHash);

  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const code = searchParams.get("code");
  const error = searchParams.get("error") ?? hashParams.get("error");
  const errorDescription =
    searchParams.get("error_description") ?? hashParams.get("error_description");

  const hasPayload = Boolean(accessToken || refreshToken || code || error || errorDescription);

  return {
    accessToken,
    refreshToken,
    code,
    error,
    errorDescription,
    hasPayload,
  };
}

export async function applyOAuthCallbackPayload(
  payload: OAuthCallbackPayload,
): Promise<{ error: Error | null; signedIn: boolean }> {
  const parsed = parseOAuthCallbackPayload(payload);
  if (parsed.error) {
    return {
      error: new Error(parsed.errorDescription || parsed.error || "Google sign-in failed."),
      signedIn: false,
    };
  }
  if (parsed.accessToken && parsed.refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (error) return { error: new Error(error.message), signedIn: false };
    return { error: null, signedIn: Boolean(data.session || data.user) };
  }
  if (parsed.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (error) return { error: new Error(error.message), signedIn: false };
    return { error: null, signedIn: Boolean(data.session || data.user) };
  }
  return {
    error: new Error("Google sign-in completed without returning session credentials."),
    signedIn: false,
  };
}

export async function checkGoogleOAuthAvailability(
  redirectTo?: string,
): Promise<GoogleOAuthAvailability> {
  if (typeof window === "undefined" || isLovableHostedSurface()) {
    return { available: true };
  }
  const baseUrl = getSupabaseBaseUrl();
  const targetRedirect = redirectTo || `${window.location.origin}/auth`;
  const authorizeUrl = `${baseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    targetRedirect,
  )}`;

  try {
    const res = await fetch(authorizeUrl, { method: "GET", redirect: "manual" });
    if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400) || res.ok) {
      return { available: true };
    }
    const text = await res.text().catch(() => "");
    let msg = "";
    try {
      const parsed = JSON.parse(text) as { msg?: unknown; error_description?: unknown };
      if (typeof parsed.msg === "string") msg = parsed.msg;
      else if (typeof parsed.error_description === "string") msg = parsed.error_description;
    } catch {
      msg = text;
    }
    const isMissingSecret =
      /missing oauth secret|provider is not enabled|unsupported provider/i.test(msg);
    if (isMissingSecret) {
      return {
        available: false,
        reason: "missing_oauth_secret",
        message:
          "Google OAuth is not configured on this Supabase backend yet (missing Google Client ID/Secret). Add it in Supabase Auth -> Providers -> Google, or use Email / Magic Link sign-in below.",
      };
    }
    return {
      available: false,
      reason: "provider_error",
      message: msg || `Google sign-in returned status ${res.status}.`,
    };
  } catch {
    // Network/CORS errors during preflight must not block attempting real OAuth.
    return { available: true };
  }
}

function openOAuthPopup(url: string): Window | null {
  const width = Math.min(540, Math.max(420, Math.round(window.outerWidth * 0.5)));
  const height = Math.min(680, Math.max(540, Math.round(window.outerHeight * 0.7)));
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);
  return window.open(
    url,
    "scu-google-oauth",
    `width=${width},height=${height},left=${left},top=${top},popup=yes`,
  );
}

async function signInWithSupabaseOAuth(
  provider: OAuthProvider,
  opts?: SignInOptions,
): Promise<OAuthSignInResult> {
  const redirectTo =
    opts?.redirect_uri ||
    (typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth");

  const inIframe = isEmbeddedInIframe();
  // Open the popup synchronously within the user-click stack so browsers never
  // treat it as an unprompted popup after an async await.
  const popup = typeof window !== "undefined" && inIframe ? openOAuthPopup("about:blank") : null;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        ...opts?.extraParams,
      },
    },
  });

  if (error || !data?.url) {
    try {
      if (popup && !popup.closed) popup.close();
    } catch {
      /* ignore */
    }
    return { error: error ?? new Error("Unable to start Google OAuth sign-in.") };
  }

  const authUrl = data.url;
  if (typeof window === "undefined") {
    return { error: new Error("OAuth sign-in is only available in the browser.") };
  }

  // Outside an iframe, redirect the top-level tab after checking for provider misconfiguration.
  if (!inIframe) {
    const availability = await checkGoogleOAuthAvailability(redirectTo);
    if (!availability.available) {
      return {
        error: new Error(availability.message || "Google OAuth is unavailable."),
        missingSecret: availability.reason === "missing_oauth_secret",
        fallbackUrl: authUrl,
      };
    }
    window.location.assign(authUrl);
    return { redirected: true };
  }

  // Inside an iframe (e.g. AI Studio preview), Google refuses to render inside frames
  // (X-Frame-Options: DENY), so navigate the popup to OAuth and bridge tokens back.
  if (!popup) {
    return {
      error: new Error(
        "Google sign-in pop-up was blocked by the browser. Use the direct sign-in link below or allow pop-ups.",
      ),
      popupBlocked: true,
      fallbackUrl: authUrl,
    };
  }

  try {
    popup.location.replace(authUrl);
  } catch {
    try {
      popup.location.href = authUrl;
    } catch {
      /* ignore navigation error */
    }
  }

  return await new Promise<OAuthSignInResult>((resolve) => {
    let settled = false;
    let channel: BroadcastChannel | null = null;

    const finish = (result: OAuthSignInResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (channel) {
        try {
          channel.close();
        } catch {
          /* ignore close error */
        }
      }
      try {
        if (!popup.closed) popup.close();
      } catch {
        /* ignore cross-origin close */
      }
      resolve(result);
    };

    const handleCallbackData = async (payload: OAuthCallbackPayload) => {
      const applied = await applyOAuthCallbackPayload(payload);
      if (applied.error) {
        finish({ error: applied.error });
        return;
      }
      finish({ error: null, exchanged: true });
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data as
        { type?: unknown; hash?: unknown; search?: unknown } | null | undefined;
      if (!msg || typeof msg !== "object" || msg.type !== SCU_OAUTH_CALLBACK_EVENT) return;
      void handleCallbackData({
        hash: typeof msg.hash === "string" ? msg.hash : undefined,
        search: typeof msg.search === "string" ? msg.search : undefined,
      });
    };

    window.addEventListener("message", onMessage);

    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(SCU_OAUTH_CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent<unknown>) => {
          const msg = event.data as
            { type?: unknown; hash?: unknown; search?: unknown } | null | undefined;
          if (!msg || typeof msg !== "object" || msg.type !== SCU_OAUTH_CALLBACK_EVENT) return;
          void handleCallbackData({
            hash: typeof msg.hash === "string" ? msg.hash : undefined,
            search: typeof msg.search === "string" ? msg.search : undefined,
          });
        };
      } catch {
        channel = null;
      }
    }

    const pollTimer = setInterval(() => {
      if (!popup.closed) return;
      clearInterval(pollTimer);
      setTimeout(async () => {
        if (settled) return;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          finish({ error: null, exchanged: true });
          return;
        }
        const availability = await checkGoogleOAuthAvailability(redirectTo);
        if (!availability.available) {
          finish({
            error: new Error(availability.message || "Google OAuth is unavailable."),
            missingSecret: availability.reason === "missing_oauth_secret",
            fallbackUrl: authUrl,
          });
          return;
        }
        finish({ error: new Error("Google sign-in window was closed before completing.") });
      }, 350);
    }, 500);

    const timeoutTimer = setTimeout(() => {
      finish({
        error: new Error("Google sign-in timed out. Please try again."),
        fallbackUrl: authUrl,
      });
    }, 120_000);
  });
}

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: OAuthProvider,
      opts?: SignInOptions,
    ): Promise<OAuthSignInResult> => {
      if (isLovableHostedSurface()) {
        try {
          const result = await lovableAuth.signInWithOAuth(provider, {
            ...(opts?.redirect_uri !== undefined ? { redirect_uri: opts.redirect_uri } : {}),
            ...(opts?.extraParams !== undefined ? { extraParams: opts.extraParams } : {}),
          });

          if (result.redirected) {
            return { redirected: true, error: null };
          }

          if (!result.error && "tokens" in result && result.tokens) {
            try {
              await supabase.auth.setSession(result.tokens);
              return { tokens: result.tokens, error: null };
            } catch (e) {
              return { error: e instanceof Error ? e : new Error(String(e)) };
            }
          }
        } catch {
          // Fall through to direct Supabase OAuth.
        }
      }

      return signInWithSupabaseOAuth(provider, opts);
    },
  },
};
