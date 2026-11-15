import fs from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { setAnimationsEnabled } from "@/lib/animations";
import { setGenreTheme } from "@/lib/genre-themes";
import { resolveCelThemeConfig } from "@/lib/three-cel-shading";
import {
  animateMangaStagger,
  animateSvgRuneDraw,
  isAnimeMotionAllowed,
} from "@/lib/anime-animations";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";
import { AnimeActionOverlay } from "@/components/anime-action-overlay";
import { AmbientStudioParticles } from "@/components/ambient-studio-particles";
import { GenreBackdrop } from "@/components/genre-backdrop";
import { GenreAbilityEmblem, GenrePortraitFrame } from "@/components/genre-decorations";
import { NexusShell } from "@/components/nexus-shell";
import { NexusExplorer, type NexusRecord } from "@/components/nexus-explorer";
import { Route as AuthenticatedRoute } from "@/routes/_authenticated/route";
import { Flame } from "lucide-react";

const mockNavigate = vi.fn();
let mockPathname = "/characters";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    options: opts,
  }),
  Outlet: () => <div data-testid="mock-outlet">Protected Child</div>,
  redirect: vi.fn(),
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
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/integrations/supabase/client", () => ({
  hasSupabaseConfig: () => false,
  supabase: {
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return chain;
    },
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}));

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => false,
  useIsStaff: () => false,
  useSession: () => ({ data: { id: "user-1" }, isLoading: false }),
}));

vi.mock("@/components/lazy-three", () => ({
  NexusFxLayer: ({ children }: { children: ReactNode }) => <>{children}</>,
  LivingThemeBackdrop: () => null,
}));

function renderTree(
  ui: ReactNode,
  initialMode: "classic" | "nexus" | "manga" | "minimal" = "manga",
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider initialMode={initialMode}>
            <ThemeProvider initialSystem={initialMode}>{ui}</ThemeProvider>
          </UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Shounen Daylight, Anime.js, Studio FX, Nexus Upgrade & Hook Safety", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = "/characters";
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["primarySystem"];
    delete document.documentElement.dataset["genreTheme"];
    delete document.documentElement.dataset["mangaSubtheme"];
    delete document.documentElement.dataset["motion"];
    delete document.documentElement.dataset["animeHitstop"];
    setAnimationsEnabled(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("calls all React hooks unconditionally in /_authenticated/route.tsx across route changes", () => {
    const authSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/_authenticated/route.tsx"),
      "utf8",
    );
    expect(authSource).toMatch(/function AuthenticatedLayout\(\)/);
    // Ensure zero early return before hooks
    const layoutBody = authSource.split("function AuthenticatedLayout()")[1] ?? "";
    const hookIdx = layoutBody.lastIndexOf("useEffect(");
    const returnIdx = layoutBody.indexOf("return (");
    expect(hookIdx).toBeGreaterThan(-1);
    expect(returnIdx).toBeGreaterThan(hookIdx);

    const Comp = (AuthenticatedRoute as unknown as { options: { component: () => ReactNode } })
      .options.component;
    const { rerender } = renderTree(<Comp />, "manga");
    expect(screen.getByTestId("mock-outlet")).toBeInTheDocument();
    mockPathname = "/abilities";
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider initialMode="manga">
              <ThemeProvider>
                <Comp />
              </ThemeProvider>
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("mock-outlet")).toBeInTheDocument();
  });

  it("implements Shounen Daylight tokens, Sunlit Frosted Glass CSS, clouds/leaves backdrop & blue-violet cel shading", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toContain('html[data-manga-subtheme="shounen"]');
    expect(css).toContain("#3898ec");
    expect(css).toContain("#7ce0f9");
    expect(css).toContain("#18a999");
    expect(css).toContain("rgba(255, 253, 248, 0.88)");
    expect(css).toContain("backdrop-filter: blur(12px)");
    expect(css).toContain("4px 4px 0px #0f172a");
    expect(css).toContain("#e86a33");
    expect(css).toContain("#14b8a6");

    const celConfig = resolveCelThemeConfig("manga", "shonen", "shounen");
    expect(celConfig.enabled).toBe(true);
    expect(celConfig.stops[0]).toBe("#4b4d8f");
    expect(celConfig.rimColor).toBe("#fffbeb");
    expect(celConfig.rimStrength).toBeGreaterThan(0.75);

    act(() => {
      setGenreTheme("shonen");
    });

    const { container } = renderTree(
      <>
        <GenreBackdrop />
        <GenrePortraitFrame theme="shonen" src={null} alt="Vanguard" fallback="V" />
        <GenreAbilityEmblem theme="shonen" label="Solar Flare" tier="Mythic" icon={Flame} />
      </>,
      "manga",
    );

    expect(container.querySelector('[data-shounen-cloud="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-shounen-leaf="true"]')).toBeInTheDocument();
    const portrait = container.querySelector('[data-portrait-frame="slash-cut"]');
    expect(portrait).toHaveAttribute("data-cel-rim", "true");
    const badge = container.querySelector('[data-ability-emblem="shonen"]');
    expect(badge?.className).toContain("studio-bloom-node");
  });

  it("drives animejs stagger & SVG rune path-drawing in Manga mode and suppresses cleanly in Minimal / FX:OFF", () => {
    const host = document.createElement("div");
    host.innerHTML = `
      <div class="manga-panel">Card 1</div>
      <div data-anime-stagger="true">Card 2</div>
      <svg data-anime-rune="true" viewBox="0 0 24 24">
        <path d="M2 12 L22 12" />
      </svg>
    `;
    document.body.appendChild(host);

    document.documentElement.dataset["primarySystem"] = "manga";
    expect(isAnimeMotionAllowed()).toBe(true);
    const staggerHandle = animateMangaStagger(host);
    const runeHandle = animateSvgRuneDraw(host);
    expect(typeof staggerHandle.cancel).toBe("function");
    expect(typeof runeHandle.cancel).toBe("function");
    staggerHandle.cancel();
    runeHandle.cancel();

    document.documentElement.dataset["primarySystem"] = "minimal";
    expect(isAnimeMotionAllowed()).toBe(false);

    document.documentElement.dataset["primarySystem"] = "manga";
    document.documentElement.dataset["motion"] = "off";
    expect(isAnimeMotionAllowed()).toBe(false);

    host.remove();
  });

  it("triggers 40ms anime action-cut flash & hit-stop cleanup, and suppresses studio particles in Minimal", () => {
    vi.useFakeTimers();

    // Active studio mode
    renderTree(
      <>
        <AmbientStudioParticles />
        <AnimeActionOverlay />
      </>,
      "manga",
    );

    expect(screen.getByTestId("ambient-studio-particles")).toBeInTheDocument();

    act(() => {
      triggerAnimeActionCut({ color: "#e86a33", label: "SLASH" });
    });

    expect(screen.getByTestId("anime-hitstop-flash")).toBeInTheDocument();
    expect(screen.getByTestId("anime-action-cut")).toBeInTheDocument();
    expect(document.documentElement.dataset["animeHitstop"]).toBe("shake");

    act(() => {
      vi.advanceTimersByTime(45);
    });
    expect(screen.queryByTestId("anime-hitstop-flash")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(screen.queryByTestId("anime-action-cut")).toBeNull();
    expect(document.documentElement.dataset["animeHitstop"]).toBeUndefined();

    cleanup();

    // Minimal mode must never render particles or action overlay
    renderTree(
      <>
        <AmbientStudioParticles />
        <AnimeActionOverlay />
      </>,
      "minimal",
    );
    expect(screen.queryByTestId("ambient-studio-particles")).toBeNull();
    act(() => {
      triggerAnimeActionCut({ color: "#e86a33" });
    });
    expect(screen.queryByTestId("anime-hitstop-flash")).toBeNull();
  });

  it("applies sci-fi cyan/amber terminal glassmorphism in NexusShell, NexusExplorer & styles.css", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
    expect(css).toContain("rgba(56, 189, 248, 0.18)");
    expect(css).toContain("rgba(245, 158, 11, 0.12)");
    expect(css).toContain("40px 40px");

    const records: NexusRecord[] = [
      { id: "r1", title: "Kaelen Voss", group: "Vanguard", subtitle: "Sentinel" },
    ];
    const cutSpy = vi.fn();
    window.addEventListener("scu:anime-action-cut", cutSpy);

    const { container } = renderTree(
      <NexusShell>
        <NexusExplorer
          records={records}
          label="Characters"
          renderDetail={(r) => <div>Detail: {r.title}</div>}
        />
      </NexusShell>,
      "nexus",
    );

    const header = container.querySelector(".nexus-command");
    expect(header?.className).toContain("border-cyan-400/35");
    expect(header?.className).toContain("backdrop-blur-xl");

    const clusterBtn = screen.getByRole("button", { name: /All characters, 1/i });
    fireEvent.click(clusterBtn);
    expect(cutSpy).toHaveBeenCalled();

    window.removeEventListener("scu:anime-action-cut", cutSpy);
  });
});
