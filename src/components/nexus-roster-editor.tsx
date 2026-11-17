import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, getMergedSecondaryIds, type Entity } from "@/lib/entities";
import {
  DOSSIER_GENDERS,
  DOSSIER_ROLES,
  DOSSIER_STATUSES,
  readDossier,
  resolveDossierMeta,
  resolvePreviousSeasonStats,
  type SeasonDossier,
} from "@/lib/nexus-season";
import { NEXUS_ROLES, projectSeasonRoster } from "@/lib/nexus-roster";
import { SEASON_STATUSES } from "@/lib/series";
import { artifactsQuery } from "@/lib/artifacts";
import { useServerFn } from "@tanstack/react-start";
import { draftSeasonStory } from "@/lib/season-story.functions";
import { allAbilityDefs, abilityDef } from "@/lib/abilities";
import {
  ABILITY_RANKS,
  abilityRankMeta,
  clampDbAbilityLevel,
  resolveAbilityAliasPure,
} from "@/lib/ability-rank";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { SeasonStatSliders } from "@/components/season-stat-sliders";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { invalidateArchive, resolveGroupIds } from "@/lib/archive-sync";
import { appendStatusHistory, normalizeTrackedStatus } from "@/lib/status-history";
import { logCharacterStatusUpdate } from "@/lib/lore-status-events";

type Ability = { name: string; level: number; note: string };
export function NexusRosterEditor({
  open,
  onClose,
  entities,
  seriesId,
  season,
  label,
}: {
  open: boolean;
  onClose: () => void;
  entities: Entity[];
  seriesId: string;
  season: number;
  label: string;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(entities[0]?.id ?? "");
  const [quickAddId, setQuickAddId] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  const { data: groups = [] } = useQuery(
    entitiesQuery(["organization", "clan", "bloodline", "faction"]),
  );
  const { data: seriesChars = [] } = useQuery({
    queryKey: ["series-characters", seriesId],
    enabled: open && !!seriesId,
    queryFn: async () => {
      const { data } = await supabase
        .from("series_characters")
        .select("*")
        .eq("series_id", seriesId);
      return data ?? [];
    },
  });

  const all = useMemo(() => [...entities, ...groups], [entities, groups]);
  const entity = all.find((e) => e.id === selected);

  const rosterChars = useMemo(
    () => projectSeasonRoster(entities, seriesId, season, seriesChars),
    [entities, seriesId, season, seriesChars],
  );
  const rosterOrgs = useMemo(
    () => projectSeasonRoster(groups, seriesId, season, []),
    [groups, seriesId, season],
  );
  const rosterIds = useMemo(
    () => new Set([...rosterChars.map((e) => e.id), ...rosterOrgs.map((e) => e.id)]),
    [rosterChars, rosterOrgs],
  );
  const notInSeason = useMemo(
    () => all.filter((e) => !rosterIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [all, rosterIds],
  );

  useEffect(() => {
    if (!quickAddId || rosterIds.has(quickAddId)) {
      setQuickAddId(notInSeason[0]?.id ?? "");
    }
  }, [quickAddId, notInSeason, rosterIds]);

  const setRosterMembership = async (target: Entity, inSeason: boolean) => {
    setQuickBusy(true);
    try {
      const { data: fresh, error } = await supabase
        .from("entities")
        .select("stats,locked_fields,status")
        .eq("id", target.id)
        .single();
      if (error) throw error;
      const key = `${seriesId}:${season}`;
      const stats = { ...((fresh.stats as Record<string, unknown>) ?? {}) };
      const map = { ...readDossier(stats) };
      map[key] = { ...map[key], roster: inSeason };
      stats["dossier"] = map;
      const up = await supabase
        .from("entities")
        .update({
          stats: stats as never,
          locked_fields: [...new Set([...(fresh.locked_fields ?? []), "stats"])],
        })
        .eq("id", target.id);
      if (up.error) throw up.error;

      if (inSeason && target.kind === "character") {
        const mergedIds = [target.id, ...getMergedSecondaryIds(target.id)];
        const { data: existingSc } = await supabase
          .from("series_characters")
          .select("id")
          .eq("series_id", seriesId)
          .in("character_id", mergedIds)
          .limit(1);
        if (!existingSc?.length) {
          const ins = await supabase.from("series_characters").insert({
            series_id: seriesId,
            character_id: target.id,
            status: fresh.status || "Alive",
          });
          if (ins.error) throw ins.error;
        }
      }

      await invalidateArchive(qc);
      if (inSeason) {
        setSelected(target.id);
        toast.success(`${target.name} added to ${label}`);
      } else {
        toast.success(`${target.name} removed from ${label}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update season roster");
    } finally {
      setQuickBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Season roster · {label}</DialogTitle>
        </DialogHeader>

        {/* Quick-Add Character / Organization to this Season */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-[200px] flex-1 gap-1 text-xs">
              Add Character or Organization to this season
              <select
                aria-label="Add character or organization to season"
                className="h-9 w-full rounded-md border border-input bg-background px-2"
                value={quickAddId}
                onChange={(ev) => setQuickAddId(ev.target.value)}
              >
                {notInSeason.length === 0 ? (
                  <option value="">All characters and organizations already in season</option>
                ) : (
                  notInSeason.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.kind !== "character" ? ` · ${e.kind}` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={quickBusy || !quickAddId}
              onClick={() => {
                const target = all.find((x) => x.id === quickAddId);
                if (target) void setRosterMembership(target, true);
              }}
            >
              <UserPlus className="mr-1 h-3.5 w-3.5" />
              Add to Season
            </Button>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Characters in this season ({rosterChars.length})
              </p>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {rosterChars.length === 0 && (
                  <span className="text-muted-foreground">None yet</span>
                )}
                {rosterChars.map((c) => (
                  <span
                    key={c.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                      selected === c.id
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-border bg-background/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className="hover:underline"
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${c.name} from season`}
                      disabled={quickBusy}
                      onClick={() => void setRosterMembership(c, false)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Organizations / Clans / Factions ({rosterOrgs.length})
              </p>
              <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                {rosterOrgs.length === 0 && <span className="text-muted-foreground">None yet</span>}
                {rosterOrgs.map((o) => (
                  <span
                    key={o.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                      selected === o.id
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-border bg-background/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(o.id)}
                      className="hover:underline"
                    >
                      {o.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${o.name} from season`}
                      disabled={quickBusy}
                      onClick={() => void setRosterMembership(o, false)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <label className="grid gap-1 text-xs">
          Edit details for Character / Organization / Bloodline / Cult
          <select
            aria-label="Roster character"
            className="h-10 w-full rounded-md border border-input bg-background px-3"
            value={selected}
            onChange={(ev) => setSelected(ev.target.value)}
          >
            {all.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.kind !== "character" ? ` · ${e.kind}` : ""}
              </option>
            ))}
          </select>
        </label>
        {entity && (
          <RosterFields
            key={`${entity.id}:${seriesId}:${season}`}
            entity={entity}
            seriesId={seriesId}
            season={season}
            seasonLabel={label}
            groups={groups}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function RosterFields({
  entity,
  seriesId,
  season,
  seasonLabel,
  groups,
}: {
  entity: Entity;
  seriesId: string;
  season: number;
  seasonLabel: string;
  groups: Entity[];
}) {
  const qc = useQueryClient();
  useAbilityRegistryVersion();
  const key = `${seriesId}:${season}`;
  const initialStatusRef = useRef<string>(
    normalizeTrackedStatus(readDossier(entity.stats)[key]?.status) ||
      normalizeTrackedStatus(resolveDossierMeta(entity, seriesId, season).status) ||
      normalizeTrackedStatus(entity.status),
  );
  const [form, setForm] = useState<SeasonDossier>(() => {
    const meta = resolveDossierMeta(entity, seriesId, season);
    return {
      roster: true,
      ...readDossier(entity.stats)[key],
      gender: readDossier(entity.stats)[key]?.gender ?? meta.gender,
      weapons: readDossier(entity.stats)[key]?.weapons ?? meta.weapons,
    };
  });
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [weaponChoice, setWeaponChoice] = useState("");
  const [customWeapon, setCustomWeapon] = useState("");
  const { data: artifacts = [] } = useQuery(artifactsQuery);
  const runDraft = useServerFn(draftSeasonStory);
  const fillStory = async () => {
    setDrafting(true);
    try {
      const res = await runDraft({ data: { entityId: entity.id, seriesId, season } });
      if (res.error) toast.error(res.error);
      else {
        setForm((f) => ({
          ...f,
          story: res.story,
          ...(res.impact ? { impact: res.impact } : {}),
          ...(res.philosophy ? { philosophy: res.philosophy } : {}),
        }));
        toast.success("Draft added from the PDFs — review it, then Save season.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't draft the story.");
    } finally {
      setDrafting(false);
    }
  };
  const { data, error: loadError } = useQuery({
    queryKey: ["roster-abilities", entity.id, seriesId, season],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_abilities")
        .select("*")
        .eq("entity_id", entity.id)
        .eq("series_id", seriesId);
      if (error) throw error;
      return data;
    },
  });
  const abilityKeysRef = useRef(form.abilityKeys);
  abilityKeysRef.current = form.abilityKeys;
  useEffect(() => {
    if (!data || loaded) return;
    setLoaded(true);
    const m = new Map<string, Ability>();
    data
      .filter((a) => a.season_number == null || a.season_number === season)
      .sort((a, b) => Number(a.season_number != null) - Number(b.season_number != null))
      .forEach((a) =>
        m.set(a.ability_key, {
          name: a.ability_key,
          level: clampDbAbilityLevel(a.level),
          note: a.note ?? "",
        }),
      );
    const keys = abilityKeysRef.current;
    setAbilities([...m.values()].filter((a) => keys === undefined || keys.includes(a.name)));
  }, [data, loaded, season]);
  const values = profile
    ? (form.abilityStats?.[profile] ?? form.abilityStats?.[resolveAbilityAliasPure(profile)] ?? {})
    : (form.stats ?? {});
  const previousStats = useMemo(
    () => resolvePreviousSeasonStats(entity.stats, seriesId, season, profile || null),
    [entity.stats, seriesId, season, profile],
  );
  const setStat = (stat: string, value: number) =>
    setForm((f) =>
      profile
        ? {
            ...f,
            abilityStats: {
              ...f.abilityStats,
              [profile]: { ...f.abilityStats?.[profile], [stat]: value },
            },
          }
        : { ...f, stats: { ...f.stats, [stat]: value } },
    );
  const save = async () => {
    setBusy(true);
    let wrote = false;
    try {
      const { data: fresh, error } = await supabase
        .from("entities")
        .select("stats,locked_fields,status")
        .eq("id", entity.id)
        .single();
      if (error) throw error;
      const freshStatsRecord = (fresh.stats as Record<string, unknown>) ?? {};
      const freshDossierStatus = normalizeTrackedStatus(readDossier(freshStatsRecord)[key]?.status);
      const prevStatus =
        freshDossierStatus || initialStatusRef.current || normalizeTrackedStatus(fresh.status);
      const nextStatus = normalizeTrackedStatus(form.status);

      let stats: Record<string, unknown> = { ...freshStatsRecord };
      stats["dossier"] = {
        ...readDossier(stats),
        [key]: {
          ...readDossier(stats)[key],
          ...form,
          abilityKeys: abilities.filter((a) => a.name.trim()).map((a) => a.name),
        },
      };

      const seriesTitle = seasonLabel.split("·")[0]?.trim() || null;
      let statusTransitionLogged: {
        fromStatus: string;
        toStatus: string;
        changedAt?: string | undefined;
      } | null = null;
      if (nextStatus && prevStatus.toLowerCase() !== nextStatus.toLowerCase()) {
        const appended = appendStatusHistory(stats, {
          entityId: entity.id,
          entityName: entity.name,
          fromStatus: prevStatus || "Unrecorded",
          toStatus: nextStatus,
          seriesId,
          seriesTitle,
          seasonNumber: season,
          seasonLabel,
          source: "roster",
        });
        stats = appended.stats;
        if (appended.recorded && appended.entry) {
          statusTransitionLogged = {
            fromStatus: appended.entry.fromStatus,
            toStatus: appended.entry.toStatus,
            changedAt: appended.entry.changedAt,
          };
        }
      }

      const result = await supabase
        .from("entities")
        .update({
          stats: stats as never,
          locked_fields: [...new Set([...fresh.locked_fields, "stats"])],
        })
        .eq("id", entity.id)
        .select("id")
        .single();
      if (result.error) throw result.error;
      wrote = true;

      if (statusTransitionLogged) {
        initialStatusRef.current = statusTransitionLogged.toStatus;
        void logCharacterStatusUpdate({
          entityId: entity.id,
          entityName: entity.name,
          fromStatus: statusTransitionLogged.fromStatus,
          toStatus: statusTransitionLogged.toStatus,
          seriesId,
          seriesTitle,
          seasonNumber: season,
          seasonLabel,
          changedAt: statusTransitionLogged.changedAt,
          source: "roster",
        });
      }
      // Existing whole-series ability rows remain intact; only this season is replaced.
      const removed = await supabase
        .from("character_abilities")
        .delete()
        .eq("entity_id", entity.id)
        .eq("series_id", seriesId)
        .eq("season_number", season);
      if (removed.error) throw removed.error;
      const unique = [
        ...new Map(abilities.filter((a) => a.name.trim()).map((a) => [a.name, a])).values(),
      ];
      if (unique.length) {
        const inserted = await supabase.from("character_abilities").insert(
          unique.map((a) => ({
            entity_id: entity.id,
            series_id: seriesId,
            season_number: season,
            ability_key: a.name,
            level: clampDbAbilityLevel(a.level),
            note: a.note || null,
          })),
        );
        if (inserted.error) throw inserted.error;
      }
      // Shared records: group memberships feed Archive/Orgs/Clan graph, series rows feed Journey graphs.
      const picked = [
        ...(form.organizations ?? []),
        ...(form.bloodline ? [form.bloodline] : []),
      ].filter(Boolean);
      const groupIds = resolveGroupIds(picked, groups);
      if (groupIds.length) {
        const { data: existing, error: memErr } = await supabase
          .from("entity_memberships")
          .select("group_id")
          .eq("character_id", entity.id);
        if (memErr) throw memErr;
        const have = new Set((existing ?? []).map((m) => m.group_id));
        const add = groupIds.filter((g) => !have.has(g) && g !== entity.id);
        if (add.length) {
          const ins = await supabase
            .from("entity_memberships")
            .insert(
              add.map((group_id) => ({ character_id: entity.id, group_id, status: "member" })),
            );
          if (ins.error) throw ins.error;
        }
      }
      if (entity.kind === "character") {
        const { data: sc, error: scErr } = await supabase
          .from("series_characters")
          .select("id")
          .eq("series_id", seriesId)
          .eq("character_id", entity.id)
          .limit(1);
        if (scErr) throw scErr;
        const patch = {
          ...(form.role ? { role_in_series: form.role, arc_role: form.role } : {}),
          ...(form.status ? { status: form.status } : {}),
        };
        const up = sc?.[0]
          ? Object.keys(patch).length
            ? await supabase.from("series_characters").update(patch).eq("id", sc[0].id)
            : { error: null }
          : form.roster !== false
            ? await supabase.from("series_characters").insert({
                series_id: seriesId,
                character_id: entity.id,
                status: form.status || "Alive",
                ...patch,
              })
            : { error: null };
        if (up.error) throw up.error;
      }
      toast.success(`${entity.name} · season saved`);
    } catch (err) {
      toast.error(
        `${wrote ? "Season details saved, but abilities could not all be saved. " : "Couldn't save this season. "}${err instanceof Error ? err.message : "Please retry."}`,
      );
    } finally {
      await invalidateArchive(qc);
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.roster !== false}
          onChange={(ev) => setForm({ ...form, roster: ev.target.checked })}
        />
        In this season's roster
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">
          Role this season
          <select
            aria-label="Season role"
            className="h-9 rounded-md border border-input bg-background px-2"
            value={form.role ?? ""}
            onChange={(ev) => setForm({ ...form, role: ev.target.value })}
          >
            <option value="">Not recorded</option>
            {[
              ...new Set([...DOSSIER_ROLES, ...NEXUS_ROLES, ...(form.role ? [form.role] : [])]),
            ].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Status
          <select
            aria-label="Season status"
            className="h-9 rounded-md border border-input bg-background px-2"
            value={form.status ?? ""}
            onChange={(ev) => setForm({ ...form, status: ev.target.value })}
          >
            <option value="">Not recorded</option>
            {[
              ...new Set([
                ...DOSSIER_STATUSES,
                ...SEASON_STATUSES,
                "Retired",
                ...(form.status ? [form.status] : []),
              ]),
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Gender
          <select
            aria-label="Season gender"
            className="h-9 rounded-md border border-input bg-background px-2"
            value={form.gender ?? ""}
            onChange={(ev) => setForm({ ...form, gender: ev.target.value })}
          >
            <option value="">Not specified</option>
            {DOSSIER_GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Title / Codename
          <Input
            aria-label="Season codename"
            value={form.codename ?? ""}
            onChange={(ev) => setForm({ ...form, codename: ev.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Bloodline
          <select
            aria-label="Season bloodline"
            className="h-9 rounded-md border border-input bg-background px-2"
            value={form.bloodline ?? ""}
            onChange={(ev) => setForm({ ...form, bloodline: ev.target.value })}
          >
            <option value="">None</option>
            {[
              ...new Set([
                ...groups
                  .filter((g) => g.kind === "bloodline" || g.kind === "clan")
                  .map((g) => g.name),
                ...(form.bloodline ? [form.bloodline] : []),
              ]),
            ].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1 text-xs sm:col-span-2">
          <span>Weapons</span>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Season weapon"
              className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2"
              value={weaponChoice}
              onChange={(ev) => {
                const w = ev.target.value.trim();
                if (w) {
                  setForm((f) => ({
                    ...f,
                    weapons: [...new Set([...(f.weapons ?? []), w])],
                  }));
                }
                setWeaponChoice("");
              }}
            >
              <option value="">Add weapon from archive…</option>
              {[...new Set(artifacts.map((a) => a.name).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b))
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
            <Input
              aria-label="Season custom weapon"
              placeholder="Or custom weapon…"
              value={customWeapon}
              onChange={(ev) => setCustomWeapon(ev.target.value)}
              className="h-9 flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const w = customWeapon.trim();
                if (!w) return;
                setForm((f) => ({
                  ...f,
                  weapons: [...new Set([...(f.weapons ?? []), w])],
                }));
                setCustomWeapon("");
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
          {(form.weapons ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(form.weapons ?? []).map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-200"
                >
                  {w}
                  <button
                    type="button"
                    aria-label={`Remove ${w}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        weapons: (f.weapons ?? []).filter((x) => x !== w),
                      }))
                    }
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <fieldset className="grid gap-1 text-xs">
        <legend className="mb-1">Organizations / Cults / Factions</legend>
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-input p-2">
          {groups
            .filter((g) => g.kind === "organization" || g.kind === "faction")
            .map((g) => {
              const on = (form.organizations ?? []).includes(g.name);
              return (
                <button
                  type="button"
                  key={g.id}
                  aria-pressed={on}
                  onClick={() =>
                    setForm({
                      ...form,
                      organizations: on
                        ? (form.organizations ?? []).filter((n) => n !== g.name)
                        : [...(form.organizations ?? []).filter(Boolean), g.name],
                    })
                  }
                  className={`rounded-full border px-2 py-0.5 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {g.name}
                </button>
              );
            })}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled={drafting} onClick={fillStory}>
          {drafting ? "Reading PDFs…" : "Fill story from PDFs"}
        </Button>
      </div>
      {(["story", "impact", "philosophy"] as const).map((field) => (
        <label key={field} className="grid gap-1 text-xs capitalize">
          {field}
          <Textarea
            aria-label={`Season ${field}`}
            rows={2}
            value={form[field] ?? ""}
            onChange={(ev) => setForm({ ...form, [field]: ev.target.value })}
          />
        </label>
      ))}
      <div className="flex items-center justify-between">
        <h3 className="text-sm">Season abilities</h3>
        <Button
          variant="outline"
          size="sm"
          disabled={!loaded}
          onClick={() => setAbilities([...abilities, { name: "", level: 1, note: "" }])}
        >
          <Plus className="h-3 w-3" />
          Ability
        </Button>
      </div>
      {loadError && (
        <p role="alert" className="text-sm text-destructive">
          Abilities could not be loaded.
        </p>
      )}
      {abilities.map((a, i) => (
        <div
          key={i}
          className="grid grid-cols-[auto_minmax(0,1fr)_132px_36px] items-center gap-2 border-b border-border pb-3"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center">
            {a.name.trim() ? (
              <NexusAbilitySymbol
                name={abilityDef(a.name).key}
                label={abilityDef(a.name).label}
                description={abilityDef(a.name).description}
                rank={a.level}
                className="h-8 w-8"
              />
            ) : (
              <span className="h-7 w-7 rounded-full border border-dashed border-border" />
            )}
          </div>
          <Input
            aria-label={`Ability ${i + 1}`}
            list="nexus-ability-options"
            value={a.name}
            onChange={(ev) =>
              setAbilities(abilities.map((v, j) => (j === i ? { ...v, name: ev.target.value } : v)))
            }
          />
          <select
            aria-label={`Ability ${i + 1} rank`}
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            value={clampDbAbilityLevel(a.level)}
            onChange={(ev) =>
              setAbilities(
                abilities.map((v, j) =>
                  j === i ? { ...v, level: clampDbAbilityLevel(Number(ev.target.value)) } : v,
                ),
              )
            }
          >
            {ABILITY_RANKS.map((n) => (
              <option key={n} value={n}>
                {abilityRankMeta(n).roman} · {abilityRankMeta(n).shortTitle} ({n})
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ability ${i + 1}`}
            onClick={() => setAbilities(abilities.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Input
            className="col-span-4"
            aria-label={`Ability ${i + 1} changes`}
            placeholder="Acquired / upgraded / lost · notes"
            value={a.note}
            onChange={(ev) =>
              setAbilities(abilities.map((v, j) => (j === i ? { ...v, note: ev.target.value } : v)))
            }
          />
        </div>
      ))}
      <datalist id="nexus-ability-options">
        {allAbilityDefs().map((a) => (
          <option key={a.key} value={a.key}>
            {a.label}
          </option>
        ))}
      </datalist>
      <label className="grid gap-1 text-xs">
        Stats profile
        <select
          aria-label="Roster stats profile"
          className="h-9 rounded-md border border-input bg-background px-2"
          value={profile}
          onChange={(ev) => setProfile(ev.target.value)}
        >
          <option value="">Character</option>
          {abilities
            .filter((a) => a.name)
            .map((a) => (
              <option key={a.name} value={a.name}>
                {abilityDef(a.name).label}
              </option>
            ))}
        </select>
      </label>
      <SeasonStatSliders
        values={values}
        previousStats={previousStats}
        onChange={setStat}
        ariaPrefix="Roster "
        layout="grid"
      />
      <Button className="w-full" disabled={busy || !loaded || !!loadError} onClick={save}>
        {busy ? "Saving…" : "Save season"}
      </Button>
    </div>
  );
}
