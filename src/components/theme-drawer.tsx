import { useState } from "react";
import { Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppearance } from "@/hooks/use-appearance";
import { useNavMode, setNavMode, type NavMode } from "@/lib/nav-mode";
import { THEMES } from "@/lib/themes";
import { UiStylePicker } from "@/components/ui-style-picker";
import { Button } from "@/components/ui/button";
import { useUiStyle } from "@/lib/ui-style";
import { useActiveGenre, useVisualMode } from "@/hooks/use-ui-mode";
import { MANGA_SUBTHEMES, useOptionalThemeContext } from "@/context/ThemeContext";
import { useSensoryFeedback } from "@/hooks/use-sensory-feedback";
import { GENRE_THEMES, setGenreTheme } from "@/lib/genre-themes";
import { NEXUS_THEMES } from "@/lib/nexus-fx";
import {
  useNexusTheme,
  setNexusTheme,
  useNexus3dFxEnabled,
  setNexus3dFxEnabled,
} from "@/hooks/use-nexus-theme";
import { NexusPresentationEditor } from "@/components/nexus-presentation-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNexusEmblemMotion, setNexusEmblemMotion } from "@/hooks/use-nexus-emblem-motion";
import { useNexusAdvancedFx, setNexusAdvancedFx } from "@/hooks/use-nexus-advanced-fx";
import {
  setNexusWallpaperChoice,
  setNexusWallpaperPlayback,
  useActiveNexusWallpaper,
} from "@/hooks/use-nexus-wallpaper";
import { Switch } from "@/components/ui/switch";

export function ThemeDrawer({
  open,
  onOpenChange,
}: { open?: boolean; onOpenChange?: (o: boolean) => void } = {}) {
  const { theme, setTheme, zoom, scaleIndex, dark, setDark } = useAppearance();
  const nexus = useUiStyle() === "nexus";
  const visualMode = useVisualMode();
  const activeGenre = useActiveGenre();
  const themeCtx = useOptionalThemeContext();
  const { playSwitch } = useSensoryFeedback();
  const navigationMode = useNavMode();
  const nexusTheme = useNexusTheme();
  const fx3dEnabled = useNexus3dFxEnabled();
  const emblemMotion = useNexusEmblemMotion();
  const advancedFx = useNexusAdvancedFx();
  const { wallpapers, wallpaper: activeWallpaper, playback, choice } = useActiveNexusWallpaper();
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
      <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Appearance</SheetTitle>
        </SheetHeader>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <span className="mr-auto text-sm text-muted-foreground">UI Style</span>
          <UiStylePicker />
        </div>
        {visualMode === "manga" && (
          <section
            aria-label="Genre and anime visual themes"
            className="border-b border-border px-4 py-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Genre &amp; Anime Aesthetics</h3>
                <p className="text-xs text-muted-foreground">
                  Each style applies unique color logic, card filigree, portrait bezels, dossier
                  arrangements &amp; ambient visualizations.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={!dark ? "secondary" : "ghost"}
                  onClick={() => setDark(false)}
                >
                  Daylight
                </Button>
                <Button
                  size="sm"
                  variant={dark ? "secondary" : "ghost"}
                  onClick={() => setDark(true)}
                >
                  Dark Edition
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {GENRE_THEMES.map((g) => {
                const selected = activeGenre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setGenreTheme(g.id);
                      playSwitch();
                    }}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left text-xs transition ${
                      selected
                        ? "border-accent bg-accent/10 glow-ring"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{g.shortLabel}</span>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {g.jpLabel}
                      </span>
                    </div>
                    <div className="my-2 flex items-center gap-1.5">
                      {g.swatches.map((hex, i) => (
                        <span
                          key={i}
                          className="h-3.5 w-3.5 rounded-full border border-foreground/20"
                          style={{ background: hex }}
                        />
                      ))}
                      <span className="ml-auto font-mono text-[9px] uppercase text-muted-foreground">
                        {g.portraitShape.replace("-", " ")}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {g.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
            {themeCtx && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
                <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sub-Engine:
                </span>
                {MANGA_SUBTHEMES.map((sub) => {
                  const selected = themeCtx.mangaSubTheme === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        themeCtx.setMangaSubTheme(sub.id);
                        playSwitch();
                      }}
                      className={`rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase transition ${
                        selected
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {nexus ? (
          <section aria-label="Nexus 3D element wallpapers" className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">3D Element Wallpaper</h3>
                <p className="text-xs text-muted-foreground">
                  3D ambient simulation (Pyre, Tide, Voltage) — turn off to show only your Nexus
                  wallpaper or clean dark backdrop.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="nexus-3d-wallpaper-toggle"
                  className="text-xs text-muted-foreground"
                >
                  {fx3dEnabled ? "On" : "Off"}
                </Label>
                <Switch
                  id="nexus-3d-wallpaper-toggle"
                  aria-label="3D element wallpaper"
                  checked={fx3dEnabled}
                  onCheckedChange={setNexus3dFxEnabled}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                variant="ghost"
                aria-pressed={!fx3dEnabled}
                onClick={() => setNexus3dFxEnabled(false)}
                className={`nexus-theme-option flex h-auto min-h-32 flex-col gap-2 whitespace-normal rounded-lg border p-3 text-center ${!fx3dEnabled ? "border-accent bg-accent/10" : "border-border"}`}
              >
                <span
                  aria-hidden
                  className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-border/80 bg-background/60 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Off
                </span>
                <span>3D Wallpaper Off</span>
              </Button>
              {NEXUS_THEMES.map((t) => (
                <Button
                  key={t.id}
                  variant="ghost"
                  aria-pressed={fx3dEnabled && nexusTheme === t.id}
                  onClick={() => {
                    setNexus3dFxEnabled(true);
                    setNexusTheme(t.id);
                  }}
                  className={`nexus-theme-option flex h-auto min-h-32 flex-col gap-2 whitespace-normal rounded-lg border p-3 text-center ${fx3dEnabled && nexusTheme === t.id ? "border-accent bg-accent/10" : "border-border"}`}
                >
                  <span
                    aria-hidden
                    className="nexus-theme-swatch nexus-theme-swatch-anim h-14 w-14 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, var(--fx-highlight), var(--fx-${t.id}) 52%, color-mix(in oklab, var(--fx-${t.id}) 30%, black) 100%)`,
                    }}
                  />
                  <span>{t.label}</span>
                </Button>
              ))}
            </div>
          </section>
        ) : (
          <>
            <div className="flex gap-1.5 px-4 pt-1">
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
          </>
        )}
        {nexus && (
          <section aria-label="Nexus wallpaper themes" className="border-t border-border px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium">Nexus Wallpaper Theme</h3>
                <p className="text-xs text-muted-foreground">
                  Applied only in Nexus UI mode ({wallpapers.length} themes available).
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
                {(["live", "static"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setNexusWallpaperPlayback(mode)}
                    aria-pressed={playback === mode}
                    className={`rounded-full px-2.5 py-1 capitalize transition ${
                      playback === mode
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
              <button
                type="button"
                aria-pressed={activeWallpaper === null}
                onClick={() => setNexusWallpaperChoice("none")}
                className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left text-xs transition ${
                  activeWallpaper === null || choice === "none"
                    ? "border-accent bg-accent/10 glow-ring"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div className="mb-2 grid h-16 w-full place-items-center rounded-lg border border-dashed border-border/70 bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  3D FX Only
                </div>
                <span className="font-medium">Default Canvas</span>
                <span className="text-[10px] text-muted-foreground">No wallpaper</span>
              </button>
              {wallpapers.map((wp) => {
                const selected = activeWallpaper?.id === wp.id;
                const thumb = wp.posterUrl || wp.mediaUrl;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setNexusWallpaperChoice(wp.id)}
                    className={`group flex flex-col items-start rounded-xl border p-2 text-left text-xs transition ${
                      selected
                        ? "border-accent bg-accent/10 glow-ring"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <div className="relative mb-2 h-16 w-full overflow-hidden rounded-lg bg-secondary/40">
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute right-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-foreground">
                        {wp.kind}
                      </span>
                    </div>
                    <span className="line-clamp-1 font-medium">{wp.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {nexus && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-4">
            <Label htmlFor="nexus-emblem-motion">Emblem motion</Label>
            <Select
              value={emblemMotion}
              onValueChange={(value) => {
                if (value === "system" || value === "static") setNexusEmblemMotion(value);
              }}
            >
              <SelectTrigger id="nexus-emblem-motion" className="w-48 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Follow device</SelectItem>
                <SelectItem value="static">Always static</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {nexus && (
          <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-4">
            <div>
              <Label htmlFor="nexus-advanced-fx">Advanced ability FX</Label>
              <p className="text-xs text-muted-foreground">
                Tap any ability to play its full animation and upgrades.
              </p>
            </div>
            <Switch
              id="nexus-advanced-fx"
              checked={advancedFx}
              onCheckedChange={setNexusAdvancedFx}
            />
          </div>
        )}
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
        {
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 pb-6 pt-4 text-sm">
            <span className="text-muted-foreground">Navigation mode</span>
            <div className="flex gap-1.5">
              {(
                [
                  ["standard", "Header"],
                  ["hud", "HUD"],
                ] as [NavMode, string][]
              ).map(([m, label]) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={m}
                  onClick={() => setNavMode(m)}
                  className={`rounded-full px-3 py-1 text-xs ${navigationMode === m ? "bg-accent text-accent-foreground" : "border text-muted-foreground"}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        }
      </SheetContent>
    </Sheet>
  );
}
