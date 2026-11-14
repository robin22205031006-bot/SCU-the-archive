import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  MANGA_SUBTHEMES,
  MANGA_SUBTHEME_STORAGE_KEY,
  PRIMARY_SYSTEMS,
  PRIMARY_SYSTEM_STORAGE_KEY,
  ThemeProvider,
  useThemeContext,
} from "@/context/ThemeContext";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { getThemeMotionSpec } from "@/lib/motionVariants";
import {
  applyCelShading,
  createSteppedMixerController,
  createToonGradientMap,
  removeCelShading,
  resolveCelThemeConfig,
} from "@/lib/three-cel-shading";
import { sfx } from "@/lib/scu-audio";
import {
  resolveSensoryProfile,
  triggerThemeSensoryFeedback,
  useSensoryFeedback,
} from "@/hooks/use-sensory-feedback";
import { UIStateProvider } from "@/context/UIStateContext";
import { NexusNavigation } from "@/components/NexusNavigation";
import { DayNightToggle } from "@/components/day-night-toggle";
import { AppVersionChecker, compareSemver } from "@/components/AppVersionChecker";

function ThemeHarness() {
  const {
    primarySystem,
    setPrimarySystem,
    mangaSubTheme,
    activeMangaSubTheme,
    setMangaSubTheme,
    isFantasy,
  } = useThemeContext();
  return (
    <div>
      <span data-testid="primary-system">{primarySystem}</span>
      <span data-testid="manga-subtheme">{mangaSubTheme}</span>
      <span data-testid="active-subtheme">{activeMangaSubTheme ?? "none"}</span>
      <span data-testid="is-fantasy">{String(isFantasy)}</span>
      {PRIMARY_SYSTEMS.map((s) => (
        <button key={s.id} type="button" onClick={() => setPrimarySystem(s.id)}>
          set-primary-{s.id}
        </button>
      ))}
      {MANGA_SUBTHEMES.map((sub) => (
        <button key={sub.id} type="button" onClick={() => setMangaSubTheme(sub.id)}>
          set-sub-{sub.id}
        </button>
      ))}
    </div>
  );
}

function SensoryHarness() {
  const { profile, playSnap, playClick, playSwitch, playTap, playCta, playCombat } =
    useSensoryFeedback();
  return (
    <div>
      <span data-testid="sensory-family">{profile.family}</span>
      <button type="button" onClick={playSnap}>
        sensory-snap
      </button>
      <button type="button" onClick={playClick}>
        sensory-click
      </button>
      <button type="button" onClick={playSwitch}>
        sensory-switch
      </button>
      <button type="button" onClick={playTap}>
        sensory-tap
      </button>
      <button type="button" onClick={playCta}>
        sensory-cta
      </button>
      <button type="button" onClick={playCombat}>
        sensory-combat
      </button>
    </div>
  );
}

describe("Four-Tier Primary UI & Expanded Manga Sub-Engine Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-primary-system");
    document.documentElement.removeAttribute("data-manga-subtheme");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-genre-theme");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("manages all 4 primary systems and 8 manga sub-themes with DOM attributes & localStorage persistence", () => {
    expect(PRIMARY_SYSTEMS.map((s) => s.id)).toEqual(["classic", "nexus", "minimal", "manga"]);
    expect(MANGA_SUBTHEMES).toHaveLength(8);
    expect(MANGA_SUBTHEMES.map((s) => s.id)).toEqual([
      "fantasy",
      "darkFantasy",
      "anime",
      "manhwa",
      "isekai",
      "ghibli",
      "scifiAnime",
      "shounen",
    ]);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider initialMode="classic">
              <ThemeProvider>
                <ThemeHarness />
              </ThemeProvider>
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("primary-system").textContent).toBe("classic");
    expect(screen.getByTestId("active-subtheme").textContent).toBe("none");
    expect(document.documentElement.dataset["primarySystem"]).toBe("classic");
    expect(document.documentElement.dataset["mangaSubtheme"]).toBeUndefined();

    // Switch to manga + fantasy sub-theme
    fireEvent.click(screen.getByRole("button", { name: "set-primary-manga" }));
    fireEvent.click(screen.getByRole("button", { name: "set-sub-fantasy" }));

    expect(screen.getByTestId("primary-system").textContent).toBe("manga");
    expect(screen.getByTestId("active-subtheme").textContent).toBe("fantasy");
    expect(screen.getByTestId("is-fantasy").textContent).toBe("true");
    expect(document.documentElement.dataset["primarySystem"]).toBe("manga");
    expect(document.documentElement.dataset["mangaSubtheme"]).toBe("fantasy");
    expect(localStorage.getItem(PRIMARY_SYSTEM_STORAGE_KEY)).toBe("manga");
    expect(localStorage.getItem(MANGA_SUBTHEME_STORAGE_KEY)).toBe("fantasy");

    // Verify all 8 sub-themes propagate cleanly
    for (const sub of MANGA_SUBTHEMES) {
      fireEvent.click(screen.getByRole("button", { name: `set-sub-${sub.id}` }));
      expect(screen.getByTestId("manga-subtheme").textContent).toBe(sub.id);
      expect(document.documentElement.dataset["mangaSubtheme"]).toBe(sub.id);
    }

    // Switching primary system away from manga removes data-manga-subtheme
    fireEvent.click(screen.getByRole("button", { name: "set-primary-nexus" }));
    expect(screen.getByTestId("active-subtheme").textContent).toBe("none");
    expect(document.documentElement.dataset["primarySystem"]).toBe("nexus");
    expect(document.documentElement.dataset["mangaSubtheme"]).toBeUndefined();
  });

  it("maps bespoke GPU-accelerated motion physics for every primary & manga sub-theme", () => {
    const fantasy = getThemeMotionSpec("manga", "fantasy");
    expect(fantasy.transition).toMatchObject({
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    });
    expect(fantasy.pageVariants["initial"]).toMatchObject({ opacity: 0, scale: 0.95 });
    expect(fantasy.pageVariants["animate"]).toMatchObject({ opacity: 1, scale: 1 });

    const nexus = getThemeMotionSpec("nexus");
    expect(nexus.transition).toMatchObject({
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    });

    const scifi = getThemeMotionSpec("manga", "scifiAnime");
    expect(scifi.transition).toMatchObject({
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    });

    const shounen = getThemeMotionSpec("manga", "shounen");
    expect(shounen.transition).toMatchObject({ type: "spring" });

    const minimal = getThemeMotionSpec("minimal");
    expect(minimal.transition).toMatchObject({ duration: 0 });
  });

  it("creates nearest-neighbor cel gradient maps, attaches inverted BackSide outlines, and steps mixer on 2s", () => {
    const grad = createToonGradientMap(3, ["#15221B", "#2E5A52", "#F5EBE6"]);
    expect(grad).toBeInstanceOf(THREE.DataTexture);
    expect(grad.minFilter).toBe(THREE.NearestFilter);
    expect(grad.magFilter).toBe(THREE.NearestFilter);
    expect(grad.colorSpace).toBe(THREE.NoColorSpace);
    expect(grad.image.width).toBe(3);
    grad.dispose();

    const grad2 = createToonGradientMap(2, ["#111111", "#ffffff"]);
    expect(grad2.image.width).toBe(2);
    grad2.dispose();

    const group = new THREE.Group();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const stdMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 });
    const mesh = new THREE.Mesh(geom, stdMat);
    group.add(mesh);

    const fantasyCfg = resolveCelThemeConfig("manga", "fantasy", "fantasy");
    expect(fantasyCfg.enabled).toBe(true);
    expect(fantasyCfg.steppedFps).toBe(12);

    applyCelShading(group, fantasyCfg);
    expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial);
    const outlineChild = mesh.children.find((c) => c.name === "__cel_outline") as
      THREE.Mesh | undefined;
    expect(outlineChild).toBeDefined();
    expect((outlineChild?.material as THREE.Material).side).toBe(THREE.BackSide);

    removeCelShading(group);
    expect(mesh.material).toBe(stdMat);
    expect(mesh.children).toHaveLength(0);

    // Nexus keeps PBR material while attaching outline hull
    const nexusCfg = resolveCelThemeConfig("nexus");
    expect(nexusCfg.enabled).toBe(true);
    expect(nexusCfg.outlineOnly).toBe(true);
    applyCelShading(group, nexusCfg);
    expect(mesh.material).toBe(stdMat);
    expect(mesh.children).toHaveLength(1);
    removeCelShading(group);
    geom.dispose();
    stdMat.dispose();

    // Stepped mixer advances strictly on quantized 1/12s boundaries when active
    const updates: number[] = [];
    const fakeMixer = {
      update: (d: number) => updates.push(d),
    } as unknown as THREE.AnimationMixer;
    const ctrl = createSteppedMixerController(12);
    ctrl.advance(fakeMixer, 0.03, true); // < 0.0833s -> hold frame
    expect(updates).toHaveLength(0);
    ctrl.advance(fakeMixer, 0.06, true); // total 0.09s >= 0.0833s -> 1 stepped tick
    expect(updates).toHaveLength(1);
    expect(updates[0]).toBeCloseTo(1 / 12, 4);
  });

  it("triggers theme-specific audio SFX and safe tactile haptics while silencing minimal mode", () => {
    expect(resolveSensoryProfile("manga", "fantasy").family).toBe("parchment");
    expect(resolveSensoryProfile("manga", "isekai").family).toBe("parchment");
    expect(resolveSensoryProfile("nexus").family).toBe("digital");
    expect(resolveSensoryProfile("manga", "scifiAnime").family).toBe("digital");
    expect(resolveSensoryProfile("manga", "shounen").family).toBe("ink");
    expect(resolveSensoryProfile("classic").family).toBe("classic");
    expect(resolveSensoryProfile("minimal").family).toBe("minimal");

    const parchmentSnapSpy = vi.spyOn(sfx, "parchmentSnap").mockImplementation(() => {});
    const parchmentClickSpy = vi.spyOn(sfx, "parchmentClick").mockImplementation(() => {});
    const terminalSnapSpy = vi.spyOn(sfx, "terminalSnap").mockImplementation(() => {});
    const terminalClickSpy = vi.spyOn(sfx, "terminalClick").mockImplementation(() => {});
    const inkSnapSpy = vi.spyOn(sfx, "inkSnap").mockImplementation(() => {});
    const inkClickSpy = vi.spyOn(sfx, "inkClick").mockImplementation(() => {});
    const comicSpy = vi.spyOn(sfx, "comic").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });

    triggerThemeSensoryFeedback("tap", "manga", "fantasy");
    expect(parchmentSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith(12);

    triggerThemeSensoryFeedback("click", "manga", "fantasy");
    expect(parchmentClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith(10);

    triggerThemeSensoryFeedback("switch", "nexus", null);
    expect(terminalClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith(8);

    triggerThemeSensoryFeedback("snap", "nexus", null);
    expect(terminalSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith([7, 10]);

    triggerThemeSensoryFeedback("snap", "manga", "shounen");
    triggerThemeSensoryFeedback("click", "manga", "shounen");
    expect(inkSnapSpy).toHaveBeenCalledTimes(1);
    expect(inkClickSpy).toHaveBeenCalledTimes(1);

    // Minimal mode suppresses both audio and haptics
    parchmentSnapSpy.mockClear();
    terminalSnapSpy.mockClear();
    vibrateMock.mockClear();
    triggerThemeSensoryFeedback("cta", "minimal", null);
    triggerThemeSensoryFeedback("snap", "minimal", null);
    triggerThemeSensoryFeedback("click", "minimal", null);
    expect(parchmentSnapSpy).not.toHaveBeenCalled();
    expect(terminalSnapSpy).not.toHaveBeenCalled();
    expect(vibrateMock).not.toHaveBeenCalled();

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider initialMode="manga">
              <ThemeProvider initialSubTheme="fantasy">
                <SensoryHarness />
                <DayNightToggle />
              </ThemeProvider>
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("sensory-family").textContent).toBe("parchment");

    fireEvent.click(screen.getByRole("button", { name: "sensory-snap" }));
    expect(parchmentSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([10, 14]);

    fireEvent.click(screen.getByRole("switch"));
    expect(parchmentClickSpy).toHaveBeenCalledTimes(2);
    expect(vibrateMock).toHaveBeenLastCalledWith([8, 18, 6]);

    fireEvent.click(screen.getByRole("button", { name: "sensory-combat" }));
    expect(comicSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith([16, 24, 28]);

    // NexusNavigation plays digital-sharp snap/click telemetry when interacted with
    terminalSnapSpy.mockClear();
    terminalClickSpy.mockClear();
    vibrateMock.mockClear();
    render(
      <UIStateProvider initialMode="nexus">
        <NexusNavigation
          links={[
            { to: "/", label: "Overview" },
            { to: "/characters", label: "Dossiers" },
          ]}
        />
      </UIStateProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open Nexus HUD" }));
    expect(terminalSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([6, 8]);

    fireEvent.click(screen.getByRole("button", { name: "Dossiers" }));
    expect(terminalSnapSpy).toHaveBeenCalledTimes(2);
  });

  it("compares semver accurately and renders APK update modal when remote version.json is newer", async () => {
    expect(compareSemver("1.1.0", "1.0.0")).toBe(1);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("1.0.2", "1.1.0")).toBe(-1);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        version: "1.2.0",
        apkUrl: "https://example.com/scu-v1.2.0.apk",
        notes: ["Arcane Botanical Fantasy Grimoire UI", "60 FPS Cel Combat Arena"],
        releasedAt: "2026-11-15",
      }),
    } as Response);

    render(
      <ThemeProvider initialSystem="manga" initialSubTheme="fantasy">
        <AppVersionChecker currentVersion="1.0.0" versionUrl="/version.json" />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("app-version-checker-modal")).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/version.json", { cache: "no-store" });
    expect(screen.getByText(/SCU Build v1\.2\.0/i)).toBeTruthy();
    expect(screen.getByText(/Arcane Botanical Fantasy Grimoire UI/i)).toBeTruthy();

    const dlLink = screen.getByRole("link", { name: /Download APK/i });
    expect(dlLink.getAttribute("href")).toBe("https://example.com/scu-v1.2.0.apk");

    // Dismissing stores the version and closes the modal
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Later" }));
    });
    expect(localStorage.getItem("scu-dismissed-apk-version")).toBe("1.2.0");
  });
});
