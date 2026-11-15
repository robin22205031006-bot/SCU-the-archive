import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/App";
import { ArchivistChat } from "@/components/ArchivistChat";
import { LoreExplorer } from "@/components/LoreExplorer";
import {
  MotionCard,
  MotionModalPanel,
  MotionPage,
  MotionPresence,
  MotionSection,
} from "@/components/app-motion";
import { KineticText } from "@/components/kinetic-text";
import { ThemeProvider } from "@/context/ThemeContext";
import { UIStateProvider } from "@/context/UIStateContext";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { useAppMotion } from "@/hooks/use-app-motion";
import { setAnimationsEnabled } from "@/lib/animations";

function MotionProbe() {
  const { primarySystem, mangaSubTheme, isMinimal, animationsEnabled, motionActive, spec } =
    useAppMotion();
  return (
    <div>
      <span data-testid="probe-system">{primarySystem}</span>
      <span data-testid="probe-sub">{mangaSubTheme ?? "none"}</span>
      <span data-testid="probe-minimal">{String(isMinimal)}</span>
      <span data-testid="probe-anim">{String(animationsEnabled)}</span>
      <span data-testid="probe-active">{String(motionActive)}</span>
      <span data-testid="probe-duration">{String(spec.transition.duration ?? "spring")}</span>
    </div>
  );
}

function renderWithAppProviders(
  ui: React.ReactNode,
  opts?: { initialMode?: "classic" | "nexus" | "manga" | "minimal" },
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider>
            <ThemeProvider initialSystem={opts?.initialMode ?? "classic"}>{ui}</ThemeProvider>
          </UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Global Framer Motion architecture with minimal mode bypass", () => {
  beforeEach(() => {
    localStorage.clear();
    setAnimationsEnabled(true);
  });

  afterEach(() => {
    cleanup();
    setAnimationsEnabled(true);
    localStorage.clear();
  });

  it("enables Framer Motion across classic, nexus, and manga modes and disables it in minimal or when animations are paused", () => {
    const { rerender } = render(
      <UIStateProvider key="classic" initialMode="classic" applyAttributesToHtml={false}>
        <MotionProbe />
      </UIStateProvider>,
    );
    expect(screen.getByTestId("probe-system").textContent).toBe("classic");
    expect(screen.getByTestId("probe-minimal").textContent).toBe("false");
    expect(screen.getByTestId("probe-active").textContent).toBe("true");

    rerender(
      <UIStateProvider key="nexus" initialMode="nexus" applyAttributesToHtml={false}>
        <MotionProbe />
      </UIStateProvider>,
    );
    expect(screen.getByTestId("probe-system").textContent).toBe("nexus");
    expect(screen.getByTestId("probe-active").textContent).toBe("true");

    rerender(
      <UIStateProvider key="manga" initialMode="manga" applyAttributesToHtml={false}>
        <MotionProbe />
      </UIStateProvider>,
    );
    expect(screen.getByTestId("probe-system").textContent).toBe("manga");
    expect(screen.getByTestId("probe-active").textContent).toBe("true");

    rerender(
      <UIStateProvider key="minimal" initialMode="minimal" applyAttributesToHtml={false}>
        <MotionProbe />
      </UIStateProvider>,
    );
    expect(screen.getByTestId("probe-system").textContent).toBe("minimal");
    expect(screen.getByTestId("probe-minimal").textContent).toBe("true");
    expect(screen.getByTestId("probe-active").textContent).toBe("false");
    expect(screen.getByTestId("probe-duration").textContent).toBe("0");

    // Animations paused overrides classic mode to paused
    rerender(
      <UIStateProvider key="classic-paused" initialMode="classic" applyAttributesToHtml={false}>
        <MotionProbe />
      </UIStateProvider>,
    );
    expect(screen.getByTestId("probe-active").textContent).toBe("true");
    act(() => {
      setAnimationsEnabled(false);
    });
    expect(screen.getByTestId("probe-anim").textContent).toBe("false");
    expect(screen.getByTestId("probe-active").textContent).toBe("false");
  });

  it("renders MotionPage, MotionSection, MotionCard, MotionModalPanel, and MotionPresence statically in minimal mode", () => {
    const { unmount } = renderWithAppProviders(
      <MotionPage data-testid="page" as="main">
        <MotionSection as="section">
          <MotionCard as="article" index={0}>
            <span>Card Item</span>
          </MotionCard>
        </MotionSection>
        <MotionPresence>
          <MotionModalPanel>
            <span>Modal Content</span>
          </MotionModalPanel>
        </MotionPresence>
      </MotionPage>,
      { initialMode: "nexus" },
    );

    const activeStates = document.querySelectorAll('[data-motion-state="active"]');
    expect(activeStates.length).toBe(4);
    expect(document.querySelectorAll('[data-motion-state="minimal-off"]').length).toBe(0);

    unmount();

    renderWithAppProviders(
      <MotionPage as="main">
        <MotionSection as="section">
          <MotionCard as="article" index={0}>
            <span>Card Item</span>
          </MotionCard>
        </MotionSection>
        <MotionPresence>
          <MotionModalPanel>
            <span>Modal Content</span>
          </MotionModalPanel>
        </MotionPresence>
      </MotionPage>,
      { initialMode: "minimal" },
    );

    const offStates = document.querySelectorAll('[data-motion-state="minimal-off"]');
    expect(offStates.length).toBe(4);
    expect(document.querySelectorAll('[data-motion-state="active"]').length).toBe(0);
    expect(screen.getByText("Card Item")).toBeInTheDocument();
    expect(screen.getByText("Modal Content")).toBeInTheDocument();
  });

  it("toggles Framer Motion across App views when switching between modes and Minimal", () => {
    render(<App />);

    // Default classic mode: Framer Motion is active
    expect(document.querySelector('[data-motion-state="active"]')).toBeInTheDocument();
    expect(document.querySelector('[data-motion-state="minimal-off"]')).toBeNull();

    // Switch to Minimal mode via UI button
    fireEvent.click(screen.getByRole("button", { name: "Minimal" }));
    expect(screen.getByTestId("active-ui-mode-badge").textContent).toBe("minimal");
    expect(document.querySelector('[data-motion-state="minimal-off"]')).toBeInTheDocument();
    expect(document.querySelector('[data-motion-state="active"]')).toBeNull();

    // Switch view to Archivist AI while in Minimal mode -> stays minimal-off
    fireEvent.click(screen.getByRole("button", { name: "Archivist AI" }));
    expect(document.querySelector('[data-motion-state="minimal-off"]')).toBeInTheDocument();
    expect(document.querySelector('[data-motion-state="active"]')).toBeNull();

    // Switch to Manga mode -> Framer Motion reactivates
    fireEvent.click(screen.getByRole("button", { name: "Manga" }));
    expect(screen.getByTestId("active-ui-mode-badge").textContent).toBe("manga");
    expect(document.querySelector('[data-motion-state="active"]')).toBeInTheDocument();
    expect(document.querySelector('[data-motion-state="minimal-off"]')).toBeNull();
  });

  it("bypasses Framer Motion in KineticText, LoreExplorer, and ArchivistChat when in minimal mode", () => {
    const { container } = render(
      <UIStateProvider initialMode="minimal" applyAttributesToHtml={false}>
        <KineticText text="Hello SCU" />
        <LoreExplorer />
        <ArchivistChat />
      </UIStateProvider>,
    );

    // KineticText renders a single plain span in minimal mode instead of per-character motion spans
    expect(screen.getByText("Hello SCU")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-motion-state="active"]').length).toBe(0);
    expect(container.querySelectorAll('[data-motion-state="minimal-off"]').length).toBeGreaterThan(
      2,
    );
  });
});
