import { Button } from "@/components/ui/button";
import { useOptionalUiMode, VISUAL_UI_MODES, type VisualUiMode } from "@/hooks/use-ui-mode";
import { useOptionalThemeContext, type PrimarySystem } from "@/context/ThemeContext";
import { useSensoryFeedback } from "@/hooks/use-sensory-feedback";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";
import { setUiStyle, useUiStyle } from "@/lib/ui-style";

export function UiStylePicker() {
  const ctx = useOptionalUiMode();
  const themeCtx = useOptionalThemeContext();
  const legacyStyle = useUiStyle();
  const { playSwitch } = useSensoryFeedback();
  const activeMode: VisualUiMode = themeCtx?.primarySystem ?? (ctx ? ctx.mode : legacyStyle);

  const handleSelect = (modeId: VisualUiMode) => {
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

  return (
    <div role="group" aria-label="UI Style" className="flex flex-wrap gap-1.5">
      {VISUAL_UI_MODES.map((m) => {
        const selected = activeMode === m.id;
        return (
          <Button
            key={m.id}
            size="sm"
            title={m.desc}
            variant={selected ? "secondary" : "ghost"}
            aria-pressed={selected}
            data-signature={m.signature ? "true" : undefined}
            onClick={() => handleSelect(m.id)}
            className={
              activeMode === "manga"
                ? `rounded-none border-2 border-foreground font-mono text-xs uppercase tracking-wider ${
                    selected
                      ? "bg-foreground text-background shadow-[3px_3px_0_#b91c1c]"
                      : "bg-card text-foreground hover:bg-secondary"
                  }`
                : m.signature
                  ? "ui-signature-chip"
                  : undefined
            }
          >
            {m.signature && (
              <span aria-hidden="true" className="ui-signature-star">
                ✦
              </span>
            )}
            {m.label}
          </Button>
        );
      })}
    </div>
  );
}
