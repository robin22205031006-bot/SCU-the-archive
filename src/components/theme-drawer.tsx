import { useState } from "react";
import { Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppearance } from "@/hooks/use-appearance";
import { useNavMode, setNavMode, type NavMode } from "@/lib/nav-mode";
import { THEMES } from "@/lib/themes";
import { UiStylePicker } from "@/components/ui-style-picker";
import { Button } from "@/components/ui/button";
import { useUiStyle } from "@/lib/ui-style";
import { NEXUS_THEMES } from "@/lib/nexus-fx";
import { useNexusTheme, setNexusTheme } from "@/hooks/use-nexus-theme";
import { NexusPresentationEditor } from "@/components/nexus-presentation-editor";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNexusEmblemMotion, setNexusEmblemMotion } from "@/hooks/use-nexus-emblem-motion";

export function ThemeDrawer({
  open,
  onOpenChange,
}: { open?: boolean; onOpenChange?: (o: boolean) => void } = {}) {
  const { theme, setTheme, zoom, scaleIndex } = useAppearance();
  const nexus = useUiStyle() === "nexus";
  const navigationMode = useNavMode();
  const nexusTheme = useNexusTheme();
  const emblemMotion = useNexusEmblemMotion();
  const [tab, setTab] = useState<"live" | "plain">("live");
  const liveThemes = THEMES.filter((t) => t.live);
  const plainThemes = THEMES.filter((t) => !t.live);
  const visible = tab === "live" ? liveThemes : plainThemes;
  return (
    <Sheet {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      <SheetTrigger asChild>
        <button
          aria-label="Appearance"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-accent hover:glow-ring"
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Appearance</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <span className="mr-auto text-sm text-muted-foreground">UI Style</span>
          <UiStylePicker />
        </div>
        {nexus ? <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {NEXUS_THEMES.map(t => <Button key={t.id} variant="ghost" aria-pressed={nexusTheme === t.id} onClick={() => setNexusTheme(t.id)} className={`nexus-theme-option flex h-auto min-h-32 flex-col gap-2 whitespace-normal rounded-lg border p-3 text-center ${nexusTheme === t.id ? "border-accent bg-accent/10" : "border-border"}`}><span aria-hidden className="nexus-theme-swatch h-14 w-14 rounded-full" style={{ background: `radial-gradient(circle at 32% 28%, var(--fx-highlight), var(--fx-${t.id}) 64%)` }} /><span>{t.label}</span></Button>)}
        </div> : <><div className="flex gap-1.5 px-4 pt-1">
          {(
            [
              ["live", "Live 3D"],
              ["plain", "Plain"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs ${tab === t ? "bg-accent text-accent-foreground" : "border text-muted-foreground"}`}
            >
              {label} ({t === "live" ? liveThemes.length : plainThemes.length})
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {visible.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs transition ${theme === t.id ? "border-accent glow-ring" : "hover:border-foreground/30"}`}
            >
              <span
                className="h-8 w-8 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(oklch(0.72 ${t.chroma} ${t.hue}), oklch(0.65 ${t.chroma} ${t.glow}), oklch(0.2 0.02 ${t.hue}), oklch(0.72 ${t.chroma} ${t.hue}))`,
                }}
              />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        </>}
        {nexus && <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-4">
          <Label htmlFor="nexus-emblem-motion">Emblem motion</Label>
          <Select value={emblemMotion} onValueChange={value => { if (value === "system" || value === "static") setNexusEmblemMotion(value); }}>
            <SelectTrigger id="nexus-emblem-motion" className="w-48 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Follow device</SelectItem>
              <SelectItem value="static">Always static</SelectItem>
            </SelectContent>
          </Select>
        </div>}
        {nexus && <NexusPresentationEditor />}
        <div className="flex items-center gap-3 px-4 pb-6 text-sm">
          <span className="text-muted-foreground">Text size</span>
          <button
            className="rounded-full border px-3 py-1"
            onClick={() => zoom(-1)}
            aria-label="Zoom out"
          >
            A−
          </button>
          <span className="w-8 text-center text-xs">{scaleIndex + 1}/6</span>
          <button
            className="rounded-full border px-3 py-1"
            onClick={() => zoom(1)}
            aria-label="Zoom in"
          >
            A+
          </button>
        </div>
        {<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 pb-6 pt-4 text-sm">
          <span className="text-muted-foreground">Navigation mode</span>
          <div className="flex gap-1.5">
            {(
              [
                ["standard", "Header"],
                ["hud", "HUD"],
              ] as [NavMode, string][]
            ).map(([m, label]) => (
              <Button variant="ghost" size="sm"
                key={m}
                onClick={() => setNavMode(m)}
                className={`rounded-full px-3 py-1 text-xs ${navigationMode === m ? "bg-accent text-accent-foreground" : "border text-muted-foreground"}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>}
      </SheetContent>
    </Sheet>
  );
}
