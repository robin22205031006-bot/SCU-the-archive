import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArchivistChat } from "@/components/ArchivistChat";

const mockAskLore = vi.fn();

vi.mock("@/lib/ai-box.functions", () => ({
  askLore: (...args: unknown[]) => mockAskLore(...args),
}));

type MockRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal: boolean;
          length: number;
          [i: number]: { transcript: string };
        }>;
      }) => void)
    | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

describe("ArchivistChat microphone speech-to-text", () => {
  let activeRecognition: MockRecognitionInstance | null = null;
  const originalSpeech = (window as unknown as Record<string, unknown>)["SpeechRecognition"];
  const originalWebkitSpeech = (window as unknown as Record<string, unknown>)[
    "webkitSpeechRecognition"
  ];
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    activeRecognition = null;
    mockAskLore.mockReset();
    mockAskLore.mockResolvedValue({ reply: "Ethan leads the Vanguard." });

    class FakeSpeechRecognition implements MockRecognitionInstance {
      continuous = false;
      interimResults = false;
      lang = "en-US";
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error: string; message?: string }) => void) | null = null;
      onresult: MockRecognitionInstance["onresult"] = null;
      start = vi.fn(() => {
        this.onstart?.();
      });
      stop = vi.fn(() => {
        this.onend?.();
      });
      abort = vi.fn(() => {
        this.onend?.();
      });
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        activeRecognition = this;
      }
    }

    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: FakeSpeechRecognition,
    });

    const stopTrack = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: originalSpeech,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: originalWebkitSpeech,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: originalMediaDevices,
    });
  });

  it("requests mic access, transcribes speech to text, and submits the spoken query", async () => {
    render(<ArchivistChat />);

    const micBtn = screen.getByRole("button", { name: /start voice input/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(activeRecognition?.start).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/listening/i);

    act(() => {
      activeRecognition?.onresult?.({
        resultIndex: 0,
        results: {
          0: { isFinal: false, length: 1, 0: { transcript: "Who leads" } },
          length: 1,
        },
      });
    });

    const input = screen.getByPlaceholderText(/listening for speech/i) as HTMLInputElement;
    expect(input.value).toBe("Who leads");

    act(() => {
      activeRecognition?.onresult?.({
        resultIndex: 0,
        results: {
          0: { isFinal: true, length: 1, 0: { transcript: "Who leads the Vanguard?" } },
          length: 1,
        },
      });
    });

    expect(input.value).toBe("Who leads the Vanguard?");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^query$/i }));
    });

    await waitFor(() => {
      expect(mockAskLore).toHaveBeenCalledWith({
        data: {
          messages: [{ role: "user", content: "Who leads the Vanguard?" }],
          model: "gemini-4-hydrogen",
          role: "archivist",
        },
      });
    });

    expect(await screen.findByText("Ethan leads the Vanguard.")).toBeInTheDocument();
  });

  it("surfaces a clear error alert when microphone permission is denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error("Denied"), { name: "NotAllowedError" })),
      },
    });

    render(<ArchivistChat />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start voice input/i }));
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/microphone access was denied/i);
  });

  it("warns cleanly when SpeechRecognition is unsupported", async () => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    render(<ArchivistChat />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start voice input/i }));
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/speech-to-text is not supported/i);
  });
});
