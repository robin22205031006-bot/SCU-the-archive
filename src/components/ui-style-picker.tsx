import { Button } from "@/components/ui/button";
import { useOptionalUiMode, VISUAL_UI_MODES, type VisualUiMode } from "@/hooks/use-ui-mode";
import { setUiStyle, useUiStyle } from "@/lib/ui-style";

export function UiStylePicker() {
  const ctx = useOptionalUiMode();
  const legacyStyle = useUiStyle();
  const activeMode: VisualUiMode = ctx ? ctx.mode : legacyStyle;

  const handleSelect = (modeId: VisualUiMode) => {
    if (ctx) {
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
            onClick={() => handleSelect(m.id)}
            className={
              activeMode === "manga"
                ? `rounded-none border-2 border-foreground font-mono text-xs uppercase tracking-wider ${
                    selected
                      ? "bg-foreground text-background shadow-[3px_3px_0_#b91c1c]"
                      : "bg-card text-foreground hover:bg-secondary"
                  }`
                : undefined
            }
          >
            {m.label}
          </Button>
        );
      })}
    </div>
  );
}
