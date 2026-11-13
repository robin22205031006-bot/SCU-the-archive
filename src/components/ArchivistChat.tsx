import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { askLore } from "@/lib/ai-box.functions";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function joinTranscript(base: string, addition: string): string {
  const left = base.trimEnd();
  const right = addition.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

function mapSpeechError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow mic access in your browser settings to dictate lore queries.";
    case "audio-capture":
      return "No microphone was detected. Connect a microphone and try again.";
    case "no-speech":
      return "No speech detected. Try speaking closer to your microphone.";
    case "network":
      return "Speech recognition network error. Please check your connection and try again.";
    default:
      return "Voice input could not complete. You can keep typing or try again.";
  }
}

export function ArchivistChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "system",
      content: "Archivist online. Query the Sentinels Cinematic Universe database.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseInputRef = useRef("");
  const finalSpeechRef = useRef("");
  const interimRef = useRef("");
  const isStoppingRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null);
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          /* already stopped */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore stop errors */
      }
    }
    if (interimRef.current.trim()) {
      const committed = joinTranscript(
        joinTranscript(baseInputRef.current, finalSpeechRef.current),
        interimRef.current,
      );
      baseInputRef.current = committed;
      finalSpeechRef.current = "";
      setInput(committed);
    }
    interimRef.current = "";
    setInterimTranscript("");
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (loading || isListening) return;
    setMicError(null);

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      setMicError(
        "Speech-to-text is not supported in this browser. Try Chrome, Edge, or Safari, or type your question.",
      );
      return;
    }

    // Request explicit microphone permission cleanly before starting SpeechRecognition,
    // releasing tracks right away so the speech engine can bind to the mic without conflict.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of stream.getTracks()) {
          track.stop();
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setMicError("No microphone device was found. Connect a microphone and try again.");
        } else {
          setMicError(
            "Microphone access was denied. Enable microphone permission in your browser and try again.",
          );
        }
        return;
      }
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

    baseInputRef.current = input;
    finalSpeechRef.current = "";
    interimRef.current = "";
    isStoppingRef.current = false;

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event) => {
      let finalized = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (!piece) continue;
        if (result?.isFinal) {
          finalized = joinTranscript(finalized, piece);
        } else {
          interim = joinTranscript(interim, piece);
        }
      }
      finalSpeechRef.current = finalized;
      interimRef.current = interim;
      const combined = joinTranscript(joinTranscript(baseInputRef.current, finalized), interim);
      setInterimTranscript(interim);
      setInput(combined);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && isStoppingRef.current) return;
      setMicError(mapSpeechError(event.error));
      setIsListening(false);
      interimRef.current = "";
      setInterimTranscript("");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      interimRef.current = "";
      setInterimTranscript("");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setMicError("Unable to start voice recognition. Please try again.");
    }
  }, [input, isListening, loading]);

  const toggleMicrophone = () => {
    if (isListening) stopListening();
    else void startListening();
  };

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (isListening) stopListening();

    const candidate = input.trim();
    if (!candidate || loading) return;

    const userMessage = candidate;
    const nextMessages = [...messages, { role: "user", content: userMessage }];
    baseInputRef.current = "";
    finalSpeechRef.current = "";
    interimRef.current = "";
    setInterimTranscript("");
    setInput("");
    setMessages(nextMessages);
    setLoading(true);

    try {
      const apiMessages = nextMessages
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.content }));
      const response = await askLore({
        data: { messages: apiMessages, model: "gemini-4-hydrogen", role: "archivist" },
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply || "No data found in archives." },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error communicating with Archivist core." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-red-500 mb-4 tracking-wide">SCU Archivist AI</h2>

      <div className="flex-1 overflow-y-auto bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4 mb-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[80%] ${msg.role === "user" ? "bg-red-900/40 ml-auto text-right" : "bg-gray-800 mr-auto"}`}
          >
            <p className="text-sm text-gray-200">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-500 animate-pulse">
            Archivist is analyzing records...
          </div>
        )}
      </div>

      {isListening && (
        <div
          role="status"
          aria-live="polite"
          className="mb-2 flex items-center justify-between gap-2 rounded border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs text-red-200"
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <span>
              Listening…{" "}
              {interimTranscript ? (
                <span className="text-gray-300 italic">{interimTranscript}</span>
              ) : (
                "Speak your lore question or input"
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={stopListening}
            className="text-red-300 underline hover:text-white"
          >
            Stop
          </button>
        </div>
      )}

      {micError && (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-2 rounded border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200"
        >
          <span>{micError}</span>
          <button
            type="button"
            onClick={() => setMicError(null)}
            className="text-amber-300 underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            baseInputRef.current = e.target.value;
            setInput(e.target.value);
          }}
          placeholder={
            isListening
              ? "Listening for speech..."
              : "Ask about factions, characters, or timeline events..."
          }
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-red-500"
        />
        <button
          type="button"
          onClick={toggleMicrophone}
          disabled={loading}
          aria-pressed={isListening}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          title={
            !speechSupported
              ? "Speech-to-text unavailable in this browser"
              : isListening
                ? "Stop microphone"
                : "Dictate with microphone"
          }
          className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-sm font-medium transition-colors ${
            isListening
              ? "border-red-500 bg-red-600/20 text-red-200 hover:bg-red-600/30"
              : speechSupported
                ? "border-gray-700 bg-gray-900 text-gray-200 hover:border-red-500/60 hover:text-white"
                : "border-gray-800 bg-gray-900/60 text-gray-500 hover:text-gray-300"
          }`}
        >
          {isListening ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span className="hidden sm:inline">Stop</span>
            </>
          ) : speechSupported ? (
            <>
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mic</span>
            </>
          ) : (
            <>
              <MicOff className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mic</span>
            </>
          )}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 rounded font-semibold transition-colors"
        >
          Query
        </button>
      </form>
    </div>
  );
}
