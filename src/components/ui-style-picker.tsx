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
    <div role="group" aria-label="UI Style" className="flex flex-wrap gap-1">
      {VISUAL_UI_MODES.map((m) => (
        <Button
          key={m.id}
          size="sm"
          title={m.desc}
          variant={activeMode === m.id ? "secondary" : "ghost"}
          aria-pressed={activeMode === m.id}
          onClick={() => handleSelect(m.id)}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
}
