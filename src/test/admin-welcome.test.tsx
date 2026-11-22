import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminWelcome from "@/components/admin-welcome";
import {
  hasSeenWelcome,
  isFreshSignIn,
  markWelcomeSeen,
  readSignInStamp,
  resolveWelcomeMotion,
  resolveWelcomeName,
  welcomeGreeting,
  welcomeKey,
} from "@/lib/admin-welcome";

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const token = (claims: object) => `h.${b64url(claims)}.s`;
const NOW = Date.parse("2026-11-22T12:00:00Z");
const nowSec = NOW / 1000;

describe("sign-in stamp", () => {
  it("is stable across token refreshes and changes on a real sign-in", () => {
    const signIn = {
      sub: "u1",
      session_id: "sess-A",
      amr: [{ method: "password", timestamp: nowSec - 30 }],
    };
    const first = readSignInStamp({
      access_token: token({ ...signIn, iat: nowSec - 30 }),
      user: { id: "u1" },
    });
    const refreshed = readSignInStamp({
      access_token: token({ ...signIn, iat: nowSec }),
      user: { id: "u1" },
    });
    const again = readSignInStamp({
      access_token: token({ sub: "u1", session_id: "sess-B", amr: [{ timestamp: nowSec }] }),
      user: { id: "u1" },
    });
    expect(welcomeKey(first!)).toBe(welcomeKey(refreshed!));
    expect(welcomeKey(again!)).not.toBe(welcomeKey(first!));
  });

  it("only counts recent sign-ins as fresh", () => {
    const fresh = readSignInStamp({
      access_token: token({ sub: "u1", session_id: "s", amr: [{ timestamp: nowSec - 60 }] }),
      user: { id: "u1" },
    });
    const stale = readSignInStamp({
      access_token: token({ sub: "u1", session_id: "s", amr: [{ timestamp: nowSec - 86400 }] }),
      user: { id: "u1" },
    });
    expect(isFreshSignIn(fresh, NOW)).toBe(true);
    expect(isFreshSignIn(stale, NOW)).toBe(false);
    expect(isFreshSignIn(null, NOW)).toBe(false);
  });

  it("falls back to last_sign_in_at when the token lacks the claims", () => {
    const stamp = readSignInStamp({
      access_token: "not-a-jwt",
      user: { id: "u1", last_sign_in_at: "2026-11-22T11:59:00Z" },
    });
    expect(stamp?.userId).toBe("u1");
    expect(isFreshSignIn(stamp, NOW)).toBe(true);
  });

  it("remembers seen sign-ins", () => {
    const key = welcomeKey({ userId: "u9", sessionId: "s9", authAt: nowSec });
    expect(hasSeenWelcome(key)).toBe(false);
    markWelcomeSeen(key);
    expect(hasSeenWelcome(key)).toBe(true);
  });
});

describe("name, greeting and motion", () => {
  it("prefers the username, then the account name, then the email handle", () => {
    expect(resolveWelcomeName({ display_name: "Robin" }, { email: "x@y.z" })).toBe("Robin");
    expect(
      resolveWelcomeName(null, { user_metadata: { full_name: "Robin Z" }, email: "x@y.z" }),
    ).toBe("Robin Z");
    expect(resolveWelcomeName(null, { email: "archivist@site.io" })).toBe("archivist");
    expect(resolveWelcomeName(null, null)).toBe("Archivist");
  });
  it("greets by time of day", () => {
    expect(welcomeGreeting(9)).toBe("Good morning");
    expect(welcomeGreeting(20)).toBe("Good evening");
  });
  it("uses the static card for Minimal, motion-off and reduced motion", () => {
    expect(
      resolveWelcomeMotion({ mode: "nexus", animationsEnabled: true, reducedMotion: false }),
    ).toBe("animated");
    expect(
      resolveWelcomeMotion({ mode: "minimal", animationsEnabled: true, reducedMotion: false }),
    ).toBe("static");
    expect(
      resolveWelcomeMotion({ mode: "manga", animationsEnabled: false, reducedMotion: false }),
    ).toBe("static");
    expect(
      resolveWelcomeMotion({ mode: "classic", animationsEnabled: true, reducedMotion: true }),
    ).toBe("static");
  });
});

describe("AdminWelcome overlay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("greets the admin by name and closes on its own", () => {
    const onDone = vi.fn();
    render(
      <AdminWelcome
        name="Robin"
        role="Superadmin"
        greeting="Good evening"
        flavor="classic"
        motion="animated"
        onDone={onDone}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Good evening, Robin. Signed in as Superadmin.",
    );
    expect(screen.getByTestId("admin-welcome")).toHaveAttribute("data-flavor", "classic");
    act(() => {
      vi.advanceTimersByTime(4300);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped with the button or Esc", () => {
    const onDone = vi.fn();
    render(
      <AdminWelcome
        name="Robin"
        role="Admin"
        greeting="Hi"
        flavor="manga"
        motion="animated"
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("decrypts the name in Nexus and shows it plainly when static", () => {
    const { rerender } = render(
      <AdminWelcome
        name="Robin"
        role="Admin"
        greeting="Hi"
        flavor="nexus"
        motion="animated"
        onDone={() => {}}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("admin-welcome")).toHaveTextContent("Robin");
    rerender(
      <AdminWelcome
        name="Robin"
        role="Admin"
        greeting="Hi"
        flavor="minimal"
        motion="static"
        onDone={() => {}}
      />,
    );
    expect(screen.getByTestId("admin-welcome")).toHaveAttribute("data-motion", "static");
  });
});
