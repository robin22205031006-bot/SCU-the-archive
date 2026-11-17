import { readDossier } from "@/lib/nexus-season";

export interface StatusHistoryEntry {
  id: string;
  entityId: string;
  entityName: string;
  fromStatus: string;
  toStatus: string;
  seriesId?: string | null | undefined;
  seriesTitle?: string | null | undefined;
  seasonNumber?: number | null | undefined;
  seasonLabel?: string | null | undefined;
  changedAt: string;
  source: "roster" | "dossier";
}

export interface StatusTimelineStep {
  id: string;
  label: string;
  shortLabel: string;
  seriesId?: string | null | undefined;
  seasonNumber?: number | null | undefined;
  fromStatus?: string | null | undefined;
  status: string;
  changedAt?: string | undefined;
  source: "history" | "season" | "base";
  isTransition: boolean;
}

export interface ResolvedStatusTimeline {
  steps: StatusTimelineStep[];
  transitions: StatusTimelineStep[];
  currentStatus: string;
}

const MAX_HISTORY_ENTRIES = 100;

export function normalizeTrackedStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status.trim() : "";
}

export function statusToneCategory(
  status: string | null | undefined,
): "alive" | "dead" | "presumed" | "missing" | "sealed" | "retired" | "neutral" {
  const s = normalizeTrackedStatus(status).toLowerCase();
  if (!s) return "neutral";
  if (s.includes("presumed")) return "presumed";
  if (s === "dead" || s === "deceased" || s === "killed") return "dead";
  if (s === "sealed" || s === "imprisoned") return "sealed";
  if (s === "missing" || s === "unknown") return "missing";
  if (s === "retired") return "retired";
  if (s === "alive" || s === "active" || s === "realive" || s === "revived") return "alive";
  return "neutral";
}

function isStatusHistoryRecord(raw: unknown): raw is StatusHistoryEntry {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r["id"] === "string" &&
    typeof r["entityId"] === "string" &&
    typeof r["toStatus"] === "string" &&
    typeof r["changedAt"] === "string"
  );
}

/** Reads chronological status history entries persisted in `entities.stats.status_history`. */
export function readStatusHistory(stats: unknown): StatusHistoryEntry[] {
  if (!stats || typeof stats !== "object") return [];
  const raw = (stats as Record<string, unknown>)["status_history"];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isStatusHistoryRecord)
    .map((entry) => ({
      ...entry,
      fromStatus: normalizeTrackedStatus(entry.fromStatus),
      toStatus: normalizeTrackedStatus(entry.toStatus),
    }))
    .filter((entry) => entry.toStatus.length > 0)
    .sort((a, b) => a.changedAt.localeCompare(b.changedAt));
}

/**
 * Appends a status change entry into `stats.status_history` when the status
 * genuinely changed (case-insensitive comparison).
 */
export function appendStatusHistory(
  stats: Record<string, unknown>,
  entry: Omit<StatusHistoryEntry, "id" | "changedAt"> & {
    id?: string | undefined;
    changedAt?: string | undefined;
  },
): { stats: Record<string, unknown>; recorded: boolean; entry: StatusHistoryEntry | null } {
  const fromStatus = normalizeTrackedStatus(entry.fromStatus);
  const toStatus = normalizeTrackedStatus(entry.toStatus);
  if (!toStatus || fromStatus.toLowerCase() === toStatus.toLowerCase()) {
    return { stats, recorded: false, entry: null };
  }

  const changedAt = entry.changedAt ?? new Date().toISOString();
  const id =
    entry.id ??
    `sh-${entry.entityId}-${entry.seriesId ?? "global"}-${entry.seasonNumber ?? "all"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const nextEntry: StatusHistoryEntry = {
    ...entry,
    id,
    fromStatus: fromStatus || "Unrecorded",
    toStatus,
    changedAt,
  };

  const existing = readStatusHistory(stats);
  const next = [...existing, nextEntry].slice(-MAX_HISTORY_ENTRIES);
  return {
    stats: {
      ...stats,
      status_history: next,
    },
    recorded: true,
    entry: nextEntry,
  };
}

function seasonSortKey(
  seriesId: string | null | undefined,
  seasonNumber: number | null | undefined,
  order: readonly string[],
): number {
  if (!seriesId) return 999_000 + (seasonNumber ?? 0);
  const idx = order.indexOf(seriesId);
  return (idx < 0 ? 998 : idx) * 1000 + (seasonNumber ?? 0);
}

/**
 * Resolves a character's chronological status progression across series/seasons
 * by combining seasonal dossier statuses with explicit `status_history` transitions.
 */
export function resolveCharacterStatusTimeline({
  entity,
  memberships,
  seriesList,
  order = [],
}: {
  entity: {
    id: string;
    name: string;
    status?: string | null | undefined;
    stats?: unknown;
  };
  memberships?:
    | ReadonlyArray<{
        series_id?: string | null | undefined;
        status?: string | null | undefined;
        series?:
          { id?: string | null | undefined; title?: string | null | undefined } | null | undefined;
      }>
    | null
    | undefined;
  seriesList?:
    | ReadonlyArray<{
        id: string;
        title: string;
        season_names?: string[] | null | undefined;
      }>
    | null
    | undefined;
  order?: readonly string[] | undefined;
}): ResolvedStatusTimeline {
  const dossier = readDossier(entity.stats);
  const history = readStatusHistory(entity.stats);

  const seriesById = new Map((seriesList ?? []).map((s) => [s.id, s]));
  for (const m of memberships ?? []) {
    const sid = m.series_id ?? m.series?.id;
    if (sid && !seriesById.has(sid) && m.series?.title) {
      seriesById.set(sid, { id: sid, title: m.series.title, season_names: null });
    }
  }

  const effectiveOrder = order.length > 0 ? order : [...seriesById.keys()];

  const formatSeasonLabels = (
    sid: string | null | undefined,
    n: number | null | undefined,
    fallbackLabel?: string | null | undefined,
  ) => {
    if (!sid) {
      return {
        label: fallbackLabel || "Overview",
        shortLabel: fallbackLabel || "All",
      };
    }
    const meta = seriesById.get(sid);
    const title = meta?.title ?? sid;
    const compactTitle = title.replace(/^The\s+/i, "");
    if (n != null && n > 0) {
      const customSeason = meta?.season_names?.[n - 1]?.trim();
      const sShort = `S${n}`;
      return {
        label: `${title} · ${customSeason || `Season ${n}`}`,
        shortLabel: `${compactTitle} · ${sShort}`,
      };
    }
    return {
      label: title,
      shortLabel: compactTitle,
    };
  };

  interface RawSlot {
    id: string;
    seriesId: string | null;
    seasonNumber: number | null;
    status: string;
    label: string;
    shortLabel: string;
    sortKey: number;
  }

  const slots: RawSlot[] = [];
  const coveredSeries = new Set<string>();

  for (const [key, entry] of Object.entries(dossier)) {
    if (entry.roster === false) continue;
    const colon = key.indexOf(":");
    if (colon <= 0) continue;
    const sid = key.slice(0, colon);
    const part = key.slice(colon + 1);
    const num = Number(part);
    if (part === "all" || !Number.isInteger(num) || num <= 0) continue;
    const st = normalizeTrackedStatus(entry.status);
    if (!st) continue;
    coveredSeries.add(sid);
    const labels = formatSeasonLabels(sid, num);
    slots.push({
      id: `slot-${sid}-${num}`,
      seriesId: sid,
      seasonNumber: num,
      status: st,
      label: labels.label,
      shortLabel: labels.shortLabel,
      sortKey: seasonSortKey(sid, num, effectiveOrder),
    });
  }

  // Fallback for series memberships that do not yet have numbered season dossiers
  for (const m of memberships ?? []) {
    const sid = m.series_id ?? m.series?.id;
    const st = normalizeTrackedStatus(m.status);
    if (!sid || !st || coveredSeries.has(sid)) continue;
    coveredSeries.add(sid);
    const labels = formatSeasonLabels(sid, null);
    slots.push({
      id: `slot-${sid}-all`,
      seriesId: sid,
      seasonNumber: null,
      status: st,
      label: labels.label,
      shortLabel: labels.shortLabel,
      sortKey: seasonSortKey(sid, 0, effectiveOrder),
    });
  }

  slots.sort((a, b) => a.sortKey - b.sortKey);

  // Group explicit history logs by `(seriesId, seasonNumber)` so within-season transitions appear accurately.
  const historyBySlot = new Map<string, StatusHistoryEntry[]>();
  const orphanHistory: StatusHistoryEntry[] = [];
  const slotKeySet = new Set(slots.map((s) => `${s.seriesId ?? ""}:${s.seasonNumber ?? "all"}`));

  for (const h of history) {
    const k = `${h.seriesId ?? ""}:${h.seasonNumber ?? "all"}`;
    if (slotKeySet.has(k)) {
      const list = historyBySlot.get(k) ?? [];
      list.push(h);
      historyBySlot.set(k, list);
    } else {
      orphanHistory.push(h);
    }
  }

  const rawSteps: Array<
    Omit<StatusTimelineStep, "fromStatus" | "isTransition"> & {
      explicitFrom?: string | undefined;
    }
  > = [];

  for (const slot of slots) {
    const k = `${slot.seriesId ?? ""}:${slot.seasonNumber ?? "all"}`;
    const slotLogs = historyBySlot.get(k) ?? [];
    if (slotLogs.length === 0) {
      rawSteps.push({
        id: slot.id,
        label: slot.label,
        shortLabel: slot.shortLabel,
        seriesId: slot.seriesId,
        seasonNumber: slot.seasonNumber,
        status: slot.status,
        source: "season",
      });
      continue;
    }

    // Emit each explicit status transition recorded in this season
    for (const log of slotLogs) {
      const labels = formatSeasonLabels(
        log.seriesId ?? slot.seriesId,
        log.seasonNumber ?? slot.seasonNumber,
        log.seasonLabel,
      );
      rawSteps.push({
        id: log.id,
        label: log.seasonLabel || labels.label,
        shortLabel: labels.shortLabel,
        seriesId: log.seriesId ?? slot.seriesId,
        seasonNumber: log.seasonNumber ?? slot.seasonNumber,
        explicitFrom: log.fromStatus,
        status: log.toStatus,
        changedAt: log.changedAt,
        source: "history",
      });
    }

    // If current slot dossier status differs from the last logged transition, append final state
    const lastLog = slotLogs[slotLogs.length - 1]!;
    if (lastLog.toStatus.toLowerCase() !== slot.status.toLowerCase()) {
      rawSteps.push({
        id: `${slot.id}-current`,
        label: slot.label,
        shortLabel: slot.shortLabel,
        seriesId: slot.seriesId,
        seasonNumber: slot.seasonNumber,
        status: slot.status,
        source: "season",
      });
    }
  }

  for (const log of orphanHistory) {
    const labels = formatSeasonLabels(log.seriesId, log.seasonNumber, log.seasonLabel);
    rawSteps.push({
      id: log.id,
      label: log.seasonLabel || labels.label,
      shortLabel: labels.shortLabel,
      seriesId: log.seriesId ?? null,
      seasonNumber: log.seasonNumber ?? null,
      explicitFrom: log.fromStatus,
      status: log.toStatus,
      changedAt: log.changedAt,
      source: "history",
    });
  }

  if (rawSteps.length === 0) {
    const baseStatus = normalizeTrackedStatus(entity.status) || "Alive";
    rawSteps.push({
      id: `base-${entity.id}`,
      label: "Base Archive Status",
      shortLabel: "Base",
      seriesId: null,
      seasonNumber: null,
      status: baseStatus,
      source: "base",
    });
  }

  // Finalize `fromStatus` and `isTransition`
  let runningStatus: string | null = null;
  const steps: StatusTimelineStep[] = rawSteps.map((step) => {
    const derivedFrom = step.explicitFrom || runningStatus;
    const isTransition = Boolean(
      derivedFrom &&
      derivedFrom.toLowerCase() !== "unrecorded" &&
      derivedFrom.toLowerCase() !== step.status.toLowerCase(),
    );
    runningStatus = step.status;
    return {
      id: step.id,
      label: step.label,
      shortLabel: step.shortLabel,
      ...(step.seriesId !== undefined ? { seriesId: step.seriesId } : {}),
      ...(step.seasonNumber !== undefined ? { seasonNumber: step.seasonNumber } : {}),
      ...(derivedFrom ? { fromStatus: derivedFrom } : {}),
      status: step.status,
      ...(step.changedAt ? { changedAt: step.changedAt } : {}),
      source: step.source,
      isTransition,
    };
  });

  const transitions = steps.filter((s) => s.isTransition);
  const currentStatus =
    steps[steps.length - 1]?.status ?? (normalizeTrackedStatus(entity.status) || "Alive");

  return {
    steps,
    transitions,
    currentStatus,
  };
}
