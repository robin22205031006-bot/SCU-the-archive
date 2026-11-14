import { useCallback, useEffect, useRef, useState } from "react";

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

export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function joinTranscript(base: string, addition: string): string {
  const left = base.trimEnd();
  const right = addition.trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

export function mapSpeechError(code: string): string {
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

export interface UseVoiceInputOptions {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  handsFree?: boolean;
  onHandsFreeSubmit?: (spokenText: string) => void | Promise<void>;
}

export function useVoiceInput({
  value,
  onChange,
  disabled = false,
  handsFree = false,
  onHandsFreeSubmit,
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseInputRef = useRef(value);
  const finalSpeechRef = useRef("");
  const interimRef = useRef("");
  const isStoppingRef = useRef(false);
  const submittedUpToIndexRef = useRef(0);

  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const handsFreeRef = useRef(handsFree);
  handsFreeRef.current = handsFree;
  const onHandsFreeSubmitRef = useRef(onHandsFreeSubmit);
  onHandsFreeSubmitRef.current = onHandsFreeSubmit;

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

  const syncBaseValue = useCallback((nextValue: string) => {
    baseInputRef.current = nextValue;
    if (!nextValue) {
      finalSpeechRef.current = "";
      interimRef.current = "";
      setInterimTranscript("");
    }
  }, []);

  const clearBuffers = useCallback(() => {
    baseInputRef.current = "";
    finalSpeechRef.current = "";
    interimRef.current = "";
    setInterimTranscript("");
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
      onChangeRef.current(committed);
    }
    interimRef.current = "";
    setInterimTranscript("");
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (disabled || isListening) return;
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

    baseInputRef.current = valueRef.current;
    finalSpeechRef.current = "";
    interimRef.current = "";
    submittedUpToIndexRef.current = 0;
    isStoppingRef.current = false;

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event) => {
      let finalizedSinceSubmit = "";
      let interim = "";
      let hasNewFinal = false;
      const startIdx = submittedUpToIndexRef.current;

      for (let i = startIdx; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result?.[0]?.transcript ?? "";
        if (!piece) continue;
        if (result?.isFinal) {
          finalizedSinceSubmit = joinTranscript(finalizedSinceSubmit, piece);
          hasNewFinal = true;
        } else {
          interim = joinTranscript(interim, piece);
        }
      }

      if (handsFreeRef.current && hasNewFinal && onHandsFreeSubmitRef.current) {
        const spokenQuery = joinTranscript(baseInputRef.current, finalizedSinceSubmit).trim();
        submittedUpToIndexRef.current = event.results.length;
        clearBuffers();
        if (spokenQuery) {
          onChangeRef.current("");
          void onHandsFreeSubmitRef.current(spokenQuery);
          return;
        }
      }

      finalSpeechRef.current = finalizedSinceSubmit;
      interimRef.current = interim;
      const combined = joinTranscript(
        joinTranscript(baseInputRef.current, finalizedSinceSubmit),
        interim,
      );
      setInterimTranscript(interim);
      onChangeRef.current(combined);
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
  }, [clearBuffers, disabled, isListening]);

  const toggleMicrophone = useCallback(() => {
    if (isListening) stopListening();
    else void startListening();
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimTranscript,
    speechSupported,
    micError,
    setMicError,
    startListening,
    stopListening,
    toggleMicrophone,
    syncBaseValue,
    clearBuffers,
  };
}
