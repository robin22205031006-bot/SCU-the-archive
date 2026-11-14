import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { DossierComponent } from "@/components/dossier-component";
import { AstralClockworkAstrolabe } from "@/components/astral-clockwork-astrolabe";
import { GenrePortraitFrame } from "@/components/genre-decorations";
import { setAnimationsEnabled } from "@/lib/animations";
import { setGenreTheme } from "@/lib/genre-themes";
import { useState, type ReactNode } from "react";

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

describe("Fantasy Full Dossier & Astral Clockwork Astrolabe Layout", () => {
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

  it("renders FantasyFullDossier with safe SVG portrait fallback and toggles cleanly to Astral Clockwork Astrolabe mode", () => {
    function ControlledFantasy() {
      const [activeTab, setActiveTab] = useState("powers");
      return (
        <DossierComponent
          theme="fantasy"
          name="Elara Thorne"
          seriesTitle="THE SENTINELS"
          activeTab={activeTab}
          onSelectTab={(id) => setActiveTab(id)}
          abilities={[
            { name: "chrono_weave", label: "Chrono Weave", tier: "Mythic" },
            { name: "emerald_ward", label: "Emerald Ward", tier: "Legendary" },
          ]}
        />
      );
    }

    renderWithProviders(<ControlledFantasy />);

    const root = document.querySelector('[data-dossier-template="scroll-parchment"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("data-fantasy-dossier-view", "grimoire");
    expect(screen.getByRole("heading", { name: "Elara Thorne" })).toBeInTheDocument();
    expect(document.querySelector('[data-portrait-fallback="svg-crest"]')).toBeInTheDocument();

    // Switch to Astral Astrolabe mode
    fireEvent.click(screen.getByRole("button", { name: /Astral Astrolabe/i }));
    expect(root).toHaveAttribute("data-fantasy-dossier-view", "astrolabe");

    const astrolabe = document.querySelector('[data-astral-astrolabe="true"]');
    expect(astrolabe).toBeInTheDocument();
    expect(astrolabe).toHaveAttribute("data-astrolabe-variant", "fantasy");
    expect(astrolabe).toHaveAttribute("data-astrolabe-angle", "-54");

    // Clicking another sector tab rotates the astrolabe alidade and preserves single heading
    fireEvent.click(screen.getByRole("tab", { name: /LORE/i }));
    expect(astrolabe).toHaveAttribute("data-astrolabe-angle", "-18");
    expect(screen.getAllByRole("heading", { name: "Elara Thorne" })).toHaveLength(1);

    // Switch back to Grimoire Folio
    fireEvent.click(screen.getByRole("button", { name: /Grimoire Folio/i }));
    expect(root).toHaveAttribute("data-fantasy-dossier-view", "grimoire");
  });

  it("renders AstralClockworkAstrolabe for astrolabe-relic and respects FX:OFF motion setting", () => {
    setGenreTheme("isekai");
    renderWithProviders(
      <AstralClockworkAstrolabe
        name="Zaan Vael"
        subtitle="ASTRAL ARCHIVIST"
        seriesTitle="STANDALONE EPICS"
        tierLabel="S+"
        variant="isekai"
        showTitle
        tabs={[
          { id: "powers", short: "ARSENAL", full: "01 // ARSENAL", jp: "異能" },
          { id: "lore", short: "LORE", full: "02 // LORE", jp: "伝承" },
        ]}
        activeTab="powers"
        abilities={[{ name: "starlight", label: "Starlight", tier: "Mythic" }]}
      />,
    );

    const astrolabe = document.querySelector('[data-astral-astrolabe="true"]');
    expect(astrolabe).toHaveAttribute("data-astrolabe-variant", "isekai");
    expect(astrolabe).toHaveAttribute("data-astrolabe-animated", "true");
    expect(document.querySelector(".astrolabe-ring-cw")).toBeInTheDocument();
    expect(document.querySelector(".astrolabe-ring-ccw")).toBeInTheDocument();
    expect(screen.getByText("Starlight")).toBeInTheDocument();
    expect(screen.getByText(/AZM 306°/)).toBeInTheDocument();

    act(() => {
      setAnimationsEnabled(false);
    });
    expect(astrolabe).toHaveAttribute("data-astrolabe-animated", "false");
    expect(document.querySelector(".astrolabe-ring-cw")).not.toBeInTheDocument();
  });

  it("falls back to inline SVG crest in GenrePortraitFrame when image fails to load", () => {
    renderWithProviders(
      <GenrePortraitFrame
        theme="fantasy"
        src="https://example.invalid/missing-portrait.png"
        alt="Aurelia Crest"
        fallback="A"
        size="dossier"
      />,
    );

    const img = screen.getByAltText("Aurelia Crest");
    fireEvent.error(img);

    expect(screen.queryByAltText("Aurelia Crest")).not.toBeInTheDocument();
    expect(document.querySelector('[data-portrait-fallback="svg-crest"]')).toBeInTheDocument();
  });
});
