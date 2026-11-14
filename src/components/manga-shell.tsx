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
 * Serialized Weekly Manga Anthology Shell.
 * Replaces floating pill bars with a high-contrast Table of Contents masthead,
 * stamped chapter index markers, brush-stroke active highlights, and Japanese marginalia.
 */
export function MangaShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const hud = useNavMode() === "hud";
  const isStaff = useIsStaff();
  const enabled = useAnimationsEnabled();
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

  const primaryTabs = [...TABS, ...(isStaff ? [STAFF_TAB] : [])].filter(
    (t) => visibility?.[t.to] ?? true,
  );
  const visibleExtra = EXTRA_CHAPTERS.filter((t) => visibility?.[t.to] ?? true);
  const activePrimaryIdx = tabIndex(pathname, primaryTabs);
  const hideHeader = pathname === "/auth" || pathname === "/install";

  return (
    <div className="manga-shell relative min-h-dvh bg-background text-foreground selection:bg-foreground selection:text-background">
      <MangaCornerMarks />

      {/* Vertical Japanese marginalia strip on wide screens */}
      <aside
        aria-hidden="true"
        className="manga-marginalia pointer-events-none fixed bottom-8 right-2 z-20 hidden select-none flex-col items-center gap-3 xl:flex"
      >
        <span className="h-12 w-[2px] bg-foreground/30" />
        <span
          className="font-serif text-[11px] font-bold tracking-[0.35em] text-foreground/55"
          style={{ writingMode: "vertical-rl" }}
        >
          センチネル公式書庫・週刊アーカイブ
        </span>
        <HankoStamp kanji="記録" tilt={-6} />
      </aside>

      {!hud && !hideHeader && (
        <header
          data-manga-header
          className="manga-masthead sticky top-0 z-40 border-b-[3px] border-foreground bg-card/98 text-foreground"
        >
          {/* Top Serialized Issue Strip */}
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 border-b-2 border-foreground px-3 py-1.5 sm:px-5">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="border-2 border-foreground bg-foreground px-2 py-0.5 font-display text-lg tracking-wider text-background transition-transform group-hover:-rotate-1">
                SCU
              </span>
              <div className="leading-none">
                <span className="block font-display text-base uppercase tracking-wider sm:text-lg">
                  WEEKLY SCU // ISSUE INDEX
                </span>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
                  SENTINELS ARCHIVE · SERIALIZED EDITION · 週刊アーカイブ
                </span>
              </div>
              <HankoStamp kanji="正伝" label="CANON" tilt={-3} className="hidden md:inline-flex" />
            </Link>

            {/* Compact utility stamps */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Theme & Visual Style"
                title="Appearance & Style"
                onClick={() => setThemeOpen(true)}
                className="manga-ink-btn inline-flex items-center gap-1.5 border-2 border-foreground bg-background px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-foreground hover:text-background"
              >
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">INK &amp; STYLE</span>
              </button>
              <button
                type="button"
                aria-label={enabled ? "Pause page ink motion" : "Enable page ink motion"}
                aria-pressed={enabled}
                onClick={() => setAnimationsEnabled(!enabled)}
                className={`manga-ink-btn hidden items-center gap-1 border-2 border-foreground px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider sm:inline-flex ${
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
                className={`manga-ink-btn inline-flex items-center gap-1 border-2 border-foreground px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                  pathname === "/profile"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-foreground hover:text-background"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden md:inline">ID</span>
              </Link>
              <button
                type="button"
                aria-label={tocOpen ? "Close full chapter index" : "Open full chapter index"}
                aria-expanded={tocOpen}
                onClick={() => setTocOpen((v) => !v)}
                className={`manga-ink-btn inline-flex items-center gap-1 border-2 border-foreground px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider ${
                  tocOpen
                    ? "bg-[#b91c1c] text-white border-[#b91c1c] dark:bg-[#dc2626] dark:border-[#dc2626]"
                    : "bg-foreground text-background hover:bg-[#b91c1c]"
                }`}
              >
                {tocOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
                <span>TOC</span>
              </button>
            </div>
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
                  className={`manga-chapter-tab relative flex shrink-0 flex-col justify-center border-r border-foreground/25 px-3 py-2 text-left transition-colors last:border-r-0 ${
                    active
                      ? "manga-chapter-active bg-foreground text-background"
                      : "text-foreground hover:bg-secondary/80"
                  }`}
                >
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                      active ? "text-[#fca5a5]" : "text-muted-foreground"
                    }`}
                  >
                    {chapterCode(idx)} //
                  </span>
                  <span className="font-display text-base uppercase leading-none tracking-wider">
                    {short}
                  </span>
                  {active && (
                    <span
                      aria-hidden="true"
                      className="manga-brush-underline absolute inset-x-0 bottom-0 h-[4px] bg-[#dc2626]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Expandable Full Anthology Table of Contents Drawer */}
          {tocOpen && (
            <div
              className="manga-halftone border-t-[3px] border-foreground bg-card px-4 py-4 shadow-[0_8px_0_rgba(0,0,0,0.9)]"
              role="region"
              aria-label="Complete anthology directory"
            >
              <div className="mx-auto max-w-7xl">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4" />
                    <h2 className="font-display text-xl uppercase tracking-wider">
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
                        className={`flex flex-col justify-between border-2 border-foreground p-2.5 transition-transform hover:-translate-y-0.5 ${
                          active ? "bg-foreground text-background" : "bg-background text-foreground"
                        }`}
                        style={{ boxShadow: "3px 3px 0 currentColor" }}
                      >
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                          {chapterCode(idx)}
                        </span>
                        <span className="mt-1 font-display text-lg uppercase leading-tight">
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
                        className={`flex flex-col justify-between border-2 border-foreground p-2.5 transition-transform hover:-translate-y-0.5 ${
                          active ? "bg-[#b91c1c] text-white" : "bg-secondary/60 text-foreground"
                        }`}
                        style={{ boxShadow: "3px 3px 0 currentColor" }}
                      >
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                          {t.ch}
                        </span>
                        <span className="mt-1 font-display text-lg uppercase leading-tight">
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
