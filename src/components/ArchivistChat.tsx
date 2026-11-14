import React, { useCallback, useRef, useState } from "react";
import { Headphones, Mic, MicOff, Square } from "lucide-react";
import { askLore } from "@/lib/ai-box.functions";
import { useVoiceInput } from "@/hooks/use-voice-input";

export function ArchivistChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "system",
      content: "Archivist online. Query the Sentinels Cinematic Universe database.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const submitQuery = useCallback(async (rawText: string) => {
    const candidate = rawText.trim();
    if (!candidate || loadingRef.current) return;

    const nextMessages = [...messagesRef.current, { role: "user", content: candidate }];
    setInput("");
    setMessages(nextMessages);
    setLoading(true);
    loadingRef.current = true;

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
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const {
    isListening,
    interimTranscript,
    speechSupported,
    micError,
    setMicError,
    stopListening,
    toggleMicrophone,
    syncBaseValue,
    clearBuffers,
  } = useVoiceInput({
    value: input,
    onChange: setInput,
    disabled: loading,
    handsFree,
    onHandsFreeSubmit: submitQuery,
  });

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (isListening) stopListening();

    const candidate = input.trim();
    if (!candidate || loading) return;
    clearBuffers();
    await submitQuery(candidate);
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
              {handsFree && <span className="font-semibold text-amber-300">[Hands-free] </span>}
              {interimTranscript ? (
                <span className="text-gray-300 italic">{interimTranscript}</span>
              ) : handsFree ? (
                "Speak naturally — pauses submit automatically"
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
            syncBaseValue(e.target.value);
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
          onClick={() => setHandsFree((v) => !v)}
          disabled={loading}
          aria-pressed={handsFree}
          aria-label="Toggle hands-free voice auto-send"
          title={
            handsFree
              ? "Hands-free auto-send ON (finalized speech submits automatically)"
              : "Hands-free auto-send OFF (dictate into input box)"
          }
          className={`inline-flex items-center justify-center gap-1.5 rounded border px-2.5 py-2 text-xs font-medium transition-colors ${
            handsFree
              ? "border-amber-500/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
              : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:inline">Hands-free</span>
        </button>
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
