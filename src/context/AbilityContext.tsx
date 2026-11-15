import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  abilityDef,
  normalizeAbilityKey,
  type AbilityDef,
  type AbilityTier,
} from "@/lib/abilities";
import {
  buildAbilityRankMap,
  clampDbAbilityLevel,
  resolveAbilityAliasPure,
  resolveAssignedAbilityRank,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
  type CharacterAbilityRankRow,
} from "@/lib/ability-rank";
import type { Entity } from "@/lib/entities";
import { seriesQuery } from "@/lib/series";
import { useAbilityHolders, useAllHubAbilities } from "@/hooks/use-ability-registry";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";

export interface CharacterAbilityAssignment extends CharacterAbilityRankRow {
  id: string;
  entity_id: string;
}

export interface AbilitySeasonStep {
  id: string;
  seriesId: string | null;
  seriesTitle: string;
  seasonNumber: number | null;
  level: AbilityEmblemRank;
  note?: string | undefined;
}

export interface AbilityImpactState {
  id: number;
  active: boolean;
  abilityKey: string;
  label: string;
  color: string;
  tier: AbilityTier;
  rank: AbilityEmblemRank;
  characterName?: string | undefined;
  reason: "high-tier" | "manual";
  startedAt: number;
}

export interface AbilityContextValue {
  abilityKey: string;
  activeDef: AbilityDef;
  rank: AbilityEmblemRank;
  selectedEntityId: string | null;
  selectedEntity: Entity | null;
  selectedSeriesId: string | null;
  selectedSeasonNumber: number | null;
  boosted: boolean;
  fps: 24 | 30 | 60;
  hubAbilities: AbilityDef[];
  holdersMap: Map<string, Entity[]>;
  canonNamesMap: Map<string, string[]>;
  assignments: CharacterAbilityAssignment[];
  selectedProgression: AbilitySeasonStep[];
  abilityImpact: AbilityImpactState | null;
  selectAbility: (
    key: string,
    opts?: {
      rank?: AbilityEmblemRank | undefined;
      entityId?: string | null | undefined;
      seriesId?: string | null | undefined;
      seasonNumber?: number | null | undefined;
      triggerImpact?: boolean | undefined;
    },
  ) => void;
  setRank: (rank: AbilityEmblemRank, opts?: { triggerImpact?: boolean | undefined }) => void;
  selectWielder: (
    entityId: string | null,
    scope?: { seriesId?: string | null | undefined; seasonNumber?: number | null | undefined },
  ) => void;
  setSeasonScope: (seriesId: string | null, seasonNumber: number | null) => void;
  setBoosted: (next: boolean | ((prev: boolean) => boolean)) => void;
  setFps: (fps: 24 | 30 | 60) => void;
  triggerAbilityImpact: (overrides?: {
    abilityKey?: string | undefined;
    rank?: AbilityEmblemRank | undefined;
    characterName?: string | undefined;
    force?: boolean | undefined;
    reason?: "high-tier" | "manual" | undefined;
  }) => void;
  clearAbilityImpact: () => void;
  resolveCharacterRank: (
    entityId: string,
    key: string,
    seriesId?: string | null,
    seasonNumber?: number | null,
  ) => AbilityEmblemRank | undefined;
  getCharacterSeasonProgression: (entityId: string, key: string) => AbilitySeasonStep[];
}

export const CHARACTER_ABILITIES_ALL_QK = ["character-abilities"] as const;
const IMPACT_DURATION_MS = 1400;

export function isHighTierAbility(tier: AbilityTier, rank: AbilityEmblemRank): boolean {
  return tier === "Mythic" || tier === "Legendary" || rank >= 4;
}

const AbilityContext = createContext<AbilityContextValue | null>(null);

export function AbilityProvider({
  children,
  initialAbility = "red_lightning",
}: {
  children: ReactNode;
  initialAbility?: string | undefined;
}) {
  const hubAbilities = useAllHubAbilities();
  const { holdersMap, canonNamesMap } = useAbilityHolders();
  const { data: seriesList = [] } = useQuery(seriesQuery);

  const { data: assignments = [] } = useQuery({
    queryKey: CHARACTER_ABILITIES_ALL_QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_abilities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return [];
      return (data ?? []) as CharacterAbilityAssignment[];
    },
  });

  const [abilityKey, setAbilityKey] = useState<string>(() => abilityDef(initialAbility).key);
  const [rank, setRankState] = useState<AbilityEmblemRank>(() =>
    tierToIntrinsicRank(abilityDef(initialAbility).tier),
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | null>(null);
  const [boosted, setBoosted] = useState<boolean>(false);
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [abilityImpact, setAbilityImpact] = useState<AbilityImpactState | null>(null);

  const impactTimerRef = useRef<number | null>(null);
  const impactSeqRef = useRef(0);

  const clearAbilityImpact = useCallback(() => {
    if (impactTimerRef.current !== null) {
      window.clearTimeout(impactTimerRef.current);
      impactTimerRef.current = null;
    }
    setAbilityImpact(null);
  }, []);

  useEffect(
    () => () => {
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
    },
    [],
  );

  const activeDef = useMemo(() => abilityDef(abilityKey), [abilityKey]);

  const seriesTitleMap = useMemo(
    () => new Map(seriesList.map((s) => [s.id, s.title])),
    [seriesList],
  );

  const resolveCharacterRank = useCallback(
    (
      entityId: string,
      key: string,
      seriesId?: string | null,
      seasonNumber?: number | null,
    ): AbilityEmblemRank | undefined => {
      const rows = assignments.filter((r) => r.entity_id === entityId);
      if (!rows.length) return undefined;
      const map = buildAbilityRankMap(rows, {
        seriesId: seriesId ?? null,
        seasonNumber: seasonNumber ?? null,
      });
      return resolveAssignedAbilityRank(key, map);
    },
    [assignments],
  );

  const getCharacterSeasonProgression = useCallback(
    (entityId: string, key: string): AbilitySeasonStep[] => {
      const targetCanon = resolveAbilityAliasPure(abilityDef(key).key);
      return assignments
        .filter(
          (r) =>
            r.entity_id === entityId &&
            resolveAbilityAliasPure(r.ability_key) === targetCanon,
        )
        .map((r) => ({
          id: r.id,
          seriesId: r.series_id ?? null,
          seriesTitle: r.series_id
            ? (seriesTitleMap.get(r.series_id) ?? "Series")
            : "Base / Global",
          seasonNumber: r.season_number ?? null,
          level: clampDbAbilityLevel(r.level),
          note: r.note ?? undefined,
        }))
        .sort((a, b) => {
          const sa = a.seriesId ? 1 : 0;
          const sb = b.seriesId ? 1 : 0;
          if (sa !== sb) return sa - sb;
          if ((a.seriesTitle ?? "") !== (b.seriesTitle ?? "")) {
            return a.seriesTitle.localeCompare(b.seriesTitle);
          }
          return (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0);
        });
    },
    [assignments, seriesTitleMap],
  );

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    const nk = normalizeAbilityKey(activeDef.key);
    const holders = holdersMap.get(nk) ?? [];
    const direct = holders.find((e) => e.id === selectedEntityId);
    if (direct) return direct;
    for (const list of holdersMap.values()) {
      const found = list.find((e) => e.id === selectedEntityId);
      if (found) return found;
    }
    return null;
  }, [selectedEntityId, holdersMap, activeDef.key]);

  const selectedProgression = useMemo(
    () =>
      selectedEntityId ? getCharacterSeasonProgression(selectedEntityId, activeDef.key) : [],
    [selectedEntityId, activeDef.key, getCharacterSeasonProgression],
  );

  const triggerAbilityImpact = useCallback(
    (overrides?: {
      abilityKey?: string | undefined;
      rank?: AbilityEmblemRank | undefined;
      characterName?: string | undefined;
      force?: boolean | undefined;
      reason?: "high-tier" | "manual" | undefined;
    }) => {
      const targetDef = abilityDef(overrides?.abilityKey ?? abilityKey);
      const targetRank = overrides?.rank ?? rank;
      const shouldFire =
        overrides?.force === true || isHighTierAbility(targetDef.tier, targetRank) || boosted;
      if (!shouldFire) return;

      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
      impactSeqRef.current += 1;
      const reason = overrides?.reason ?? (overrides?.force ? "manual" : "high-tier");
      const nextState: AbilityImpactState = {
        id: impactSeqRef.current,
        active: true,
        abilityKey: targetDef.key,
        label: targetDef.label,
        color: targetDef.color,
        tier: targetDef.tier,
        rank: targetRank,
        characterName: overrides?.characterName ?? selectedEntity?.name,
        reason,
        startedAt: Date.now(),
      };
      setAbilityImpact(nextState);

      if (typeof window !== "undefined") {
        triggerAnimeActionCut({
          color: targetDef.color,
          label: `${targetDef.label} · Rank ${targetRank}`,
          intensity: targetDef.tier === "Mythic" || targetRank === 5 ? "heavy" : "normal",
        });
        impactTimerRef.current = window.setTimeout(() => {
          setAbilityImpact(null);
          impactTimerRef.current = null;
        }, IMPACT_DURATION_MS);
      }
    },
    [abilityKey, rank, boosted, selectedEntity?.name],
  );

  const selectAbility = useCallback(
    (
      key: string,
      opts?: {
        rank?: AbilityEmblemRank | undefined;
        entityId?: string | null | undefined;
        seriesId?: string | null | undefined;
        seasonNumber?: number | null | undefined;
        triggerImpact?: boolean | undefined;
      },
    ) => {
      const nextDef = abilityDef(key);
      const nextEntityId = opts?.entityId !== undefined ? opts.entityId : selectedEntityId;
      const nextSeriesId = opts?.seriesId !== undefined ? opts.seriesId : selectedSeriesId;
      const nextSeasonNumber =
        opts?.seasonNumber !== undefined ? opts.seasonNumber : selectedSeasonNumber;

      // Clear entity selection if switched to a different ability that the current entity doesn't hold
      let resolvedEntityId = nextEntityId;
      if (resolvedEntityId) {
        const nk = normalizeAbilityKey(nextDef.key);
        const holders = holdersMap.get(nk) ?? [];
        const hasAssignment = Boolean(resolveCharacterRank(resolvedEntityId, nextDef.key));
        if (!holders.some((h) => h.id === resolvedEntityId) && !hasAssignment) {
          resolvedEntityId = null;
        }
      }

      const assignedRank = resolvedEntityId
        ? resolveCharacterRank(resolvedEntityId, nextDef.key, nextSeriesId, nextSeasonNumber)
        : undefined;
      const nextRank = opts?.rank ?? assignedRank ?? tierToIntrinsicRank(nextDef.tier);

      setAbilityKey(nextDef.key);
      setSelectedEntityId(resolvedEntityId ?? null);
      if (opts?.seriesId !== undefined) setSelectedSeriesId(opts.seriesId);
      if (opts?.seasonNumber !== undefined) setSelectedSeasonNumber(opts.seasonNumber);
      setRankState(nextRank);

      if (opts?.triggerImpact !== false && isHighTierAbility(nextDef.tier, nextRank)) {
        const holderName = resolvedEntityId
          ? (holdersMap.get(normalizeAbilityKey(nextDef.key))?.find((h) => h.id === resolvedEntityId)
              ?.name ?? undefined)
          : undefined;
        triggerAbilityImpact({
          abilityKey: nextDef.key,
          rank: nextRank,
          characterName: holderName,
          force: true,
          reason: "high-tier",
        });
      }
    },
    [
      selectedEntityId,
      selectedSeriesId,
      selectedSeasonNumber,
      holdersMap,
      resolveCharacterRank,
      triggerAbilityImpact,
    ],
  );

  const setRank = useCallback(
    (nextRank: AbilityEmblemRank, opts?: { triggerImpact?: boolean | undefined }) => {
      const clamped = clampDbAbilityLevel(nextRank);
      setRankState(clamped);
      if (opts?.triggerImpact || clamped >= 4) {
        triggerAbilityImpact({
          abilityKey,
          rank: clamped,
          force: opts?.triggerImpact || clamped >= 4,
          reason: opts?.triggerImpact ? "manual" : "high-tier",
        });
      }
    },
    [abilityKey, triggerAbilityImpact],
  );

  const selectWielder = useCallback(
    (
      entityId: string | null,
      scope?: { seriesId?: string | null | undefined; seasonNumber?: number | null | undefined },
    ) => {
      setSelectedEntityId(entityId);
      const nextSeries = scope?.seriesId !== undefined ? scope.seriesId : null;
      const nextSeason = scope?.seasonNumber !== undefined ? scope.seasonNumber : null;
      setSelectedSeriesId(nextSeries);
      setSelectedSeasonNumber(nextSeason);

      if (!entityId) {
        const fallbackRank = tierToIntrinsicRank(activeDef.tier);
        setRankState(fallbackRank);
        return;
      }

      const assigned = resolveCharacterRank(entityId, activeDef.key, nextSeries, nextSeason);
      const prog = getCharacterSeasonProgression(entityId, activeDef.key);
      const bestStep = prog.length ? prog[prog.length - 1] : undefined;
      const resolved = assigned ?? bestStep?.level ?? tierToIntrinsicRank(activeDef.tier);
      setRankState(resolved);

      if (!nextSeries && bestStep) {
        setSelectedSeriesId(bestStep.seriesId);
        setSelectedSeasonNumber(bestStep.seasonNumber);
      }

      if (isHighTierAbility(activeDef.tier, resolved)) {
        const holder = (holdersMap.get(normalizeAbilityKey(activeDef.key)) ?? []).find(
          (h) => h.id === entityId,
        );
        triggerAbilityImpact({
          abilityKey: activeDef.key,
          rank: resolved,
          characterName: holder?.name,
          force: true,
          reason: "high-tier",
        });
      }
    },
    [
      activeDef.key,
      activeDef.tier,
      resolveCharacterRank,
      getCharacterSeasonProgression,
      holdersMap,
      triggerAbilityImpact,
    ],
  );

  const setSeasonScope = useCallback(
    (seriesId: string | null, seasonNumber: number | null) => {
      setSelectedSeriesId(seriesId);
      setSelectedSeasonNumber(seasonNumber);
      if (!selectedEntityId) return;
      const assigned = resolveCharacterRank(
        selectedEntityId,
        activeDef.key,
        seriesId,
        seasonNumber,
      );
      if (assigned) {
        setRankState(assigned);
        if (assigned >= 4) {
          triggerAbilityImpact({
            abilityKey: activeDef.key,
            rank: assigned,
            force: true,
            reason: "high-tier",
          });
        }
      }
    },
    [selectedEntityId, activeDef.key, resolveCharacterRank, triggerAbilityImpact],
  );

  const value = useMemo<AbilityContextValue>(
    () => ({
      abilityKey,
      activeDef,
      rank,
      selectedEntityId,
      selectedEntity,
      selectedSeriesId,
      selectedSeasonNumber,
      boosted,
      fps,
      hubAbilities,
      holdersMap,
      canonNamesMap,
      assignments,
      selectedProgression,
      abilityImpact,
      selectAbility,
      setRank,
      selectWielder,
      setSeasonScope,
      setBoosted,
      setFps,
      triggerAbilityImpact,
      clearAbilityImpact,
      resolveCharacterRank,
      getCharacterSeasonProgression,
    }),
    [
      abilityKey,
      activeDef,
      rank,
      selectedEntityId,
      selectedEntity,
      selectedSeriesId,
      selectedSeasonNumber,
      boosted,
      fps,
      hubAbilities,
      holdersMap,
      canonNamesMap,
      assignments,
      selectedProgression,
      abilityImpact,
      selectAbility,
      setRank,
      selectWielder,
      setSeasonScope,
      setBoosted,
      setFps,
      triggerAbilityImpact,
      clearAbilityImpact,
      resolveCharacterRank,
      getCharacterSeasonProgression,
    ],
  );

  return <AbilityContext.Provider value={value}>{children}</AbilityContext.Provider>;
}

export function useOptionalAbilityContext(): AbilityContextValue | null {
  return useContext(AbilityContext);
}

export function useAbilityContext(): AbilityContextValue {
  const ctx = useContext(AbilityContext);
  if (!ctx) {
    throw new Error("useAbilityContext must be used inside <AbilityProvider>");
  }
  return ctx;
}
