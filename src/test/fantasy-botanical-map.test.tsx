import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { DossierComponent } from "@/components/dossier-component";
import { BotanicalCanopyOverlay } from "@/components/botanical-foliage-canopy";
import { IvyDecoration } from "@/components/manga/fantasy/IvyDecoration";
import { FantasyMapSpread } from "@/components/fantasy-map-spread";
import { MangaEntitySpread } from "@/components/manga-view";
import type { Entity } from "@/lib/entities";
import { setAnimationsEnabled } from "@/lib/animations";
import { setGenreTheme } from "@/lib/genre-themes";

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
    const { preload: _preload, ...anchorProps } = rest;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
}));

function renderWithProviders(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider initialMode="manga">{ui}</UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Fantasy Botanical Canopy, Dossier Abilities Showcase & Diamond Map Spread", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset["genreTheme"];
    setAnimationsEnabled(true);
    setGenreTheme("fantasy");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders hanging moving botanical ivy/branches, jade cartouche, and interactive circular ability orbs inside FantasyFullDossier", () => {
    renderWithProviders(
      <DossierComponent
        theme="fantasy"
        name="Sylvara"
        seriesTitle="THE SENTINELS"
        abilities={[
          { name: "athenas_judgement", label: "Athena's Judgement", tier: "Mythic" },
          { name: "aether_dominion", label: "Aether Dominion", tier: "Mythic" },
        ]}
      />,
    );

    expect(document.querySelector('[data-jade-cartouche="true"]')).toBeInTheDocument();
    const canopy = document.querySelector('[data-botanical-canopy="dossier"]');
    expect(canopy).toBeInTheDocument();
    expect(canopy).toHaveAttribute("data-botanical-animated", "true");

    const showcase = document.querySelector('[data-dossier-abilities-showcase="true"]');
    expect(showcase).toBeInTheDocument();

    const orbs = document.querySelectorAll('[data-ability-orb="true"]');
    expect(orbs).toHaveLength(2);
    expect(orbs[0]).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(orbs[1]!);
    expect(orbs[1]).toHaveAttribute("aria-pressed", "true");
    expect(showcase?.textContent).toContain("Aether Dominion");
  });

  it("halts botanical animations when FX:OFF disables animations", () => {
    renderWithProviders(<BotanicalCanopyOverlay variant="card" />);
    const canopy = document.querySelector('[data-botanical-canopy="card"]');
    expect(canopy).toHaveAttribute("data-botanical-animated", "true");

    act(() => {
      setAnimationsEnabled(false);
    });
    expect(canopy).toHaveAttribute("data-botanical-animated", "false");
  });

  it("renders FantasyMapSpread diamond viewport layout with stacked elemental crests, realm switching, and Discover CTA", () => {
    renderWithProviders(<FantasyMapSpread />);

    expect(document.querySelector('[data-fantasy-map-spread="true"]')).toBeInTheDocument();
    expect(screen.getByLabelText("Realm elemental ratings")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nilanjona's Realm" })).toBeInTheDocument();

    // Switch realm to Yasnaya then Aethmos
    fireEvent.click(screen.getAllByRole("button", { name: /^Yasnaya$/i })[0]!);
    expect(screen.getByRole("heading", { name: "Yasnaya" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^Aethmos$/i })[0]!);
    expect(screen.getByRole("heading", { name: "Aethmos" })).toBeInTheDocument();

    // Verify DISCOVER button opens interactive atlas overlay
    const discoverBtn = document.querySelector('[data-fantasy-discover-btn="true"]');
    expect(discoverBtn).toBeInTheDocument();
    fireEvent.click(discoverBtn!);
  });

  it("applies card-idle-breath and hover mint-emerald aura classes on character cards and dossier ability cards in fantasy mode", () => {
    const mockChars = [
      {
        id: "char-1",
        name: "Sylvara",
        kind: "character",
        status: "Active",
        category: "Sentinel",
        abilities: ["aether_dominion"],
        beast_traits: [],
        sketches: [],
      },
      {
        id: "char-2",
        name: "Kaelen",
        kind: "character",
        status: "Active",
        category: "Vanguard",
        abilities: ["athenas_judgement"],
        beast_traits: [],
        sketches: [],
      },
    ] as unknown as Entity[];

    renderWithProviders(
      <>
        <MangaEntitySpread
          entities={mockChars}
          kind="character"
          chapter="CH. 02"
          title="Characters"
          subtitle="Roster"
          onSelect={() => {}}
          search=""
          onSearchChange={() => {}}
          spoilerScope="characters"
        />
        <DossierComponent
          theme="fantasy"
          name="Sylvara"
          seriesTitle="THE SENTINELS"
          abilities={[{ name: "aether_dominion", label: "Aether Dominion", tier: "Mythic" }]}
        />
      </>,
    );

    const charCards = Array.from(document.querySelectorAll("article.manga-panel-hover"));
    expect(charCards).toHaveLength(2);
    expect(charCards[0]).toHaveClass("card-idle-breath");
    expect(charCards[0]).toHaveClass("hover:mint-emerald-aura");
    expect(charCards[0]).toHaveClass("fantasy-mint-aura-hover");
    expect((charCards[0] as HTMLElement).style.animationDelay).toBe("0s");
    expect((charCards[1] as HTMLElement).style.animationDelay).toBe("0.48s");

    const dossierAbilityCard = document.querySelector(
      '[data-dossier-abilities-showcase="true"] .card-idle-breath',
    );
    expect(dossierAbilityCard).toBeInTheDocument();
    expect(dossierAbilityCard).toHaveClass("hover:mint-emerald-aura");
    expect(dossierAbilityCard).toHaveClass("fantasy-mint-aura-hover");

    // Switching off FX freezes idle breath
    act(() => {
      setAnimationsEnabled(false);
    });
    expect(charCards[0]).not.toHaveClass("card-idle-breath");

    // Switching out of fantasy removes idle breath and mint-emerald aura even when animations are enabled
    act(() => {
      setAnimationsEnabled(true);
      setGenreTheme("manga-ink");
    });
    expect(charCards[0]).not.toHaveClass("card-idle-breath");
    expect(charCards[0]).not.toHaveClass("hover:mint-emerald-aura");

    // Verify CSS keyframes include both translation and rotation plus mint-emerald aura utility
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
    const breathBlock = css.match(/@keyframes cardIdleBreath\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(breathBlock).toContain("translate3d(");
    expect(breathBlock).toContain("rotate(");
    expect(css).toContain("@utility mint-emerald-aura");
    expect(css).toContain(".fantasy-mint-aura-hover:hover");

    // Switching back to fantasy verifies IvyDecoration renders inside character cards
    act(() => {
      setGenreTheme("fantasy");
    });
    expect(charCards[0]?.querySelector('[data-ivy-decoration="true"]')).toBeInTheDocument();
  });

  it("renders IvyDecoration with absolute positioning and ivySway animations only when manga + fantasy are active", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <ThemeProvider key="manga-fantasy" initialSystem="manga" initialSubTheme="fantasy">
          <div className="relative">
            <IvyDecoration />
          </div>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const ivy = document.querySelector('[data-ivy-decoration="true"]') as HTMLElement | null;
    expect(ivy).toBeInTheDocument();
    expect(ivy).toHaveClass("absolute");
    expect(ivy).toHaveAttribute("data-ivy-animated", "true");
    const animatedVine = ivy?.querySelector(".ivy-sway") as HTMLElement | null;
    expect(animatedVine).toBeInTheDocument();
    expect(animatedVine?.style.animation).toContain("ivySway");

    // FX:OFF pauses ivySway animation cleanly
    act(() => {
      setAnimationsEnabled(false);
    });
    expect(ivy).toHaveAttribute("data-ivy-animated", "false");
    expect((ivy?.querySelector("svg") as HTMLElement | null)?.style.animation).toBe("none");

    // Non-fantasy manga sub-theme hides IvyDecoration
    act(() => {
      setAnimationsEnabled(true);
    });
    rerender(
      <QueryClientProvider client={qc}>
        <ThemeProvider key="manga-shounen" initialSystem="manga" initialSubTheme="shounen">
          <div className="relative">
            <IvyDecoration />
          </div>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(document.querySelector('[data-ivy-decoration="true"]')).not.toBeInTheDocument();

    // Non-manga primary system hides IvyDecoration even if fantasy sub-theme was previously stored
    rerender(
      <QueryClientProvider client={qc}>
        <ThemeProvider key="classic-fantasy" initialSystem="classic" initialSubTheme="fantasy">
          <div className="relative">
            <IvyDecoration />
          </div>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(document.querySelector('[data-ivy-decoration="true"]')).not.toBeInTheDocument();
  });
});
