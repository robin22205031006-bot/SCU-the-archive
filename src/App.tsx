import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { LoreExplorer } from "@/components/LoreExplorer";
import { ArchivistChat } from "@/components/ArchivistChat";
import { NexusNavigation, type NexusNavLink } from "@/components/NexusNavigation";
import { MotionPage } from "@/components/app-motion";
import {
  UIStateProvider,
  applyHtmlUIStateAttributes,
  useUIState,
  type UIMode,
} from "@/context/UIStateContext";
import { applyUiModeCss } from "@/hooks/use-ui-mode";
import { useAppMotion } from "@/hooks/use-app-motion";
import { usePreloadUIFeedback, useUIFeedback } from "@/hooks/use-ui-feedback";
import { MangaSfxLayer } from "@/components/manga-sfx";
import { HeaderThemeSelect } from "@/components/header-theme-select";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";

const APP_NAV_LINKS: readonly NexusNavLink[] = [
  { to: "/archive", label: "Lore Explorer", icon: "archive" },
  { to: "/ai", label: "Archivist AI", icon: "ai" },
];

function AppContent() {
  const { mode, setMode, activeNav, setActiveNav, modes } = useUIState();
  const { triggerFeedback } = useUIFeedback({ mode });
  const { isMinimal, motionActive, spec } = useAppMotion();
  usePreloadUIFeedback();
  const activeView = activeNav === "/ai" ? "chat" : "explorer";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    applyUiModeCss(mode, true, root);
    applyHtmlUIStateAttributes(mode, root);
  }, [mode]);

  return (
    <MotionConfig
      reducedMotion={isMinimal || !motionActive ? "always" : "user"}
      transition={motionActive ? spec.transition : { duration: 0 }}
    >
      <div
        className="min-h-screen bg-background text-foreground flex flex-col"
        data-motion-state={motionActive ? "active" : isMinimal ? "minimal-off" : "paused"}
      >
        {mode === "manga" && <MangaSfxLayer />}
        {/* Navigation Header */}
        <header className="glass border-b border-border px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold tracking-widest text-primary">
              SCU - SENTINELS
            </h1>
            <span
              data-testid="active-ui-mode-badge"
              className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              {mode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex space-x-2" role="tablist" aria-label="Archive views">
              <button
                type="button"
                onClick={(e) => {
                  triggerFeedback("nav", mode, e);
                  setActiveNav("/archive");
                }}
                aria-current={activeView === "explorer" ? "page" : undefined}
                className={`scu-tactile px-4 py-2 rounded text-sm font-semibold transition-colors ${
                  activeView === "explorer"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Lore Explorer
              </button>
              <button
                type="button"
                onClick={(e) => {
                  triggerFeedback("nav", mode, e);
                  setActiveNav("/ai");
                }}
                aria-current={activeView === "chat" ? "page" : undefined}
                className={`scu-tactile px-4 py-2 rounded text-sm font-semibold transition-colors ${
                  activeView === "chat"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Archivist AI
              </button>
            </div>

            <HeaderThemeSelect />

            <div className="flex items-center gap-1" role="group" aria-label="Application UI Mode">
              {modes.map((opt) => {
                const selected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      const nextMode = opt.id as UIMode;
                      triggerFeedback("switch", nextMode, e);
                      triggerTierSwitchHitstop(nextMode);
                      setMode(nextMode);
                    }}
                    aria-pressed={selected}
                    className={`scu-tactile rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-hidden">
          <MotionPage className="h-full">
            {activeView === "chat" ? <ArchivistChat /> : <LoreExplorer />}
          </MotionPage>
        </main>

        <NexusNavigation links={APP_NAV_LINKS} onNavigate={(link) => setActiveNav(link.to)} />
      </div>
    </MotionConfig>
  );
}

export function App() {
  return (
    <UIStateProvider initialNav="/archive" applyAttributesToHtml={false}>
      <AppContent />
    </UIStateProvider>
  );
}

export default App;
