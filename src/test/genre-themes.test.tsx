import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { GENRE_THEMES, setGenreTheme, type GenreThemeId } from "@/lib/genre-themes";
import { MANGA_SCALE, getMangaScaleClass } from "@/lib/manga-scale";
import { GenreBackdrop } from "@/components/genre-backdrop";
import { GenreThemeOverlay } from "@/components/genre-theme-overlay";
import { GenreCardFrame } from "@/components/genre-decorations";
import {
  DossierComponent,
  DOSSIER_TEMPLATE_BY_GENRE,
  resolveDossierTemplate,
} from "@/components/dossier-component";
import { AbilityBadge } from "@/components/ability-badge";
import { MangaShell } from "@/components/manga-shell";
import { MangaCharacterSpread, resolveDossierLayout } from "@/components/manga-view";
import { MangaSfxLayer, triggerMangaSfx } from "@/components/manga-sfx";
import {
  INTERACTION_SFX_MAP,
  resetInteractionSfxCounters,
  useMangaSfx,
} from "@/hooks/use-manga-sfx";
import { setAnimationsEnabled } from "@/lib/animations";
import fs from "node:fs";
import path from "node:path";

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
    const { preload: _preload, ...anchorProps } = rest;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
  useLocation: () => ({ pathname: "/characters" }),
  useNavigate: () => mockNavigate,
}));

const MOCK_ENTITY = {
  id: "char-1",
  name: "Kaelen Voss",
  kind: "character",
  alias: "Crimson Fang",
  role: "Vanguard",
  category: "Dark Fantasy",
  status: "Active",
  character_tier: "S",
  description: "Sworn blade of the Seventh Bastion.",
  image_url: null,
  abilities: ["Pyrokinesis", "Shadow Step"],
  beast_traits: [],
  sketches: [],
  stats: {
    affiliation: "Seventh Bastion",
    power: 92,
    agility: 85,
    tactical_iq: 88,
    clan_mastery: 78,
    weapon_proficiency: 80,
  },
};

function makeChain(table: string) {
  const result = (() => {
    if (table === "app_settings") return { data: null, error: null };
    if (table === "entities") return { data: [MOCK_ENTITY], error: null };
    return { data: [], error: null };
  })();

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => (table === "entities" ? { data: MOCK_ENTITY, error: null } : result),
    single: async () => (table === "entities" ? { data: MOCK_ENTITY, error: null } : result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeChain(table),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}));

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => false,
  useIsStaff: () => false,
}));

vi.mock("@/components/compare-sentinel", () => ({
  CompareSentinel: () => null,
}));

vi.mock("@/components/lineage-panel", () => ({
  CharacterRelationships: () => <div data-testid="mock-relationships" />,
  OrgHierarchy: () => <div data-testid="mock-org-hierarchy" />,
}));

vi.mock("@/components/entity-links", () => ({
  EntityLinks: () => <div data-testid="mock-entity-links" />,
}));

vi.mock("@/components/series-appearances", () => ({
  SeriesAppearances: () => <div data-testid="mock-series-appearances" />,
}));

function renderWithMode(ui: ReactNode, mode: "manga" | "classic" = "manga") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider initialMode={mode}>{ui}</UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Dynamic Manga SFX Pop-ups, Font Sizing Fix & Multi-Genre Themes", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["genreTheme"];
    setAnimationsEnabled(true);
    resetInteractionSfxCounters();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
  });

  it("spawns CSS-based Manga SFX pop-ups on interaction in Manga mode and auto-dismisses", () => {
    vi.useFakeTimers();

    renderWithMode(
      <div>
        <MangaSfxLayer />
        <button type="button">VS Combat Strike</button>
      </div>,
      "manga",
    );

    const btn = screen.getByRole("button", { name: "VS Combat Strike" });
    fireEvent.click(btn);

    const popup = document.querySelector('[data-manga-sfx="popup"]');
    expect(popup).toBeInTheDocument();
    expect(popup?.querySelector(".manga-sfx-text")?.textContent).toMatch(
      /BOOM!|WHAM!|SMASH!|SLASH!|KRAK!/,
    );
    expect(popup?.querySelector(".manga-sfx-outer")).toBeInTheDocument();

    act(() => {
      triggerMangaSfx({ word: "WHOOSH!", variant: "cloud", tone: "cyan", x: 200, y: 150 });
    });
    expect(screen.getByText("WHOOSH!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(document.querySelector('[data-manga-sfx="popup"]')).not.toBeInTheDocument();
  });

  it("switches across all 8 genre & anime themes from MangaShell with distinct viz, decorations, bezels & arrangements", async () => {
    renderWithMode(
      <MangaShell>
        <MangaCharacterSpread id="char-1" />
      </MangaShell>,
      "manga",
    );

    expect(await screen.findByRole("heading", { name: "Kaelen Voss" })).toBeInTheDocument();

    // Switch through key genre themes and verify unique visualization, card decoration, portrait bezel, and dossier arrangement
    const checks: Array<{
      id: GenreThemeId;
      buttonLabel: string;
      portrait: string;
      arrangement: string;
    }> = [
      {
        id: "xianxia",
        buttonLabel: "Xianxia",
        portrait: "quatrefoil-sun",
        arrangement: "xianxia-plaque",
      },
      {
        id: "cyber-anime",
        buttonLabel: "Cyber Anime",
        portrait: "lunar-circle",
        arrangement: "lunar-dossier",
      },
      {
        id: "dark-fantasy",
        buttonLabel: "Dark Fantasy",
        portrait: "occult-ring",
        arrangement: "occult-omen",
      },
      {
        id: "fantasy",
        buttonLabel: "Fantasy",
        portrait: "diamond-bezel",
        arrangement: "astrolabe-royal",
      },
      {
        id: "isekai",
        buttonLabel: "Isekai",
        portrait: "mana-orbit",
        arrangement: "isekai-status",
      },
      {
        id: "ghibli",
        buttonLabel: "Ghibli",
        portrait: "botanical-oval",
        arrangement: "ghibli-journal",
      },
      {
        id: "shonen",
        buttonLabel: "Shonen",
        portrait: "slash-cut",
        arrangement: "shonen-clash",
      },
    ];

    for (const c of checks) {
      fireEvent.click(screen.getByRole("button", { name: c.buttonLabel }));
      expect(document.documentElement.dataset["genreTheme"]).toBe(c.id);
      expect(document.querySelector(`[data-genre-viz="${c.id}"]`)).toBeInTheDocument();
      expect(document.querySelector(`[data-genre-decoration="${c.id}"]`)).toBeInTheDocument();
      expect(document.querySelector(`[data-portrait-frame="${c.portrait}"]`)).toBeInTheDocument();
      expect(
        document.querySelector(`[data-dossier-arrangement="${c.arrangement}"]`),
      ).toBeInTheDocument();
    }

    // Verify all 8 themes exist in registry
    expect(GENRE_THEMES).toHaveLength(8);
  }, 15000);

  it("keeps Classic UI untouched when a genre theme is stored in localStorage", () => {
    setGenreTheme("fantasy");
    renderWithMode(
      <div>
        <GenreBackdrop />
        <MangaSfxLayer />
        <button type="button">Classic Button</button>
      </div>,
      "classic",
    );

    expect(document.documentElement.dataset["uiMode"]).toBe("classic");
    expect(document.documentElement.dataset["genreTheme"]).toBeUndefined();
    expect(document.querySelector("[data-genre-viz]")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Classic Button" }));
    expect(document.querySelector('[data-manga-sfx="popup"]')).not.toBeInTheDocument();
  });

  it("useMangaSfx triggers keyword-mapped SFX (POW, CRACK, WHIZ) cleanly without duplicates and respects Classic/FX:OFF guards", () => {
    vi.useFakeTimers();

    function SfxHarness() {
      const { triggerSfx, bindSfx, isEnabled } = useMangaSfx();
      return (
        <div data-sfx-enabled={isEnabled ? "true" : "false"}>
          <button type="button" onClick={(ev) => triggerSfx("POW", ev)}>
            Trigger POW
          </button>
          <button type="button" onClick={(ev) => triggerSfx("CRACK", ev)}>
            Trigger CRACK
          </button>
          <button type="button" {...bindSfx("WHIZ")}>
            Bind WHIZ
          </button>
        </div>
      );
    }

    renderWithMode(
      <div>
        <MangaSfxLayer />
        <SfxHarness />
      </div>,
      "manga",
    );

    expect(document.querySelector('[data-sfx-enabled="true"]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trigger POW" }));
    expect(screen.getByText("POW!")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-manga-sfx="popup"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Trigger CRACK" }));
    expect(screen.getByText("CRACK!")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-manga-sfx="popup"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Bind WHIZ" }));
    expect(screen.getByText("WHIZ!")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-manga-sfx="popup"]')).toHaveLength(3);

    // Pausing animations disables SFX cleanly
    act(() => {
      setAnimationsEnabled(false);
    });
    expect(document.querySelector('[data-sfx-enabled="false"]')).toBeInTheDocument();
    expect(document.querySelector('[data-manga-sfx="popup"]')).not.toBeInTheDocument();
  });

  it("renders unique animated anime VFX elements per genre (falling petals, flowing ink stream, sparkles, embers) and obeys FX:OFF", () => {
    setGenreTheme("ghibli");
    renderWithMode(<GenreBackdrop />, "manga");
    expect(document.querySelector('[data-genre-viz="ghibli"]')).toHaveAttribute(
      "data-viz-animated",
      "true",
    );
    expect(document.querySelectorAll(".genre-petal.genre-ghibli-petals").length).toBeGreaterThan(0);

    act(() => {
      setGenreTheme("xianxia");
    });
    expect(
      document.querySelector(".genre-ink-stream-band.genre-xianxia-ink-stream"),
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".genre-qi-mote").length).toBeGreaterThan(0);

    act(() => {
      setGenreTheme("isekai");
    });
    expect(document.querySelectorAll(".genre-isekai-sparkle").length).toBeGreaterThan(0);

    act(() => {
      setGenreTheme("dark-fantasy");
    });
    expect(
      document.querySelectorAll(".genre-dark-ember.genre-ember-ascend").length,
    ).toBeGreaterThan(0);

    act(() => {
      setAnimationsEnabled(false);
    });
    expect(document.querySelector('[data-genre-viz="dark-fantasy"]')).toHaveAttribute(
      "data-viz-animated",
      "false",
    );
    expect(document.querySelector(".genre-ember-ascend")).not.toBeInTheDocument();
  });

  it("exposes centralized MANGA_SCALE utilities, non-matte genre render styles, and CSS background animations in src/styles.css", () => {
    expect(MANGA_SCALE.card).toBe("manga-card-scale");
    expect(MANGA_SCALE.heroTitle).toBe("manga-type-hero");
    expect(getMangaScaleClass("cardTitle", "extra-cls")).toBe("manga-type-card extra-cls");

    const css = fs.readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf-8");
    // Original Classic root font scale stays intact without global clamp override
    expect(css).toContain("font-size: calc(16px * var(--scu-zoom, 1) * var(--scu-base-scale, 1));");
    expect(css).not.toMatch(/clamp\(13\.5px,\s*0\.55vw/);
    // Centralized Manga scaling utility classes
    expect(css).toContain('html[data-ui="manga"] .manga-card-scale');
    expect(css).toContain('html[data-ui="manga"] .manga-type-card');
    // Distinct non-matte render styles & CSS background animations
    expect(css).toContain('html[data-genre-theme="fantasy"]');
    expect(css).toContain('html[data-genre-theme="dark-fantasy"]');
    expect(css).toContain('html[data-genre-theme="isekai"] .manga-panel');
    expect(css).toContain("backdrop-filter: blur(15px) saturate(165%)");
    expect(css).toContain("@keyframes genre-ghibli-petals");
    expect(css).toContain("@keyframes genre-xianxia-ink-stream");
    expect(css).toContain("@keyframes genre-isekai-sparkle");
    expect(css).toContain("@keyframes genre-ember-ascend");
    expect(css).toContain("@keyframes genre-shonen-speedlines");
    expect(css).toContain("@keyframes genre-cyber-grid-drift");
    expect(css).toContain("@keyframes manga-sfx-burst");
    expect(css).toContain(".manga-sfx-starburst");
    expect(css).toContain("@keyframes genre-theme-crossfade");
    expect(css).toContain("background-color 420ms");
  });

  it("maps interaction types (click, success, error, switch-mode) to diverse Manga SFX triggers (POW, WHAM, WHOOSH, SHING)", () => {
    vi.useFakeTimers();

    expect(INTERACTION_SFX_MAP.click.triggers).toEqual(expect.arrayContaining(["POW", "WHAM"]));
    expect(INTERACTION_SFX_MAP.success.triggers).toContain("SHING");
    expect(INTERACTION_SFX_MAP.error.triggers).toContain("CRACK");
    expect(INTERACTION_SFX_MAP["switch-mode"].triggers).toContain("WHOOSH");

    function InteractionHarness() {
      const { triggerInteractionSfx, bindInteractionSfx } = useMangaSfx();
      return (
        <div>
          <button
            type="button"
            onClick={(ev) => triggerInteractionSfx("click", ev, { withAudio: false })}
          >
            Action Click
          </button>
          <button
            type="button"
            onClick={(ev) => triggerInteractionSfx("success", ev, { withAudio: false })}
          >
            Action Success
          </button>
          <button
            type="button"
            onClick={(ev) => triggerInteractionSfx("error", ev, { withAudio: false })}
          >
            Action Error
          </button>
          <button type="button" {...bindInteractionSfx("switch-mode")}>
            Action Switch
          </button>
        </div>
      );
    }

    renderWithMode(
      <div>
        <MangaSfxLayer />
        <InteractionHarness />
      </div>,
      "manga",
    );

    fireEvent.click(screen.getByRole("button", { name: "Action Click" }));
    fireEvent.click(screen.getByRole("button", { name: "Action Success" }));
    fireEvent.click(screen.getByRole("button", { name: "Action Error" }));
    fireEvent.click(screen.getByRole("button", { name: "Action Switch" }));
    fireEvent.click(screen.getByRole("button", { name: "Action Click" }));

    const texts = Array.from(
      document.querySelectorAll('[data-manga-sfx="popup"] .manga-sfx-text'),
    ).map((el) => el.textContent);
    expect(texts).toHaveLength(5);
    expect(texts[0]).toBe("POW!");
    expect(texts[1]).toBe("SHING!");
    expect(texts[2]).toBe("CRACK!");
    expect(texts[3]).toBe("WHOOSH!");
    expect(texts[4]).toBe("WHAM!");
  });

  it("renders GenreThemeOverlay in Manga mode to dynamically toggle data-genre-theme on <html> and stays hidden in Classic mode", () => {
    const { rerender } = renderWithMode(
      <div>
        <MangaSfxLayer />
        <GenreThemeOverlay />
      </div>,
      "manga",
    );

    const toggle = screen.getByRole("button", { name: "Toggle genre theme overlay" });
    fireEvent.click(toggle);

    const fantasyOption = document.querySelector('[data-genre-option="fantasy"]') as HTMLElement;
    expect(fantasyOption).toBeInTheDocument();
    fireEvent.click(fantasyOption);
    expect(document.documentElement.dataset["genreTheme"]).toBe("fantasy");

    const darkFantasyOption = document.querySelector(
      '[data-genre-option="dark-fantasy"]',
    ) as HTMLElement;
    fireEvent.click(darkFantasyOption);
    expect(document.documentElement.dataset["genreTheme"]).toBe("dark-fantasy");

    cleanup();
    renderWithMode(
      <div>
        <GenreThemeOverlay />
      </div>,
      "classic",
    );
    expect(document.querySelector('[data-genre-overlay="true"]')).not.toBeInTheDocument();
    void rerender;
  });

  it("renders distinct Full Dossier layouts and genre-styled Ability Emblems per theme while preserving dossier functionality", async () => {
    setGenreTheme("fantasy");
    renderWithMode(
      <MangaShell>
        <MangaCharacterSpread id="char-1" />
        <AbilityBadge name="Pyrokinesis" />
      </MangaShell>,
      "manga",
    );

    expect(await screen.findByRole("heading", { name: "Kaelen Voss" })).toBeInTheDocument();
    expect(
      document.querySelector('[data-dossier-layout="royal-class-showcase"]'),
    ).toBeInTheDocument();
    expect(document.querySelector('[data-ability-emblem="fantasy"]')).toBeInTheDocument();

    // Switch through inspired full dossier layouts via overlay & verify live layout + ability emblem swaps
    const expectedLayouts: Array<[GenreThemeId, string]> = [
      ["isekai", "astrolabe-relic-hud"],
      ["dark-fantasy", "obsidian-filigree"],
      ["xianxia", "jade-scroll-plaque"],
      ["cyber-anime", "astral-lunar-dossier"],
      ["ghibli", "watercolor-field-journal"],
      ["shonen", "shonen-versus-splash"],
      ["manga-ink", "comic-spread"],
    ];

    for (const [themeId, layout] of expectedLayouts) {
      expect(resolveDossierLayout(themeId)).toBe(layout);
      act(() => {
        setGenreTheme(themeId);
      });
      expect(document.querySelector(`[data-dossier-layout="${layout}"]`)).toBeInTheDocument();
      expect(document.querySelector(`[data-ability-emblem="${themeId}"]`)).toBeInTheDocument();
    }

    // Verify Dossier Tabs remain interactive under non-default dossier layout
    act(() => {
      setGenreTheme("dark-fantasy");
    });
    expect(document.querySelector('[data-dossier-template="grimoire-altar"]')).toBeInTheDocument();
    const loreTab = screen.getByRole("tab", { name: /lore/i });
    fireEvent.click(loreTab);
    expect(screen.getByText(/Sworn blade of the Seventh Bastion\./i)).toBeInTheDocument();
  }, 15000);

  it("DossierComponent dynamically switches layout templates (scroll-parchment, data-terminal, etc.) on data-genre-theme changes", async () => {
    document.documentElement.dataset["genreTheme"] = "fantasy";
    renderWithMode(<DossierComponent name="Seraphina Vale" />, "manga");

    expect(
      document.querySelector('[data-dossier-template="scroll-parchment"]'),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seraphina Vale" })).toBeInTheDocument();

    // Mutate html[data-genre-theme] directly and wait for MutationObserver update
    await act(async () => {
      document.documentElement.dataset["genreTheme"] = "cyber-anime";
      await Promise.resolve();
    });
    expect(document.querySelector('[data-dossier-template="data-terminal"]')).toBeInTheDocument();

    for (const [genreId, expectedTemplate] of Object.entries(DOSSIER_TEMPLATE_BY_GENRE)) {
      expect(resolveDossierTemplate(genreId as GenreThemeId)).toBe(expectedTemplate);
      await act(async () => {
        document.documentElement.dataset["genreTheme"] = genreId;
        await Promise.resolve();
      });
      expect(
        document.querySelector(`[data-dossier-template="${expectedTemplate}"]`),
      ).toBeInTheDocument();
    }
  });

  it("renders frame-by-frame stepped anime frame VFX (birds, sword slash, butterflies, runes), picture-inspired emblems, and obeys FX:OFF", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf-8");
    expect(css).toContain("@keyframes frame-cel-slash");
    expect(css).toContain("@keyframes frame-cel-bird");
    expect(css).toContain("@keyframes frame-cel-butterfly");
    expect(css).toContain("@keyframes frame-cel-rune-tick");
    expect(css).toMatch(/\.frame-vfx-bird\s*\{[^}]*steps\(/);
    expect(css).toMatch(/\.frame-vfx-slash\s*\{[^}]*steps\(/);

    const vfxCases: Array<[GenreThemeId, string, string]> = [
      ["shonen", "sword-slash", "kinetic-spark-crest"],
      ["ghibli", "flying-birds", "botanical-hex-seal"],
      ["fantasy", "butterfly-magic", "crowned-heraldic-shield"],
      ["isekai", "astrolabe-runes", "astrolabe-gear"],
      ["dark-fantasy", "arcane-slash", "carved-rune-diamond"],
      ["xianxia", "crane-qi-sweep", "jade-cloud-seal"],
      ["cyber-anime", "meteor-scan", "crescent-holo-node"],
    ];

    for (const [themeId, vfxType, emblemStyle] of vfxCases) {
      setGenreTheme(themeId);
      const { unmount } = renderWithMode(
        <div className="relative">
          <GenreCardFrame theme={themeId} />
          <AbilityBadge name="Pyrokinesis" />
        </div>,
        "manga",
      );
      const vfxEl = document.querySelector(`[data-frame-vfx="${themeId}"]`);
      expect(vfxEl).toBeInTheDocument();
      expect(vfxEl).toHaveAttribute("data-vfx-type", vfxType);
      expect(document.querySelector(`[data-emblem-style="${emblemStyle}"]`)).toBeInTheDocument();
      unmount();
    }

    // FX:OFF disables frame VFX overlays cleanly
    setAnimationsEnabled(false);
    renderWithMode(
      <div className="relative">
        <GenreCardFrame theme="shonen" />
      </div>,
      "manga",
    );
    expect(document.querySelector('[data-frame-vfx="shonen"]')).not.toBeInTheDocument();
  });
});
