import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiStylePicker } from "@/components/ui-style-picker";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UI_MODE_STORAGE_KEY, UiModeProvider, useUiMode } from "@/hooks/use-ui-mode";
import { setUiStyle } from "@/lib/ui-style";

function ModeProbe() {
  const { mode, setMode, cycleMode } = useUiMode();
  return (
    <div>
      <span data-testid="current-mode">{mode}</span>
      <button type="button" onClick={() => setMode("nexus")}>
        Switch Nexus
      </button>
      <button type="button" onClick={() => setMode("minimal")}>
        Switch Minimal
      </button>
      <button type="button" onClick={() => setMode("manga")}>
        Switch Manga
      </button>
      <button type="button" onClick={() => setMode("classic")}>
        Switch Classic
      </button>
      <button type="button" onClick={cycleMode}>
        Cycle Mode
      </button>
      <UiStylePicker />
    </div>
  );
}

function renderWithProviders() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider>
            <ModeProbe />
          </UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Global UiModeProvider context & <html> CSS custom properties", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["uiSwitching"];
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("tracks UI mode globally and updates CSS custom properties and data attributes on <html>", () => {
    vi.useFakeTimers();
    renderWithProviders();

    const root = document.documentElement;
    expect(screen.getByTestId("current-mode").textContent).toBe("classic");
    expect(root.dataset["uiMode"]).toBe("classic");
    expect(root.dataset["ui"]).toBeUndefined();
    expect(root.style.getPropertyValue("--ui-mode")).toBe("classic");

    // Classic -> Nexus
    fireEvent.click(screen.getByRole("button", { name: "Switch Nexus" }));
    expect(screen.getByTestId("current-mode").textContent).toBe("nexus");
    expect(root.dataset["uiMode"]).toBe("nexus");
    expect(root.dataset["ui"]).toBe("nexus");
    expect(root.dataset["uiSwitching"]).toBe("true");
    expect(root.style.getPropertyValue("--ui-mode")).toBe("nexus");
    expect(root.style.getPropertyValue("--background")).toBe("var(--nexus-bg)");
    expect(root.style.getPropertyValue("--accent")).toBe("var(--nexus-glow)");
    expect(root.style.getPropertyValue("--glass-blur")).toBe("18px");
    expect(localStorage.getItem(UI_MODE_STORAGE_KEY)).toBe("nexus");

    vi.advanceTimersByTime(350);
    expect(root.dataset["uiSwitching"]).toBeUndefined();

    // Nexus -> Manga
    fireEvent.click(screen.getByRole("button", { name: "Switch Manga" }));
    expect(screen.getByTestId("current-mode").textContent).toBe("manga");
    expect(root.dataset["uiMode"]).toBe("manga");
    expect(root.dataset["ui"]).toBe("manga");
    expect(root.style.getPropertyValue("--ui-mode")).toBe("manga");
    expect(root.style.getPropertyValue("--ui-card-border-width")).toBe("2px");
    expect(root.style.getPropertyValue("--glass-blur")).toBe("0px");
    expect(root.style.getPropertyValue("--glow-strength")).toBe("0");

    // Manga -> Minimal (instant transition, zero blur/glow/shadow)
    fireEvent.click(screen.getByRole("button", { name: "Switch Minimal" }));
    expect(screen.getByTestId("current-mode").textContent).toBe("minimal");
    expect(root.dataset["uiMode"]).toBe("minimal");
    expect(root.dataset["ui"]).toBe("minimal");
    expect(root.dataset["uiSwitching"]).toBeUndefined();
    expect(root.style.getPropertyValue("--ui-transition")).toBe("0ms");
    expect(root.style.getPropertyValue("--ui-card-shadow")).toBe("none");
    expect(root.style.getPropertyValue("--radius")).toBe("0.375rem");

    // Minimal -> Classic restores base theme variables without leaving stale Nexus/Manga props
    fireEvent.click(screen.getByRole("button", { name: "Switch Classic" }));
    expect(screen.getByTestId("current-mode").textContent).toBe("classic");
    expect(root.dataset["uiMode"]).toBe("classic");
    expect(root.dataset["ui"]).toBeUndefined();
    expect(root.style.getPropertyValue("--ui-card-border-width")).toBe("1px");
    expect(root.style.getPropertyValue("--background")).not.toBe("var(--nexus-bg)");
  });

  it("synchronizes with UiStylePicker and legacy setUiStyle updates", () => {
    renderWithProviders();

    const mangaBtn = screen.getByRole("button", { name: "Manga" });
    fireEvent.click(mangaBtn);
    expect(screen.getByTestId("current-mode").textContent).toBe("manga");
    expect(mangaBtn).toHaveAttribute("aria-pressed", "true");

    // Legacy store call updates global context
    act(() => {
      setUiStyle("nexus");
    });
    expect(screen.getByTestId("current-mode").textContent).toBe("nexus");
    expect(document.documentElement.dataset["uiMode"]).toBe("nexus");

    // Cycling advances cleanly back around
    fireEvent.click(screen.getByRole("button", { name: "Cycle Mode" }));
    expect(screen.getByTestId("current-mode").textContent).toBe("minimal");
  });
});
