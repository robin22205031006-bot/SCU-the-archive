import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useAbilityHolders } from "@/hooks/use-ability-registry";
import { abilityDef, normalizeAbilityKey } from "@/lib/abilities";
import {
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  resolveAbilityAliasPure,
} from "@/lib/ability-rank";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { useOptionalAbilityContext } from "@/context/AbilityContext";

export function useAbilityHolderSummary(abilityKey: string) {
  const { holdersMap, canonNamesMap } = useAbilityHolders();
  const nk = normalizeAbilityKey(abilityDef(abilityKey).key);
  const entities = holdersMap.get(nk) ?? [];
  const entityNamesLower = new Set(entities.map((e) => e.name.trim().toLowerCase()));
  const canonFallbacks = (canonNamesMap.get(nk) ?? []).filter(
    (name) => !entityNamesLower.has(name.trim().toLowerCase()),
  );
  const totalCount = entities.length + canonFallbacks.length;
  return { entities, canonFallbacks, totalCount };
}

/**
 * Shared spoiler-aware wielder badges for Ability FX cards, Showcase modal,
 * Combat Simulator, and Ability in Action.
 */
export function AbilityHoldersChips({
  abilityKey,
  compact = false,
}: {
  abilityKey: string;
  compact?: boolean;
}) {
  const holdersMasked = useSpoilerMask("abilities");
  const { entities, canonFallbacks, totalCount } = useAbilityHolderSummary(abilityKey);
  const ctx = useOptionalAbilityContext();
  const targetCanon = resolveAbilityAliasPure(abilityDef(abilityKey).key);

  if (totalCount === 0) {
    return compact ? null : (
      <p className="text-xs text-muted-foreground">
        No characters or factions carry this ability in the archive yet.
      </p>
    );
  }

  if (holdersMasked) {
    return (
      <p className="flex items-center gap-1.5 text-xs italic text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {totalCount} {totalCount === 1 ? "wielder" : "wielders"} hidden (spoiler mask active).
        </span>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Users className="h-3 w-3" aria-hidden="true" />
        Wielders ({totalCount}):
      </span>
      {entities.map((e) => {
        const entityRows = ctx
          ? ctx.assignments.filter(
              (r) => r.entity_id === e.id && resolveAbilityAliasPure(r.ability_key) === targetCanon,
            )
          : [];
        const highestRank = entityRows.length
          ? entityRows.reduce((best, r) => {
              const lv = clampDbAbilityLevel(r.level);
              return lv > best ? lv : best;
            }, clampDbAbilityLevel(entityRows[0]!.level))
          : null;

        return (
          <span
            key={e.id}
            className="inline-flex items-center overflow-hidden rounded-full border border-border bg-secondary/60 text-xs text-foreground transition hover:border-accent"
          >
            <Link
              to="/reader"
              search={{ e: e.id }}
              className="px-2.5 py-0.5 transition hover:text-accent"
            >
              {e.name}
            </Link>
            {highestRank !== null && (
              <span
                className="border-l border-border/70 px-1.5 py-0.5 font-mono text-[10px] font-bold"
                style={{ color: ABILITY_RANK_META[highestRank].ringColor }}
                title={`Assigned mastery: ${ABILITY_RANK_META[highestRank].label}`}
              >
                {ABILITY_RANK_META[highestRank].roman}
              </span>
            )}
          </span>
        );
      })}
      {canonFallbacks.map((name) => (
        <span
          key={name}
          className="rounded-full border border-border/80 bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
