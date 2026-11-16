import type { ReactNode } from "react";
import { GenreCardFrame } from "@/components/genre-decorations";
import { HankoStamp } from "@/components/manga-emblem";
import { useActiveGenre } from "@/hooks/use-ui-mode";
import { MANGA_SCALE } from "@/lib/manga-scale";

/* Lightweight anthology layout primitives. Kept separate from manga-view so
   routes that only need a banner or panel do not download the full dossier code. */

export function MangaChapterBanner({
  chapter,
  jp,
  title,
  subtitle,
  stamp = "正典",
  actions,
}: {
  chapter: string;
  jp?: string;
  title: string;
  subtitle?: string;
  stamp?: string;
  actions?: ReactNode;
}) {
  const activeGenre = useActiveGenre() ?? "manga-ink";
  return (
    <header
      className={`manga-panel manga-halftone-edge ${MANGA_SCALE.banner} relative mb-5 border-2 border-border bg-card`}
    >
      <GenreCardFrame theme={activeGenre} />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border border-border bg-foreground px-2 py-0.5 font-mono ${MANGA_SCALE.meta} font-bold uppercase tracking-[0.2em] text-background`}
            >
              {chapter}
            </span>
            {jp && (
              <span className="font-serif text-xs font-bold tracking-[0.18em] text-muted-foreground">
                {jp}
              </span>
            )}
            <HankoStamp kanji={stamp} tilt={-4} />
          </div>
          <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-2 break-words uppercase`}>
            {title}
          </h1>
          {subtitle && (
            <p
              className={`mt-1.5 max-w-2xl border-l-2 border-primary pl-2.5 ${MANGA_SCALE.body} font-medium text-muted-foreground`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function MangaPanel({
  children,
  caption,
  badge,
  halftone = false,
  diagonal = false,
  className = "",
}: {
  children: ReactNode;
  caption?: string;
  badge?: string;
  halftone?: boolean;
  diagonal?: boolean;
  className?: string;
}) {
  const activeGenre = useActiveGenre() ?? "manga-ink";
  return (
    <section
      className={`manga-panel ${MANGA_SCALE.card} relative border-2 border-border bg-card ${
        halftone ? "manga-halftone" : ""
      } ${diagonal ? "manga-panel-slant" : ""} ${className}`}
    >
      <GenreCardFrame theme={activeGenre} compact />
      {(caption || badge) && (
        <div className="relative mb-2.5 flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
          {caption && (
            <span
              className={`font-display ${MANGA_SCALE.sectionTitle} uppercase tracking-wider text-foreground`}
            >
              {caption}
            </span>
          )}
          {badge && (
            <span
              className={`border border-border bg-foreground px-1.5 py-0.5 font-mono ${MANGA_SCALE.meta} font-bold uppercase tracking-widest text-background`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}

export function MangaSpeechBubble({
  speaker,
  children,
  tail = "left",
  className = "",
}: {
  speaker?: string;
  children: ReactNode;
  tail?: "left" | "right" | "none";
  className?: string;
}) {
  return (
    <div
      className={`manga-speech-bubble relative border-2 border-border bg-card p-3.5 text-card-foreground ${
        tail === "left" ? "manga-tail-left" : tail === "right" ? "manga-tail-right" : ""
      } ${className}`}
    >
      {speaker && (
        <span className="mb-1.5 inline-block border border-border bg-foreground px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-background">
          {speaker}
        </span>
      )}
      <div className="text-xs leading-relaxed sm:text-sm">{children}</div>
    </div>
  );
}

export function MangaThoughtBox({
  label = "INTERNAL LOG",
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`manga-thought-box relative border-2 border-dashed border-border/80 bg-secondary/75 p-3.5 text-foreground ${className}`}
    >
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        <span>◎</span>
        <span>{label}</span>
      </div>
      <div className="text-xs italic leading-relaxed sm:text-sm">{children}</div>
    </div>
  );
}

export function MangaCaptionBox({
  kicker,
  children,
  inverted = false,
  className = "",
}: {
  kicker?: string;
  children: ReactNode;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border border-border p-2.5 ${
        inverted ? "bg-foreground text-background" : "bg-background text-foreground"
      } ${className}`}
      style={{ boxShadow: "2px 2px 0 currentColor" }}
    >
      {kicker && (
        <p className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-75">
          {kicker}
        </p>
      )}
      <div className="text-xs leading-snug">{children}</div>
    </div>
  );
}
