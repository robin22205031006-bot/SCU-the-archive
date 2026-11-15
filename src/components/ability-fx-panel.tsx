import { useState } from "react";
import { Flame, Gauge, GitBranch, Sparkles } from "lucide-react";
import { FxChains, FxLibrary, FxSimulator } from "@/components/ability-fx-library";
import { MotionPage, MotionPresence, MotionSection } from "@/components/app-motion";

const TABS = [
  { id: "library", label: "Library", icon: Sparkles },
  { id: "chains", label: "Upgrade chains", icon: GitBranch },
  { id: "sim", label: "Combat simulator", icon: Gauge },
] as const;

export function AbilityFxPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("library");
  return (
    <MotionPage as="main" className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
      <MotionSection as="header" className="grid gap-1">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Ability FX</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every ability animated by its tier, how it ascends, and how it plays out in a fight.
        </p>
      </MotionSection>
      <MotionSection delay={0.04}>
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`scu-tactile inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${tab === id ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </MotionSection>
      <MotionPresence mode="wait">
        <MotionSection key={tab}>
          {tab === "library" ? <FxLibrary /> : tab === "chains" ? <FxChains /> : <FxSimulator />}
        </MotionSection>
      </MotionPresence>
    </MotionPage>
  );
}
