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
import {
  ABILITY_USAGE_EVENT,
  canonicalAbilityUsageKey,
  getAllAbilityUsageCounts,
  recordAbilityUsage,
} from "@/lib/ability-benefits";
import {
  triggerAbilityRankUpHaptic,
  triggerLegendaryRankUpConfetti,
} from "@/lib/ability-celebration";

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

export interface ActiveCharacterAbility {
  abilityKey: string;
  canonKey: string;
  def: AbilityDef;
  rank: AbilityEmblemRank;
  seriesId: string | null;
  seasonNumber: number | null;
  steps: AbilitySeasonStep[];
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
  performanceMode: boolean;
  hubAbilities: AbilityDef[];
  holdersMap: Map<string, Entity[]>;
  canonNamesMap: Map<string, string[]>;
  assignments: CharacterAbilityAssignment[];
  activeCharacterAbilities: ActiveCharacterAbility[];
  characterAbilityRankMap: Map<string, AbilityEmblemRank>;
  selectedProgression: AbilitySeasonStep[];
  abilityImpact: AbilityImpactState | null;
  usageCounts: Record<string, number>;
  getUsageCount: (key: string) => number;
  recordAbilityUse: (key: string, amount?: number) => number;
  selectAbility: (
    key: string,
    opts?: {
      rank?: AbilityEmblemRank | undefined;
      entityId?: string | null | undefined;
      seriesId?: string | null | undefined;
      seasonNumber?: number | null | undefined;
      triggerImpact?: boolean | undefined;
      trackUsage?: boolean | undefined;
    },
  ) => void;
  setRank: (
    rank: AbilityEmblemRank,
    opts?: {
      triggerImpact?: boolean | undefined;
      celebrateOnApex?: boolean | undefined;
      originElement?: HTMLElement | null | undefined;
    },
  ) => void;
  setCharacterAbilityRank: (
    key: string,
    rank: AbilityEmblemRank,
    opts?: {
      triggerImpact?: boolean | undefined;
      celebrateOnApex?: boolean | undefined;
      originElement?: HTMLElement | null | undefined;
    },
  ) => void;
  getActiveAbilityRank: (key: string) => AbilityEmblemRank | undefined;
  selectWielder: (
    entityId: string | null,
    scope?: { seriesId?: string | null | undefined; seasonNumber?: number | null | undefined },
  ) => void;
  setSeasonScope: (seriesId: string | null, seasonNumber: number | null) => void;
  setBoosted: (next: boolean | ((prev: boolean) => boolean)) => void;
  setFps: (fps: 24 | 30 | 60) => void;
  setPerformanceMode: (next: boolean | ((prev: boolean) => boolean)) => void;
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

export interface PerformanceFxCaps {
  /** Preserved semantic progression rank (1-5) for colors, milestone bezels, and apex badges. */
  visualRank: AbilityEmblemRank;
  /** Complexity budget rank capped at 3 for Ranks 4-5 when performanceMode is active. */
  complexityRank: AbilityEmblemRank;
  /** DevicePixelRatio cap (1 in performanceMode, 2 otherwise). */
  maxDpr: number;
  /** Target frame rate ceiling (24 in performanceMode, 60 otherwise). */
  maxFps: number;
  /** Effective recipe power ceiling (5 in performanceMode, 8 otherwise). */
  maxPower: number;
}

export function resolvePerformanceFxCaps(
  rank: AbilityEmblemRank,
  performanceMode: boolean,
): PerformanceFxCaps {
  if (!performanceMode) {
    return {
      visualRank: rank,
      complexityRank: rank,
      maxDpr: 2,
      maxFps: 60,
      maxPower: 8,
    };
  }
  return {
    visualRank: rank,
    complexityRank: (rank > 3 ? 3 : rank) as AbilityEmblemRank,
    maxDpr: 1,
    maxFps: 24,
    maxPower: 5,
  };
}

export const CHARACTER_ABILITIES_ALL_QK = ["character-abilities"] as const;
export const ABILITY_PERFORMANCE_STORAGE_KEY = "scu-ability-performance-mode";
const IMPACT_DURATION_MS = 1400;

function readInitialPerformanceMode(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ABILITY_PERFORMANCE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isHighTierAbility(tier: AbilityTier, rank: AbilityEmblemRank): boolean {
  return tier === "Mythic" || tier === "Legendary" || rank >= 4;
}

const AbilityContext = createContext<AbilityContextValue | null>(null);

export function AbilityProvider({
  children,
  initialAbility = "red_lightning",
  initialPerformanceMode,
}: {
  children: ReactNode;
  initialAbility?: string | undefined;
  initialPerformanceMode?: boolean | undefined;
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
  const [performanceMode, setPerformanceModeState] = useState<boolean>(() =>
    readInitialPerformanceMode(initialPerformanceMode),
  );
  const [abilityImpact, setAbilityImpact] = useState<AbilityImpactState | null>(null);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() =>
    getAllAbilityUsageCounts(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncUsage = () => setUsageCounts(getAllAbilityUsageCounts());
    window.addEventListener(ABILITY_USAGE_EVENT, syncUsage);
    window.addEventListener("storage", syncUsage);
    return () => {
      window.removeEventListener(ABILITY_USAGE_EVENT, syncUsage);
      window.removeEventListener("storage", syncUsage);
    };
  }, []);

  const getUsageCount = useCallback(
    (key: string) => {
      const canon = canonicalAbilityUsageKey(key);
      return usageCounts[canon] ?? 0;
    },
    [usageCounts],
  );

  const recordAbilityUse = useCallback((key: string, amount = 1) => {
    const next = recordAbilityUsage(key, amount);
    setUsageCounts(getAllAbilityUsageCounts());
    return next;
  }, []);

  const setPerformanceMode = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setPerformanceModeState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      try {
        window.localStorage.setItem(ABILITY_PERFORMANCE_STORAGE_KEY, resolved ? "1" : "0");
      } catch {
        // ignore storage unavailability
      }
      return resolved;
    });
  }, []);
  const [sessionRankOverrides, setSessionRankOverrides] = useState<
    Record<string, AbilityEmblemRank>
  >({});

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

  const makeOverrideScopeKey = useCallback(
    (
      entityId: string | null,
      key: string,
      seriesId: string | null,
      seasonNumber: number | null,
    ) => {
      const canon = resolveAbilityAliasPure(abilityDef(key).key);
      return `${entityId ?? "global"}::${canon}::${seriesId ?? "all"}::${seasonNumber ?? "all"}`;
    },
    [],
  );

  const resolveCharacterRank = useCallback(
    (
      entityId: string,
      key: string,
      seriesId?: string | null,
      seasonNumber?: number | null,
    ): AbilityEmblemRank | undefined => {
      const scopedOverride =
        sessionRankOverrides[
          makeOverrideScopeKey(entityId, key, seriesId ?? null, seasonNumber ?? null)
        ];
      if (scopedOverride) return scopedOverride;
      const rows = assignments.filter((r) => r.entity_id === entityId);
      if (!rows.length) return undefined;
      const map = buildAbilityRankMap(rows, {
        seriesId: seriesId ?? null,
        seasonNumber: seasonNumber ?? null,
        includePriorSeasons: true,
      });
      return resolveAssignedAbilityRank(key, map);
    },
    [assignments, sessionRankOverrides, makeOverrideScopeKey],
  );

  const getCharacterSeasonProgression = useCallback(
    (entityId: string, key: string): AbilitySeasonStep[] => {
      const targetCanon = resolveAbilityAliasPure(abilityDef(key).key);
      return assignments
        .filter(
          (r) => r.entity_id === entityId && resolveAbilityAliasPure(r.ability_key) === targetCanon,
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
    () => (selectedEntityId ? getCharacterSeasonProgression(selectedEntityId, activeDef.key) : []),
    [selectedEntityId, activeDef.key, getCharacterSeasonProgression],
  );

  const activeCharacterAbilities = useMemo<ActiveCharacterAbility[]>(() => {
    const byCanon = new Map<string, ActiveCharacterAbility>();

    if (selectedEntityId) {
      const charRows = assignments.filter((r) => r.entity_id === selectedEntityId);
      const seenKeys = new Map<string, string>();
      for (const row of charRows) {
        const resolvedDef = abilityDef(row.ability_key);
        const canon = resolveAbilityAliasPure(resolvedDef.key);
        if (!seenKeys.has(canon)) {
          seenKeys.set(canon, resolvedDef.key);
        }
      }
      for (const [canon, repKey] of seenKeys.entries()) {
        const defObj = abilityDef(repKey);
        const steps = getCharacterSeasonProgression(selectedEntityId, repKey);
        const lastStep = steps.length ? steps[steps.length - 1] : undefined;
        const scopedRank =
          resolveCharacterRank(selectedEntityId, repKey, selectedSeriesId, selectedSeasonNumber) ??
          lastStep?.level ??
          tierToIntrinsicRank(defObj.tier);
        byCanon.set(canon, {
          abilityKey: defObj.key,
          canonKey: canon,
          def: defObj,
          rank: scopedRank,
          seriesId: selectedSeriesId ?? lastStep?.seriesId ?? null,
          seasonNumber: selectedSeasonNumber ?? lastStep?.seasonNumber ?? null,
          steps,
        });
      }
    }

    // Include any runtime rank overrides tracked for the active context/character
    const activeCanon = resolveAbilityAliasPure(activeDef.key);
    const activeOverrideRank =
      sessionRankOverrides[
        makeOverrideScopeKey(
          selectedEntityId,
          activeDef.key,
          selectedSeriesId,
          selectedSeasonNumber,
        )
      ];
    const effectiveActiveRank = activeOverrideRank ?? rank;
    const existingActive = byCanon.get(activeCanon);
    if (existingActive) {
      byCanon.set(activeCanon, {
        ...existingActive,
        rank: effectiveActiveRank,
      });
    } else if (selectedEntityId || rank !== tierToIntrinsicRank(activeDef.tier)) {
      byCanon.set(activeCanon, {
        abilityKey: activeDef.key,
        canonKey: activeCanon,
        def: activeDef,
        rank: effectiveActiveRank,
        seriesId: selectedSeriesId,
        seasonNumber: selectedSeasonNumber,
        steps: selectedProgression,
      });
    }

    return [...byCanon.values()];
  }, [
    selectedEntityId,
    assignments,
    getCharacterSeasonProgression,
    resolveCharacterRank,
    selectedSeriesId,
    selectedSeasonNumber,
    activeDef,
    rank,
    selectedProgression,
    sessionRankOverrides,
    makeOverrideScopeKey,
  ]);

  const characterAbilityRankMap = useMemo(() => {
    const map = new Map<string, AbilityEmblemRank>();
    for (const item of activeCharacterAbilities) {
      map.set(item.canonKey, item.rank);
    }
    map.set(resolveAbilityAliasPure(activeDef.key), rank);
    return map;
  }, [activeCharacterAbilities, activeDef.key, rank]);

  const getActiveAbilityRank = useCallback(
    (key: string): AbilityEmblemRank | undefined => {
      const targetDef = abilityDef(key);
      const canon = resolveAbilityAliasPure(targetDef.key);
      if (targetDef.key === activeDef.key || canon === resolveAbilityAliasPure(activeDef.key)) {
        return rank;
      }
      const tracked = characterAbilityRankMap.get(canon);
      if (tracked) return tracked;
      if (selectedEntityId) {
        return resolveCharacterRank(
          selectedEntityId,
          targetDef.key,
          selectedSeriesId,
          selectedSeasonNumber,
        );
      }
      return undefined;
    },
    [
      activeDef.key,
      rank,
      characterAbilityRankMap,
      selectedEntityId,
      resolveCharacterRank,
      selectedSeriesId,
      selectedSeasonNumber,
    ],
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

      if (overrides?.force || overrides?.reason === "manual") {
        recordAbilityUse(targetDef.key, 1);
      }

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
    [abilityKey, rank, boosted, selectedEntity?.name, recordAbilityUse],
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
        trackUsage?: boolean | undefined;
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

      if (opts?.trackUsage !== false) {
        recordAbilityUse(nextDef.key, 1);
      }

      if (opts?.triggerImpact !== false && isHighTierAbility(nextDef.tier, nextRank)) {
        const holderName = resolvedEntityId
          ? (holdersMap
              .get(normalizeAbilityKey(nextDef.key))
              ?.find((h) => h.id === resolvedEntityId)?.name ?? undefined)
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
      recordAbilityUse,
    ],
  );

  const setRank = useCallback(
    (
      nextRank: AbilityEmblemRank,
      opts?: {
        triggerImpact?: boolean | undefined;
        celebrateOnApex?: boolean | undefined;
        originElement?: HTMLElement | null | undefined;
      },
    ) => {
      const clamped = clampDbAbilityLevel(nextRank);
      const prevRank = rank;
      setRankState(clamped);
      const scopeKey = makeOverrideScopeKey(
        selectedEntityId,
        abilityKey,
        selectedSeriesId,
        selectedSeasonNumber,
      );
      setSessionRankOverrides((prev) =>
        prev[scopeKey] === clamped ? prev : { ...prev, [scopeKey]: clamped },
      );
      if (clamped > prevRank) {
        recordAbilityUse(abilityKey, 1);
        triggerAbilityRankUpHaptic(clamped, {
          previousRank: prevRank,
          abilityKey,
        });
      }
      if (opts?.celebrateOnApex !== false && prevRank < 5 && clamped === 5) {
        triggerLegendaryRankUpConfetti({
          originElement: opts?.originElement,
          accentColor: activeDef.color,
        });
      }
      if (opts?.triggerImpact || clamped >= 4) {
        triggerAbilityImpact({
          abilityKey,
          rank: clamped,
          force: opts?.triggerImpact || clamped >= 4,
          reason: opts?.triggerImpact ? "manual" : "high-tier",
        });
      }
    },
    [
      rank,
      abilityKey,
      activeDef.color,
      selectedEntityId,
      selectedSeriesId,
      selectedSeasonNumber,
      makeOverrideScopeKey,
      recordAbilityUse,
      triggerAbilityImpact,
    ],
  );

  const setCharacterAbilityRank = useCallback(
    (
      targetKey: string,
      nextRank: AbilityEmblemRank,
      opts?: {
        triggerImpact?: boolean | undefined;
        celebrateOnApex?: boolean | undefined;
        originElement?: HTMLElement | null | undefined;
      },
    ) => {
      const resolvedDef = abilityDef(targetKey);
      const clamped = clampDbAbilityLevel(nextRank);
      const scopeKey = makeOverrideScopeKey(
        selectedEntityId,
        resolvedDef.key,
        selectedSeriesId,
        selectedSeasonNumber,
      );
      const prevKnownRank =
        sessionRankOverrides[scopeKey] ??
        getActiveAbilityRank(resolvedDef.key) ??
        tierToIntrinsicRank(resolvedDef.tier);
      setSessionRankOverrides((prev) =>
        prev[scopeKey] === clamped ? prev : { ...prev, [scopeKey]: clamped },
      );
      if (
        resolvedDef.key === activeDef.key ||
        resolveAbilityAliasPure(resolvedDef.key) === resolveAbilityAliasPure(activeDef.key)
      ) {
        setRankState(clamped);
      }
      if (clamped > prevKnownRank) {
        recordAbilityUse(resolvedDef.key, 1);
        triggerAbilityRankUpHaptic(clamped, {
          previousRank: prevKnownRank,
          abilityKey: resolvedDef.key,
        });
      }
      if (opts?.celebrateOnApex !== false && prevKnownRank < 5 && clamped === 5) {
        triggerLegendaryRankUpConfetti({
          originElement: opts?.originElement,
          accentColor: resolvedDef.color,
        });
      }
      if (opts?.triggerImpact || clamped >= 4) {
        triggerAbilityImpact({
          abilityKey: resolvedDef.key,
          rank: clamped,
          force: opts?.triggerImpact || clamped >= 4,
          reason: opts?.triggerImpact ? "manual" : "high-tier",
        });
      }
    },
    [
      activeDef.key,
      selectedEntityId,
      selectedSeriesId,
      selectedSeasonNumber,
      makeOverrideScopeKey,
      sessionRankOverrides,
      getActiveAbilityRank,
      recordAbilityUse,
      triggerAbilityImpact,
    ],
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
      performanceMode,
      hubAbilities,
      holdersMap,
      canonNamesMap,
      assignments,
      activeCharacterAbilities,
      characterAbilityRankMap,
      selectedProgression,
      abilityImpact,
      usageCounts,
      getUsageCount,
      recordAbilityUse,
      selectAbility,
      setRank,
      setCharacterAbilityRank,
      getActiveAbilityRank,
      selectWielder,
      setSeasonScope,
      setBoosted,
      setFps,
      setPerformanceMode,
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
      performanceMode,
      hubAbilities,
      holdersMap,
      canonNamesMap,
      assignments,
      activeCharacterAbilities,
      characterAbilityRankMap,
      selectedProgression,
      abilityImpact,
      usageCounts,
      getUsageCount,
      recordAbilityUse,
      selectAbility,
      setRank,
      setCharacterAbilityRank,
      getActiveAbilityRank,
      selectWielder,
      setSeasonScope,
      setBoosted,
      setFps,
      setPerformanceMode,
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
