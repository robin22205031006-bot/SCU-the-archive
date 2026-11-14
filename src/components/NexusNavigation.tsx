import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp, Compass, Layers, Sparkles, X } from "lucide-react";
import { NexusNavGlyph } from "@/components/nexus-nav-glyph";
import { UI_MODE_OPTIONS, useUIState, type UIMode } from "@/context/UIStateContext";
import { TABS } from "@/lib/nav";

export interface NexusNavLink {
  to: string;
  label: string;
  icon?: string;
}

export interface NexusNavigationProps {
  links?: readonly NexusNavLink[];
  onNavigate?: (link: NexusNavLink) => void;
  showModeSwitcher?: boolean;
  className?: string;
}

const DEFAULT_NEXUS_LINKS: readonly NexusNavLink[] = [
  ...TABS,
  { to: "/series", label: "Series", icon: "series" },
  { to: "/timeline", label: "Timeline", icon: "timeline" },
];

export function NexusNavigation({
  links = DEFAULT_NEXUS_LINKS,
  onNavigate,
  showModeSwitcher = true,
  className = "",
}: NexusNavigationProps) {
  const { mode, setMode, navOpen, setNavOpen, toggleNav, activeNav, setActiveNav, isMinimal } =
    useUIState();
  const deviceReduced = useReducedMotion();
  const reduceMotion = Boolean(deviceReduced) || isMinimal;
  const [windowStart, setWindowStart] = useState(0);

  const visibleSlots = 6;
  const maxStart = Math.max(0, links.length - visibleSlots);
  const clampedStart = Math.min(windowStart, maxStart);
  const visibleLinks = links.slice(clampedStart, clampedStart + visibleSlots);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen, setNavOpen]);

  const handleLinkSelect = (link: NexusNavLink) => {
    setActiveNav(link.to);
    onNavigate?.(link);
    setNavOpen(false);
  };

  return (
    <div
      data-hud-style={mode === "nexus" ? "nexus" : mode}
      className={`fixed bottom-5 left-5 z-50 flex flex-col items-start gap-3 ${className}`}
    >
      <AnimatePresence>
        {navOpen && (
          <motion.nav
            key="nexus-floating-hud"
            aria-label="Nexus Floating HUD Navigation"
            data-testid="nexus-hud-panel"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18, scale: reduceMotion ? 1 : 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 14, scale: reduceMotion ? 1 : 0.95 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 28, mass: 0.8 }
            }
            className="relative w-72 overflow-hidden rounded-2xl border p-3.5 text-foreground"
            style={{
              backgroundColor: "var(--nexus-surface, oklch(0.18 0.014 210 / 0.96))",
              borderColor: "var(--nexus-border, oklch(0.74 0.08 190 / 35%))",
              boxShadow: isMinimal
                ? "none"
                : "0 18px 46px rgba(0, 0, 0, 0.55), 0 0 28px color-mix(in oklab, var(--nexus-glow, #38bdf8) 22%, transparent)",
            }}
          >
            {/* Orbital Nexus Ring Backdrop */}
            {!isMinimal && (
              <div
                aria-hidden="true"
                className="pointer-events-none -right-14 -top-14 absolute size-36 rounded-full border border-dashed opacity-25 nexus-orbit-cw"
                style={{ borderColor: "var(--nexus-glow, #38bdf8)" }}
              />
            )}

            <div
              className="mb-2.5 flex items-center justify-between border-b pb-2"
              style={{ borderColor: "var(--nexus-border, rgba(255,255,255,0.12))" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles
                  className="h-4 w-4"
                  style={{ color: "var(--nexus-glow, #38bdf8)" }}
                  aria-hidden="true"
                />
                <span
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--nexus-fg, #f8fafc)" }}
                >
                  Nexus HUD
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close Nexus HUD"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {maxStart > 0 && (
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setWindowStart((v) => Math.max(0, v - 1))}
                  disabled={clampedStart === 0}
                  aria-label="Scroll HUD links up"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground disabled:opacity-35"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>
                <span>
                  {String(clampedStart + 1).padStart(2, "0")}–
                  {String(Math.min(links.length, clampedStart + visibleSlots)).padStart(2, "0")} /{" "}
                  {String(links.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setWindowStart((v) => Math.min(maxStart, v + 1))}
                  disabled={clampedStart >= maxStart}
                  aria-label="Scroll HUD links down"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground disabled:opacity-35"
                >
                  <span>Next</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <ul className="grid gap-1.5" role="list">
              {visibleLinks.map((link, idx) => {
                const isActive = activeNav === link.to;
                return (
                  <motion.li
                    key={link.to}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.2, delay: idx * 0.025 }
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleLinkSelect(link)}
                      aria-current={isActive ? "page" : undefined}
                      className="group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-all"
                      style={{
                        borderColor: isActive
                          ? "var(--nexus-glow, #38bdf8)"
                          : "var(--nexus-border, rgba(255,255,255,0.1))",
                        backgroundColor: isActive
                          ? "color-mix(in oklab, var(--nexus-glow, #38bdf8) 18%, transparent)"
                          : "rgba(0, 0, 0, 0.22)",
                        color: "var(--nexus-fg, #f8fafc)",
                        boxShadow:
                          isActive && !isMinimal
                            ? "0 0 18px color-mix(in oklab, var(--nexus-glow, #38bdf8) 28%, transparent)"
                            : "none",
                      }}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                          borderColor: isActive
                            ? "var(--nexus-glow, #38bdf8)"
                            : "var(--nexus-border, rgba(255,255,255,0.14))",
                          color: isActive
                            ? "var(--nexus-glow, #38bdf8)"
                            : "var(--nexus-muted, #94a3b8)",
                        }}
                      >
                        <NexusNavGlyph to={link.to} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium tracking-wide">
                        {link.label}
                      </span>
                      {isActive && (
                        <span
                          className="font-mono text-[10px] uppercase tracking-widest"
                          style={{ color: "var(--nexus-glow, #38bdf8)" }}
                        >
                          Active
                        </span>
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>

            {showModeSwitcher && (
              <div
                className="mt-3 border-t pt-2.5"
                style={{ borderColor: "var(--nexus-border, rgba(255,255,255,0.12))" }}
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  <span>UI Mode</span>
                </div>
                <div className="grid grid-cols-3 gap-1" role="group" aria-label="Global UI Mode">
                  {UI_MODE_OPTIONS.map((opt) => {
                    const selected = mode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMode(opt.id as UIMode)}
                        aria-pressed={selected}
                        className="rounded-lg border px-2 py-1 text-xs font-medium transition"
                        style={{
                          borderColor: selected
                            ? "var(--nexus-glow, #38bdf8)"
                            : "var(--nexus-border, rgba(255,255,255,0.12))",
                          backgroundColor: selected
                            ? "color-mix(in oklab, var(--nexus-glow, #38bdf8) 22%, transparent)"
                            : "transparent",
                          color: selected
                            ? "var(--nexus-fg, #ffffff)"
                            : "var(--nexus-muted, #94a3b8)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Floating Nexus HUD Launcher Button */}
      <motion.button
        type="button"
        onClick={toggleNav}
        aria-expanded={navOpen}
        aria-label={navOpen ? "Close Nexus HUD" : "Open Nexus HUD"}
        {...(reduceMotion
          ? {}
          : {
              whileHover: { scale: 1.06 },
              whileTap: { scale: 0.94 },
            })}
        className="group relative inline-flex h-12 items-center gap-2.5 rounded-full border px-4 text-xs font-mono uppercase tracking-[0.2em] transition-colors"
        style={{
          backgroundColor: "var(--nexus-surface, oklch(0.18 0.014 210 / 0.95))",
          borderColor: navOpen
            ? "var(--nexus-glow, #38bdf8)"
            : "var(--nexus-border, oklch(0.74 0.08 190 / 40%))",
          color: "var(--nexus-glow, #38bdf8)",
          boxShadow: isMinimal
            ? "none"
            : "0 10px 30px rgba(0, 0, 0, 0.45), 0 0 22px color-mix(in oklab, var(--nexus-glow, #38bdf8) 25%, transparent)",
        }}
      >
        <Compass
          className={`h-5 w-5 ${!reduceMotion && mode === "nexus" ? "nexus-orbit-cw" : ""}`}
          aria-hidden="true"
        />
        <span>{navOpen ? "Close HUD" : "Nexus HUD"}</span>
      </motion.button>
    </div>
  );
}
