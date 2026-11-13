import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, type Entity } from "@/lib/entities";
import { NEXUS_STATS, readDossier, type SeasonDossier } from "@/lib/nexus-season";
import { NEXUS_ROLES } from "@/lib/nexus-roster";
import { SEASON_STATUSES } from "@/lib/series";
import { useServerFn } from "@tanstack/react-start";
import { draftSeasonStory } from "@/lib/season-story.functions";
import { allAbilityDefs, abilityDef } from "@/lib/abilities";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { invalidateArchive, resolveGroupIds } from "@/lib/archive-sync";

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
  const [selected, setSelected] = useState(entities[0]?.id ?? "");
  const { data: groups = [] } = useQuery(
    entitiesQuery(["organization", "clan", "bloodline", "faction"]),
  );
  const all = [...entities, ...groups];
  const entity = all.find((e) => e.id === selected);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Season roster · {label}</DialogTitle>
        </DialogHeader>
        <label className="grid gap-1 text-xs">
          Character / Organization / Bloodline / Cult
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
  groups,
}: {
  entity: Entity;
  seriesId: string;
  season: number;
  groups: Entity[];
}) {
  const qc = useQueryClient();
  useAbilityRegistryVersion();
  const key = `${seriesId}:${season}`;
  const [form, setForm] = useState<SeasonDossier>(() => ({
    roster: true,
    ...readDossier(entity.stats)[key],
  }));
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
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
  if (data && !loaded) {
    setLoaded(true);
    const m = new Map<string, Ability>();
    data
      .filter((a) => a.season_number == null || a.season_number === season)
      .sort((a, b) => Number(a.season_number != null) - Number(b.season_number != null))
      .forEach((a) =>
        m.set(a.ability_key, { name: a.ability_key, level: a.level, note: a.note ?? "" }),
      );
    const keys = form.abilityKeys;
    setAbilities([...m.values()].filter((a) => keys === undefined || keys.includes(a.name)));
  }
  const values = profile ? (form.abilityStats?.[profile] ?? {}) : (form.stats ?? {});
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
        .select("stats,locked_fields")
        .eq("id", entity.id)
        .single();
      if (error) throw error;
      const stats = { ...(fresh.stats as Record<string, unknown>) };
      stats["dossier"] = {
        ...readDossier(stats),
        [key]: {
          ...readDossier(stats)[key],
          ...form,
          abilityKeys: abilities.filter((a) => a.name.trim()).map((a) => a.name),
        },
      };
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
            level: a.level,
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
            {[...new Set([...NEXUS_ROLES, ...(form.role ? [form.role] : [])])].map((r) => (
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
            {SEASON_STATUSES.map((s) => (
              <option key={s}>{s}</option>
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
          className="grid grid-cols-[minmax(0,1fr)_64px_36px] gap-2 border-b border-border pb-3"
        >
          <Input
            aria-label={`Ability ${i + 1}`}
            list="nexus-ability-options"
            value={a.name}
            onChange={(ev) =>
              setAbilities(abilities.map((v, j) => (j === i ? { ...v, name: ev.target.value } : v)))
            }
          />
          <Input
            type="number"
            aria-label={`Ability ${i + 1} level`}
            min={1}
            max={100}
            value={a.level}
            onChange={(ev) =>
              setAbilities(
                abilities.map((v, j) =>
                  j === i
                    ? { ...v, level: Math.max(1, Math.min(100, Number(ev.target.value) || 1)) }
                    : v,
                ),
              )
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ability ${i + 1}`}
            onClick={() => setAbilities(abilities.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Input
            className="col-span-3"
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
      <div className="grid gap-2 sm:grid-cols-2">
        {NEXUS_STATS.map((s) => (
          <label key={s.key} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0">{s.label}</span>
            <input
              aria-label={`Roster ${s.label}`}
              type="range"
              min={0}
              max={100}
              value={values[s.key] ?? 0}
              onChange={(ev) => setStat(s.key, Number(ev.target.value))}
              className="min-w-0 flex-1 accent-[var(--accent)]"
            />
            <span className="w-7 text-right">{values[s.key] ?? 0}</span>
          </label>
        ))}
      </div>
      <Button className="w-full" disabled={busy || !loaded || !!loadError} onClick={save}>
        {busy ? "Saving…" : "Save season"}
      </Button>
    </div>
  );
}
