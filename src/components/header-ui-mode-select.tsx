import { LayoutTemplate } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOptionalThemeContext, type PrimarySystem } from "@/context/ThemeContext";
import { useSensoryFeedback } from "@/hooks/use-sensory-feedback";
import { useOptionalUiMode, VISUAL_UI_MODES, type VisualUiMode } from "@/hooks/use-ui-mode";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";
import { setUiStyle, useUiStyle } from "@/lib/ui-style";

const SHORT_UI_LABELS: Record<VisualUiMode, string> = {
  classic: "Classic",
  nexus: "Nexus",
  minimal: "Minimal",
  manga: "Manga",
  codex: "Codex",
};

export function HeaderUiModeSelect({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "nexus" | "manga";
}) {
  const ctx = useOptionalUiMode();
  const themeCtx = useOptionalThemeContext();
  const legacyStyle = useUiStyle();
  const { playSwitch } = useSensoryFeedback();
  const activeMode: VisualUiMode = themeCtx?.primarySystem ?? (ctx ? ctx.mode : legacyStyle);

  const handleSelect = (nextValue: string) => {
    const modeId = nextValue as VisualUiMode;
    playSwitch();
    triggerTierSwitchHitstop(modeId);
    if (themeCtx) {
      themeCtx.setPrimarySystem(modeId as PrimarySystem);
    } else if (ctx) {
      ctx.setMode(modeId);
    } else {
      setUiStyle(modeId === "nexus" || modeId === "minimal" ? modeId : "classic");
    }
  };

  const triggerClass =
    variant === "nexus"
      ? "scu-tactile h-7 w-auto min-w-[88px] shrink-0 gap-1.5 whitespace-nowrap rounded-full border-cyan-400/35 bg-slate-900/75 px-2.5 text-[11px] font-medium text-cyan-200 hover:border-cyan-300/60"
      : variant === "manga"
        ? "scu-tactile h-7 w-auto min-w-[84px] shrink-0 gap-1.5 whitespace-nowrap rounded-none border border-border bg-background px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground hover:border-primary"
        : "scu-tactile h-7 w-auto min-w-[88px] shrink-0 gap-1.5 whitespace-nowrap rounded-full border-border/70 bg-secondary/70 px-2.5 text-[11px] font-medium text-foreground";

  return (
    <Select value={activeMode} onValueChange={handleSelect}>
      <SelectTrigger
        aria-label="Switch UI style"
        data-testid="header-ui-mode-select"
        className={`${triggerClass} ${className}`}
      >
        <LayoutTemplate className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
        <SelectValue placeholder="UI">{SHORT_UI_LABELS[activeMode]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectGroup>
          <SelectLabel>Signature · fully animated</SelectLabel>
          {VISUAL_UI_MODES.filter((m) => m.signature).map((m) => (
            <SelectItem
              key={m.id}
              value={m.id}
              data-ui-option={m.id}
              data-signature="true"
              className="ui-signature-option"
            >
              <span className="font-semibold">{m.label}</span>
              <span className="ui-signature-badge ml-2" aria-hidden="true">
                ✦ Signature
              </span>
              <span className="ml-2 text-xs text-muted-foreground">· {m.desc}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Interface Mode</SelectLabel>
          {VISUAL_UI_MODES.filter((m) => !m.signature).map((m) => (
            <SelectItem key={m.id} value={m.id} data-ui-option={m.id}>
              <span className="font-medium">{m.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">· {m.desc}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
