import type { CombatStats } from "@/lib/combat-stats";

/** Browser-safe presentation rules for the Versus Simulator WebGL clash. */
export type ClashSystem = "classic" | "nexus" | "minimal" | "manga";

export interface ClashPalette {
  a: string;
  b: string;
  core: string;
  background: string;
  bloom: number;
  aberration: number;
  shake: number;
  particles: number;
  sparkles: boolean;
}

export const CLASH_PALETTES: Record<ClashSystem, ClashPalette> = {
  classic: {
    a: "#fb7185",
    b: "#fbbf24",
    core: "#fff7ed",
    background: "#0c0a12",
    bloom: 1.4,
    aberration: 0.0012,
    shake: 0.22,
    particles: 520,
    sparkles: true,
  },
  nexus: {
    a: "#22d3ee",
    b: "#a78bfa",
    core: "#ecfeff",
    background: "#050816",
    bloom: 2.1,
    aberration: 0.0018,
    shake: 0.28,
    particles: 720,
    sparkles: true,
  },
  minimal: {
    a: "#e5e5e5",
    b: "#a3a3a3",
    core: "#ffffff",
    background: "#0a0a0a",
    bloom: 0.6,
    aberration: 0,
    shake: 0,
    particles: 180,
    sparkles: false,
  },
  manga: {
    a: "#f5f5f4",
    b: "#dc2626",
    core: "#ffffff",
    background: "#09090b",
    bloom: 1.1,
    aberration: 0.0032,
    shake: 0.34,
    particles: 600,
    sparkles: false,
  },
};

export function resolveClashSystem(value: string | null | undefined): ClashSystem {
  return value === "nexus" || value === "minimal" || value === "manga" ? value : "classic";
}

/** Offensive output used to decide which beam pushes the collision point. */
export function clashPower(stats: CombatStats | null | undefined): number {
  if (!stats) return 50;
  return Math.round(
    stats.power * 0.4 +
      stats.weapon_proficiency * 0.25 +
      stats.clan_mastery * 0.2 +
      stats.agility * 0.1 +
      stats.tactical_iq * 0.05,
  );
}

/** -1..1 where positive means side A pushes the collision toward side B. */
export function clashBalance(powerA: number, powerB: number): number {
  const total = powerA + powerB;
  if (total <= 0) return 0;
  return Math.max(-1, Math.min(1, (powerA - powerB) / total));
}

export function clashVerdict(nameA: string, nameB: string, balance: number): string {
  if (Math.abs(balance) < 0.04) return `${nameA} and ${nameB} are locked in a dead heat`;
  const winner = balance > 0 ? nameA : nameB;
  const loser = balance > 0 ? nameB : nameA;
  const margin = Math.abs(balance);
  if (margin > 0.35) return `${winner} overwhelms ${loser}`;
  if (margin > 0.15) return `${winner} drives ${loser} back`;
  return `${winner} edges out ${loser}`;
}
