import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { Compass, Palette, X, User, Sparkles } from "lucide-react";
import { useIsStaff } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { TABS, STAFF_TAB } from "@/lib/nav";
import { useAnimationsEnabled, setAnimationsEnabled } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { ThemeDrawer } from "@/components/theme-drawer";
import { NexusSectionRail } from "@/components/nexus-section-rail";
import { NexusFxLayer } from "@/components/nexus-fx";
import { useNexusTheme } from "@/hooks/use-nexus-theme";
import { NexusSign } from "@/components/nexus-sign";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";

export function NexusShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isStaff = useIsStaff();
  const enabled = useAnimationsEnabled();
  const moving = useNexusMotion();
  const nexusTheme = useNexusTheme();
  const anime = useNexusSymbolSettings().anime ?? false;
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { data: visibility } = useQuery({
    queryKey: ["app-settings", "nav_visibility"], staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", "nav_visibility").maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as Record<string, boolean>;
    },
  });
  useEffect(() => {
    document.documentElement.dataset["ui"] = "nexus";
    document.documentElement.dataset["nexusMotion"] = moving ? "on" : "off";
    document.documentElement.dataset["nexusTheme"] = nexusTheme;
    document.documentElement.dataset["nexusAnime"] = anime ? "on" : "off";
    return () => { delete document.documentElement.dataset["ui"]; delete document.documentElement.dataset["nexusMotion"]; delete document.documentElement.dataset["nexusTheme"]; delete document.documentElement.dataset["nexusAnime"]; };
  }, [moving, nexusTheme, anime]);
  useEffect(() => setOpen(false), [pathname]);
  const tabs = [...TABS, { to: "/series", label: "Series", icon: "book" }, { to: "/orgs", label: "Organizations", icon: "book" }, { to: "/timeline", label: "Timeline", icon: "book" }, { to: "/graph", label: "Graph", icon: "book" }, { to: "/clans", label: "Clans", icon: "book" }, ...(isStaff ? [STAFF_TAB] : [])].filter(t => visibility?.[t.to] ?? true);
  return <MotionConfig reducedMotion={moving ? "user" : "always"} transition={{ duration: moving ? 0.55 : 0 }}>
    <div className="nexus-shell relative min-h-dvh">
      <NexusFxLayer>
      <header className={`nexus-command fixed z-40 flex items-center gap-2 border border-border bg-background/90 p-2 backdrop-blur-lg ${pathname === "/character" ? "bottom-4 right-4" : "left-4 right-4 top-4"}`}>
        {pathname !== "/character" && <Link to="/" className="mr-auto flex items-center gap-2 font-mono text-xs tracking-widest text-accent"><Compass className="h-5 w-5" />SCU / NEXUS</Link>}
        <Button variant="ghost" size="icon" aria-label="Nexus navigation" aria-expanded={open} onClick={() => setOpen(v => !v)} title="Navigation">{open ? <X /> : <Compass />}</Button>
        <Button variant="ghost" size="icon" aria-label="Theme" title="Theme" onClick={() => setThemeOpen(true)}><Palette /></Button>
        <Button variant="ghost" size="icon" aria-label={enabled ? "Pause animations" : "Enable animations"} aria-pressed={enabled} title="Animations" onClick={() => setAnimationsEnabled(!enabled)}><Sparkles /></Button>
        <Button asChild variant="ghost" size="icon"><Link to="/profile" aria-label="Profile" title="Profile"><User /></Link></Button>
      </header>
      <AnimatePresence>
        {open && <motion.nav aria-label="Nexus pages" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }} className={`fixed inset-x-4 z-50 max-h-[70dvh] overflow-y-auto border border-border bg-background/95 p-4 backdrop-blur-xl ${pathname === "/character" ? "bottom-20" : "top-20"}`}>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
            {tabs.map((t, i) => <motion.div key={t.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: moving ? i * 0.025 : 0 }}>
              <Button asChild variant="ghost" className="nexus-nav-link h-20 w-full justify-start whitespace-normal border-b border-border text-left"><Link to={t.to} aria-current={pathname === t.to ? "page" : undefined}><NexusSign symbolName={t.label} className="shrink-0"><span className="nexus-mark h-4 w-4" /></NexusSign><span>{t.label}</span></Link></Button>
            </motion.div>)}
          </div>
        </motion.nav>}
      </AnimatePresence>
      <ThemeDrawer open={themeOpen} onOpenChange={setThemeOpen} />
      <AnimatePresence mode="wait" initial={false}><motion.div key={pathname} data-nexus-page={pathname.slice(1) || "home"} initial={{ opacity: moving ? 0 : 1, x: moving ? 24 : 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: moving ? -20 : 0 }} transition={{ duration: moving ? 0.5 : 0, ease: [0.22, 1, 0.36, 1] }} className="nexus-page relative">{["/admin", "/profile", "/reader", "/ingest", "/ai"].includes(pathname) ? <NexusSectionRail>{children}</NexusSectionRail> : children}</motion.div></AnimatePresence>
      </NexusFxLayer>
    </div>
  </MotionConfig>;
}