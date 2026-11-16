import { useState, useSyncExternalStore } from "react";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersusClashStage } from "@/components/lazy-three";
import { AbilityImpactOverlay } from "@/components/ability-impact-overlay";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
import { useAppMotion } from "@/hooks/use-app-motion";
import type { CombatStats } from "@/lib/combat-stats";
import {
  CLASH_PALETTES,
  clashBalance,
  clashPower,
  clashVerdict,
  resolveClashSystem,
} from "@/lib/versus-clash";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Presentation-only WebGL clash for the Versus Simulator. Reads the shared UI system and global
 * AbilityImpact state; never queries or writes archive data.
 */
export function VersusClashPanel({
  nameA,
  nameB,
  statsA,
  statsB,
}: {
  nameA: string;
  nameB: string;
  statsA: CombatStats | null;
  statsB: CombatStats | null;
}) {
  const { primarySystem, motionActive } = useAppMotion();
  const reduced = useReducedMotion();
  const abilityCtx = useOptionalAbilityContext();
  const [webgl] = useState(detectWebGL);
  const [localClashes, setLocalClashes] = useState(0);

  const system = resolveClashSystem(primarySystem);
  const palette = CLASH_PALETTES[system];
  const motion = motionActive && !reduced;
  const powerA = clashPower(statsA);
  const powerB = clashPower(statsB);
  const balance = clashBalance(powerA, powerB);

  const impact = abilityCtx?.abilityImpact ?? null;
  const clashId = localClashes + (impact?.id ?? 0);
  const impactColor = impact?.active ? impact.color : null;
  const hasClashed = localClashes > 0 || !!impact?.active;

  return (
    <section
      aria-label={`Energy clash: ${nameA} versus ${nameB}`}
      data-clash-system={system}
      className="grid gap-3"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-black">
        {webgl ? (
          <VersusClashStage
            palette={palette}
            balance={balance}
            clashId={clashId}
            impactColor={impactColor}
            motion={motion}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${palette.a} 0%, ${palette.background} 50%, ${palette.b} 100%)`,
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3 text-xs font-semibold uppercase tracking-widest">
          <span className="rounded-md bg-black/60 px-2 py-1" style={{ color: palette.a }}>
            {nameA} <span className="text-white/60">· {powerA}</span>
          </span>
          <span className="rounded-md bg-black/60 px-2 py-1" style={{ color: palette.b }}>
            <span className="text-white/60">{powerB} ·</span> {nameB}
          </span>
        </div>

        <AbilityImpactOverlay impact={impact} compact />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hasClashed
            ? `${clashVerdict(nameA, nameB, balance)}.`
            : "Trigger a clash to see whose output overpowers the other."}
          {!webgl && " WebGL is unavailable, so a static preview is shown."}
        </p>
        <Button type="button" size="sm" onClick={() => setLocalClashes((n) => n + 1)}>
          <Swords className="h-4 w-4" aria-hidden="true" />
          Simulate Clash
        </Button>
      </div>
    </section>
  );
}
