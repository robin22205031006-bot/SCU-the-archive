import { useState } from "react";
import { FxChains, FxLibrary, FxSimulator } from "@/components/ability-fx-library";

const TABS = [
  ["library", "Library"],
  ["chains", "Upgrade chains"],
  ["sim", "Combat simulator"],
] as const;

export function AbilityFxPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("library");
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
      <header className="grid gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Ability FX</h1>
        <p className="text-sm text-muted-foreground">
          Every ability animated by its tier, how it ascends, and how it plays out in a fight.
        </p>
      </header>
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${tab === id ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "library" ? <FxLibrary /> : tab === "chains" ? <FxChains /> : <FxSimulator />}
    </main>
  );
}
