import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveVisualUiMode, uiModeCssVars, VISUAL_UI_MODES } from "@/hooks/use-ui-mode";
import { isClassicBackedMode } from "@/lib/ui-style";
import { resolveUIMode, UI_MODE_OPTIONS } from "@/context/UIStateContext";
import { getThemeMotionSpec } from "@/lib/motionVariants";
import { cinematicTitleFor } from "@/lib/cinematic";

const routerState = vi.hoisted(() => ({ pathname: "/characters" }));
const motionState = vi.hoisted(() => ({ motionActive: true }));
vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: routerState.pathname }),
}));
vi.mock("@/hooks/use-app-motion", () => ({
  useAppMotion: () => ({ motionActive: motionState.motionActive }),
}));

describe("Cinematic UI mode", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    routerState.pathname = "/characters";
    motionState.motionActive = true;
  });

  it("is a selectable, persisted style in every mode list", () => {
    expect(VISUAL_UI_MODES.map((m) => m.id)).toContain("cinematic");
    expect(UI_MODE_OPTIONS.map((m) => m.id)).toContain("cinematic");
    expect(resolveVisualUiMode("cinematic")).toBe("cinematic");
    expect(resolveUIMode("cinematic")).toBe("cinematic");
  });

  it("reuses Classic layouts so data and permission rules stay identical", () => {
    expect(isClassicBackedMode("cinematic")).toBe(true);
    expect(isClassicBackedMode("manga")).toBe(true);
    expect(isClassicBackedMode("nexus")).toBe(false);
    expect(isClassicBackedMode("minimal")).toBe(false);
  });

  it("grades the palette dark with an amber key light and film typography", () => {
    const vars = uiModeCssVars("cinematic", false);
    expect(vars["--background"]).toBe("#07080b");
    expect(vars["--accent"]).toBe("#e2a23b");
    expect(vars["--font-display"]).toContain("Cinzel");
  });

  it("animates pages with a fade-up push-in using transform and opacity only", () => {
    const spec = getThemeMotionSpec("cinematic");
    expect(spec.pageVariants["initial"]).toEqual({ opacity: 0, scale: 1.025 });
    for (const variant of Object.values(spec.cardVariants)) {
      expect(Object.keys(variant as object)).not.toContain("filter");
    }
  });

  it("titles scenes from the route", () => {
    expect(cinematicTitleFor("/")).toBe("The Archive");
    expect(cinematicTitleFor("/ability-fx")).toBe("Ability FX");
    expect(cinematicTitleFor("/atlas/rome")).toBe("Atlas");
    expect(cinematicTitleFor("/season")).toBe("Season");
  });

  it("shows a title card only on navigation, never on first load, then clears it", async () => {
    vi.useFakeTimers();
    const { CinematicChrome } = await import("@/components/cinematic-shell");
    const view = render(<CinematicChrome />);
    expect(screen.queryByTestId("cinematic-title-card")).toBeNull();

    routerState.pathname = "/abilities";
    view.rerender(<CinematicChrome />);
    expect(screen.getByTestId("cinematic-title-card")).toHaveTextContent("Abilities");
    expect(screen.getByTestId("cinematic-title-card")).toHaveTextContent("Scene 02");

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.queryByTestId("cinematic-title-card")).toBeNull();
  });

  it("skips title cards when motion is off", async () => {
    motionState.motionActive = false;
    const { CinematicChrome } = await import("@/components/cinematic-shell");
    const view = render(<CinematicChrome />);
    routerState.pathname = "/series";
    view.rerender(<CinematicChrome />);
    expect(screen.queryByTestId("cinematic-title-card")).toBeNull();
  });
});
