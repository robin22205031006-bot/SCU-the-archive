import { supabase } from "@/integrations/supabase/client";
import type { LoreItem } from "@/components/LoreExplorer";
import { normalizeTrackedStatus } from "@/lib/status-history";

export const LORE_STATUS_EVENTS_KEY = "scu_lore_status_update_events_v1";
export const MAX_LORE_STATUS_EVENTS = 150;

export interface LoreStatusUpdateEvent {
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

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:lore-status-events-updated"));
  }
}

export function readLoreStatusEvents(): LoreStatusUpdateEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LORE_STATUS_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LoreStatusUpdateEvent =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as LoreStatusUpdateEvent).id === "string" &&
        typeof (entry as LoreStatusUpdateEvent).entityId === "string" &&
        typeof (entry as LoreStatusUpdateEvent).entityName === "string" &&
        typeof (entry as LoreStatusUpdateEvent).toStatus === "string" &&
        typeof (entry as LoreStatusUpdateEvent).changedAt === "string",
    );
  } catch {
    return [];
  }
}

export function writeLoreStatusEvents(entries: LoreStatusUpdateEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      LORE_STATUS_EVENTS_KEY,
      JSON.stringify(entries.slice(0, MAX_LORE_STATUS_EVENTS)),
    );
  } catch {
    /* storage optional */
  }
  notifyListeners();
}

export function recordLoreStatusUpdateEvent(
  input: Omit<LoreStatusUpdateEvent, "id" | "changedAt"> & {
    id?: string | undefined;
    changedAt?: string | undefined;
  },
): LoreStatusUpdateEvent | null {
  const fromStatus = normalizeTrackedStatus(input.fromStatus) || "Unrecorded";
  const toStatus = normalizeTrackedStatus(input.toStatus);
  if (!toStatus || fromStatus.toLowerCase() === toStatus.toLowerCase()) {
    return null;
  }

  const entry: LoreStatusUpdateEvent = {
    ...input,
    id:
      input.id ??
      `status-update-${input.entityId}-${input.seriesId ?? "global"}-${input.seasonNumber ?? "all"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fromStatus,
    toStatus,
    changedAt: input.changedAt ?? new Date().toISOString(),
  };

  const existing = readLoreStatusEvents();
  const next = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(
    0,
    MAX_LORE_STATUS_EVENTS,
  );
  writeLoreStatusEvents(next);
  return entry;
}

export function clearLoreStatusEvents(): LoreStatusUpdateEvent[] {
  writeLoreStatusEvents([]);
  return [];
}

export function subscribeLoreStatusEvents(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LORE_STATUS_EVENTS_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function toLoreStatusExplorerItem(ev: LoreStatusUpdateEvent): LoreItem {
  const scopeLabel =
    ev.seasonLabel ||
    (ev.seriesTitle
      ? `${ev.seriesTitle}${ev.seasonNumber ? ` · Season ${ev.seasonNumber}` : ""}`
      : ev.seasonNumber
        ? `Season ${ev.seasonNumber}`
        : "Archive Roster");

  return {
    id: ev.id,
    name: `${ev.entityName} — Status Update`,
    event_name: `${ev.entityName}: ${ev.fromStatus} → ${ev.toStatus}`,
    title: `${ev.entityName} · ${ev.fromStatus} → ${ev.toStatus}`,
    category: "Status Update",
    event_type: "status update",
    status: ev.toStatus,
    previous_status: ev.fromStatus,
    tier: "Common",
    era: scopeLabel,
    series: ev.seriesTitle ?? scopeLabel,
    year: ev.changedAt.slice(0, 10),
    description: `Status update: ${ev.entityName} changed from ${ev.fromStatus} to ${ev.toStatus} (${scopeLabel}).`,
  };
}

/**
 * Records a `'status update'` event in the local Lore Explorer feed and attempts a
 * non-blocking insert into `timeline_events` for shared archive persistence.
 */
export async function logCharacterStatusUpdate(
  input: Omit<LoreStatusUpdateEvent, "id" | "changedAt"> & {
    id?: string | undefined;
    changedAt?: string | undefined;
  },
): Promise<LoreStatusUpdateEvent | null> {
  const logged = recordLoreStatusUpdateEvent(input);
  if (!logged) return null;

  const loreItem = toLoreStatusExplorerItem(logged);
  try {
    await supabase.from("timeline_events").insert({
      title: loreItem.title ?? loreItem.name ?? `${logged.entityName} Status Update`,
      description: loreItem.description ?? "",
      era: "Status Update",
      series: loreItem.series ?? null,
      source: "status update",
      impact: 2,
    });
  } catch {
    // Non-blocking: local reactive Lore Explorer store guarantees delivery offline/in tests.
  }

  return logged;
}
