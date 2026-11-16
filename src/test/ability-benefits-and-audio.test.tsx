import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import confetti from "canvas-confetti";
import { AbilityRankEmblem, AbilityRankProgressionStrip } from "@/components/ability-rank-emblem";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityBenefitsModal } from "@/components/ability-benefits-modal";
import { AbilityProvider, useAbilityContext } from "@/context/AbilityContext";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UI_MODE_STORAGE_KEY, UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { setHapticsEnabled } from "@/hooks/use-sensory-feedback";
import { setUiStyle } from "@/lib/ui-style";
import {
  compareAbilityRanks,
  getAbilityRankBenefits,
  getAbilityUsageCount,
  getTopUsedAbilities,
  recordAbilityUsage,
  resetAbilityUsageCounts,
} from "@/lib/ability-benefits";
import {
  buildAbilitySynergySummary,
  resetPinnedAbilitySet,
  resolveAbilitySynergyConnection,
} from "@/lib/ability-synergy";
import {
  ABILITY_RANK_UP_VIBRATION_PATTERNS,
  clearLegendaryPageShake,
  EMBLEM_FLOAT_TRANSITION_MS,
  isMobileHapticDevice,
  LEGENDARY_CONFETTI_FALLBACK_SETTLE_MS,
  LEGENDARY_SECONDARY_BURST_DELAY_MS,
  LEGENDARY_SHAKE_CLASS,
  LEGENDARY_SHAKE_DURATION_MS,
  resetAbilityRankUpHapticState,
  triggerAbilityRankUpHaptic,
  triggerLegendaryRankUpConfetti,
} from "@/lib/ability-celebration";
import { resetAudioBufferCache, setMuted, sfx } from "@/lib/scu-audio";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockedConfetti = vi.mocked(confetti);

interface RecordedOscillator {
  type: OscillatorType;
  frequencies: number[];
  ramps: number[];
}

function installMockAudioContext() {
  const oscillators: RecordedOscillator[] = [];

  class MockAudioContext {
    state = "running";
    currentTime = 0;
    sampleRate = 44100;
    destination = {} as AudioDestinationNode;

    createOscillator() {
      const record: RecordedOscillator = {
        type: "sine",
        frequencies: [],
        ramps: [],
      };
      oscillators.push(record);
      return {
        get type() {
          return record.type;
        },
        set type(v: OscillatorType) {
          record.type = v;
        },
        frequency: {
          setValueAtTime: (val: number) => {
            record.frequencies.push(val);
          },
          exponentialRampToValueAtTime: (val: number) => {
            record.ramps.push(val);
          },
        },
        connect: (node: unknown) => node,
        start: () => {},
        stop: () => {},
      };
    }

    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: (node: unknown) => node,
      };
    }

    createBuffer(_ch: number, len: number) {
      const data = new Float32Array(len);
      return { getChannelData: () => data };
    }

    createBufferSource() {
      return {
        buffer: null,
        connect: (node: unknown) => node,
        start: () => {},
      };
    }

    createBiquadFilter() {
      return {
        type: "bandpass",
        frequency: { value: 0 },
        Q: { value: 1 },
        connect: (node: unknown) => node,
      };
    }

    resume() {
      return Promise.resolve();
    }
  }

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: MockAudioContext,
  });

  return oscillators;
}

function TestShell({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["nexus-symbol-settings"], {});
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider>{children}</UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ContextHarness() {
  const ctx = useAbilityContext();
  return (
    <div>
      <span data-testid="ctx-rank">{ctx.rank}</span>
      <span data-testid="ctx-usage">{ctx.getUsageCount("red_lightning")}</span>
      <button type="button" onClick={() => ctx.setRank(3)}>
        Rank3
      </button>
      <button type="button" onClick={() => ctx.setRank(5)}>
        Rank5
      </button>
    </div>
  );
}

const origVibrateDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, "vibrate");
const origUaDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent");
const origMaxTouchDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, "maxTouchPoints");

function configureMockMobileEnv(opts: {
  hasVibrate: boolean;
  mobile: boolean;
  userAgent?: string;
}) {
  const vibrateMock = vi.fn(() => true);
  if (opts.hasVibrate) {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      writable: true,
      value: vibrateMock,
    });
  } else {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      writable: true,
      value: undefined,
    });
  }
  Object.defineProperty(navigator, "userAgentData", {
    configurable: true,
    writable: true,
    value: { mobile: opts.mobile },
  });
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    writable: true,
    value:
      opts.userAgent ??
      (opts.mobile
        ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36"
        : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"),
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    writable: true,
    value: opts.mobile ? 5 : 0,
  });
  return vibrateMock;
}

describe("Ability rank audio cues, benefits modal, usage tracking, comparison, and Rank 5 confetti", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAbilityUsageCounts();
    resetPinnedAbilitySet();
    resetAudioBufferCache();
    resetAbilityRankUpHapticState();
    setMuted(false);
    setHapticsEnabled(true);
    setUiStyle("classic");
    localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
    mockedConfetti.mockClear();
  });

  afterEach(() => {
    clearLegendaryPageShake();
    resetAbilityRankUpHapticState();
    cleanup();
    vi.restoreAllMocks();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    if (origVibrateDesc) {
      Object.defineProperty(navigator, "vibrate", origVibrateDesc);
    } else {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    }
    if (origUaDesc) {
      Object.defineProperty(navigator, "userAgent", origUaDesc);
    }
    if (origMaxTouchDesc) {
      Object.defineProperty(navigator, "maxTouchPoints", origMaxTouchDesc);
    }
    delete (navigator as unknown as { userAgentData?: unknown }).userAgentData;
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["motion"];
  });

  it("synthesizes distinct subtle Web Audio cues per rank transition and respects mute", () => {
    const oscillators = installMockAudioContext();

    const perRankStarts: number[] = [];
    for (const rank of [1, 2, 3, 4, 5] as const) {
      const before = oscillators.length;
      sfx.rankTransition(rank, "ascending");
      const created = oscillators.slice(before);
      expect(created.length).toBeGreaterThan(0);
      perRankStarts.push(created[0]!.frequencies[0]!);
    }

    // Frequencies escalate harmonically from Rank 1 -> Rank 5
    expect(perRankStarts[0]!).toBeLessThan(perRankStarts[1]!);
    expect(perRankStarts[1]!).toBeLessThan(perRankStarts[2]!);
    expect(perRankStarts[2]!).toBeLessThan(perRankStarts[3]!);
    expect(perRankStarts[4]!).toBeGreaterThanOrEqual(500);

    // Muted audio produces zero oscillators
    const countBeforeMute = oscillators.length;
    setMuted(true);
    sfx.rankTransition(5, "ascending");
    expect(oscillators.length).toBe(countBeforeMute);
  });

  it("plays rank-specific audio cue automatically when AbilityRankEmblem rank transitions", () => {
    const oscillators = installMockAudioContext();
    const spy = vi.spyOn(sfx, "rankTransition");

    const { rerender } = render(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={1} />
      </TestShell>,
    );
    expect(spy).not.toHaveBeenCalled();

    rerender(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={4} />
      </TestShell>,
    );
    expect(spy).toHaveBeenCalledWith(4, "ascending");
    expect(oscillators.length).toBeGreaterThan(0);

    rerender(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={2} />
      </TestShell>,
    );
    expect(spy).toHaveBeenCalledWith(2, "descending");
  });

  it("tracks and persists ability usage counts in localStorage and computes top utilized powers", () => {
    expect(getAbilityUsageCount("red_lightning")).toBe(0);

    recordAbilityUsage("red_lightning", 2);
    recordAbilityUsage("blue_flame", 5);
    recordAbilityUsage("duskmoor_blue_flame", 1);
    recordAbilityUsage("red_lightning", 1);

    expect(getAbilityUsageCount("red_lightning")).toBe(3);
    expect(getAbilityUsageCount("blue_flame")).toBe(6);
    expect(getAbilityUsageCount("duskmoor_blue_flame")).toBe(6);

    const top = getTopUsedAbilities(3);
    expect(top[0]?.key).toBe("duskmoor_blue_flame");
    expect(top[0]?.count).toBe(6);
    expect(top[1]?.key).toBe("red_lightning");
    expect(top[1]?.count).toBe(3);
  });

  it("computes mechanical benefits and side-by-side rank stat deltas accurately", () => {
    const rank2 = getAbilityRankBenefits("red_lightning", 2);
    const rank5 = getAbilityRankBenefits("red_lightning", 5);

    expect(rank2.potencyBonusPct).toBeGreaterThan(0);
    expect(rank5.potencyBonusPct).toBeGreaterThan(rank2.potencyBonusPct);
    expect(rank5.benefits.some((b) => b.id === "legendary-apex")).toBe(true);

    const cmp = compareAbilityRanks("red_lightning", 2);
    expect(cmp.currentRank).toBe(2);
    expect(cmp.targetRank).toBe(3);
    expect(cmp.stats.find((s) => s.id === "damage")!.delta).toBeGreaterThan(0);
    expect(cmp.stats.find((s) => s.id === "potency")!.delta).toBeGreaterThan(0);
    expect(cmp.newlyUnlockedBenefits.some((b) => b.unlockedAtRank === 3)).toBe(true);
  });

  it("opens expandable AbilityBenefitsModal on emblem click with benefits, usage count, and side-by-side comparison", () => {
    recordAbilityUsage("red_lightning", 4);
    recordAbilityUsage("aether", 2);

    render(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={2} />
      </TestShell>,
    );

    const trigger = screen.getByRole("button", { name: /Inspect Red Lightning/i });
    fireEvent.click(trigger);

    const modal = document.querySelector('[data-ability-benefits-modal="red_lightning"]');
    expect(modal).toBeTruthy();
    expect(modal?.getAttribute("data-modal-layout")).toBe("panel");

    // Current rank mechanical benefits visible
    expect(screen.getByText(/Rank II Mechanical Benefits/i)).toBeInTheDocument();
    expect(screen.getByText(/Rapid Recovery Cadence/i)).toBeInTheDocument();

    // Usage count and top utilized powers displayed
    expect(screen.getByTestId("ability-usage-count")).toHaveTextContent("4");
    expect(screen.getByText(/Most Utilized Powers/i)).toBeInTheDocument();

    // Activate button increments usage live
    fireEvent.click(screen.getByTestId("activate-ability-usage-btn"));
    expect(screen.getByTestId("ability-usage-count")).toHaveTextContent("5");

    // Side-by-side comparison shows Current vs Next stats and deltas
    const comparison = screen.getByTestId("rank-comparison-view");
    expect(comparison).toHaveTextContent("Rank II · Adept");
    expect(comparison).toHaveTextContent("Rank III · Veteran");
    const dmgDelta = comparison.querySelector('[data-stat-delta="damage"]');
    expect(dmgDelta?.textContent).toMatch(/^\+\d+$/);

    // Expand side panel toggle switches layout cleanly
    const expandBtn = screen.getByRole("button", { name: /Expand comparison modal/i });
    fireEvent.click(expandBtn);
    expect(modal?.getAttribute("data-modal-layout")).toBe("expanded");
  });

  it("triggers canvas-confetti Legendary burst only when upgrading an ability to Rank 5", () => {
    vi.useFakeTimers();
    try {
      render(
        <TestShell>
          <AbilityBenefitsModal
            ability="red_lightning"
            rank={3}
            open={true}
            onOpenChange={() => {}}
          />
        </TestShell>,
      );

      // Initial mount at Rank 3 does not fire confetti
      expect(mockedConfetti).not.toHaveBeenCalled();

      // Upgrading 3 -> 4 does not fire confetti
      fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn"));
      expect(mockedConfetti).not.toHaveBeenCalled();

      // Upgrading 4 -> 5 triggers celebratory Rank 5 Legendary confetti
      fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn"));
      expect(mockedConfetti).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("legendary-rank-achieved")).toBeInTheDocument();

      // Delayed flanking bursts also fire
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockedConfetti).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("triggers Rank 5 confetti through AbilityContext.setRank(5) and skips confetti under reduced motion", () => {
    render(
      <TestShell>
        <AbilityProvider initialAbility="blue_flame">
          <ContextHarness />
        </AbilityProvider>
      </TestShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rank3" }));
    expect(mockedConfetti).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Rank5" }));
    expect(mockedConfetti).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ctx-rank")).toHaveTextContent("5");

    // Under prefers-reduced-motion: reduce, confetti helper cleanly returns false
    mockedConfetti.mockClear();
    const origMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    expect(triggerLegendaryRankUpConfetti()).toBe(false);
    expect(mockedConfetti).not.toHaveBeenCalled();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: origMatchMedia,
    });
  });

  it("computes lineage ascension and elemental motif synergies scaled by rank", () => {
    const lineage = resolveAbilitySynergyConnection("fire", 2, "fire_guardian", 4);
    expect(lineage.kind).toBe("ascension");
    expect(lineage.strength).toBeGreaterThanOrEqual(85);
    expect(lineage.buffs.some((b) => b.metric === "Damage")).toBe(true);

    const lowRank = resolveAbilitySynergyConnection("wind", 1, "flame", 3);
    const highRank = resolveAbilitySynergyConnection("wind", 5, "flame", 3);
    expect(lowRank.title).toBe("Gale-Fed Inferno");
    expect(highRank.strength).toBeGreaterThan(lowRank.strength);
    expect(highRank.buffs.find((b) => b.metric === "Damage")!.value).toBeGreaterThan(
      lowRank.buffs.find((b) => b.metric === "Damage")!.value,
    );

    const summary = buildAbilitySynergySummary({
      focalKey: "wind_guardian",
      focalRank: 4,
      characterAbilities: [
        { abilityKey: "fire_guardian", rank: 4 },
        { abilityKey: "water_guardian", rank: 3 },
      ],
    });
    expect(summary.connections).toHaveLength(2);
    expect(summary.aggregateBuffs.damagePct).toBeGreaterThan(0);
    expect(summary.recommendedCandidates.length).toBeGreaterThan(0);
  });

  it("renders interactive Synergy Connections SVG visualization in AbilityBenefitsModal and supports adding/switching partners", () => {
    render(
      <TestShell>
        <AbilityBenefitsModal
          ability="wind_guardian"
          rank={3}
          open={true}
          onOpenChange={() => {}}
          currentSetAbilities={[
            { abilityKey: "fire_guardian", rank: 4 },
            { abilityKey: "water_guardian", rank: 3 },
          ]}
        />
      </TestShell>,
    );

    const section = screen.getByTestId("synergy-connections-section");
    expect(section).toBeInTheDocument();

    const svg = screen.getByTestId("synergy-connections-svg");
    expect(svg.querySelector('[data-synergy-focal="wind_guardian"]')).toBeTruthy();
    expect(svg.querySelector('[data-synergy-node="fire_guardian"]')).toBeTruthy();
    expect(svg.querySelector('[data-synergy-node="water_guardian"]')).toBeTruthy();
    expect(svg.querySelector('[data-synergy-edge="fire_guardian"]')).toBeTruthy();

    // Selecting partner node updates detailed interaction card
    const waterNode = svg.querySelector('[data-synergy-node="water_guardian"]') as Element;
    fireEvent.click(waterNode);
    const detail = screen.getByTestId("selected-synergy-detail");
    expect(detail).toHaveTextContent("Water Guardian");

    // Inspecting partner switches focal ability cleanly with a Back button
    fireEvent.click(screen.getByRole("button", { name: /Inspect Water Guardian/i }));
    expect(screen.getByRole("heading", { name: "Water Guardian" })).toBeInTheDocument();
    const backBtn = screen.getByRole("button", { name: /Back to Wind Guardian/i });
    fireEvent.click(backBtn);
    expect(screen.getByRole("heading", { name: "Wind Guardian" })).toBeInTheDocument();

    // Expanding current set via candidate chip adds new partner node to SVG graph
    const candidateBtn = section.querySelector("[data-add-synergy-candidate]") as HTMLElement;
    const addedKey = candidateBtn.getAttribute("data-add-synergy-candidate")!;
    fireEvent.click(candidateBtn);
    expect(svg.querySelector(`[data-synergy-node="${addedKey}"]`)).toBeTruthy();
  });

  it("shows empty Synergy Connections discovery state when current set has no other abilities and activates on add", () => {
    render(
      <TestShell>
        <AbilityBenefitsModal
          ability="red_lightning"
          rank={2}
          open={true}
          onOpenChange={() => {}}
        />
      </TestShell>,
    );

    expect(screen.getByTestId("synergy-empty-state")).toBeInTheDocument();
    const candidateBtn = document.querySelector("[data-add-synergy-candidate]") as HTMLElement;
    expect(candidateBtn).toBeTruthy();
    const addedKey = candidateBtn.getAttribute("data-add-synergy-candidate")!;

    fireEvent.click(candidateBtn);
    expect(screen.queryByTestId("synergy-empty-state")).not.toBeInTheDocument();
    const svg = screen.getByTestId("synergy-connections-svg");
    expect(svg.querySelector(`[data-synergy-node="${addedKey}"]`)).toBeTruthy();
  });

  it("triggers main-page screen-shake only after Rank 5 canvas-confetti animation completes and cleans up afterward", async () => {
    vi.useFakeTimers();
    try {
      let resolvePrimary!: () => void;
      let resolveLeft!: () => void;
      let resolveRight!: () => void;
      mockedConfetti
        .mockImplementationOnce(
          () =>
            new Promise<undefined>((res) => {
              resolvePrimary = () => res(undefined);
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<undefined>((res) => {
              resolveLeft = () => res(undefined);
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<undefined>((res) => {
              resolveRight = () => res(undefined);
            }),
        );

      render(
        <TestShell>
          <div data-ui-mode="classic" data-testid="main-page-root">
            <AbilityBenefitsModal
              ability="red_lightning"
              rank={4}
              open={true}
              onOpenChange={() => {}}
            />
          </div>
        </TestShell>,
      );

      const pageRoot = screen.getByTestId("main-page-root");
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      // Upgrade 4 -> 5 starts confetti, but screen-shake must wait until confetti finishes
      fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn"));
      expect(mockedConfetti).toHaveBeenCalledTimes(1);
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      // Secondary side bursts fire at 160ms; confetti promises are still in flight so no shake yet
      act(() => {
        vi.advanceTimersByTime(LEGENDARY_SECONDARY_BURST_DELAY_MS);
      });
      expect(mockedConfetti).toHaveBeenCalledTimes(3);
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      // Resolve all confetti animation promises -> main-page screen-shake triggers
      await act(async () => {
        resolvePrimary();
        resolveLeft();
        resolveRight();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(true);
      expect(pageRoot.getAttribute("data-legendary-shake")).toBe("active");

      // Shake clears automatically once the animation duration finishes
      act(() => {
        vi.advanceTimersByTime(LEGENDARY_SHAKE_DURATION_MS);
      });
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);
      expect(pageRoot.getAttribute("data-legendary-shake")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("triggers fallback screen-shake settle timing when confetti returns void and skips shake under reduced motion", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <div data-ui-mode="classic" data-testid="fallback-shake-root">
          <p>Main page content</p>
        </div>,
      );
      const pageRoot = container.querySelector(
        '[data-testid="fallback-shake-root"]',
      ) as HTMLElement;

      const onComplete = vi.fn();
      expect(triggerLegendaryRankUpConfetti({ onComplete })).toBe(true);
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      act(() => {
        vi.advanceTimersByTime(
          LEGENDARY_SECONDARY_BURST_DELAY_MS + LEGENDARY_CONFETTI_FALLBACK_SETTLE_MS - 10,
        );
      });
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(true);
      expect(onComplete).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(LEGENDARY_SHAKE_DURATION_MS);
      });
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);

      // Reduced motion suppresses both confetti and screen-shake
      document.documentElement.dataset["motion"] = "off";
      expect(triggerLegendaryRankUpConfetti()).toBe(false);
      expect(pageRoot.classList.contains(LEGENDARY_SHAKE_CLASS)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("transitions emblem into 'floating' inspection mode when the ability benefits modal is opened", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(
        <TestShell>
          <AbilityRankEmblem ability="red_lightning" rank={3} />
        </TestShell>,
      );

      const pageEmblem = container.querySelector(
        '[data-ability-rank-emblem="red_lightning"]',
      ) as HTMLElement;
      expect(pageEmblem.getAttribute("data-emblem-inspection-mode")).toBe("idle");

      // Opening modal initiates smooth entrance transition to floating mode on both emblems
      fireEvent.click(screen.getByRole("button", { name: /Inspect Red Lightning/i }));

      const modalEmblem = document.querySelector(
        '[data-modal-inspection-emblem="red_lightning"]',
      ) as HTMLElement;
      expect(modalEmblem).toBeTruthy();
      expect(modalEmblem.classList.contains("scu-emblem-inspect")).toBe(true);
      expect(modalEmblem.getAttribute("data-emblem-inspection-mode")).toBe("transitioning");
      expect(pageEmblem.getAttribute("data-emblem-inspection-mode")).toBe("transitioning");

      // After entry transition settles, both emblems enter continuous 'floating' inspection mode
      act(() => {
        vi.advanceTimersByTime(EMBLEM_FLOAT_TRANSITION_MS);
      });
      expect(modalEmblem.getAttribute("data-emblem-inspection-mode")).toBe("floating");
      expect(pageEmblem.getAttribute("data-emblem-inspection-mode")).toBe("floating");
      const shadow = document.querySelector("[data-emblem-inspection-shadow]");
      expect(shadow?.getAttribute("data-emblem-inspection-shadow")).toBe("floating");

      // Closing modal settles page emblem back to idle
      fireEvent.click(screen.getByRole("button", { name: /Close/i }));
      expect(pageEmblem.getAttribute("data-emblem-inspection-mode")).toBe("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses static inspection state without floating animation in Minimal mode", () => {
    setUiStyle("minimal");
    localStorage.setItem(UI_MODE_STORAGE_KEY, "minimal");

    render(
      <TestShell>
        <AbilityBenefitsModal ability="blue_flame" rank={4} open={true} onOpenChange={() => {}} />
      </TestShell>,
    );

    const modalEmblem = document.querySelector(
      '[data-modal-inspection-emblem="duskmoor_blue_flame"]',
    ) as HTMLElement;
    expect(modalEmblem).toBeTruthy();
    expect(modalEmblem.getAttribute("data-emblem-inspection-mode")).toBe("static");
  });

  it("triggers rank-up device-vibration feedback strictly on mobile devices with haptic support", () => {
    // 1. Desktop browser with navigator.vibrate present must NOT vibrate
    const desktopVibrate = configureMockMobileEnv({ hasVibrate: true, mobile: false });
    expect(isMobileHapticDevice()).toBe(false);
    expect(triggerAbilityRankUpHaptic(4, { previousRank: 2, abilityKey: "red_lightning" })).toBe(
      false,
    );
    expect(desktopVibrate).not.toHaveBeenCalled();

    // 2. Mobile device WITHOUT navigator.vibrate support cleanly skips vibration
    configureMockMobileEnv({ hasVibrate: false, mobile: true });
    expect(isMobileHapticDevice()).toBe(false);
    expect(triggerAbilityRankUpHaptic(3, { previousRank: 2, abilityKey: "red_lightning" })).toBe(
      false,
    );

    // 3. Mobile device WITH haptic support vibrates on ascending rank upgrades
    const mobileVibrate = configureMockMobileEnv({ hasVibrate: true, mobile: true });
    expect(isMobileHapticDevice()).toBe(true);

    render(
      <TestShell>
        <AbilityBenefitsModal
          ability="red_lightning"
          rank={2}
          open={true}
          onOpenChange={() => {}}
        />
      </TestShell>,
    );

    // Upgrade 2 -> 3 triggers Rank 3 tactile pattern
    fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn"));
    expect(mobileVibrate).toHaveBeenCalledTimes(1);
    expect(mobileVibrate).toHaveBeenLastCalledWith(ABILITY_RANK_UP_VIBRATION_PATTERNS[3]);

    // Descending (3 -> 2) does NOT trigger rank-up vibration
    fireEvent.click(screen.getByRole("button", { name: /Set Red Lightning to Rank II/i }));
    expect(mobileVibrate).toHaveBeenCalledTimes(1);

    // Identical rank within dedup window is ignored; next upgrade 2 -> 3 -> 4 -> 5 escalates cleanly
    resetAbilityRankUpHapticState();
    fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn")); // 2 -> 3
    fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn")); // 3 -> 4
    fireEvent.click(screen.getByTestId("upgrade-ability-rank-btn")); // 4 -> 5
    expect(mobileVibrate).toHaveBeenLastCalledWith(ABILITY_RANK_UP_VIBRATION_PATTERNS[5]);

    // Respects user haptics opt-out toggle
    mobileVibrate.mockClear();
    resetAbilityRankUpHapticState();
    setHapticsEnabled(false);
    expect(triggerAbilityRankUpHaptic(5, { previousRank: 4, abilityKey: "blue_flame" })).toBe(
      false,
    );
    expect(mobileVibrate).not.toHaveBeenCalled();
  });

  it("deduplicates simultaneous AbilityContext + AbilityRankEmblem haptics to a single buzz", () => {
    const mobileVibrate = configureMockMobileEnv({ hasVibrate: true, mobile: true });

    function LinkedHarness() {
      const ctx = useAbilityContext();
      return (
        <div>
          <AbilityRankEmblem ability="blue_flame" />
          <button type="button" onClick={() => ctx.setRank(2)}>
            SetRank2
          </button>
          <button type="button" onClick={() => ctx.setRank(4)}>
            UpgradeTo4
          </button>
        </div>
      );
    }

    render(
      <TestShell>
        <AbilityProvider initialAbility="blue_flame">
          <LinkedHarness />
        </AbilityProvider>
      </TestShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "SetRank2" }));
    mobileVibrate.mockClear();
    resetAbilityRankUpHapticState();

    fireEvent.click(screen.getByRole("button", { name: "UpgradeTo4" }));
    expect(mobileVibrate).toHaveBeenCalledTimes(1);
    expect(mobileVibrate).toHaveBeenCalledWith(ABILITY_RANK_UP_VIBRATION_PATTERNS[4]);
  });

  it("displays subtle context-aware hover tooltips with rank level names on ability emblem rank icons", () => {
    const { rerender } = render(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={1} />
      </TestShell>,
    );

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Hovering Rank 1 emblem shows 'Initiate' without opening the modal
    const trigger1 = screen.getByRole("button", { name: /Inspect Red Lightning/i });
    fireEvent.mouseEnter(trigger1);
    const tip1 = screen.getByRole("tooltip");
    expect(tip1).toHaveAttribute("data-rank-level-name", "Initiate");
    expect(tip1).toHaveTextContent("Initiate");
    expect(tip1).toHaveTextContent("Rank I");
    expect(tip1).toHaveTextContent("Red Lightning · Click to inspect");
    expect(document.querySelector("[data-ability-benefits-modal]")).toBeNull();

    fireEvent.mouseLeave(trigger1);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Rerendering at Rank 4 shows 'Master'
    rerender(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={4} />
      </TestShell>,
    );
    const trigger4 = screen.getByRole("button", { name: /Inspect Red Lightning/i });
    fireEvent.mouseEnter(trigger4);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Master");

    // Clicking emblem dismisses tooltip cleanly while opening modal
    fireEvent.click(trigger4);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(document.querySelector('[data-ability-benefits-modal="red_lightning"]')).toBeTruthy();
  });

  it("renders contextual hover tooltips on progression strip steps and standalone rank pips, and suppresses on masked emblems", () => {
    const { container } = render(
      <TestShell>
        <div>
          <AbilityRankProgressionStrip ability="wind_guardian" currentRank={2} />
          <div data-testid="standalone-pips-wrap">
            <AbilityRankPips rank={5} />
          </div>
          <div data-testid="masked-emblem-wrap">
            <AbilityRankEmblem ability="aether" rank={4} masked={true} />
          </div>
        </div>
      </TestShell>,
    );

    // Progression strip step tooltips reflect unlocked/current/locked context
    const stepEmblems = container.querySelectorAll(
      '[data-emblem-progression="true"] [data-ability-rank-emblem="wind_guardian"]',
    );
    expect(stepEmblems).toHaveLength(5);

    fireEvent.mouseEnter(stepEmblems[1]!);
    const currentTip = screen.getByRole("tooltip");
    expect(currentTip).toHaveTextContent("Adept");
    expect(currentTip).toHaveTextContent("Current active rank");
    fireEvent.mouseLeave(stepEmblems[1]!);

    fireEvent.mouseEnter(stepEmblems[4]!);
    const lockedTip = screen.getByRole("tooltip");
    expect(lockedTip).toHaveTextContent("Apex");
    expect(lockedTip).toHaveTextContent("Locked progression stage");
    fireEvent.mouseLeave(stepEmblems[4]!);

    // Standalone AbilityRankPips hover reveals 'Apex'
    const standalonePips = container.querySelector(
      '[data-testid="standalone-pips-wrap"] [data-ability-rank="5"]',
    ) as HTMLElement;
    fireEvent.mouseEnter(standalonePips);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Apex");
    fireEvent.mouseLeave(standalonePips);

    // Masked emblems do NOT reveal rank tooltips
    const maskedEmblem = container.querySelector(
      '[data-testid="masked-emblem-wrap"] [data-ability-rank-emblem]',
    ) as HTMLElement;
    fireEvent.mouseEnter(maskedEmblem);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
