import { useEffect, useState } from "react";
import { Flame, Gauge, GitBranch, Sparkles } from "lucide-react";
import { FxChains, FxLibrary, FxSimulator } from "@/components/ability-fx-library";
import { MotionSection } from "@/components/app-motion";
import { hydrateAbilityRegistry } from "@/hooks/use-ability-registry";
import { abilityDef } from "@/lib/abilities";
import { SpoilerToggle } from "@/lib/spoiler-mask";
import {
  AbilityProvider,
  useAbilityContext,
  useOptionalAbilityContext,
} from "@/context/AbilityContext";

const TABS = [
  { id: "library", label: "Library", icon: Sparkles },
  { id: "chains", label: "Upgrade chains", icon: GitBranch },
  { id: "sim", label: "Combat simulator", icon: Gauge },
] as const;

function AbilityFxPanelBody({ initialAbility }: { initialAbility?: string | undefined }) {
  const ctx = useAbilityContext();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("library");
  const [simKey, setSimKey] = useState<string | undefined>(() =>
    initialAbility ? abilityDef(initialAbility).key : ctx.abilityKey,
  );

  useEffect(() => {
    void hydrateAbilityRegistry(true);
  }, []);

  useEffect(() => {
    if (initialAbility) {
      const resolved = abilityDef(initialAbility).key;
      setSimKey(resolved);
      ctx.selectAbility(resolved, { triggerImpact: false });
    }
    // Sync only when initialAbility prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAbility]);

  const openSimulator = (key: string) => {
    const resolved = abilityDef(key).key;
    setSimKey(resolved);
    ctx.selectAbility(resolved);
    setTab("sim");
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
      <MotionSection as="header" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ability FX</h1>
          </div>
          <SpoilerToggle scope="abilities" />
        </div>
        <p className="text-sm text-muted-foreground">
          Every hub ability animated by its tier, category, and character mastery rank (I–V), how it
          ascends, its lore context and wielders, and how it performs in a fight.
        </p>
      </MotionSection>
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
      <div key={tab}>
        {tab === "library" ? (
          <FxLibrary initialAbility={initialAbility} onSimulate={openSimulator} />
        ) : tab === "chains" ? (
          <FxChains onSimulate={openSimulator} />
        ) : (
          <FxSimulator initialKey={simKey} />
        )}
      </div>
    </main>
  );
}

export function AbilityFxPanel({ initialAbility }: { initialAbility?: string | undefined }) {
  const existingCtx = useOptionalAbilityContext();
  if (existingCtx) {
    return <AbilityFxPanelBody initialAbility={initialAbility} />;
  }
  return (
    <AbilityProvider initialAbility={initialAbility}>
      <AbilityFxPanelBody initialAbility={initialAbility} />
    </AbilityProvider>
  );
}
