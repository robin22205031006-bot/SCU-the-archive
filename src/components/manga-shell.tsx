import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, LogIn, Palette, Sparkles, User, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";
import { useOptionalAuth } from "@/context/AuthContext";
import { TABS, STAFF_TAB, tabIndex } from "@/lib/nav";
import { useNavMode } from "@/lib/nav-mode";
import { useAnimationsEnabled, setAnimationsEnabled } from "@/lib/animations";
import { ThemeDrawer } from "@/components/theme-drawer";
import { HeaderThemeSelect } from "@/components/header-theme-select";
import { NexusNavGlyph } from "@/components/nexus-nav-glyph";
import { HankoStamp, MangaCornerMarks } from "@/components/manga-emblem";
import { useActiveGenre } from "@/hooks/use-ui-mode";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { getThemeMotionSpec } from "@/lib/motionVariants";
import { GENRE_THEMES, getGenreThemeMeta, setGenreTheme } from "@/lib/genre-themes";
import { MangaSfxLayer } from "@/components/manga-sfx";
import { useMangaSfx } from "@/hooks/use-manga-sfx";
import { useUIFeedback } from "@/hooks/use-ui-feedback";
import { GenreBackdrop } from "@/components/genre-backdrop";
import { GenreCardFrame } from "@/components/genre-decorations";
import { GenreThemeOverlay } from "@/components/genre-theme-overlay";
import { animateMangaStagger, animateSvgRuneDraw } from "@/lib/anime-animations";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";

const EXTRA_CHAPTERS = [
  { to: "/series", ch: "CH. 11", label: "Sagas" },
  { to: "/orgs", ch: "CH. 12", label: "Factions" },
  { to: "/timeline", ch: "CH. 13", label: "Chronicle" },
  { to: "/graph", ch: "CH. 14", label: "Relations" },
  { to: "/clans", ch: "CH. 15", label: "Bloodlines" },
  { to: "/atlas", ch: "CH. 16", label: "World Atlas" },
  { to: "/explorer", ch: "CH. 17", label: "Lore Explorer" },
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
 * Supports unrolled parchment Scroll Header + jade-teal cloud scrolls in Arcane Botanical Fantasy,
 * GPU-accelerated motion/react page & tab transitions, dynamic Manga SFX pop-ups, and sensory feedback.
 */
export function MangaChrome({ pageRef }: { pageRef?: RefObject<HTMLDivElement | null> }) {
  const { pathname } = useLocation();
  const hud = useNavMode() === "hud";
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isStaff = useIsStaff();
  const enabled = useAnimationsEnabled();
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const themeCtx = useOptionalThemeContext();
  const activeSubTheme =
    themeCtx?.mangaSubTheme ?? (activeGenre === "fantasy" ? "fantasy" : undefined);
  const motionSpec = getThemeMotionSpec(themeCtx?.primarySystem ?? "manga", activeSubTheme);
  const isFantasy = activeGenre === "fantasy";
  const motionActive = enabled && !themeCtx?.isMinimal;

  const activeMeta = getGenreThemeMeta(activeGenre);
  const { triggerInteractionSfx } = useMangaSfx();
  const { triggerNavigation: playSnap, triggerClick: playClick, triggerFeedback } = useUIFeedback();
  const playSwitch = (target?: Parameters<typeof playClick>[0]) =>
    triggerFeedback("switch", target);
  const [tocOpen, setTocOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const { data: visibility } = useQuery({
    queryKey: ["app-settings", "nav_visibility"],
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
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

  useEffect(() => {
    if (!enabled || themeCtx?.isMinimal) return;
    const node = pageRef?.current;
    if (!node) return;
    let staggerHandle: ReturnType<typeof animateMangaStagger> | null = null;
    let runeHandle: ReturnType<typeof animateSvgRuneDraw> | null = null;
    const rafId = requestAnimationFrame(() => {
      staggerHandle = animateMangaStagger(node);
      runeHandle = animateSvgRuneDraw(node);
    });
    return () => {
      cancelAnimationFrame(rafId);
      staggerHandle?.cancel();
      runeHandle?.cancel();
    };
  }, [pathname, activeGenre, activeSubTheme, enabled, themeCtx?.isMinimal, pageRef]);

  const primaryTabs = [...TABS, ...(isStaff ? [STAFF_TAB] : [])].filter(
    (t) => visibility?.[t.to] ?? true,
  );
  const visibleExtra = EXTRA_CHAPTERS.filter((t) => visibility?.[t.to] ?? true);
  const activePrimaryIdx = tabIndex(pathname, primaryTabs);
  const hideHeader = pathname === "/auth" || pathname === "/install";

  return (
    <>
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
          className={`manga-masthead sticky top-0 z-40 transition-colors duration-300 ${
            isFantasy
              ? "fantasy-scroll-banner mx-auto border-b-2 border-[#c5a869] text-[#15221b]"
              : "border-b-2 border-border bg-card text-foreground"
          }`}
        >
          {isFantasy && (
            <>
              {/* Decorative Jade-Teal Cloud Scrolls & Brass Filigree Corners on Scroll Banner */}
              <svg
                aria-hidden="true"
                data-anime-rune="true"
                viewBox="0 0 64 28"
                className="pointer-events-none absolute left-1 top-1 hidden h-6 w-14 text-[#2e5a52] opacity-85 lg:block"
                fill="none"
              >
                <path
                  d="M4 22 C8 10, 22 6, 36 12 C42 8, 52 10, 58 18"
                  stroke="#c5a869"
                  strokeWidth="1.5"
                />
                <path
                  d="M6 18 C12 8, 22 9, 24 16 C28 11, 36 12, 38 19 Z"
                  fill="#2e5a52"
                  fillOpacity="0.85"
                  stroke="#5ce1b8"
                  strokeWidth="0.9"
                />
              </svg>
              <svg
                aria-hidden="true"
                data-anime-rune="true"
                viewBox="0 0 64 28"
                className="pointer-events-none absolute right-1 top-1 hidden h-6 w-14 -scale-x-100 text-[#2e5a52] opacity-85 lg:block"
                fill="none"
              >
                <path
                  d="M4 22 C8 10, 22 6, 36 12 C42 8, 52 10, 58 18"
                  stroke="#c5a869"
                  strokeWidth="1.5"
                />
                <path
                  d="M6 18 C12 8, 22 9, 24 16 C28 11, 36 12, 38 19 Z"
                  fill="#2e5a52"
                  fillOpacity="0.85"
                  stroke="#5ce1b8"
                  strokeWidth="0.9"
                />
              </svg>
            </>
          )}

          {/* Top Serialized Issue Strip */}
          <div
            className={`mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:px-5 ${
              isFantasy ? "border-b border-[#c5a869]/45" : "border-b border-border/50"
            }`}
          >
            <Link
              to="/"
              onClick={(e) => playClick(e)}
              className="group flex min-w-0 items-center gap-2"
            >
              <span
                className={`shrink-0 border-2 px-1.5 py-0.5 font-display text-sm tracking-wider transition-transform group-hover:-rotate-1 ${
                  !themeCtx?.isMinimal ? "studio-bloom-border " : ""
                }${
                  isFantasy
                    ? "border-[#c5a869] bg-[#15221b] text-[#5ce1b8] shadow-[0_0_10px_rgba(92,225,184,0.3)]"
                    : "border-foreground bg-foreground text-background"
                }`}
              >
                SCU
              </span>
              <div className="min-w-0 leading-none">
                <span className="block truncate font-display text-xs uppercase tracking-wider sm:text-base">
                  <span className="sm:hidden">SCU // INDEX</span>
                  <span className="hidden sm:inline">WEEKLY SCU // ISSUE INDEX</span>
                </span>
                <span
                  className={`hidden font-mono text-[9px] uppercase tracking-[0.2em] sm:block ${
                    isFantasy ? "text-[#2e5a52]" : "text-muted-foreground"
                  }`}
                >
                  SENTINELS ARCHIVE · {activeMeta.shortLabel.toUpperCase()} EDITION ·{" "}
                  {activeMeta.jpLabel}
                </span>
              </div>
              <HankoStamp kanji="正伝" label="CANON" tilt={-3} className="hidden md:inline-flex" />
            </Link>

            {/* Compact utility stamps */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <HeaderThemeSelect variant="manga" />
              <button
                type="button"
                aria-label="Theme & Visual Style"
                title="Appearance & Genre Themes"
                onClick={(e) => {
                  playClick(e);
                  setThemeOpen(true);
                }}
                className={`scu-tactile manga-ink-btn inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  isFantasy
                    ? "border-[#c5a869] bg-[#15221b] text-[#f5ebe6] hover:border-[#5ce1b8] hover:text-[#5ce1b8]"
                    : "border-border bg-background text-foreground hover:bg-primary hover:text-primary-foreground"
                }`}
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
                  playSwitch(ev);
                  if (next) triggerInteractionSfx("switch-mode", ev);
                }}
                className={`manga-ink-btn hidden items-center gap-1 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider sm:inline-flex ${
                  isFantasy
                    ? enabled
                      ? "border-[#5ce1b8] bg-[#2e5a52] text-[#f5ebe6] shadow-[inset_0_0_10px_rgba(92,225,184,0.35)]"
                      : "border-[#c5a869] bg-[#f5ebe6] text-[#15221b]"
                    : enabled
                      ? "border-border bg-foreground text-background"
                      : "border-border bg-background text-foreground"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>FX:{enabled ? "ON" : "OFF"}</span>
              </button>
              {user ? (
                <Link
                  to="/profile"
                  onClick={(e) => playClick(e)}
                  aria-label="Profile"
                  title="Reader Profile"
                  className={`manga-ink-btn inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    pathname === "/profile"
                      ? "border-[#c5a869] bg-foreground text-background"
                      : isFantasy
                        ? "border-[#c5a869]/80 bg-[#f5ebe6] text-[#15221b] hover:bg-[#15221b] hover:text-[#5ce1b8]"
                        : "border-border bg-background text-foreground hover:bg-foreground hover:text-background"
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span className="hidden md:inline">ID</span>
                </Link>
              ) : (
                <Link
                  to="/auth"
                  onClick={(e) => playClick(e)}
                  aria-label="Sign in"
                  title="Sign in"
                  className={`manga-ink-btn inline-flex shrink-0 items-center gap-1 whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider sm:px-2.5 ${
                    isFantasy
                      ? "border-[#c5a869] bg-[#15221b] text-[#5ce1b8] hover:bg-[#2e5a52]"
                      : "border-primary bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  <LogIn className="h-3 w-3 shrink-0" />
                  <span>Sign in</span>
                </Link>
              )}
              <button
                type="button"
                aria-label={tocOpen ? "Close full chapter index" : "Open full chapter index"}
                aria-expanded={tocOpen}
                onClick={(ev) => {
                  playSnap(ev);
                  triggerInteractionSfx("click", ev);
                  setTocOpen((v) => !v);
                }}
                className={`manga-ink-btn inline-flex shrink-0 items-center gap-1 whitespace-nowrap border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  isFantasy
                    ? "fantasy-discover-btn border-[#c5a869]"
                    : tocOpen
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {tocOpen ? (
                  <X className="h-3 w-3 shrink-0" />
                ) : (
                  <Menu className="h-3 w-3 shrink-0" />
                )}
                <span>TOC</span>
              </button>
            </div>
          </div>

          {/* Multi-Genre & Anime Style Quick Ribbon */}
          <div
            aria-label="Genre theme selector"
            className={`mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-3 py-1 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              isFantasy
                ? "border-b border-[#c5a869]/40 bg-[#15221b]/95 text-[#f5ebe6]"
                : "border-b border-border/35 bg-secondary/45"
            }`}
          >
            <span
              className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest ${
                isFantasy ? "text-[#c5a869]" : "text-muted-foreground"
              }`}
            >
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
                    playSwitch(ev);
                    triggerTierSwitchHitstop("manga", g.id);
                    triggerInteractionSfx("switch-mode", ev);
                  }}
                  className={`scu-tactile inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    selected
                      ? isFantasy
                        ? "studio-bloom-border border-[#5ce1b8] bg-[#2e5a52] text-[#f5ebe6] shadow-[0_0_10px_rgba(92,225,184,0.35)]"
                        : `${!themeCtx?.isMinimal ? "studio-bloom-border " : ""}border-primary bg-primary text-primary-foreground`
                      : isFantasy
                        ? "border-[#c5a869]/45 bg-[#1a241e] text-[#e6dcc5] hover:border-[#5ce1b8]"
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
                  onClick={(e) => playSnap(e)}
                  className={`manga-chapter-tab relative flex shrink-0 flex-col justify-center px-2.5 py-1.5 text-left transition-colors last:border-r-0 ${
                    isFantasy
                      ? active
                        ? "bg-[#15221b] text-[#5ce1b8] shadow-[inset_0_0_12px_rgba(92,225,184,0.22)]"
                        : "border-r border-[#c5a869]/35 text-[#15221b] hover:bg-[#e6dcc5]"
                      : active
                        ? "manga-chapter-active border-r border-border/25 bg-foreground text-background"
                        : "border-r border-border/25 text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest ${
                      isFantasy
                        ? active
                          ? "text-[#c5a869]"
                          : "text-[#2e5a52]"
                        : active
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}
                  >
                    <span>{chapterCode(idx)} //</span>
                    {isFantasy && active && (
                      <span
                        aria-hidden="true"
                        className="text-[#5ce1b8] drop-shadow-[0_0_4px_#5ce1b8]"
                      >
                        ✦
                      </span>
                    )}
                  </span>
                  <span className="font-display text-xs uppercase leading-tight tracking-wider sm:text-sm">
                    {short}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className={`manga-brush-underline absolute inset-x-0 bottom-0 h-[3px] transition-opacity ${
                        isFantasy ? "bg-[#5ce1b8] shadow-[0_0_10px_#5ce1b8]" : "bg-primary"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Expandable Full Anthology Table of Contents Drawer */}
          <AnimatePresence initial={false}>
            {tocOpen && (
              <motion.div
                key="manga-toc-drawer"
                initial={motionActive ? { opacity: 0, y: -8 } : false}
                animate={{ opacity: 1, y: 0 }}
                {...(motionActive ? { exit: { opacity: 0, y: -6 } } : {})}
                transition={motionActive ? motionSpec.transition : { duration: 0 }}
                className="manga-halftone border-t-2 border-border bg-card px-4 py-3 text-card-foreground shadow-lg"
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
                          onClick={(e) => {
                            playSnap(e);
                            setTocOpen(false);
                          }}
                          className={`scu-tactile relative flex flex-col justify-between border border-border p-2 transition-transform hover:-translate-y-0.5 ${
                            active
                              ? "bg-foreground text-background"
                              : "bg-background text-foreground"
                          }`}
                        >
                          <GenreCardFrame theme={activeGenre} compact />
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-80">
                              {chapterCode(idx)}
                            </span>
                            <NexusNavGlyph to={t.to} className="h-4 w-4 opacity-80" />
                          </div>
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
                          onClick={(e) => {
                            playSnap(e);
                            setTocOpen(false);
                          }}
                          className={`scu-tactile relative flex flex-col justify-between border border-border p-2 transition-transform hover:-translate-y-0.5 ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/60 text-foreground"
                          }`}
                        >
                          <GenreCardFrame theme={activeGenre} compact />
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-80">
                              {t.ch}
                            </span>
                            <NexusNavGlyph to={t.to} className="h-4 w-4 opacity-80" />
                          </div>
                          <span className="mt-0.5 font-display text-sm uppercase leading-tight">
                            {t.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      <ThemeDrawer open={themeOpen} onOpenChange={setThemeOpen} />
    </>
  );
}

export function MangaShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const enabled = useAnimationsEnabled();
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-motion={enabled ? "on" : "off"}
      className="manga-shell relative min-h-dvh text-foreground selection:bg-foreground selection:text-background"
    >
      <MangaChrome pageRef={pageRef} />
      <div
        ref={pageRef}
        data-manga-page={pathname.slice(1) || "home"}
        className="manga-page relative z-[1]"
      >
        {children}
      </div>
    </div>
  );
}
