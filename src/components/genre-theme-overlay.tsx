import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Palette, Sparkles } from "lucide-react";
import { useActiveGenre, useIsManga } from "@/hooks/use-ui-mode";
import { GENRE_THEMES, getGenreThemeMeta, setGenreTheme } from "@/lib/genre-themes";
import { useMangaSfx } from "@/hooks/use-manga-sfx";

/**
 * Floating UI overlay exclusive to Manga UI mode that lets readers dynamically
 * toggle `data-genre-theme` on `<html>` (even in HUD mode) with smooth palette
 * & backdrop blending and Manga SFX feedback.
 */
export function GenreThemeOverlay() {
  const isManga = useIsManga();
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const activeMeta = getGenreThemeMeta(activeGenre);
  const { triggerInteractionSfx } = useMangaSfx();
  const [open, setOpen] = useState(false);

  if (!isManga) return null;

  return (
    <div
      data-genre-overlay="true"
      className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2"
    >
      {open && (
        <section
          role="region"
          aria-label="Genre theme switcher overlay"
          className="manga-panel w-[min(320px,calc(100vw-2rem))] rounded-lg border-2 border-border bg-card/95 p-2.5 text-card-foreground shadow-xl backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
                GENRE ENGINE // 様式切替
              </span>
            </div>
            <span className="font-mono text-[9px] uppercase text-muted-foreground">
              {activeMeta.shortLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {GENRE_THEMES.map((g) => {
              const selected = activeGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  data-genre-option={g.id}
                  aria-pressed={selected}
                  onClick={(ev) => {
                    setGenreTheme(g.id);
                    triggerInteractionSfx("switch-mode", ev);
                  }}
                  className={`flex items-center justify-between gap-1.5 rounded border px-2 py-1.5 text-left transition ${
                    selected
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_28%,transparent)]"
                      : "border-border/50 bg-background/75 text-foreground hover:border-primary/70 hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full border border-foreground/30"
                      style={{
                        background: `linear-gradient(135deg, ${g.swatches[1]} 0%, ${g.swatches[2]} 100%)`,
                      }}
                    />
                    <div className="min-w-0 leading-tight">
                      <span className="block truncate font-mono text-[10px] font-bold uppercase">
                        {g.shortLabel}
                      </span>
                      <span className="block truncate text-[9px] text-muted-foreground">
                        {g.jpLabel}
                      </span>
                    </div>
                  </div>
                  {selected && <Check className="h-3 w-3 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label="Toggle genre theme overlay"
        aria-expanded={open}
        onClick={(ev) => {
          triggerInteractionSfx("click", ev);
          setOpen((v) => !v);
        }}
        className="manga-ink-btn inline-flex items-center gap-2 rounded-md border-2 border-border bg-card/95 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground shadow-lg backdrop-blur-md hover:border-primary"
      >
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full border border-foreground/35"
          style={{
            background: `linear-gradient(135deg, ${activeMeta.swatches[1]} 0%, ${activeMeta.swatches[2]} 100%)`,
          }}
        />
        <Palette className="h-3.5 w-3.5 text-primary" />
        <span>THEME: {activeMeta.shortLabel}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
}
