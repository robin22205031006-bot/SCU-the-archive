import { ABILITY_REGISTRY, abilityDef, type AbilityGroup, type AbilityTier } from "@/lib/abilities";
import { abilityFxRecipe, FX_LINEAGES, simulateCombat, type FxMotif } from "@/lib/ability-fx";
import { canonicalAbilityUsageKey, getAllAbilityUsageCounts } from "@/lib/ability-benefits";
import {
  clampDbAbilityLevel,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";

export const ABILITY_SET_STORAGE_KEY = "scu-ability-active-set";
export const ABILITY_SET_EVENT = "scu-ability-set-change";

export type SynergyKind = "ascension" | "amplify" | "sustain" | "tempo" | "control";
export type SynergyDirection = "buffs-partner" | "buffed-by-partner" | "mutual";
export type SetMemberOrigin = "character" | "active-set" | "usage";

export interface AbilitySetMember {
  key: string;
  rank: AbilityEmblemRank;
  origin: SetMemberOrigin;
}

export interface SynergyBuffEffect {
  metric: string;
  deltaLabel: string;
  value: number;
  target: "set" | "partner" | "source";
}

export interface AbilitySynergyConnection {
  id: string;
  sourceKey: string;
  partnerKey: string;
  partnerLabel: string;
  partnerColor: string;
  partnerTier: AbilityTier;
  partnerGroup: AbilityGroup;
  partnerRank: AbilityEmblemRank;
  partnerOrigin: SetMemberOrigin;
  kind: SynergyKind;
  kindLabel: string;
  kindColor: string;
  direction: SynergyDirection;
  title: string;
  description: string;
  strength: number;
  buffs: SynergyBuffEffect[];
}

export interface SynergyCandidate {
  key: string;
  label: string;
  color: string;
  tier: AbilityTier;
  rank: AbilityEmblemRank;
  title: string;
  kindLabel: string;
  kindColor: string;
  strength: number;
  primaryBuffLabel: string;
}

export interface AbilitySynergySummary {
  focalKey: string;
  focalRank: AbilityEmblemRank;
  setMembers: AbilitySetMember[];
  connections: AbilitySynergyConnection[];
  recommendedCandidates: SynergyCandidate[];
  aggregateBuffs: {
    damagePct: number;
    cooldownReductionPct: number;
    reachMeters: number;
    speedPct: number;
  };
}

export const SYNERGY_KIND_META: Record<SynergyKind, { label: string; color: string }> = {
  ascension: { label: "Lineage Ascension", color: "#fbbf24" },
  amplify: { label: "Damage Amplification", color: "#f97316" },
  tempo: { label: "Tempo Overdrive", color: "#38bdf8" },
  sustain: { label: "Sustain Relay", color: "#34d399" },
  control: { label: "Field Resonance", color: "#a855f7" },
};

interface MotifPairRule {
  motifs: [FxMotif, FxMotif];
  kind: SynergyKind;
  title: string;
  description: (aLabel: string, bLabel: string) => string;
  baseStrength: number;
  damageBase: number;
  speedBase: number;
  cdBase: number;
  reachBase: number;
}

const MOTIF_SYNERGY_RULES: MotifPairRule[] = [
  {
    motifs: ["wind", "flame"],
    kind: "amplify",
    title: "Gale-Fed Inferno",
    description: (a, b) =>
      `${a} and ${b} supercharge combustion currents, expanding thermal sweep and ignition reach.`,
    baseStrength: 88,
    damageBase: 14,
    speedBase: 6,
    cdBase: 0,
    reachBase: 6,
  },
  {
    motifs: ["water", "lightning"],
    kind: "amplify",
    title: "Storm-Conductive Surge",
    description: (a, b) =>
      `Conductive mist links ${a} with ${b}, chaining arc strikes across soaked combat zones.`,
    baseStrength: 90,
    damageBase: 15,
    speedBase: 10,
    cdBase: 0,
    reachBase: 5,
  },
  {
    motifs: ["water", "frost"],
    kind: "control",
    title: "Glacial Tide Lock",
    description: (a, b) =>
      `${a} saturates the arena so ${b} flash-freezes terrain vectors and slows enemy tempo.`,
    baseStrength: 86,
    damageBase: 8,
    speedBase: 0,
    cdBase: 10,
    reachBase: 7,
  },
  {
    motifs: ["earth", "nature"],
    kind: "sustain",
    title: "Living Bastion",
    description: (a, b) =>
      `${a} anchors defensive stone ridges while ${b} regenerates barrier integrity over time.`,
    baseStrength: 84,
    damageBase: 6,
    speedBase: 0,
    cdBase: 11,
    reachBase: 5,
  },
  {
    motifs: ["flame", "blade"],
    kind: "amplify",
    title: "Cauterizing Edge",
    description: (a, b) =>
      `Thermal discharge from ${a} coats ${b} strikes with searing follow-through arcs.`,
    baseStrength: 82,
    damageBase: 14,
    speedBase: 6,
    cdBase: 0,
    reachBase: 3,
  },
  {
    motifs: ["shadow", "portal"],
    kind: "tempo",
    title: "Umbral Warp Vector",
    description: (a, b) =>
      `${a} conceals spatial rifts opened by ${b}, cutting reposition latency during flanks.`,
    baseStrength: 87,
    damageBase: 8,
    speedBase: 14,
    cdBase: 9,
    reachBase: 6,
  },
  {
    motifs: ["shadow", "blade"],
    kind: "tempo",
    title: "Nightfall Ambush",
    description: (a, b) =>
      `${a} shrouds approach angles so ${b} lands critical close-quarters pressure earlier.`,
    baseStrength: 82,
    damageBase: 11,
    speedBase: 12,
    cdBase: 6,
    reachBase: 2,
  },
  {
    motifs: ["arcane", "void"],
    kind: "control",
    title: "Aetheric Singularity",
    description: (a, b) =>
      `${a} sigil matrices stabilize ${b} distortion fields, widening command radius.`,
    baseStrength: 89,
    damageBase: 12,
    speedBase: 4,
    cdBase: 8,
    reachBase: 8,
  },
  {
    motifs: ["chrono", "arcane"],
    kind: "tempo",
    title: "Temporal Sigil Relay",
    description: (a, b) =>
      `Time dilation from ${a} accelerates casting cadence and cooldown recovery on ${b}.`,
    baseStrength: 88,
    damageBase: 6,
    speedBase: 14,
    cdBase: 14,
    reachBase: 4,
  },
  {
    motifs: ["tech", "lightning"],
    kind: "tempo",
    title: "Capacitor Overdrive",
    description: (a, b) =>
      `${a} harnesses excess arc output from ${b} to cycle reactor bursts faster.`,
    baseStrength: 85,
    damageBase: 10,
    speedBase: 10,
    cdBase: 12,
    reachBase: 4,
  },
  {
    motifs: ["tech", "beam"],
    kind: "amplify",
    title: "Focused Emitter Array",
    description: (a, b) =>
      `Precision telemetry from ${a} concentrates ${b} beams for extended long-range penetration.`,
    baseStrength: 84,
    damageBase: 12,
    speedBase: 6,
    cdBase: 6,
    reachBase: 8,
  },
  {
    motifs: ["blood", "flame"],
    kind: "amplify",
    title: "Crimson Ignition",
    description: (a, b) =>
      `Volatile ignition from ${b} turns ${a} constructs into pressurized crimson bursts.`,
    baseStrength: 83,
    damageBase: 15,
    speedBase: 5,
    cdBase: 4,
    reachBase: 4,
  },
  {
    motifs: ["blood", "shadow"],
    kind: "sustain",
    title: "Nocturnal Crimson Pact",
    description: (a, b) =>
      `${a} and ${b} siphon momentum during stealth exchanges, sustaining continuous pressure.`,
    baseStrength: 81,
    damageBase: 10,
    speedBase: 8,
    cdBase: 10,
    reachBase: 3,
  },
  {
    motifs: ["beast", "lightning"],
    kind: "tempo",
    title: "Predator Velocity",
    description: (a, b) =>
      `Arc impulses from ${b} supercharge ${a} reflexes for explosive gap-closing dives.`,
    baseStrength: 82,
    damageBase: 11,
    speedBase: 15,
    cdBase: 6,
    reachBase: 3,
  },
  {
    motifs: ["beast", "blade"],
    kind: "amplify",
    title: "Feral Cleave Cadence",
    description: (a, b) =>
      `Primal ferocity in ${a} multiplies close-range impact velocity on ${b} combos.`,
    baseStrength: 80,
    damageBase: 14,
    speedBase: 10,
    cdBase: 4,
    reachBase: 2,
  },
  {
    motifs: ["mind", "beam"],
    kind: "control",
    title: "Predictive Overwatch",
    description: (a, b) =>
      `Tactical foresight from ${a} locks target trajectories for ${b} precision strikes.`,
    baseStrength: 83,
    damageBase: 9,
    speedBase: 6,
    cdBase: 8,
    reachBase: 9,
  },
  {
    motifs: ["prism", "judgement"],
    kind: "control",
    title: "Sovereign Prism Verdict",
    description: (a, b) =>
      `Omni-spectral refraction merges ${a} with ${b}, projecting overwhelming arena authority.`,
    baseStrength: 94,
    damageBase: 16,
    speedBase: 8,
    cdBase: 8,
    reachBase: 9,
  },
];

function findLineageConnection(keyA: string, keyB: string) {
  for (const lineage of FX_LINEAGES) {
    const idxA = lineage.steps.indexOf(keyA);
    const idxB = lineage.steps.indexOf(keyB);
    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
      return { lineage, idxA, idxB };
    }
  }
  return null;
}

function findMotifRule(motifA: FxMotif, motifB: FxMotif): MotifPairRule | null {
  for (const rule of MOTIF_SYNERGY_RULES) {
    const [m1, m2] = rule.motifs;
    if ((motifA === m1 && motifB === m2) || (motifA === m2 && motifB === m1)) {
      return rule;
    }
  }
  return null;
}

export function getPinnedAbilitySet(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ABILITY_SET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item === "string" && item.trim()) {
        const canon = canonicalAbilityUsageKey(item);
        if (!seen.has(canon)) {
          seen.add(canon);
          out.push(canon);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writePinnedAbilitySet(keys: string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    if (!k || !k.trim()) continue;
    const canon = canonicalAbilityUsageKey(k);
    if (!seen.has(canon)) {
      seen.add(canon);
      deduped.push(canon);
    }
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ABILITY_SET_STORAGE_KEY, JSON.stringify(deduped));
    } catch {
      // ignore storage errors
    }
    try {
      window.dispatchEvent(new CustomEvent(ABILITY_SET_EVENT, { detail: { keys: deduped } }));
    } catch {
      // ignore event errors
    }
  }
  return deduped;
}

export function addAbilityToPinnedSet(key: string): string[] {
  const current = getPinnedAbilitySet();
  return writePinnedAbilitySet([...current, key]);
}

export function removeAbilityFromPinnedSet(key: string): string[] {
  const target = canonicalAbilityUsageKey(key);
  const current = getPinnedAbilitySet();
  return writePinnedAbilitySet(current.filter((k) => k !== target));
}

export function resetPinnedAbilitySet(): void {
  writePinnedAbilitySet([]);
}

export function resolveAbilitySynergyConnection(
  sourceKeyInput: string,
  sourceRankInput: number | undefined,
  partnerKeyInput: string,
  partnerRankInput: number | undefined,
  partnerOrigin: SetMemberOrigin = "active-set",
): AbilitySynergyConnection {
  const sourceDef = abilityDef(sourceKeyInput);
  const partnerDef = abilityDef(partnerKeyInput);
  const sourceKey = canonicalAbilityUsageKey(sourceDef.key);
  const partnerKey = canonicalAbilityUsageKey(partnerDef.key);
  const sourceRank = clampDbAbilityLevel(sourceRankInput);
  const partnerRank = clampDbAbilityLevel(partnerRankInput ?? tierToIntrinsicRank(partnerDef.tier));

  const sourceRecipe = abilityFxRecipe(sourceKey, sourceRank);
  const partnerRecipe = abilityFxRecipe(partnerKey, partnerRank);
  const sourceCombat = simulateCombat(sourceKey, sourceDef.tier, sourceRank);
  const partnerCombat = simulateCombat(partnerKey, partnerDef.tier, partnerRank);

  const rankScalar = 0.8 + (sourceRank - 1) * 0.1 + (partnerRank - 1) * 0.05;
  const rankBonusPct = sourceRank >= 5 ? 6 : sourceRank >= 4 ? 3 : 0;

  let kind: SynergyKind = "control";
  let direction: SynergyDirection = "mutual";
  let title = "Tactical Stance Sync";
  let description = `Pairs ${sourceDef.label} with ${partnerDef.label} for balanced multi-phase coverage.`;
  let rawStrength = 52;
  let dmgPct = 6;
  let spdPct = 4;
  let cdPct = 4;
  let reachM = 2;

  const lineageMatch = findLineageConnection(sourceKey, partnerKey);
  const motifRule = findMotifRule(sourceRecipe.motif, partnerRecipe.motif);

  if (lineageMatch) {
    kind = "ascension";
    const { lineage, idxA, idxB } = lineageMatch;
    direction = idxA < idxB ? "buffs-partner" : "buffed-by-partner";
    title = `${lineage.label} Resonance`;
    description =
      idxA < idxB
        ? `${sourceDef.label} channels foundational power directly into ${partnerDef.label}'s evolved tier.`
        : `${sourceDef.label} draws heightened mastery harmonics from ${partnerDef.label}'s lineage path.`;
    rawStrength = 91;
    dmgPct = Math.round(14 * rankScalar) + rankBonusPct;
    spdPct = Math.round(8 * rankScalar);
    cdPct = Math.round(10 * rankScalar);
    reachM = Math.round(5 * rankScalar);
  } else if (motifRule) {
    kind = motifRule.kind;
    title = motifRule.title;
    description = motifRule.description(sourceDef.label, partnerDef.label);
    direction = sourceRank >= partnerRank ? "buffs-partner" : "mutual";
    rawStrength = motifRule.baseStrength;
    dmgPct =
      motifRule.damageBase > 0 ? Math.round(motifRule.damageBase * rankScalar) + rankBonusPct : 0;
    spdPct = motifRule.speedBase > 0 ? Math.round(motifRule.speedBase * rankScalar) : 0;
    cdPct = motifRule.cdBase > 0 ? Math.round(motifRule.cdBase * rankScalar) : 0;
    reachM = motifRule.reachBase > 0 ? Math.round(motifRule.reachBase * rankScalar) : 0;
  } else if (sourceRecipe.motif === partnerRecipe.motif) {
    kind = "amplify";
    direction = "mutual";
    title = "Harmonic Element Echo";
    description = `Shared ${sourceRecipe.motif} resonance lets ${sourceDef.label} amplify ${partnerDef.label}'s active bursts.`;
    rawStrength = 80;
    dmgPct = Math.round(12 * rankScalar) + rankBonusPct;
    spdPct = Math.round(6 * rankScalar);
    cdPct = Math.round(6 * rankScalar);
    reachM = Math.round(4 * rankScalar);
  } else if (sourceRecipe.motif === "heal" || partnerRecipe.motif === "heal") {
    kind = "sustain";
    direction = sourceRecipe.motif === "heal" ? "buffs-partner" : "buffed-by-partner";
    title = "Vital Sustain Loop";
    description = `Restorative output offsets high-tier strain, allowing ${
      sourceRecipe.motif === "heal" ? partnerDef.label : sourceDef.label
    } to cycle more frequently.`;
    rawStrength = 78;
    dmgPct = 0;
    spdPct = Math.round(6 * rankScalar);
    cdPct = Math.round(12 * rankScalar) + Math.floor(rankBonusPct / 2);
    reachM = Math.round(3 * rankScalar);
  } else if (sourceCombat.role !== partnerCombat.role) {
    const isTempoPair =
      sourceCombat.mobility >= 60 ||
      partnerCombat.mobility >= 60 ||
      sourceDef.group === "role" ||
      partnerDef.group === "role";
    kind = isTempoPair ? "tempo" : "control";
    direction = sourceRank > partnerRank ? "buffs-partner" : "mutual";
    title = isTempoPair ? "Cross-Tempo Flank Relay" : "Multi-Range Zone Lock";
    description = `Bridges ${sourceCombat.role.toLowerCase()} pressure from ${sourceDef.label} with ${partnerCombat.role.toLowerCase()} coverage from ${partnerDef.label}.`;
    rawStrength = 68;
    dmgPct = Math.round(7 * rankScalar) + rankBonusPct;
    spdPct = isTempoPair ? Math.round(9 * rankScalar) : Math.round(4 * rankScalar);
    cdPct = Math.round(6 * rankScalar);
    reachM = Math.round(4 * rankScalar);
  } else {
    kind = "control";
    direction = "mutual";
    title = "Dual-Discipline Stance";
    description = `Alternating ${sourceDef.label} and ${partnerDef.label} keeps ${sourceCombat.role.toLowerCase()} combos unpredictable.`;
    rawStrength = 56;
    dmgPct = Math.round(6 * rankScalar) + Math.floor(rankBonusPct / 2);
    spdPct = Math.round(5 * rankScalar);
    cdPct = Math.round(5 * rankScalar);
    reachM = 2;
  }

  const strength = Math.min(99, Math.max(35, Math.round(rawStrength + (sourceRank - 1) * 1.5)));
  const buffs: SynergyBuffEffect[] = [];
  if (dmgPct > 0) {
    buffs.push({
      metric: "Damage",
      deltaLabel: `+${dmgPct}%`,
      value: dmgPct,
      target: direction === "buffs-partner" ? "partner" : "set",
    });
  }
  if (cdPct > 0) {
    buffs.push({
      metric: "Cooldown",
      deltaLabel: `-${cdPct}%`,
      value: cdPct,
      target: "set",
    });
  }
  if (spdPct > 0) {
    buffs.push({
      metric: "Tempo",
      deltaLabel: `+${spdPct}%`,
      value: spdPct,
      target: "set",
    });
  }
  if (reachM > 0) {
    buffs.push({
      metric: "Reach",
      deltaLabel: `+${reachM}m`,
      value: reachM,
      target: "set",
    });
  }

  const kindMeta = SYNERGY_KIND_META[kind];

  return {
    id: `${sourceKey}__${partnerKey}`,
    sourceKey,
    partnerKey,
    partnerLabel: partnerDef.label,
    partnerColor: partnerDef.color,
    partnerTier: partnerDef.tier,
    partnerGroup: partnerDef.group,
    partnerRank,
    partnerOrigin,
    kind,
    kindLabel: kindMeta.label,
    kindColor: kindMeta.color,
    direction,
    title,
    description,
    strength,
    buffs,
  };
}

export function buildAbilitySynergySummary({
  focalKey,
  focalRank,
  characterAbilities,
  usageCounts,
  pinnedKeys,
  getRankForAbility,
  candidateLimit = 4,
}: {
  focalKey: string;
  focalRank: AbilityEmblemRank;
  characterAbilities?: Array<{ abilityKey: string; rank: AbilityEmblemRank }> | undefined;
  usageCounts?: Record<string, number> | undefined;
  pinnedKeys?: string[] | undefined;
  getRankForAbility?: ((key: string) => AbilityEmblemRank | undefined) | undefined;
  candidateLimit?: number | undefined;
}): AbilitySynergySummary {
  const canonFocal = canonicalAbilityUsageKey(focalKey);
  const memberMap = new Map<string, AbilitySetMember>();

  const addMember = (key: string, origin: SetMemberOrigin, explicitRank?: AbilityEmblemRank) => {
    const canon = canonicalAbilityUsageKey(key);
    if (!canon || canon === canonFocal) return;
    const def = abilityDef(canon);
    const resolvedRank = clampDbAbilityLevel(
      explicitRank ?? getRankForAbility?.(canon) ?? tierToIntrinsicRank(def.tier),
    );
    const existing = memberMap.get(canon);
    if (!existing) {
      memberMap.set(canon, { key: canon, rank: resolvedRank, origin });
    } else if (origin === "character") {
      memberMap.set(canon, {
        key: canon,
        rank: explicitRank ?? existing.rank,
        origin: "character",
      });
    }
  };

  for (const item of characterAbilities ?? []) {
    addMember(item.abilityKey, "character", item.rank);
  }
  for (const key of pinnedKeys ?? getPinnedAbilitySet()) {
    addMember(key, "active-set");
  }
  const resolvedUsage = usageCounts ?? getAllAbilityUsageCounts();
  for (const [key, count] of Object.entries(resolvedUsage)) {
    if (count > 0) {
      addMember(key, "usage");
    }
  }

  const setMembers = [...memberMap.values()];
  const connections = setMembers
    .map((m) => resolveAbilitySynergyConnection(canonFocal, focalRank, m.key, m.rank, m.origin))
    .sort((a, b) => b.strength - a.strength || a.partnerLabel.localeCompare(b.partnerLabel));

  let damagePct = 0;
  let cooldownReductionPct = 0;
  let reachMeters = 0;
  let speedPct = 0;

  for (const conn of connections) {
    for (const buff of conn.buffs) {
      if (buff.metric === "Damage") damagePct += buff.value;
      else if (buff.metric === "Cooldown") cooldownReductionPct += buff.value;
      else if (buff.metric === "Reach") reachMeters += buff.value;
      else if (buff.metric === "Tempo") speedPct += buff.value;
    }
  }

  // Cap aggregate display buffs reasonably while preserving multi-link scaling
  const aggregateBuffs = {
    damagePct: Math.min(75, damagePct),
    cooldownReductionPct: Math.min(45, cooldownReductionPct),
    reachMeters: Math.min(35, reachMeters),
    speedPct: Math.min(60, speedPct),
  };

  const excluded = new Set<string>([canonFocal, ...setMembers.map((m) => m.key)]);
  const recommendedCandidates: SynergyCandidate[] = ABILITY_REGISTRY.filter(
    (entry) => !excluded.has(canonicalAbilityUsageKey(entry.key)),
  )
    .map((entry) => {
      const rank = tierToIntrinsicRank(entry.tier);
      const conn = resolveAbilitySynergyConnection(
        canonFocal,
        focalRank,
        entry.key,
        rank,
        "active-set",
      );
      const firstBuff = conn.buffs[0];
      return {
        key: conn.partnerKey,
        label: conn.partnerLabel,
        color: conn.partnerColor,
        tier: conn.partnerTier,
        rank,
        title: conn.title,
        kindLabel: conn.kindLabel,
        kindColor: conn.kindColor,
        strength: conn.strength,
        primaryBuffLabel: firstBuff
          ? `${firstBuff.deltaLabel} ${firstBuff.metric}`
          : `${conn.strength}% sync`,
      };
    })
    .sort((a, b) => b.strength - a.strength || a.label.localeCompare(b.label))
    .slice(0, Math.max(1, candidateLimit));

  return {
    focalKey: canonFocal,
    focalRank,
    setMembers,
    connections,
    recommendedCandidates,
    aggregateBuffs,
  };
}
