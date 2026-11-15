import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { Compass, LogIn, Palette, X, User, Sparkles } from "lucide-react";
import { useIsStaff } from "@/hooks/use-admin";
import { useOptionalAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TABS, STAFF_TAB } from "@/lib/nav";
import { useAnimationsEnabled, setAnimationsEnabled } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { ThemeDrawer } from "@/components/theme-drawer";
import { NexusSectionRail } from "@/components/nexus-section-rail";
import { NexusFxLayer } from "@/components/lazy-three";
import { useNexusTheme, useNexus3dFxEnabled } from "@/hooks/use-nexus-theme";
import { NexusNavGlyph } from "@/components/nexus-nav-glyph";
import { useNavMode } from "@/lib/nav-mode";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";
import { useUIFeedback } from "@/hooks/use-ui-feedback";

export function NexusShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const hud = useNavMode() === "hud";
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isStaff = useIsStaff();
  const enabled = useAnimationsEnabled();
  const moving = useNexusMotion();
  const nexusTheme = useNexusTheme();
  const fx3dEnabled = useNexus3dFxEnabled();
  const anime = useNexusSymbolSettings().anime ?? false;
  const { triggerNavigation: playSnap, triggerClick: playClick } = useUIFeedback({ mode: "nexus" });
  const [open, setOpen] = useState(false);
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
    document.documentElement.dataset["nexusMotion"] = moving ? "on" : "off";
    document.documentElement.dataset["nexusTheme"] = nexusTheme;
    document.documentElement.dataset["nexusAnime"] = anime ? "on" : "off";
    document.documentElement.dataset["nexus3dFx"] = fx3dEnabled ? "on" : "off";
    return () => {
      delete document.documentElement.dataset["nexusMotion"];
      delete document.documentElement.dataset["nexusTheme"];
      delete document.documentElement.dataset["nexusAnime"];
      delete document.documentElement.dataset["nexus3dFx"];
    };
  }, [moving, nexusTheme, anime, fx3dEnabled]);
  useEffect(() => setOpen(false), [pathname]);
  const tabs = [
    ...TABS,
    { to: "/series", label: "Series", icon: "book" },
    { to: "/orgs", label: "Organizations", icon: "book" },
    { to: "/timeline", label: "Timeline", icon: "book" },
    { to: "/graph", label: "Graph", icon: "book" },
    { to: "/clans", label: "Clans", icon: "book" },
    ...(isStaff ? [STAFF_TAB] : []),
  ].filter((t) => visibility?.[t.to] ?? true);
  return (
    <MotionConfig
      reducedMotion={moving ? "user" : "always"}
      transition={{ duration: moving ? 0.55 : 0 }}
    >
      <div className="nexus-shell relative min-h-dvh">
        <NexusFxLayer>{null}</NexusFxLayer>
        {!hud && (
            <header
              className={`nexus-command fixed z-40 flex items-center gap-2 rounded-2xl border border-cyan-400/35 bg-slate-950/75 p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_24px_rgba(56,189,248,0.14)] backdrop-blur-xl ${pathname === "/character" ? "bottom-4 right-4" : "left-4 right-4 top-4"}`}
            >
              {pathname !== "/character" && (
                <Link
                  to="/"
                  onClick={(e) => playClick(e)}
                  className="mr-auto flex items-center gap-2 font-mono text-xs tracking-widest text-cyan-300 transition-colors hover:text-amber-300"
                >
                  <Compass className="h-5 w-5 animate-[spin_25s_linear_infinite]" />
                  <span>SCU / NEXUS</span>
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                  />
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Nexus navigation"
                aria-expanded={open}
                onClick={(e) => {
                  playSnap(e);
                  setOpen((v) => !v);
                }}
                title="Navigation"
                className="hover:bg-nexus-glow/20 hover:text-nexus-fg transition-all"
              >
                {open ? <X /> : <Compass />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Theme"
                title="Theme"
                onClick={(e) => {
                  playClick(e);
                  setThemeOpen(true);
                }}
                className="hover:bg-nexus-glow/20 hover:text-nexus-fg transition-all"
              >
                <Palette />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={enabled ? "Pause animations" : "Enable animations"}
                aria-pressed={enabled}
                title="Animations"
                onClick={(e) => {
                  playClick(e);
                  setAnimationsEnabled(!enabled);
                }}
                className="hover:bg-nexus-glow/20 hover:text-nexus-fg transition-all"
              >
                <Sparkles className={enabled ? "text-nexus-glow" : ""} />
              </Button>
              {user ? (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="hover:bg-nexus-glow/20 hover:text-nexus-fg transition-all"
                >
                  <Link
                    to="/profile"
                    aria-label="Profile"
                    title="Profile"
                    onClick={(e) => playClick(e)}
                  >
                    <User />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-cyan-400/45 bg-cyan-500/10 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20 hover:text-white"
                >
                  <Link
                    to="/auth"
                    aria-label="Sign in"
                    title="Sign in"
                    onClick={(e) => playClick(e)}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in</span>
                  </Link>
                </Button>
              )}
            </header>
          )}
          <AnimatePresence>
            {open && !hud && (
              <motion.nav
                aria-label="Nexus pages"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: moving ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
                className={`fixed inset-x-4 z-50 max-h-[70dvh] overflow-y-auto rounded-2xl border border-cyan-400/40 bg-slate-950/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.75),0_0_28px_rgba(56,189,248,0.16)] backdrop-blur-2xl ${pathname === "/character" ? "bottom-20" : "top-20"}`}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {tabs.map((t, i) => (
                    <motion.div
                      key={t.to}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: moving ? i * 0.02 : 0,
                        duration: moving ? 0.18 : 0,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <Button
                        asChild
                        variant="ghost"
                        className="nexus-nav-link group h-20 w-full justify-start whitespace-normal rounded-xl border border-cyan-400/25 bg-slate-900/55 p-3 text-left backdrop-blur-md transition-all hover:border-amber-400/70 hover:bg-slate-900/85 hover:shadow-[0_0_16px_rgba(56,189,248,0.2)]"
                      >
                        <Link
                          to={t.to}
                          onClick={(e) => playSnap(e)}
                          aria-current={pathname === t.to ? "page" : undefined}
                        >
                          <NexusNavGlyph
                            to={t.to}
                            className="h-9 w-9 transition-transform group-hover:scale-110"
                          />
                          <span className="font-medium text-foreground transition-colors group-hover:text-cyan-300">
                            {t.label}
                          </span>
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
          <ThemeDrawer open={themeOpen} onOpenChange={setThemeOpen} />
          <motion.div
            key={pathname}
            data-nexus-page={pathname.slice(1) || "home"}
            initial={{ opacity: moving ? 0.65 : 1, x: moving ? 10 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: moving ? 0.2 : 0, ease: [0.16, 1, 0.3, 1] }}
            className="nexus-page relative z-[1]"
          >
            {["/admin", "/profile", "/reader", "/ingest", "/ai"].includes(pathname) ? (
              <NexusSectionRail>{children}</NexusSectionRail>
            ) : (
              children
            )}
          </motion.div>
      </div>
    </MotionConfig>
  );
}
