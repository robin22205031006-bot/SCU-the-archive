import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import {
  SCU_OAUTH_CALLBACK_EVENT,
  checkGoogleOAuthAvailability,
  lovable,
  parseOAuthCallbackPayload,
} from "@/integrations/lovable";

const mockSignInWithOAuth = vi.fn();
const mockSetSession = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

function ControlledPasswordHarness() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <span data-testid="mode-label">Show pass: {show ? "On" : "Off"}</span>
      <PasswordInput
        aria-label="Password"
        showPassword={show}
        onShowPasswordChange={setShow}
        defaultValue="sentinel-secret"
      />
    </div>
  );
}

describe("PasswordInput show-password mode", () => {
  it("toggles between hidden password mode (Off) and visible text mode (On)", () => {
    render(<ControlledPasswordHarness />);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    const toggle = screen.getByTestId("password-visibility-toggle");

    expect(input.type).toBe("password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Off");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Show pass: Off");

    fireEvent.click(toggle);

    expect(input.type).toBe("text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("On");
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Show pass: On");

    fireEvent.click(toggle);

    expect(input.type).toBe("password");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Off");
  });
});

describe("Google OAuth flow and diagnostics", () => {
  const originalFetch = globalThis.fetch;
  const originalOpen = window.open;
  const originalTop = window.top;

  beforeEach(() => {
    mockSignInWithOAuth.mockReset();
    mockSetSession.mockReset();
    mockExchangeCodeForSession.mockReset();
    mockGetSession.mockReset();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.open = originalOpen;
    Object.defineProperty(window, "top", {
      configurable: true,
      value: originalTop,
    });
  });

  it("parses implicit hash tokens, PKCE codes, and OAuth errors", () => {
    expect(
      parseOAuthCallbackPayload({
        hash: "#access_token=abc&refresh_token=def",
        search: "",
      }),
    ).toEqual({
      accessToken: "abc",
      refreshToken: "def",
      code: null,
      error: null,
      errorDescription: null,
      hasPayload: true,
    });

    expect(
      parseOAuthCallbackPayload({
        hash: "",
        search: "?code=pkce-123",
      }),
    ).toEqual({
      accessToken: null,
      refreshToken: null,
      code: "pkce-123",
      error: null,
      errorDescription: null,
      hasPayload: true,
    });

    expect(
      parseOAuthCallbackPayload({
        hash: "",
        search: "?error=access_denied&error_description=User%20cancelled",
      }),
    ).toEqual({
      accessToken: null,
      refreshToken: null,
      code: null,
      error: "access_denied",
      errorDescription: "User cancelled",
      hasPayload: true,
    });
  });

  it("detects missing OAuth secret from Supabase authorize endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 400,
          error_code: "validation_failed",
          msg: "Unsupported provider: missing OAuth secret",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );

    const status = await checkGoogleOAuthAvailability("https://example.run.app/auth");
    expect(status.available).toBe(false);
    expect(status.reason).toBe("missing_oauth_secret");
    expect(status.message).toMatch(/missing Google Client ID\/Secret/i);
  });

  it("uses Supabase popup + postMessage callback inside iframe on non-Lovable hosts", async () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: {} as Window,
    });

    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://csdmkmtfhgxkjmucepjo.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    mockSetSession.mockResolvedValue({
      data: { session: { access_token: "tok" }, user: { id: "u1" } },
      error: null,
    });

    const replaceSpy = vi.fn();
    const closeSpy = vi.fn();
    const fakePopup = {
      closed: false,
      close: closeSpy,
      location: { replace: replaceSpy, href: "" },
    } as unknown as Window;

    window.open = vi.fn().mockReturnValue(fakePopup);

    const promise = lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });

    await vi.waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith(
        "https://csdmkmtfhgxkjmucepjo.supabase.co/auth/v1/authorize?provider=google",
      );
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: SCU_OAUTH_CALLBACK_EVENT,
          hash: "#access_token=tok&refresh_token=ref",
          search: "",
        },
      }),
    );

    const res = await promise;
    expect(res.error).toBeNull();
    expect(res.exchanged).toBe(true);
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: "tok",
      refresh_token: "ref",
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  it("returns fallbackUrl when popup is blocked inside iframe", async () => {
    Object.defineProperty(window, "top", {
      configurable: true,
      value: {} as Window,
    });

    mockSignInWithOAuth.mockResolvedValue({
      data: { url: "https://csdmkmtfhgxkjmucepjo.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    window.open = vi.fn().mockReturnValue(null);

    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });

    expect(res.popupBlocked).toBe(true);
    expect(res.fallbackUrl).toBe(
      "https://csdmkmtfhgxkjmucepjo.supabase.co/auth/v1/authorize?provider=google",
    );
    expect(res.error?.message).toMatch(/pop-up was blocked/i);
  });
});
