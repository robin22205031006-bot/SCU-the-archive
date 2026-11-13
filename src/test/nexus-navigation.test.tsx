import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { NexusNavigation, type NexusNavLink } from "@/components/NexusNavigation";
import { UIStateProvider, UI_STATE_STORAGE_KEY, useUIState } from "@/context/UIStateContext";
import { scuCache } from "@/services/scuCache";

function UIStateProbe() {
  const { mode, setMode, cycleMode, navOpen, setNavOpen, activeNav, isNexus, isMinimal, isManga } =
    useUIState();
  return (
    <div>
      <span data-testid="probe-mode">{mode}</span>
      <span data-testid="probe-flags">{`${isNexus},${isMinimal},${isManga}`}</span>
      <span data-testid="probe-nav-open">{String(navOpen)}</span>
      <span data-testid="probe-active-nav">{activeNav}</span>
      <button type="button" onClick={() => setMode("minimal")}>
        Set Minimal
      </button>
      <button type="button" onClick={() => setMode("manga")}>
        Set Manga
      </button>
      <button type="button" onClick={cycleMode}>
        Cycle Mode
      </button>
      <button type="button" onClick={() => setNavOpen(true)}>
        Force Open
      </button>
    </div>
  );
}

const SAMPLE_LINKS: readonly NexusNavLink[] = [
  { to: "/", label: "Home" },
  { to: "/characters", label: "Characters" },
  { to: "/abilities", label: "Abilities" },
  { to: "/archive", label: "Archive" },
  { to: "/ai", label: "AI Box" },
  { to: "/series", label: "Series" },
  { to: "/timeline", label: "Timeline" },
];

describe("UIStateContext, NexusNavigation & App theme synchronization", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["uiSwitching"];
    vi.spyOn(scuCache, "getCharacters").mockResolvedValue([]);
    vi.spyOn(scuCache, "getOrganizations").mockResolvedValue([]);
    vi.spyOn(scuCache, "getTimeline").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("tracks UI mode globally via useUIState and updates <html> data attributes", () => {
    render(
      <UIStateProvider initialNav="/characters">
        <UIStateProbe />
      </UIStateProvider>,
    );

    const root = document.documentElement;
    expect(screen.getByTestId("probe-mode").textContent).toBe("nexus");
    expect(screen.getByTestId("probe-flags").textContent).toBe("true,false,false");
    expect(screen.getByTestId("probe-active-nav").textContent).toBe("/characters");
    expect(root.getAttribute("data-ui-mode")).toBe("nexus");
    expect(root.getAttribute("data-ui")).toBe("nexus");

    fireEvent.click(screen.getByRole("button", { name: "Set Minimal" }));
    expect(screen.getByTestId("probe-mode").textContent).toBe("minimal");
    expect(screen.getByTestId("probe-flags").textContent).toBe("false,true,false");
    expect(root.getAttribute("data-ui-mode")).toBe("minimal");
    expect(root.getAttribute("data-ui")).toBe("minimal");
    expect(localStorage.getItem(UI_STATE_STORAGE_KEY)).toBe("minimal");

    fireEvent.click(screen.getByRole("button", { name: "Set Manga" }));
    expect(screen.getByTestId("probe-mode").textContent).toBe("manga");
    expect(screen.getByTestId("probe-flags").textContent).toBe("false,false,true");
    expect(root.getAttribute("data-ui-mode")).toBe("manga");
    expect(root.getAttribute("data-ui")).toBe("manga");

    fireEvent.click(screen.getByRole("button", { name: "Cycle Mode" }));
    expect(screen.getByTestId("probe-mode").textContent).toBe("nexus");
    expect(root.getAttribute("data-ui")).toBe("nexus");
  });

  it("syncs NexusNavigation floating HUD links, pagination, Escape key, and mode switcher with UIStateContext", () => {
    const onNavigate = vi.fn();

    render(
      <UIStateProvider initialNav="/">
        <UIStateProbe />
        <NexusNavigation links={SAMPLE_LINKS} onNavigate={onNavigate} />
      </UIStateProvider>,
    );

    const launcher = screen.getByRole("button", { name: "Open Nexus HUD" });
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByTestId("probe-nav-open").textContent).toBe("false");

    // Opening HUD syncs UIStateContext navOpen -> true
    fireEvent.click(launcher);
    expect(screen.getByTestId("probe-nav-open").textContent).toBe("true");
    expect(screen.getByTestId("nexus-hud-panel")).toBeInTheDocument();

    // Pagination exposes links beyond 6 slots ("Timeline" is slot 7)
    expect(screen.queryByRole("button", { name: "Timeline" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Scroll HUD links down" }));
    expect(screen.getByRole("button", { name: "Timeline" })).toBeInTheDocument();

    // Selecting a HUD link updates activeNav, fires onNavigate, and closes HUD
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(onNavigate).toHaveBeenCalledWith({ to: "/timeline", label: "Timeline" });
    expect(screen.getByTestId("probe-active-nav").textContent).toBe("/timeline");
    expect(screen.getByTestId("probe-nav-open").textContent).toBe("false");

    // External context open + Escape closes HUD
    fireEvent.click(screen.getByRole("button", { name: "Force Open" }));
    expect(screen.getByTestId("nexus-hud-panel")).toBeInTheDocument();

    // Switch mode via HUD UI Mode control
    fireEvent.click(screen.getByRole("button", { name: "Manga" }));
    expect(screen.getByTestId("probe-mode").textContent).toBe("manga");
    expect(document.documentElement.getAttribute("data-ui")).toBe("manga");

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(screen.getByTestId("probe-nav-open").textContent).toBe("false");
  });

  it("mounts UIStateProvider in App, applies <html> theme attributes & CSS vars, and navigates via NexusNavigation", async () => {
    await act(async () => {
      render(<App />);
    });

    const root = document.documentElement;
    expect(screen.getByTestId("active-ui-mode-badge").textContent).toBe("nexus");
    expect(root.getAttribute("data-ui-mode")).toBe("nexus");
    expect(root.getAttribute("data-ui")).toBe("nexus");
    expect(root.style.getPropertyValue("--background")).toBe("var(--nexus-bg)");

    // Switch mode via App header control -> updates <html> attributes & CSS properties
    fireEvent.click(screen.getByRole("button", { name: "Minimal" }));
    expect(screen.getByTestId("active-ui-mode-badge").textContent).toBe("minimal");
    expect(root.getAttribute("data-ui-mode")).toBe("minimal");
    expect(root.getAttribute("data-ui")).toBe("minimal");
    expect(root.style.getPropertyValue("--glass-blur")).toBe("0px");

    // Open NexusNavigation HUD and switch to Archivist AI view
    fireEvent.click(screen.getByRole("button", { name: "Open Nexus HUD" }));
    const hudNav = screen.getByTestId("nexus-hud-panel");
    const archivistHudLink = hudNav.querySelector("button:has(> span)");
    expect(archivistHudLink).not.toBeNull();

    const aiButtons = screen.getAllByRole("button", { name: /Archivist AI/i });
    fireEvent.click(aiButtons[aiButtons.length - 1]);
    expect(screen.getByText(/Archivist online/i)).toBeInTheDocument();

    // Switch to Manga via App header
    const headerModes = screen.getByRole("group", { name: "Application UI Mode" });
    fireEvent.click(within(headerModes).getByRole("button", { name: "Manga" }));
    expect(root.getAttribute("data-ui-mode")).toBe("manga");
    expect(root.getAttribute("data-ui")).toBe("manga");
    expect(root.style.getPropertyValue("--ui-card-border-width")).toBe("2px");
  });
});
