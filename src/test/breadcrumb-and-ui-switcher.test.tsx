import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { UIStateProvider } from "@/context/UIStateContext";
import { LoreBreadcrumb, LoreBreadcrumbProvider } from "@/components/lore-breadcrumb";
import { NexusExplorer, type NexusRecord } from "@/components/nexus-explorer";
import { LoreExplorer, type LoreItem } from "@/components/LoreExplorer";
import { HeaderUiModeSelect } from "@/components/header-ui-mode-select";
import { SiteNav } from "@/components/site-nav";
import { NexusChrome } from "@/components/nexus-shell";
import { MangaChrome } from "@/components/manga-shell";
import { FloatingNav } from "@/components/floating-nav";

let mockPathname = "/characters";
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => {
    const { preload: _preload, search: _search, ...anchorProps } = rest;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/integrations/supabase/client", () => {
  const emptyChain: Record<string, unknown> = {
    select: () => emptyChain,
    eq: () => emptyChain,
    in: () => emptyChain,
    order: () => emptyChain,
    limit: () => emptyChain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return {
    supabase: {
      from: () => emptyChain,
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
    },
  };
});

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => false,
  useIsStaff: () => false,
  useSession: () => ({ data: null }),
}));

vi.mock("@/components/universal-search", () => ({
  UniversalSearch: () => <div data-testid="mock-universal-search" />,
}));

vi.mock("@/components/theme-drawer", () => ({
  ThemeDrawer: () => null,
}));

vi.mock("@/components/lazy-three", () => ({
  GlbModelViewer: () => null,
  NexusFxLayer: ({ children }: { children?: ReactNode }) => <>{children ?? null}</>,
  ArsenalThreeStage: () => null,
  LivingThemeBackdrop: () => null,
  CelCombatStage: () => null,
}));

function renderWithProviders(
  ui: ReactNode,
  { initialMode = "classic" as "classic" | "nexus" | "minimal" | "manga" } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider initialMode={initialMode}>
            <ThemeProvider>
              <UIStateProvider applyAttributesToHtml={false}>{ui}</UIStateProvider>
            </ThemeProvider>
          </UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("LoreBreadcrumb navigation and nested folder trail", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = "/archive";
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("merges LoreBreadcrumbProvider ancestor segments with child segments and triggers parent callbacks", () => {
    const onArchiveClick = vi.fn();
    const onOrgsClick = vi.fn();

    renderWithProviders(
      <LoreBreadcrumbProvider
        segments={[{ id: "archive", label: "Archive", onClick: onArchiveClick }]}
      >
        <LoreBreadcrumb
          segments={[
            { id: "orgs", label: "Orgs & Bloodlines", onClick: onOrgsClick },
            { id: "faction-dew", label: "D.E.W." },
          ]}
        />
      </LoreBreadcrumbProvider>,
    );

    const trail = screen.getByTestId("lore-breadcrumb");
    const nav = within(trail).getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Orgs & Bloodlines" })).toBeInTheDocument();

    const currentPage = within(nav).getByText("D.E.W.");
    expect(currentPage).toHaveAttribute("aria-current", "page");

    fireEvent.click(within(nav).getByRole("button", { name: "Orgs & Bloodlines" }));
    expect(onOrgsClick).toHaveBeenCalledTimes(1);

    fireEvent.click(within(nav).getByRole("button", { name: "Archive" }));
    expect(onArchiveClick).toHaveBeenCalledTimes(1);
  });

  it("does not render when fewer than two segments exist", () => {
    renderWithProviders(<LoreBreadcrumb segments={[{ id: "single", label: "Archive" }]} />);
    expect(screen.queryByTestId("lore-breadcrumb")).not.toBeInTheDocument();
  });

  it("tracks NexusExplorer drilldown (Root -> Category -> Record) and returns to parent folders on click", async () => {
    const records: Array<NexusRecord & { detail: string }> = [
      { id: "r1", title: "Aether Stone", group: "Relic", detail: "Cosmic core fragment." },
      { id: "r2", title: "Kara Yazgi", group: "Cursed Blade", detail: "Ashen obsidian sword." },
    ];

    renderWithProviders(
      <NexusExplorer
        label="Artifacts"
        records={records}
        renderDetail={(rec) => <p>{rec.detail}</p>}
      />,
      { initialMode: "nexus" },
    );

    // At root cluster level without search, breadcrumb is hidden
    expect(screen.queryByTestId("lore-breadcrumb")).not.toBeInTheDocument();

    // Drill into Relic folder
    fireEvent.click(screen.getByRole("button", { name: /Relic, 1/i }));
    const trailAtGroup = screen.getByTestId("lore-breadcrumb");
    expect(within(trailAtGroup).getByRole("button", { name: "Artifacts" })).toBeInTheDocument();
    expect(within(trailAtGroup).getByText("Relic")).toHaveAttribute("aria-current", "page");

    // Drill into Aether Stone item (wait for AnimatePresence mode="wait" to swap views)
    const itemBtn = await screen.findByRole("button", { name: /Aether Stone/i });
    fireEvent.click(itemBtn);
    expect(await screen.findByText("Cosmic core fragment.")).toBeInTheDocument();

    const trailAtItem = screen.getByTestId("lore-breadcrumb");
    expect(within(trailAtItem).getByRole("button", { name: "Relic" })).toBeInTheDocument();
    expect(within(trailAtItem).getByText("Aether Stone")).toHaveAttribute("aria-current", "page");

    // Click parent category crumb -> closes detail back to Relic list
    fireEvent.click(within(trailAtItem).getByRole("button", { name: "Relic" }));
    await waitFor(() => {
      expect(screen.queryByText("Cosmic core fragment.")).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("button", { name: /Aether Stone/i })).toBeInTheDocument();

    // Click root crumb -> returns to top category clusters view
    fireEvent.click(
      within(screen.getByTestId("lore-breadcrumb")).getByRole("button", { name: "Artifacts" }),
    );
    expect(await screen.findByRole("button", { name: /Cursed Blade, 1/i })).toBeInTheDocument();
    expect(screen.queryByTestId("lore-breadcrumb")).not.toBeInTheDocument();
  });

  it("renders LoreExplorer breadcrumb trail below header on deep tier filtering and resets on parent click", () => {
    const sampleItems: LoreItem[] = [
      { id: "c1", name: "Ethan Reed", tier: "Mythic", category: "Vanguard", description: "Lead" },
      { id: "c2", name: "Samuel", tier: "Ancient", category: "Clan", description: "Warden" },
    ];

    renderWithProviders(<LoreExplorer initialItems={sampleItems} />);

    expect(screen.queryByTestId("lore-breadcrumb")).not.toBeInTheDocument();

    // Click Mythic tier filter tab
    fireEvent.click(screen.getByRole("tab", { name: /Mythic \(1\)/i }));

    const trail = screen.getByTestId("lore-breadcrumb");
    expect(within(trail).getByRole("button", { name: "Lore Explorer" })).toBeInTheDocument();
    expect(within(trail).getByRole("button", { name: "Characters" })).toBeInTheDocument();
    expect(within(trail).getByText("Tier: Mythic")).toHaveAttribute("aria-current", "page");

    // Click parent Characters crumb to return to all sections
    fireEvent.click(within(trail).getByRole("button", { name: "Characters" }));
    expect(screen.getByRole("region", { name: "Ancient section" })).toBeInTheDocument();
    expect(screen.queryByTestId("lore-breadcrumb")).not.toBeInTheDocument();
  });
});

describe("Global HeaderUiModeSelect across shells & tabs", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("switches UI mode via HeaderUiModeSelect and updates html attributes", () => {
    renderWithProviders(<HeaderUiModeSelect />, { initialMode: "classic" });

    const trigger = screen.getByTestId("header-ui-mode-select");
    expect(trigger).toHaveAttribute("aria-label", "Switch UI style");
    expect(document.documentElement.dataset["uiMode"]).toBe("classic");
    expect(document.documentElement.dataset["ui"]).toBeUndefined();

    fireEvent.click(trigger);
    const mangaOption = screen.getByRole("option", { name: /Manga/i });
    fireEvent.click(mangaOption);

    expect(document.documentElement.dataset["ui"]).toBe("manga");
    expect(document.documentElement.dataset["uiMode"]).toBe("manga");
  });

  it("exposes UI changing control inside SiteNav across any tab", () => {
    mockPathname = "/series";
    renderWithProviders(<SiteNav />, { initialMode: "classic" });

    const switcher = screen.getByTestId("header-ui-mode-select");
    expect(switcher).toBeInTheDocument();

    fireEvent.click(switcher);
    fireEvent.click(screen.getByRole("option", { name: /Nexus/i }));
    expect(document.documentElement.dataset["ui"]).toBe("nexus");
  });

  it("exposes UI changing control in NexusChrome header and navigation drawer", () => {
    mockPathname = "/archive";
    renderWithProviders(<NexusChrome />, { initialMode: "nexus" });

    expect(screen.getByTestId("header-ui-mode-select")).toBeInTheDocument();

    // Open Nexus navigation drawer and confirm full Interface UI picker is available too
    fireEvent.click(screen.getByRole("button", { name: "Nexus navigation" }));
    expect(screen.getByText("Interface UI")).toBeInTheDocument();
  });

  it("exposes UI changing control in MangaChrome issue strip", () => {
    mockPathname = "/abilities";
    renderWithProviders(<MangaChrome />, { initialMode: "manga" });

    const switcher = screen.getByTestId("header-ui-mode-select");
    expect(switcher).toBeInTheDocument();
    fireEvent.click(switcher);
    fireEvent.click(screen.getByRole("option", { name: /Minimal/i }));
    expect(document.documentElement.dataset["ui"]).toBe("minimal");
  });

  it("exposes UI changing control in HUD navigation mode across tabs", () => {
    mockPathname = "/timeline";
    localStorage.setItem("scu-nav-mode", "hud");
    renderWithProviders(<FloatingNav />, { initialMode: "classic" });

    expect(screen.getByTestId("header-ui-mode-select")).toBeInTheDocument();
  });
});
