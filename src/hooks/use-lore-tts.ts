import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildLoreNarrationText,
  cancelLoreNarration,
  speakLoreNarration,
  type LoreSpeechItem,
} from "@/lib/lore-tts";

export interface UseLoreTtsOptions {
  onStatus?: ((message: string) => void) | undefined;
}

export function useLoreTts({ onStatus }: UseLoreTtsOptions = {}) {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speakingKeyRef = useRef<string | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const stopSpeaking = useCallback(() => {
    speakingKeyRef.current = null;
    setSpeakingKey(null);
    cancelLoreNarration();
  }, []);

  const toggleSpeak = useCallback(
    (itemKey: string, item: LoreSpeechItem) => {
      if (speakingKeyRef.current === itemKey) {
        stopSpeaking();
        const title = item.name || item.event_name || item.title || "entry";
        onStatusRef.current?.(`Stopped narrating ${title}`);
        return;
      }

      const title = item.name || item.event_name || item.title || "Lore entry";
      const text = buildLoreNarrationText(item);

      speakingKeyRef.current = itemKey;
      setSpeakingKey(itemKey);

      const res = speakLoreNarration({
        text,
        onStart: () => {
          if (speakingKeyRef.current === itemKey) {
            setSpeakingKey(itemKey);
          }
        },
        onEnd: () => {
          if (speakingKeyRef.current === itemKey) {
            speakingKeyRef.current = null;
            setSpeakingKey(null);
          }
        },
        onError: () => {
          if (speakingKeyRef.current === itemKey) {
            speakingKeyRef.current = null;
            setSpeakingKey(null);
            onStatusRef.current?.(`Unable to narrate ${title} in this browser`);
          }
        },
      });

      if (!res.started) {
        speakingKeyRef.current = null;
        setSpeakingKey(null);
        if (res.reason === "unsupported") {
          onStatusRef.current?.("Text-to-speech is not supported in this browser");
        } else if (res.reason === "error") {
          onStatusRef.current?.(`Unable to narrate ${title}`);
        }
        return;
      }

      onStatusRef.current?.(`Narrating ${title}`);
    },
    [stopSpeaking],
  );

  useEffect(() => () => cancelLoreNarration(), []);

  return {
    speakingKey,
    toggleSpeak,
    stopSpeaking,
  };
}
