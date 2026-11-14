import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, FileText, RotateCcw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askLore } from "@/lib/ai-box.functions";
import { useIsManga } from "@/hooks/use-ui-mode";
import { HankoStamp } from "@/components/manga-emblem";

type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  model?: string;
};

type RoleOption = "archivist" | "tactician" | "historian" | "guide";
type ModelOption = "gemini-4-hydrogen" | "gemini-3.1-flash-lite";

const ROLE_OPTIONS: { id: RoleOption; label: string }[] = [
  { id: "archivist", label: "Canon Archivist" },
  { id: "tactician", label: "Combat Analyst" },
  { id: "historian", label: "Timeline Chronicler" },
  { id: "guide", label: "SCU Guide" },
];

const STARTER_PROMPTS = [
  "Who are Ethan and Elizah, and how are they connected?",
  "Explain Kara Yazgi and who has wielded it.",
  "Summarize the Diablo War timeline and major factions.",
  "Which Mythic abilities exist in the SCU registry?",
];

export function LoreChat() {
  const isManga = useIsManga();
  const ask = useServerFn(askLore);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [role, setRole] = useState<RoleOption>("archivist");
  const [model, setModel] = useState<ModelOption>("gemini-4-hydrogen");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length, busy]);

  const send = async (overrideText?: string) => {
    const q = (overrideText ?? text).trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    if (!overrideText) setText("");
    setErrorMsg(null);
    setBusy(true);
    try {
      const r = await ask({
        data: {
          messages: next.slice(-20).map((m) => ({ role: m.role, content: m.content })),
          model,
          role,
        },
      });
      setMsgs([
        ...next,
        {
          role: "assistant",
          content: r.reply,
          sources: r.sources,
          model: r.model,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "The archive is unreachable right now. Please try again.";
      setErrorMsg(message);
      setMsgs([...next, { role: "assistant", content: message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className={`mx-auto flex h-dvh max-w-3xl flex-col px-4 pb-6 sm:px-5 ${
        isManga ? "pt-6" : "pt-28"
      }`}
    >
      <div
        className={`flex flex-wrap items-end justify-between gap-3 ${
          isManga ? "manga-panel border-[3px] border-foreground bg-card p-4" : ""
        }`}
      >
        <div>
          <p
            className={`text-[11px] uppercase tracking-[0.25em] ${
              isManga ? "font-mono font-bold text-[#b91c1c]" : "text-accent"
            }`}
          >
            Gemini Archivist
          </p>
          <h1
            className={`mt-2 sm:text-5xl ${
              isManga ? "manga-display-title text-4xl uppercase" : "text-4xl font-medium glow-text"
            }`}
          >
            SCU AI Box
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Multi-turn Gemini assistant grounded in the official SCU archive and PDF vault.
          </p>
        </div>
        {isManga ? (
          <HankoStamp kanji="電脳" label="ORACLE" tilt={-3} />
        ) : (
          <span className="mb-1 hidden items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-widest text-accent sm:inline-flex">
            <FileText className="h-3 w-3" /> Powered by Gemini &amp; SCU Archives
          </span>
        )}
      </div>

      {/* Role & Model Controls */}
      <div
        className={
          isManga
            ? "mt-4 flex flex-wrap items-center justify-between gap-2 border-[2.5px] border-foreground bg-card p-2.5 text-xs"
            : "mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/40 p-2.5 text-xs"
        }
      >
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Assistant role"
        >
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRole(opt.id)}
              aria-pressed={role === opt.id}
              className={
                isManga
                  ? `border-2 border-foreground px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      role === opt.id
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-secondary"
                    }`
                  : `rounded-full px-3 py-1 text-xs font-medium transition ${
                      role === opt.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Gemini model"
            value={model}
            onChange={(e) => setModel(e.target.value as ModelOption)}
            className={
              isManga
                ? "h-8 border-2 border-foreground bg-background px-2 font-mono text-[11px] font-bold uppercase text-foreground"
                : "h-8 rounded-full border border-border bg-background px-3 text-xs text-foreground"
            }
          >
            <option value="gemini-4-hydrogen">Gemini 4 Hydrogen (Default)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fast)</option>
          </select>
          {msgs.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setMsgs([]);
                setErrorMsg(null);
              }}
              aria-label="New chat"
              title="Reset conversation"
              className={
                isManga
                  ? "h-8 rounded-none border-2 border-foreground px-2.5 font-mono text-[10px] font-bold uppercase"
                  : "h-8 rounded-full px-2.5 text-xs"
              }
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> New chat
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className={`mt-3 border px-3 py-2 text-xs text-destructive ${
            isManga
              ? "border-2 border-[#b91c1c] bg-[#b91c1c]/10 font-mono"
              : "rounded-xl border-destructive/40 bg-destructive/10"
          }`}
        >
          {errorMsg}
        </div>
      )}

      {/* Scrollable Multi-Turn Conversation Thread */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3">
        {msgs.length === 0 && (
          <div
            className={
              isManga
                ? "manga-panel manga-halftone grid place-items-center gap-4 border-[3px] border-foreground bg-card p-8 text-center text-sm text-foreground"
                : "glass grid place-items-center gap-4 rounded-2xl p-8 text-center text-sm text-muted-foreground"
            }
          >
            <Bot className={`h-8 w-8 ${isManga ? "text-[#b91c1c]" : "text-accent"}`} />
            <p>Ask Gemini about any SCU character, ability, faction, relic, or timeline arc.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className={
                    isManga
                      ? "inline-flex items-center gap-1.5 border-2 border-foreground bg-background px-3 py-1.5 font-mono text-[11px] font-bold text-foreground transition hover:bg-foreground hover:text-background"
                      : "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent"
                  }
                >
                  <Sparkles className={`h-3 w-3 ${isManga ? "text-[#b91c1c]" : "text-accent"}`} />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className="grid gap-1.5">
            <div
              className={
                isManga
                  ? m.role === "user"
                    ? "max-w-[85%] justify-self-end whitespace-pre-line border-2 border-foreground bg-foreground px-4 py-2.5 text-sm text-background shadow-[3px_3px_0_#b91c1c]"
                    : "manga-speech-bubble manga-tail-left max-w-[85%] justify-self-start whitespace-pre-line border-[2.5px] border-foreground bg-card px-4 py-2.5 text-sm text-card-foreground"
                  : `max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "justify-self-end bg-primary text-primary-foreground"
                        : "glass justify-self-start"
                    }`
              }
            >
              {m.content}
            </div>
            {m.role === "assistant" && (
              <div className="flex flex-wrap items-center gap-2 justify-self-start pl-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.model && <span>{m.model}</span>}
                {m.sources && m.sources.length > 0 && (
                  <span>· Sources: {m.sources.join(", ")}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div
            className={
              isManga
                ? "manga-thought-box justify-self-start border-2 border-dashed border-foreground bg-card px-4 py-2.5 font-mono text-xs uppercase text-foreground"
                : "glass justify-self-start rounded-2xl px-4 py-2.5 text-sm text-muted-foreground"
            }
          >
            Gemini is analyzing the SCU archive…
          </div>
        )}
        <div ref={end} />
      </div>

      <form
        className={
          isManga
            ? "sticky bottom-2 mt-4 flex gap-2 border-[3px] border-foreground bg-card p-1.5 shadow-[4px_4px_0_var(--foreground)]"
            : "glass sticky bottom-2 mt-4 flex gap-2 rounded-full p-1.5"
        }
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Gemini about the SCU archive…"
          className="border-0 bg-transparent"
          maxLength={2000}
        />
        <Button
          type="submit"
          size="icon"
          className={
            isManga
              ? "rounded-none border-2 border-foreground bg-[#b91c1c] text-white"
              : "rounded-full"
          }
          disabled={busy || !text.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </main>
  );
}
