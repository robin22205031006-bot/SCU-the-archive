import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { UIStateProvider } from "@/context/UIStateContext";
import {
  UI_FEEDBACK_VIBRATION_PATTERNS,
  getDecodedAudioBuffer,
  getUIFeedbackVibrationPattern,
  preloadUIFeedbackAudio,
  resetAudioBufferCache,
  resolveUIFeedbackStyle,
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
});
