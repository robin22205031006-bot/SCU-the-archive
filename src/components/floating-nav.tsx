import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Archive, BookMarked, BookOpen, Bot, Castle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Compass, FileLock, Home, Map, MessagesSquare, Network, Palette, Shield, Sparkles, User, Users, WandSparkles } from "lucide-react";
import { TABS, STAFF_TAB } from "@/lib/nav";
import { useNavMode } from "@/lib/nav-mode";
import { useIsStaff, useSession } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeDrawer } from "./theme-drawer";
import { useNavHidden } from "@/lib/nav-visibility";
export { navMode, setNavMode, hudNavEnabled, setHudNav, type NavMode } from "@/lib/nav-mode";

const icons = { home: Home, chars: Users, abilities: WandSparkles, archive: Archive, book: BookOpen, map: Map, fandom: MessagesSquare, ai: Bot, vault: FileLock, admin: Sparkles, series: BookMarked, orgs: Shield, time: Clock, graph: Network, clans: Castle, profile: User, theme: Palette };
const extraTabs = [{ to: "/series", label: "Series", icon: "series" }, { to: "/orgs", label: "Organizations", icon: "orgs" }, { to: "/timeline", label: "Timeline", icon: "time" }, { to: "/graph", label: "Graph", icon: "graph" }, { to: "/clans", label: "Clans", icon: "clans" }] as const;

/** A viewport-bound arc: five visible entries, with scroll/swipe access to every page. */
export function FloatingNav() {
  const mode = useNavMode();
  const { pathname } = useLocation();
  const { data: user } = useSession();
  const staff = useIsStaff();
  const hidden = useNavHidden();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [themeOpen, setThemeOpen] = useState(false);
  const [start, setStart] = useState(0);
  const touch = useRef<number | null>(null);
  const wheelAt = useRef(0);
  const { data: visibility } = useQuery({ queryKey: ["app-settings", "nav_visibility"], staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", "nav_visibility").maybeSingle();
    if (error) throw error;
    return (data?.value ?? {}) as Record<string, boolean>;
  } });
  const items = [...TABS, ...extraTabs, ...(staff ? [STAFF_TAB] : []), { to: "/profile", label: "Profile", icon: "profile" }, { to: "#theme", label: "Theme", icon: "theme" }].filter(t => visibility?.[t.to] ?? true);
  const max = Math.max(0, items.length - 5);
  const first = Math.min(start, max);
  const slide = (delta: number) => setStart(v => Math.max(0, Math.min(max, v + delta)));
  useEffect(() => {
    const index = items.findIndex(t => t.to === pathname);
    if (index >= 0) setStart(Math.max(0, Math.min(max, index - 2)));
  }, [pathname, max]);
  if (mode !== "hud" || !user || pathname === "/auth" || pathname === "/install") return null;
  const expanded = open && !hidden;
  return <>
    <nav aria-label="HUD navigation" data-no-swipe className="hud-navigation fixed left-0 top-1/2 z-40 -translate-y-1/2" onWheel={e => { if (Date.now() - wheelAt.current < 180 || Math.abs(e.deltaY) < 4) return; wheelAt.current = Date.now(); slide(e.deltaY > 0 ? 1 : -1); }} onTouchStart={e => { touch.current = e.touches[0]?.clientY ?? null; }} onTouchEnd={e => { const end = e.changedTouches[0]?.clientY; if (touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 35) slide(end < touch.current ? 1 : -1); touch.current = null; }}>
      <AnimatePresence>
        {expanded && <motion.div key="arc" className="hud-arc-panel" initial={{ x: reduce ? 0 : -240, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: reduce ? 0 : -240, opacity: 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}>
          <div className="hud-arc-track" aria-hidden="true" />
          <Button variant="ghost" size="icon" className="hud-scroll hud-scroll-up" aria-label="Previous HUD tabs" disabled={first === 0} onClick={() => slide(-1)} title="Previous tabs"><ChevronUp /></Button>
          <div className="hud-arc-items">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.slice(first, first + 5).map((item, slot) => {
                const Icon = icons[item.icon as keyof typeof icons] ?? Compass;
                const active = item.to === pathname;
                return <motion.div key={item.to} className={`hud-entry hud-slot-${slot}`} layout={!reduce} initial={{ opacity: 0, y: reduce ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -24 }} transition={{ duration: reduce ? 0 : 0.25 }}>
                  <Button asChild={item.to !== "#theme"} variant="ghost" className={`hud-tab ${active ? "hud-tab-active" : ""}`} {...(item.to === "#theme" ? { onClick: () => setThemeOpen(true), "aria-label": "Theme" } : {})}>
                    {item.to === "#theme" ? <><span className="hud-node"><Icon /></span><span className="hud-label">Theme</span></> : <Link to={item.to} aria-current={active ? "page" : undefined}><span className="hud-node"><Icon /></span><span className="hud-label">{item.label}</span></Link>}
                  </Button>
                </motion.div>;
              })}
            </AnimatePresence>
          </div>
          <Button variant="ghost" size="icon" className="hud-scroll hud-scroll-down" aria-label="Next HUD tabs" disabled={first === max} onClick={() => slide(1)} title="Next tabs"><ChevronDown /></Button>
          <div className="hud-counter" aria-hidden="true">{String(first + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</div>
        </motion.div>}
      </AnimatePresence>
      <Button variant="outline" size="icon" className="hud-toggle" aria-label={expanded ? "Collapse HUD" : "Expand HUD"} aria-expanded={expanded} onClick={() => setOpen(!expanded)} title={expanded ? "Collapse HUD" : "Expand HUD"}>{expanded ? <ChevronLeft /> : <ChevronRight />}</Button>
    </nav>
    {themeOpen && <ThemeDrawer open={themeOpen} onOpenChange={setThemeOpen} />}
  </>;
}
