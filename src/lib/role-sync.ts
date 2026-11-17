import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invalidateArchive } from "@/lib/archive-sync";
import { getMergedSecondaryIds } from "@/lib/entities";
import { readDossier, type SeasonDossier } from "@/lib/nexus-season";
import {
  ROLE_EMBLEM_LABELS,
  formatEmblemRolesText,
  mergeEmblemRoles,
  parseEmblemRoles,
  readEntityAllTeamRolesMap,
  readEntityGlobalRoles,
  roleEmblemDef,
  type EmblemRoleLabel,
} from "@/lib/role-emblems";

export type RoleSyncScope =
  | { type: "global" }
  | { type: "team"; groupId: string }
  | { type: "series"; seriesId: string; seasonNumber?: number | null | undefined };

export interface SyncEntityRolesParams {
  qc: QueryClient;
  entityId: string;
  roles: readonly string[];
  scope: RoleSyncScope;
}

/**
 * Atomically updates role emblem attachments for a character across:
 * - `entities.stats.roles` (global role emblems)
 * - `entities.stats.teamRoles[groupId]` (when scoped to a Team / Organization)
 * - `entities.stats.dossier[seriesId:season].roles` & `.role` (when scoped to Series / Season)
 * - `entities.role` & `series_characters` so Abilities (Roles), Teams, Series, and Full Character Dossier stay synchronized.
 */
export async function syncEntityRoles({
  qc,
  entityId,
  roles,
  scope,
}: SyncEntityRolesParams): Promise<EmblemRoleLabel[]> {
  const nextRoles = mergeEmblemRoles(
    roles.map((r) => roleEmblemDef(r)?.label).filter((x): x is EmblemRoleLabel => !!x),
  );

  const { data: fresh, error } = await supabase
    .from("entities")
    .select("id,kind,role,stats,locked_fields,status")
    .eq("id", entityId)
    .single();
  if (error) throw error;

  const baseStats: Record<string, unknown> = {
    ...((fresh.stats as Record<string, unknown>) ?? {}),
  };
  const currentGlobal = mergeEmblemRoles(
    readEntityGlobalRoles(baseStats),
    parseEmblemRoles(fresh.role),
  );
  const teamRolesMap = readEntityAllTeamRolesMap(baseStats);
  const dossierMap = { ...readDossier(baseStats) };

  let finalGlobalRoles: EmblemRoleLabel[] = currentGlobal;

  if (scope.type === "global") {
    const removedSet = new Set(currentGlobal.filter((r) => !nextRoles.includes(r)));
    finalGlobalRoles = nextRoles;
    baseStats["roles"] = nextRoles;

    // Propagate explicit global removals across team & series dossiers so detaching globally stays synchronized.
    if (removedSet.size > 0) {
      for (const [gid, list] of Object.entries(teamRolesMap)) {
        const filtered = list.filter((r) => !removedSet.has(r));
        if (filtered.length > 0) teamRolesMap[gid] = filtered;
        else delete teamRolesMap[gid];
      }
      baseStats["teamRoles"] = teamRolesMap;

      for (const [dk, entry] of Object.entries(dossierMap)) {
        const currentEntryRoles = mergeEmblemRoles(
          parseEmblemRoles(entry.roles),
          parseEmblemRoles(entry.role),
        );
        const filtered = currentEntryRoles.filter((r) => !removedSet.has(r));
        if (filtered.length !== currentEntryRoles.length) {
          dossierMap[dk] = {
            ...entry,
            roles: filtered,
            role: formatEmblemRolesText(filtered, entry.role),
          };
        }
      }
      baseStats["dossier"] = dossierMap;
    }
  } else if (scope.type === "team") {
    const prevTeamRoles = teamRolesMap[scope.groupId] ?? [];
    const removedFromTeam = prevTeamRoles.filter((r) => !nextRoles.includes(r));

    if (nextRoles.length > 0) {
      teamRolesMap[scope.groupId] = nextRoles;
    } else {
      delete teamRolesMap[scope.groupId];
    }
    baseStats["teamRoles"] = teamRolesMap;

    const stillHeldInAnyTeam = new Set(Object.values(teamRolesMap).flat());
    const keptGlobal = currentGlobal.filter(
      (r) => !removedFromTeam.includes(r) || stillHeldInAnyTeam.has(r),
    );
    finalGlobalRoles = mergeEmblemRoles(keptGlobal, nextRoles);
    baseStats["roles"] = finalGlobalRoles;
  } else if (scope.type === "series") {
    const seasonKey = `${scope.seriesId}:${scope.seasonNumber ?? "all"}`;
    const prevEntry: SeasonDossier = dossierMap[seasonKey] ?? {};
    const prevSeasonRoles = mergeEmblemRoles(
      parseEmblemRoles(prevEntry.roles),
      parseEmblemRoles(prevEntry.role),
    );
    const removedFromSeason = prevSeasonRoles.filter((r) => !nextRoles.includes(r));

    dossierMap[seasonKey] = {
      ...prevEntry,
      roles: nextRoles,
      role: formatEmblemRolesText(nextRoles, prevEntry.role),
      ...(scope.seasonNumber != null ? { roster: true } : {}),
    };
    baseStats["dossier"] = dossierMap;

    const keptGlobal = currentGlobal.filter((r) => !removedFromSeason.includes(r));
    finalGlobalRoles = mergeEmblemRoles(keptGlobal, nextRoles);
    baseStats["roles"] = finalGlobalRoles;
  }

  const orderedFinal = ROLE_EMBLEM_LABELS.filter((l) => finalGlobalRoles.includes(l));
  const formattedEntityRole = formatEmblemRolesText(orderedFinal, fresh.role);

  const { error: upErr } = await supabase
    .from("entities")
    .update({
      role: formattedEntityRole || null,
      stats: baseStats as never,
      locked_fields: [...new Set([...(fresh.locked_fields ?? []), "stats", "role"])],
    })
    .eq("id", entityId);
  if (upErr) throw upErr;

  if (scope.type === "series" && fresh.kind === "character") {
    const mergedIds = [entityId, ...getMergedSecondaryIds(entityId)];
    const { data: scRows, error: scErr } = await supabase
      .from("series_characters")
      .select("id")
      .eq("series_id", scope.seriesId)
      .in("character_id", mergedIds)
      .limit(1);
    if (scErr) throw scErr;
    const roleText = formatEmblemRolesText(nextRoles);
    if (scRows?.[0]) {
      const { error: upSc } = await supabase
        .from("series_characters")
        .update({ arc_role: roleText || null, role_in_series: roleText || null })
        .eq("id", scRows[0].id);
      if (upSc) throw upSc;
    } else if (nextRoles.length > 0) {
      const { error: insSc } = await supabase.from("series_characters").insert({
        series_id: scope.seriesId,
        character_id: entityId,
        status: fresh.status || "Alive",
        arc_role: roleText,
        role_in_series: roleText,
      });
      if (insSc) throw insSc;
    }
  }

  await invalidateArchive(qc);
  return orderedFinal;
}

/**
 * Convenience helper to attach or detach a single role emblem from Abilities -> Roles hub.
 */
export async function toggleSingleRoleOnEntity({
  qc,
  entityId,
  roleLabel,
  attach,
  currentRoles,
}: {
  qc: QueryClient;
  entityId: string;
  roleLabel: EmblemRoleLabel;
  attach: boolean;
  currentRoles: readonly EmblemRoleLabel[];
}): Promise<EmblemRoleLabel[]> {
  const next = attach
    ? mergeEmblemRoles(currentRoles, [roleLabel])
    : currentRoles.filter((r) => r !== roleLabel);
  return syncEntityRoles({
    qc,
    entityId,
    roles: next,
    scope: { type: "global" },
  });
}
