import {
  ABILITY_GROUP_LABELS,
  abilityDef,
  type AbilityGroup,
  type AbilityTier,
} from "@/lib/abilities";
import { abilityFxRecipe, simulateCombat, type CombatStats } from "@/lib/ability-fx";
import {
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  resolveAbilityAliasPure,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";

export const ABILITY_USAGE_STORAGE_KEY = "scu-ability-usage-counts";
export const ABILITY_USAGE_EVENT = "scu-ability-usage-change";

export interface AbilityRankBenefitItem {
  id: string;
  title: string;
  metric: string;
  detail: string;
  unlockedAtRank: AbilityEmblemRank;
}

export interface AbilityRankBenefitProfile {
  abilityKey: string;
  label: string;
  tier: AbilityTier;
  group: AbilityGroup;
  rank: AbilityEmblemRank;
  rankLabel: string;
  shortTitle: string;
  roman: string;
  ringColor: string;
  summary: string;
  potencyBonusPct: number;
  cooldownReductionPct: number;
  energyEfficiencyPct: number;
  fxPower: number;
  combat: CombatStats;
  benefits: AbilityRankBenefitItem[];
}

export interface AbilityRankStatComparison {
  id: string;
  label: string;
  unit: string;
  current: number;
  next: number;
  delta: number;
  maxScale: number;
}

export interface AbilityRankComparisonResult {
  currentRank: AbilityEmblemRank;
  targetRank: AbilityEmblemRank;
  isMaxRank: boolean;
  current: AbilityRankBenefitProfile;
  next: AbilityRankBenefitProfile;
  stats: AbilityRankStatComparison[];
  newlyUnlockedBenefits: AbilityRankBenefitItem[];
}

export interface TopUsedAbilityEntry {
  key: string;
  label: string;
  color: string;
  tier: AbilityTier;
  count: number;
  sharePct: number;
}

const RANK_POTENCY_BONUS: Record<AbilityEmblemRank, number> = {
  1: 0,
  2: 18,
  3: 38,
  4: 62,
  5: 95,
};

const RANK_COOLDOWN_REDUCTION: Record<AbilityEmblemRank, number> = {
  1: 0,
  2: 10,
  3: 20,
  4: 32,
  5: 45,
};

const RANK_ENERGY_EFFICIENCY: Record<AbilityEmblemRank, number> = {
  1: 0,
  2: 12,
  3: 24,
  4: 36,
  5: 50,
};

const GROUP_SPECIALTY_TITLE: Record<AbilityGroup, Record<AbilityEmblemRank, string>> = {
  power: {
    1: "Kinetic Foundation",
    2: "Surge Conduit",
    3: "Tactical Overclock",
    4: "Sovereign Output",
    5: "Apex Singularity",
  },
  beast: {
    1: "Primal Reflexes",
    2: "Predator Stride",
    3: "Feral Synchronization",
    4: "Apex Instinct",
    5: "Mythic Manifestation",
  },
  element: {
    1: "Elemental Spark",
    2: "Harmonic Channeling",
    3: "Field Saturation",
    4: "Cataclysmic Convergence",
    5: "Guardian Ascension",
  },
  role: {
    1: "Operational Readiness",
    2: "Field Coordination",
    3: "Command Horizon",
    4: "Master Protocol",
    5: "Supreme Authority",
  },
  art: {
    1: "Basic Kata & Form",
    2: "Fluid Execution",
    3: "Technique Mastery",
    4: "Grandmaster Cadence",
    5: "Transcendent Art",
  },
};

const RANK_SUMMARY_TEMPLATES: Record<AbilityEmblemRank, string> = {
  1: "Establishes baseline activation control and reliable close-to-mid deployment.",
  2: "Sharpens projection speed and reduces recovery time between activations.",
  3: "Unlocks harmonic field attunement, widening combat reach and sustained pressure.",
  4: "Channels high-tier mastery resonance with major potency amplification and minimal drain.",
  5: "Unleashes Legendary Apex dominion: peak output, extended aura reach, and sovereign override.",
};

export function canonicalAbilityUsageKey(key: string): string {
  const def = abilityDef(key);
  return resolveAbilityAliasPure(def.key);
}

export function getAllAbilityUsageCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ABILITY_USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        const canon = canonicalAbilityUsageKey(k);
        out[canon] = (out[canon] ?? 0) + Math.floor(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getAbilityUsageCount(key: string): number {
  const canon = canonicalAbilityUsageKey(key);
  const all = getAllAbilityUsageCounts();
  return all[canon] ?? 0;
}

export function recordAbilityUsage(key: string, amount = 1): number {
  if (!key || !key.trim()) return 0;
  const canon = canonicalAbilityUsageKey(key);
  const step = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  const all = getAllAbilityUsageCounts();
  const nextCount = (all[canon] ?? 0) + step;
  all[canon] = nextCount;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ABILITY_USAGE_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore storage write failures in restricted environments
    }
    try {
      window.dispatchEvent(
        new CustomEvent(ABILITY_USAGE_EVENT, {
          detail: { key: canon, count: nextCount, counts: all },
        }),
      );
    } catch {
      // ignore event dispatch errors
    }
  }
  return nextCount;
}

export function resetAbilityUsageCounts(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ABILITY_USAGE_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(ABILITY_USAGE_EVENT, {
        detail: { key: null, count: 0, counts: {} },
      }),
    );
  } catch {
    // ignore storage errors
  }
}

export function getTotalAbilityUsageCount(countsMap?: Record<string, number>): number {
  const map = countsMap ?? getAllAbilityUsageCounts();
  let total = 0;
  for (const val of Object.values(map)) {
    if (typeof val === "number" && Number.isFinite(val) && val > 0) {
      total += val;
    }
  }
  return total;
}

export function getTopUsedAbilities(
  limit = 5,
  countsMap?: Record<string, number>,
): TopUsedAbilityEntry[] {
  const map = countsMap ?? getAllAbilityUsageCounts();
  const total = getTotalAbilityUsageCount(map);
  if (total <= 0) return [];
  return Object.entries(map)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, limit))
    .map(([key, count]) => {
      const def = abilityDef(key);
      return {
        key: def.key,
        label: def.label,
        color: def.color,
        tier: def.tier,
        count,
        sharePct: Math.round((count / total) * 100),
      };
    });
}

export function getAbilityRankBenefits(
  abilityKey: string,
  rankInput: number | undefined,
): AbilityRankBenefitProfile {
  const def = abilityDef(abilityKey);
  const rank = clampDbAbilityLevel(rankInput);
  const meta = ABILITY_RANK_META[rank];
  const combat = simulateCombat(def.key, def.tier, rank);
  const recipe = abilityFxRecipe(def.key, rank);
  const potencyBonusPct = RANK_POTENCY_BONUS[rank];
  const cooldownReductionPct = RANK_COOLDOWN_REDUCTION[rank];
  const energyEfficiencyPct = RANK_ENERGY_EFFICIENCY[rank];
  const specialty = GROUP_SPECIALTY_TITLE[def.group][rank];
  const groupName = ABILITY_GROUP_LABELS[def.group];

  const benefits: AbilityRankBenefitItem[] = [
    {
      id: "potency",
      title: specialty,
      metric: potencyBonusPct > 0 ? `+${potencyBonusPct}% Potency` : "Baseline 100%",
      detail: `Scales ${def.label} strike force to ${combat.damage}/100 and FX intensity to ${recipe.power}/8.`,
      unlockedAtRank: 1,
    },
    {
      id: "reach",
      title: `${combat.role} Envelope`,
      metric: `≈ ${combat.meters} m reach`,
      detail: `Extends effective operational zone (${combat.range}/100 range, ${combat.mobility}/100 mobility) across ${groupName.toLowerCase()} encounters.`,
      unlockedAtRank: 1,
    },
  ];

  if (rank >= 2) {
    benefits.push({
      id: "cadence",
      title: "Rapid Recovery Cadence",
      metric: `-${cooldownReductionPct}% Cooldown`,
      detail: `Cuts recovery delay between chained ${def.label} bursts and trims energy cost by ${energyEfficiencyPct}%.`,
      unlockedAtRank: 2,
    });
  }

  if (rank >= 3) {
    benefits.push({
      id: "attunement",
      title: "Harmonic Field Attunement",
      metric: `${combat.speed}/100 Tempo`,
      detail: `Stabilizes prolonged resonance so ${def.tier}-tier effects hold pressure even under contested terrain.`,
      unlockedAtRank: 3,
    });
  }

  if (rank >= 4) {
    benefits.push({
      id: "mastery",
      title: "High-Tier Impact Trigger",
      metric: "Action Cut Enabled",
      detail: `Unlocks Master-class visual overdrive, piercing guard thresholds and amplifying burst follow-through.`,
      unlockedAtRank: 4,
    });
  }

  if (rank >= 5) {
    benefits.push({
      id: "legendary-apex",
      title: "Legendary Apex Aura",
      metric: "Peak Rank V",
      detail: `Grants sovereign corona presence with maximum ${combat.meters} m reach, -${cooldownReductionPct}% cooldown, and peak ${recipe.power}/8 spectacle.`,
      unlockedAtRank: 5,
    });
  }

  return {
    abilityKey: def.key,
    label: def.label,
    tier: def.tier,
    group: def.group,
    rank,
    rankLabel: meta.label,
    shortTitle: meta.shortTitle,
    roman: meta.roman,
    ringColor: meta.ringColor,
    summary: RANK_SUMMARY_TEMPLATES[rank],
    potencyBonusPct,
    cooldownReductionPct,
    energyEfficiencyPct,
    fxPower: recipe.power,
    combat,
    benefits,
  };
}

export function compareAbilityRanks(
  abilityKey: string,
  currentRankInput: number | undefined,
  explicitTargetRank?: number | undefined,
): AbilityRankComparisonResult {
  const currentRank = clampDbAbilityLevel(currentRankInput);
  const isMaxRank = currentRank === 5;
  const fallbackTarget: AbilityEmblemRank = isMaxRank
    ? 5
    : ((currentRank + 1) as AbilityEmblemRank);
  const targetRank = explicitTargetRank ? clampDbAbilityLevel(explicitTargetRank) : fallbackTarget;

  const current = getAbilityRankBenefits(abilityKey, currentRank);
  const next = getAbilityRankBenefits(abilityKey, targetRank);

  const stats: AbilityRankStatComparison[] = [
    {
      id: "damage",
      label: "Damage",
      unit: "",
      current: current.combat.damage,
      next: next.combat.damage,
      delta: next.combat.damage - current.combat.damage,
      maxScale: 100,
    },
    {
      id: "speed",
      label: "Speed",
      unit: "",
      current: current.combat.speed,
      next: next.combat.speed,
      delta: next.combat.speed - current.combat.speed,
      maxScale: 100,
    },
    {
      id: "range",
      label: "Range",
      unit: "",
      current: current.combat.range,
      next: next.combat.range,
      delta: next.combat.range - current.combat.range,
      maxScale: 100,
    },
    {
      id: "mobility",
      label: "Mobility",
      unit: "",
      current: current.combat.mobility,
      next: next.combat.mobility,
      delta: next.combat.mobility - current.combat.mobility,
      maxScale: 100,
    },
    {
      id: "meters",
      label: "Effective Reach",
      unit: "m",
      current: current.combat.meters,
      next: next.combat.meters,
      delta: next.combat.meters - current.combat.meters,
      maxScale: 80,
    },
    {
      id: "fxPower",
      label: "FX Intensity",
      unit: "/8",
      current: current.fxPower,
      next: next.fxPower,
      delta: next.fxPower - current.fxPower,
      maxScale: 8,
    },
    {
      id: "potency",
      label: "Potency Bonus",
      unit: "%",
      current: current.potencyBonusPct,
      next: next.potencyBonusPct,
      delta: next.potencyBonusPct - current.potencyBonusPct,
      maxScale: 100,
    },
    {
      id: "cooldown",
      label: "Cooldown Reduction",
      unit: "%",
      current: current.cooldownReductionPct,
      next: next.cooldownReductionPct,
      delta: next.cooldownReductionPct - current.cooldownReductionPct,
      maxScale: 50,
    },
  ];

  const newlyUnlockedBenefits =
    targetRank > currentRank
      ? next.benefits.filter(
          (b) => b.unlockedAtRank > currentRank && b.unlockedAtRank <= targetRank,
        )
      : next.benefits.filter((b) => b.unlockedAtRank === targetRank);

  return {
    currentRank,
    targetRank,
    isMaxRank,
    current,
    next,
    stats,
    newlyUnlockedBenefits,
  };
}
