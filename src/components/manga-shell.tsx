import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, Palette, Sparkles, User, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";
import { TABS, STAFF_TAB, tabIndex } from "@/lib/nav";
import { useNavMode } from "@/lib/nav-mode";
import { useAnimationsEnabled, setAnimationsEnabled } from "@/lib/animations";
import { ThemeDrawer } from "@/components/theme-drawer";
import { HankoStamp, MangaCornerMarks } from "@/components/manga-emblem";
import { useActiveGenre } from "@/hooks/use-ui-mode";
import { GENRE_THEMES, getGenreThemeMeta, setGenreTheme } from "@/lib/genre-themes";
import { MangaSfxLayer } from "@/components/manga-sfx";
import { useMangaSfx } from "@/hooks/use-manga-sfx";
import { GenreBackdrop } from "@/components/genre-backdrop";
import { GenreCardFrame } from "@/components/genre-decorations";
import { GenreThemeOverlay } from "@/components/genre-theme-overlay";

const EXTRA_CHAPTERS = [
  { to: "/series", ch: "CH. 11", label: "Sagas" },
  { to: "/orgs", ch: "CH. 12", label: "Factions" },
  { to: "/timeline", ch: "CH. 13", label: "Chronicle" },
  { to: "/graph", ch: "CH. 14", label: "Relations" },
  { to: "/clans", ch: "CH. 15", label: "Bloodlines" },
  { to: "/atlas", ch: "CH. 16", label: "World Atlas" },
] as const;

function chapterCode(idx: number): string {
  return `CH. ${String(idx + 1).padStart(2, "0")}`;
}

const SHORT_TAB_NAMES: Record<string, string> = {
  "/": "OVERVIEW",
  "/characters": "DOSSIERS",
  "/abilities": "POWERS",
  "/arsenal": "ARSENAL",
  "/archive": "ARCHIVE",
  "/story": "STORY",
  "/map": "ATLAS",
  "/fandom": "FANDOM",
  "/ai": "AI BOX",
  "/vault": "VAULT",
  "/admin": "EDITOR",
};

/**
 * Serialized Anthology & Multi-Genre Shell.
 * Features compact proportions aligned with Classic/Nexus, dynamic CSS Manga SFX pop-ups,
 * and instant switching across Manga Ink, Shonen, Fantasy, Isekai, Dark Fantasy, Ghibli,
 * Xianxia, and Cyber Anime aesthetic themes.
 */
export function MangaShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const hud = useNavMode() === "hud";
  const isStaff = useIsStaff();
  const enabled = useAnimationsEnabled();
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const activeMeta = getGenreThemeMeta(activeGenre);
  const { triggerInteractionSfx } = useMangaSfx();
  const [tocOpen, setTocOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const { data: visibility } = useQuery({
    queryKey: ["app-settings", "nav_visibility"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "nav_visibility")
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as Record<string, boolean>;
    },
  });

  useEffect(() => {
    setTocOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset["motion"] = enabled ? "on" : "off";
    return () => {
      delete document.documentElement.dataset["motion"];
    };
  }, [enabled]);

  const primaryTabs = [...TABS, ...(isStaff ? [STAFF_TAB] : [])].filter(
    (t) => visibility?.[t.to] ?? true,
  );
  const visibleExtra = EXTRA_CHAPTERS.filter((t) => visibility?.[t.to] ?? true);
  const activePrimaryIdx = tabIndex(pathname, primaryTabs);
  const hideHeader = pathname === "/auth" || pathname === "/install";

  return (
    <div
      data-motion={enabled ? "on" : "off"}
      className="manga-shell relative min-h-dvh text-foreground selection:bg-foreground selection:text-background"
    >
      <GenreBackdrop />
      <MangaSfxLayer />
      <GenreThemeOverlay />
      {activeGenre === "manga-ink" && <MangaCornerMarks />}

      {/* Vertical Japanese marginalia strip on wide screens */}
      <aside
        aria-hidden="true"
        className="manga-marginalia pointer-events-none fixed bottom-8 right-2 z-20 hidden select-none flex-col items-center gap-3 xl:flex"
      >
        <span className="h-10 w-[1.5px] bg-foreground/30" />
        <span
          className="font-serif text-[10px] font-bold tracking-[0.32em] text-foreground/55"
          style={{ writingMode: "vertical-rl" }}
        >
          センチネル公式書庫・{activeMeta.jpLabel}
        </span>
        <HankoStamp kanji="記録" tilt={-6} />
      </aside>

      {!hud && !hideHeader && (
        <header
          data-manga-header
          className="manga-masthead sticky top-0 z-40 border-b-2 border-border bg-card/95 text-foreground backdrop-blur-sm"
        >
          {/* Top Serialized Issue Strip */}
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 border-b border-border/50 px-3 py-1 sm:px-5">
            <Link to="/" className="group flex items-center gap-2">
              <span className="border-2 border-foreground bg-foreground px-1.5 py-0.5 font-display text-sm tracking-wider text-background transition-transform group-hover:-rotate-1">
                SCU
              </span>
              <div className="leading-none">
                <span className="block font-display text-sm uppercase tracking-wider sm:text-base">
                  WEEKLY SCU // ISSUE INDEX
                </span>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
                  SENTINELS ARCHIVE · {activeMeta.shortLabel.toUpperCase()} EDITION ·{" "}
                  {activeMeta.jpLabel}
                </span>
              </div>
              <HankoStamp kanji="正伝" label="CANON" tilt={-3} className="hidden md:inline-flex" />
            </Link>

            {/* Compact utility stamps */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Theme & Visual Style"
                title="Appearance & Genre Themes"
                onClick={() => setThemeOpen(true)}
                className="manga-ink-btn inline-flex items-center gap-1.5 border border-border bg-background px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Palette className="h-3 w-3" />
                <span className="hidden sm:inline">{activeMeta.shortLabel}</span>
              </button>
              <button
                type="button"
                aria-label={enabled ? "Pause page ink motion" : "Enable page ink motion"}
                aria-pressed={enabled}
                onClick={(ev) => {
                  const next = !enabled;
                  setAnimationsEnabled(next);
                  if (next) triggerInteractionSfx("switch-mode", ev);
                }}
                className={`manga-ink-btn hidden items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider sm:inline-flex ${
                  enabled ? "bg-foreground text-background" : "bg-background text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>FX:{enabled ? "ON" : "OFF"}</span>
              </button>
              <Link
                to="/profile"
                aria-label="Profile"
                title="Reader Profile"
                className={`manga-ink-btn inline-flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  pathname === "/profile"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                <User className="h-3 w-3" />
                <span className="hidden md:inline">ID</span>
              </Link>
              <button
                type="button"
                aria-label={tocOpen ? "Close full chapter index" : "Open full chapter index"}
                aria-expanded={tocOpen}
                onClick={(ev) => {
                  triggerInteractionSfx("click", ev);
                  setTocOpen((v) => !v);
                }}
                className={`manga-ink-btn inline-flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  tocOpen
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {tocOpen ? <X className="h-3 w-3" /> : <Menu className="h-3 w-3" />}
                <span>TOC</span>
              </button>
            </div>
          </div>

          {/* Multi-Genre & Anime Style Quick Ribbon */}
          <div
            aria-label="Genre theme selector"
            className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto border-b border-border/35 bg-secondary/45 px-3 py-1 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              STYLE:
            </span>
            {GENRE_THEMES.map((g) => {
              const selected = activeGenre === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={(ev) => {
                    setGenreTheme(g.id);
                    triggerInteractionSfx("switch-mode", ev);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/50 bg-background/80 text-foreground hover:border-primary"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full border border-foreground/30"
                    style={{ background: g.swatches[1] }}
                  />
                  <span>{g.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Primary Chapter TOC Navigation Ribbon */}
          <nav
            aria-label="Manga chapter table of contents"
            className="mx-auto flex max-w-7xl items-stretch overflow-x-auto px-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {primaryTabs.map((t, idx) => {
              const active = idx === activePrimaryIdx;
              const short = SHORT_TAB_NAMES[t.to] ?? t.label.toUpperCase();
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  preload="intent"
                  aria-current={active ? "page" : undefined}
                  className={`manga-chapter-tab relative flex shrink-0 flex-col justify-center border-r border-border/25 px-2.5 py-1.5 text-left transition-colors last:border-r-0 ${
                    active
                      ? "manga-chapter-active bg-foreground text-background"
                      : "text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {chapterCode(idx)} //
                  </span>
                  <span className="font-display text-xs uppercase leading-tight tracking-wider sm:text-sm">
                    {short}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="manga-brush-underline absolute inset-x-0 bottom-0 h-[3px] bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Expandable Full Anthology Table of Contents Drawer */}
          {tocOpen && (
            <div
              className="manga-halftone border-t-2 border-border bg-card px-4 py-3 shadow-lg"
              role="region"
              aria-label="Complete anthology directory"
            >
              <div className="mx-auto max-w-7xl">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4" />
                    <h2 className="font-display text-base uppercase tracking-wider">
                      COMPLETE ARCHIVE TABLE OF CONTENTS // 全目次
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    SELECT CHAPTER STAMP TO JUMP
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {primaryTabs.map((t, idx) => {
                    const active = pathname === t.to;
                    return (
                      <Link
                        key={t.to}
                        to={t.to}
                        onClick={() => setTocOpen(false)}
                        className={`relative flex flex-col justify-between border border-border p-2 transition-transform hover:-translate-y-0.5 ${
                          active ? "bg-foreground text-background" : "bg-background text-foreground"
                        }`}
                      >
                        <GenreCardFrame theme={activeGenre} compact />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-80">
                          {chapterCode(idx)}
                        </span>
                        <span className="mt-0.5 font-display text-sm uppercase leading-tight">
                          {t.label}
                        </span>
                      </Link>
                    );
                  })}
                  {visibleExtra.map((t) => {
                    const active = pathname === t.to;
                    return (
                      <Link
                        key={t.to}
                        to={t.to}
                        onClick={() => setTocOpen(false)}
                        className={`relative flex flex-col justify-between border border-border p-2 transition-transform hover:-translate-y-0.5 ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/60 text-foreground"
                        }`}
                      >
                        <GenreCardFrame theme={activeGenre} compact />
                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-80">
                          {t.ch}
                        </span>
                        <span className="mt-0.5 font-display text-sm uppercase leading-tight">
                          {t.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      <ThemeDrawer open={themeOpen} onOpenChange={setThemeOpen} />

      <div data-manga-page={pathname.slice(1) || "home"} className="manga-page relative z-[1]">
        {children}
      </div>
    </div>
  );
}
