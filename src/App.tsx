import { useEffect } from "react";
import { LoreExplorer } from "@/components/LoreExplorer";
import { ArchivistChat } from "@/components/ArchivistChat";
import { NexusNavigation, type NexusNavLink } from "@/components/NexusNavigation";
import {
  UIStateProvider,
  applyHtmlUIStateAttributes,
  useUIState,
  type UIMode,
} from "@/context/UIStateContext";
import { applyUiModeCss } from "@/hooks/use-ui-mode";
import { usePreloadUIFeedback, useUIFeedback } from "@/hooks/use-ui-feedback";
import { MangaSfxLayer } from "@/components/manga-sfx";

const APP_NAV_LINKS: readonly NexusNavLink[] = [
  { to: "/archive", label: "Lore Explorer", icon: "archive" },
  { to: "/ai", label: "Archivist AI", icon: "ai" },
];

function AppContent() {
  const { mode, setMode, activeNav, setActiveNav, modes } = useUIState();
  const { triggerFeedback } = useUIFeedback({ mode });
  usePreloadUIFeedback();
  const activeView = activeNav === "/ai" ? "chat" : "explorer";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    applyUiModeCss(mode, true, root);
    applyHtmlUIStateAttributes(mode, root);
  }, [mode]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
              onClick={() => {
                triggerFeedback("nav", mode);
                setActiveNav("/archive");
              }}
              aria-current={activeView === "explorer" ? "page" : undefined}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                activeView === "explorer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Lore Explorer
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback("nav", mode);
                setActiveNav("/ai");
              }}
              aria-current={activeView === "chat" ? "page" : undefined}
              className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                activeView === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Archivist AI
            </button>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Application UI Mode">
            {modes.map((opt) => {
              const selected = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const nextMode = opt.id as UIMode;
                    triggerFeedback("click", nextMode);
                    setMode(nextMode);
                  }}
                  aria-pressed={selected}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
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
        {activeView === "chat" ? <ArchivistChat /> : <LoreExplorer />}
      </main>

      <NexusNavigation links={APP_NAV_LINKS} onNavigate={(link) => setActiveNav(link.to)} />
    </div>
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
