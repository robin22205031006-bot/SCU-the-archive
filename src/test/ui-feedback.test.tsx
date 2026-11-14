import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { UIStateProvider, useUIState } from "@/context/UIStateContext";
import { ThemeDrawer } from "@/components/theme-drawer";
import {
  UI_FEEDBACK_VIBRATION_PATTERNS,
  calculateElementAudioPan,
  getDecodedAudioBuffer,
  getUIFeedbackVibrationPattern,
  preloadUIFeedbackAudio,
  resetAudioBufferCache,
  resolveUIFeedbackStyle,
  scaleVibrationPattern,
  triggerUIFeedback,
  useUIFeedback,
} from "@/hooks/use-ui-feedback";
import { scuCache } from "@/services/scuCache";
import { sfx } from "@/lib/scu-audio";

function UIFeedbackProbe({ mode }: { mode?: string }) {
  const { style, triggerFeedback, triggerNavigation, triggerClick, triggerAction } = useUIFeedback(
    mode ? { mode } : undefined,
  );
  return (
    <div>
      <span data-testid="ui-feedback-style">{style}</span>
      <button type="button" onClick={() => triggerFeedback("nav", mode ?? "fantasy")}>
        direct-nav-fantasy
      </button>
      <button type="button" onClick={() => triggerFeedback("click", "nexus")}>
        direct-click-nexus
      </button>
      <button type="button" onClick={() => triggerNavigation()}>
        nav-click
      </button>
      <button type="button" onClick={() => triggerClick()}>
        ui-click
      </button>
      <button type="button" onClick={() => triggerAction()}>
        cta-click
      </button>
    </div>
  );
}

describe("useUIFeedback Web Audio, Navigator.vibrate & Preload Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAudioBufferCache();
    document.documentElement.removeAttribute("data-primary-system");
    document.documentElement.removeAttribute("data-manga-subtheme");
    document.documentElement.removeAttribute("data-ui-mode");
    document.documentElement.removeAttribute("data-ui");
    document.documentElement.removeAttribute("data-genre-theme");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("differentiates feedback style and haptic patterns between fantasy (rhythmic pulse), nexus (short burst), manga (ink), classic, and minimal", () => {
    expect(resolveUIFeedbackStyle("fantasy")).toBe("parchment");
    expect(resolveUIFeedbackStyle("manga", "fantasy")).toBe("parchment");
    expect(resolveUIFeedbackStyle("isekai")).toBe("parchment");
    expect(resolveUIFeedbackStyle("ghibli")).toBe("parchment");
    expect(resolveUIFeedbackStyle("nexus")).toBe("sharp");
    expect(resolveUIFeedbackStyle("manga", "scifiAnime")).toBe("sharp");
    expect(resolveUIFeedbackStyle("manga", "shounen")).toBe("ink");
    expect(resolveUIFeedbackStyle("classic")).toBe("classic");
    expect(resolveUIFeedbackStyle("minimal")).toBe("minimal");

    expect(getUIFeedbackVibrationPattern("fantasy", "nav")).toEqual(
      UI_FEEDBACK_VIBRATION_PATTERNS.parchment.nav,
    );
    expect(getUIFeedbackVibrationPattern("fantasy", "click")).toEqual([8, 18, 6]);
    expect(getUIFeedbackVibrationPattern("nexus", "nav")).toEqual([6, 8]);
    expect(getUIFeedbackVibrationPattern("nexus", "click")).toBe(5);
    expect(getUIFeedbackVibrationPattern("minimal", "click")).toBeNull();
  });

  it("triggers parchment Web Audio sounds and softer rhythmic pulse vibrations for fantasy mode", () => {
    const parchmentSnapSpy = vi.spyOn(sfx, "parchmentSnap").mockImplementation(() => {});
    const parchmentClickSpy = vi.spyOn(sfx, "parchmentClick").mockImplementation(() => {});
    const angelSpy = vi.spyOn(sfx, "angel").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });

    render(<UIFeedbackProbe mode="fantasy" />);
    expect(screen.getByTestId("ui-feedback-style").textContent).toBe("parchment");

    fireEvent.click(screen.getByRole("button", { name: "nav-click" }));
    expect(parchmentSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([12, 26, 10]);

    fireEvent.click(screen.getByRole("button", { name: "ui-click" }));
    expect(parchmentClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([8, 18, 6]);

    fireEvent.click(screen.getByRole("button", { name: "cta-click" }));
    expect(angelSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([14, 24, 12, 20, 10]);
  });

  it("triggers sharp digital Web Audio clicks and short vibration bursts for nexus mode via UIStateProvider", () => {
    const terminalSnapSpy = vi.spyOn(sfx, "terminalSnap").mockImplementation(() => {});
    const terminalClickSpy = vi.spyOn(sfx, "terminalClick").mockImplementation(() => {});
    const hudSpy = vi.spyOn(sfx, "hud").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });

    render(
      <UIStateProvider initialMode="nexus">
        <UIFeedbackProbe />
      </UIStateProvider>,
    );

    expect(screen.getByTestId("ui-feedback-style").textContent).toBe("sharp");

    fireEvent.click(screen.getByRole("button", { name: "nav-click" }));
    expect(terminalSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([6, 8]);

    fireEvent.click(screen.getByRole("button", { name: "ui-click" }));
    expect(terminalClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith(5);

    fireEvent.click(screen.getByRole("button", { name: "cta-click" }));
    expect(hudSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([8, 10, 8]);
  });

  it("reads active ThemeContext mode/sub-theme automatically and silences minimal mode", () => {
    const parchmentClickSpy = vi.spyOn(sfx, "parchmentClick").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider initialMode="manga">
              <ThemeProvider initialSubTheme="fantasy">
                <UIFeedbackProbe />
              </ThemeProvider>
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("ui-feedback-style").textContent).toBe("parchment");
    fireEvent.click(screen.getByRole("button", { name: "ui-click" }));
    expect(parchmentClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledWith([8, 18, 6]);

    parchmentClickSpy.mockClear();
    vibrateMock.mockClear();
    triggerUIFeedback("click", "minimal");
    triggerUIFeedback("navigation", "minimal");
    expect(parchmentClickSpy).not.toHaveBeenCalled();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it("supports triggerFeedback(type, mode) directly and integrates cleanly in AppContent tabs and mode selector", async () => {
    const parchmentSnapSpy = vi.spyOn(sfx, "parchmentSnap").mockImplementation(() => {});
    const terminalSnapSpy = vi.spyOn(sfx, "terminalSnap").mockImplementation(() => {});
    const terminalClickSpy = vi.spyOn(sfx, "terminalClick").mockImplementation(() => {});
    const inkClickSpy = vi.spyOn(sfx, "inkClick").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });
    vi.spyOn(scuCache, "getCharacters").mockResolvedValue([]);
    vi.spyOn(scuCache, "getOrganizations").mockResolvedValue([]);
    vi.spyOn(scuCache, "getTimeline").mockResolvedValue([]);

    const { unmount } = render(<UIFeedbackProbe mode="fantasy" />);
    fireEvent.click(screen.getByRole("button", { name: "direct-nav-fantasy" }));
    expect(parchmentSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([12, 26, 10]);
    fireEvent.click(screen.getByRole("button", { name: "direct-click-nexus" }));
    expect(terminalClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith(5);
    unmount();

    terminalSnapSpy.mockClear();
    terminalClickSpy.mockClear();
    inkClickSpy.mockClear();
    vibrateMock.mockClear();

    render(<App />);
    // Default App mode from UIStateProvider is nexus -> tab click triggers sharp digital nav feedback
    fireEvent.click(screen.getByRole("button", { name: "Archivist AI" }));
    expect(terminalSnapSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith([6, 8]);

    // Mode selector click to Manga triggers manga ink click feedback
    fireEvent.click(screen.getByRole("button", { name: "Manga" }));
    expect(inkClickSpy).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenLastCalledWith(8);

    // Switching to Minimal silences both tab navigation and mode feedback
    terminalSnapSpy.mockClear();
    vibrateMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Minimal" }));
    fireEvent.click(screen.getByRole("button", { name: "Lore Explorer" }));
    expect(terminalSnapSpy).not.toHaveBeenCalled();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it("pre-warms synthesized PCM noise buffers and decodes custom audio buffers via preloadUIFeedbackAudio", async () => {
    const fakeBuffer = { duration: 0.12, length: 5760, sampleRate: 48000 } as AudioBuffer;
    const decodeAudioDataMock = vi.fn(async () => fakeBuffer);
    const createBufferMock = vi.fn((_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate,
        getChannelData: () => data,
      } as unknown as AudioBuffer;
    });

    class MockAudioContext {
      state: AudioContextState = "running";
      sampleRate = 48000;
      currentTime = 0;
      destination = {} as AudioDestinationNode;
      createBuffer = createBufferMock;
      decodeAudioData = decodeAudioDataMock;
      resume = vi.fn(async () => {});
    }

    const origAC = window.AudioContext;
    Object.defineProperty(window, "AudioContext", {
      value: MockAudioContext,
      configurable: true,
    });

    try {
      const tinyDataUrl = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA";
      const result = await preloadUIFeedbackAudio({
        "sfx:parchment": tinyDataUrl,
      });

      expect(result.initialized).toBe(true);
      expect(result.warmedNoiseCount).toBeGreaterThanOrEqual(10);
      expect(result.decodedCount).toBe(1);
      expect(createBufferMock).toHaveBeenCalled();
      expect(decodeAudioDataMock).toHaveBeenCalledTimes(1);
      expect(getDecodedAudioBuffer("sfx:parchment")).toBe(fakeBuffer);
      expect(getDecodedAudioBuffer(tinyDataUrl)).toBe(fakeBuffer);
    } finally {
      Object.defineProperty(window, "AudioContext", {
        value: origAC,
        configurable: true,
      });
    }
  });

  it("calculates screen-center positional audio panning from elements, rects, and events", () => {
    const viewport = { width: 1000, height: 800 };

    expect(calculateElementAudioPan(null, viewport)).toBeNull();
    expect(
      calculateElementAudioPan({ left: 450, top: 380, width: 100, height: 40 }, viewport),
    ).toEqual({
      pan: 0,
      x: 0,
      y: 0,
      distanceFromCenter: 0,
    });

    const farLeft = calculateElementAudioPan(
      { left: 0, top: 380, width: 100, height: 40 },
      viewport,
    );
    expect(farLeft?.pan).toBeCloseTo(-0.9, 5);
    expect(farLeft?.y).toBeCloseTo(0, 5);
    expect(farLeft?.distanceFromCenter).toBeCloseTo(0.9 / Math.SQRT2, 5);

    const farRightBtn = document.createElement("button");
    farRightBtn.getBoundingClientRect = () =>
      ({ left: 900, top: 700, width: 100, height: 100 }) as DOMRect;
    const rightCorner = calculateElementAudioPan(farRightBtn, viewport);
    expect(rightCorner?.pan).toBeCloseTo(0.9, 5);
    expect(rightCorner?.y).toBeCloseTo(0.875, 5);
    expect(rightCorner?.distanceFromCenter ?? 0).toBeGreaterThan(0.85);

    // Unlaid-out jsdom element defaults to centered pan=0
    const unlaidOutBtn = document.createElement("button");
    unlaidOutBtn.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    expect(calculateElementAudioPan({ currentTarget: unlaidOutBtn }, viewport)).toEqual({
      pan: 0,
      x: 0,
      y: 0,
      distanceFromCenter: 0,
    });
  });

  it("routes nexus and fantasy Web Audio through StereoPannerNode (and PannerNode fallback) based on element position", () => {
    const createMockParam = (initial = 0) => {
      const param = {
        value: initial,
        setValueAtTime: vi.fn((val: number) => {
          param.value = val;
        }),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      };
      return param;
    };

    const stereoPanners: Array<{
      pan: ReturnType<typeof createMockParam>;
      connect: ReturnType<typeof vi.fn>;
    }> = [];
    const gainNodes: Array<{
      gain: ReturnType<typeof createMockParam>;
      connect: ReturnType<typeof vi.fn>;
    }> = [];

    class MockStereoAudioContext {
      state: AudioContextState = "running";
      sampleRate = 48000;
      currentTime = 1.5;
      destination = { kind: "destination" } as unknown as AudioDestinationNode;
      createStereoPanner = vi.fn(() => {
        const panParam = createMockParam(0);
        const panner = {
          pan: panParam,
          connect: vi.fn((dest: unknown) => dest),
        };
        stereoPanners.push(panner);
        return panner as unknown as StereoPannerNode;
      });
      createOscillator = vi.fn(() => ({
        type: "sine",
        frequency: createMockParam(440),
        connect: vi.fn((dest: unknown) => dest),
        start: vi.fn(),
        stop: vi.fn(),
      }));
      createGain = vi.fn(() => {
        const gain = {
          gain: createMockParam(1),
          connect: vi.fn((dest: unknown) => dest),
        };
        gainNodes.push(gain);
        return gain as unknown as GainNode;
      });
      createBuffer = vi.fn((_c: number, length: number, sampleRate: number) => ({
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length),
      }));
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn((dest: unknown) => dest),
        start: vi.fn(),
      }));
      createBiquadFilter = vi.fn(() => ({
        type: "bandpass",
        frequency: createMockParam(1000),
        Q: createMockParam(1),
        connect: vi.fn((dest: unknown) => dest),
      }));
    }

    const origAC = window.AudioContext;
    const origWidth = window.innerWidth;
    const origHeight = window.innerHeight;
    Object.defineProperty(window, "AudioContext", {
      value: MockStereoAudioContext,
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    try {
      function SpatialProbe() {
        const { triggerClick, triggerNavigation } = useUIFeedback({ mode: "nexus" });
        return (
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.getBoundingClientRect = () =>
                  ({ left: 0, top: 380, width: 100, height: 40 }) as DOMRect;
                triggerClick(e);
              }}
            >
              left-nexus-btn
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.getBoundingClientRect = () =>
                  ({ left: 850, top: 100, width: 100, height: 40 }) as DOMRect;
                triggerNavigation(e);
              }}
            >
              right-nexus-btn
            </button>
          </div>
        );
      }

      render(<SpatialProbe />);

      fireEvent.click(screen.getByRole("button", { name: "left-nexus-btn" }));
      expect(stereoPanners.length).toBeGreaterThanOrEqual(1);
      expect(stereoPanners[0]?.pan.setValueAtTime).toHaveBeenCalledWith(-0.9, 1.5);
      expect(stereoPanners[0]?.pan.value).toBeCloseTo(-0.9, 5);
      expect(stereoPanners[0]?.connect).toHaveBeenCalled();
      expect(gainNodes.some((g) => g.connect.mock.calls[0]?.[0] === stereoPanners[0])).toBe(true);

      const countBeforeSecond = stereoPanners.length;
      fireEvent.click(screen.getByRole("button", { name: "right-nexus-btn" }));
      expect(stereoPanners.length).toBeGreaterThan(countBeforeSecond);
      expect(stereoPanners[countBeforeSecond]?.pan.value).toBeCloseTo(0.8, 5);

      // PannerNode fallback in fantasy mode when createStereoPanner is unavailable
      resetAudioBufferCache();
      const setPositionMock = vi.fn();
      const pannerConnectMock = vi.fn((dest: unknown) => dest);
      class Mock3DPannerAudioContext extends MockStereoAudioContext {
        override createStereoPanner =
          undefined as unknown as MockStereoAudioContext["createStereoPanner"];
        createPanner = vi.fn(() => ({
          panningModel: "HRTF",
          setPosition: setPositionMock,
          connect: pannerConnectMock,
        }));
      }
      Object.defineProperty(window, "AudioContext", {
        value: Mock3DPannerAudioContext,
        configurable: true,
      });

      triggerUIFeedback("nav", "fantasy", {
        target: { left: 700, top: 100, width: 100, height: 100 },
      });
      expect(setPositionMock).toHaveBeenCalled();
      const [px, py, pz] = setPositionMock.mock.calls[0] as [number, number, number];
      expect(px).toBeCloseTo(0.5, 5);
      expect(py).toBeCloseTo(0.625, 5);
      expect(pz).toBeLessThan(0);
      expect(pannerConnectMock).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "AudioContext", { value: origAC, configurable: true });
      Object.defineProperty(window, "innerWidth", { value: origWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: origHeight, configurable: true });
    }
  });

  it("reads haptic intensity preference from UIStateContext and scales navigator.vibrate durations", () => {
    vi.spyOn(sfx, "terminalClick").mockImplementation(() => {});
    vi.spyOn(sfx, "parchmentSnap").mockImplementation(() => {});
    vi.spyOn(sfx, "click").mockImplementation(() => {});
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrateMock,
      configurable: true,
    });

    expect(scaleVibrationPattern([12, 26, 10], "low")).toEqual([6, 13, 5]);
    expect(scaleVibrationPattern([12, 26, 10], "medium")).toEqual([12, 26, 10]);
    expect(scaleVibrationPattern([12, 26, 10], "high")).toEqual([18, 39, 15]);
    expect(getUIFeedbackVibrationPattern("nexus", "click", null, "low")).toBe(3);
    expect(getUIFeedbackVibrationPattern("nexus", "click", null, "high")).toBe(8);

    function HapticProbe() {
      const { hapticIntensity, setHapticIntensity } = useUIState();
      const { triggerNavigation, triggerClick } = useUIFeedback({ mode: "fantasy" });
      const [drawerOpen, setDrawerOpen] = useState(false);
      return (
        <div>
          <span data-testid="ctx-haptic-intensity">{hapticIntensity}</span>
          <button type="button" onClick={() => setHapticIntensity("low")}>
            set-low
          </button>
          <button type="button" onClick={() => setHapticIntensity("high")}>
            set-high
          </button>
          <button type="button" onClick={(e) => triggerNavigation(e)}>
            fire-nav
          </button>
          <button type="button" onClick={(e) => triggerClick(e)}>
            fire-click
          </button>
          <button type="button" onClick={() => setDrawerOpen((v) => !v)}>
            toggle-drawer
          </button>
          <ThemeDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </div>
      );
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <UIStateProvider initialMode="nexus" initialHapticIntensity="low">
            <HapticProbe />
          </UIStateProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("ctx-haptic-intensity").textContent).toBe("low");
    fireEvent.click(screen.getByRole("button", { name: "fire-nav" }));
    // fantasy nav [12, 26, 10] * 0.5 => [6, 13, 5]
    expect(vibrateMock).toHaveBeenLastCalledWith([6, 13, 5]);

    fireEvent.click(screen.getByRole("button", { name: "set-high" }));
    expect(screen.getByTestId("ctx-haptic-intensity").textContent).toBe("high");
    fireEvent.click(screen.getByRole("button", { name: "fire-nav" }));
    // fantasy nav [12, 26, 10] * 1.5 => [18, 39, 15]
    expect(vibrateMock).toHaveBeenLastCalledWith([18, 39, 15]);

    // ThemeDrawer exposes Haptic intensity buttons and updates context cleanly
    fireEvent.click(screen.getByRole("button", { name: "toggle-drawer" }));
    const mediumBtn = screen.getByRole("button", { name: "Medium" });
    fireEvent.click(mediumBtn);
    expect(localStorage.getItem("scu-haptic-intensity")).toBe("medium");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("ctx-haptic-intensity").textContent).toBe("medium");
    fireEvent.click(screen.getByRole("button", { name: "fire-click" }));
    expect(vibrateMock).toHaveBeenLastCalledWith([8, 18, 6]);
  });
});
