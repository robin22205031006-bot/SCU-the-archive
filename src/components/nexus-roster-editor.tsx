import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Entity } from "@/lib/entities";
import { NEXUS_STATS, readDossier, type SeasonDossier } from "@/lib/nexus-season";
import { NEXUS_ROLES } from "@/lib/nexus-roster";
import { ABILITY_REGISTRY, abilityDef } from "@/lib/abilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

type Ability = { name: string; level: number; note: string };
export function NexusRosterEditor({ open, onClose, entities, seriesId, season, label }: { open: boolean; onClose: () => void; entities: Entity[]; seriesId: string; season: number; label: string }) {
  const [selected, setSelected] = useState(entities[0]?.id ?? "");
  const entity = entities.find(e => e.id === selected);
  return <Dialog open={open} onOpenChange={v => !v && onClose()}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Season roster · {label}</DialogTitle></DialogHeader>
    <label className="grid gap-1 text-xs">Character<select aria-label="Roster character" className="h-10 w-full rounded-md border border-input bg-background px-3" value={selected} onChange={ev => setSelected(ev.target.value)}>{entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
    {entity && <RosterFields key={`${entity.id}:${seriesId}:${season}`} entity={entity} seriesId={seriesId} season={season} />}
  </DialogContent></Dialog>;
}
function RosterFields({ entity, seriesId, season }: { entity: Entity; seriesId: string; season: number }) {
  const qc = useQueryClient();
  const key = `${seriesId}:${season}`;
  const [form, setForm] = useState<SeasonDossier>(() => ({ roster: true, ...readDossier(entity.stats)[key] }));
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, error: loadError } = useQuery({ queryKey: ["roster-abilities", entity.id, seriesId, season], queryFn: async () => {
    const { data, error } = await supabase.from("character_abilities").select("*").eq("entity_id", entity.id).eq("series_id", seriesId);
    if (error) throw error;
    return data;
  }});
  if (data && !loaded) {
    setLoaded(true);
    const m = new Map<string, Ability>();
    data.filter(a => a.season_number == null || a.season_number === season).sort((a,b) => Number(a.season_number != null)-Number(b.season_number != null)).forEach(a => m.set(a.ability_key, { name: a.ability_key, level: a.level, note: a.note ?? "" }));
    setAbilities([...m.values()]);
  }
  const values = profile ? form.abilityStats?.[profile] ?? {} : form.stats ?? {};
  const setStat = (stat: string, value: number) => setForm(f => profile ? { ...f, abilityStats: { ...f.abilityStats, [profile]: { ...f.abilityStats?.[profile], [stat]: value } } } : { ...f, stats: { ...f.stats, [stat]: value } });
  const save = async () => {
    setBusy(true);
    let wrote = false;
    try {
      const { data: fresh, error } = await supabase.from("entities").select("stats,locked_fields").eq("id", entity.id).single();
      if (error) throw error;
      const stats = { ...(fresh.stats as Record<string, unknown>) };
      stats["dossier"] = { ...readDossier(stats), [key]: { ...readDossier(stats)[key], ...form } };
      const result = await supabase.from("entities").update({ stats: stats as never, locked_fields: [...new Set([...fresh.locked_fields, "stats"])] }).eq("id", entity.id).select("id").single();
      if (result.error) throw result.error;
      wrote = true;
      // Existing whole-series ability rows remain intact; only this season is replaced.
      const removed = await supabase.from("character_abilities").delete().eq("entity_id", entity.id).eq("series_id", seriesId).eq("season_number", season);
      if (removed.error) throw removed.error;
      const unique = [...new Map(abilities.filter(a => a.name.trim()).map(a => [a.name, a])).values()];
      if (unique.length) {
        const inserted = await supabase.from("character_abilities").insert(unique.map(a => ({ entity_id: entity.id, series_id: seriesId, season_number: season, ability_key: a.name, level: a.level, note: a.note || null })));
        if (inserted.error) throw inserted.error;
      }
      toast.success(`${entity.name} · season saved`);
    } catch (err) {
      toast.error(`${wrote ? "Season details saved, but abilities could not all be saved. " : "Couldn't save this season. "}${err instanceof Error ? err.message : "Please retry."}`);
    } finally {
      await Promise.all([["entities"], ["entity", entity.id], ["character-abilities"], ["roster-abilities"], ["nexus-series-abilities"], ["character-series"]].map(queryKey => qc.invalidateQueries({ queryKey })));
      setBusy(false);
    }
  };
  return <div className="space-y-4">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.roster !== false} onChange={ev => setForm({ ...form, roster: ev.target.checked })} />In this season's roster</label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs">Role<Input aria-label="Season role" list="nexus-role-options" value={form.role ?? ""} onChange={ev => setForm({ ...form, role: ev.target.value })} /><datalist id="nexus-role-options">{NEXUS_ROLES.map(r => <option key={r} value={r} />)}</datalist></label>
      <label className="grid gap-1 text-xs">Status<select aria-label="Season status" className="h-9 rounded-md border border-input bg-background px-2" value={form.status ?? ""} onChange={ev => setForm({ ...form, status: ev.target.value })}><option value="">Not recorded</option>{["Alive", "Dead", "Revived", "Presumed Dead", "Missing", "Retired", "Unknown"].map(s => <option key={s}>{s}</option>)}</select></label>
      <label className="grid gap-1 text-xs">Title / Codename<Input aria-label="Season codename" value={form.codename ?? ""} onChange={ev => setForm({ ...form, codename: ev.target.value })} /></label>
      <label className="grid gap-1 text-xs">Bloodline<Input aria-label="Season bloodline" value={form.bloodline ?? ""} onChange={ev => setForm({ ...form, bloodline: ev.target.value })} /></label>
    </div>
    <label className="grid gap-1 text-xs">Organizations / Cults<Input aria-label="Season organizations" value={(form.organizations ?? []).join(", ")} onChange={ev => setForm({ ...form, organizations: ev.target.value.split(",").map(s => s.trim()) })} /></label>
    {(["story", "impact", "philosophy"] as const).map(field => <label key={field} className="grid gap-1 text-xs capitalize">{field}<Textarea aria-label={`Season ${field}`} rows={2} value={form[field] ?? ""} onChange={ev => setForm({ ...form, [field]: ev.target.value })} /></label>)}
    <div className="flex items-center justify-between"><h3 className="text-sm">Season abilities</h3><Button variant="outline" size="sm" disabled={!loaded} onClick={() => setAbilities([...abilities, { name: "", level: 1, note: "" }])}><Plus className="h-3 w-3" />Ability</Button></div>
    {loadError && <p role="alert" className="text-sm text-destructive">Abilities could not be loaded.</p>}
    {abilities.map((a,i) => <div key={i} className="grid grid-cols-[1fr_70px_36px] gap-2 border-b border-border pb-3">
      <Input aria-label={`Ability ${i+1}`} list="nexus-ability-options" value={a.name} onChange={ev => setAbilities(abilities.map((v,j) => j===i ? { ...v, name: ev.target.value } : v))} />
      <Input type="number" aria-label={`Ability ${i+1} level`} min={1} max={100} value={a.level} onChange={ev => setAbilities(abilities.map((v,j) => j===i ? { ...v, level: Math.max(1,Math.min(100,Number(ev.target.value)||1)) } : v))} />
      <Button variant="ghost" size="icon" aria-label={`Remove ability ${i+1}`} onClick={() => setAbilities(abilities.filter((_,j) => j!==i))}><Trash2 className="h-4 w-4" /></Button>
      <Input className="col-span-3" aria-label={`Ability ${i+1} changes`} placeholder="Acquired / upgraded / lost · notes" value={a.note} onChange={ev => setAbilities(abilities.map((v,j) => j===i ? { ...v, note: ev.target.value } : v))} />
    </div>)}
    <datalist id="nexus-ability-options">{ABILITY_REGISTRY.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</datalist>
    <label className="grid gap-1 text-xs">Stats profile<select aria-label="Roster stats profile" className="h-9 rounded-md border border-input bg-background px-2" value={profile} onChange={ev => setProfile(ev.target.value)}><option value="">Character</option>{abilities.filter(a => a.name).map(a => <option key={a.name} value={a.name}>{abilityDef(a.name).label}</option>)}</select></label>
    <div className="grid gap-2 sm:grid-cols-2">{NEXUS_STATS.map(s => <label key={s.key} className="flex items-center gap-2 text-xs"><span className="w-28 shrink-0">{s.label}</span><input aria-label={`Roster ${s.label}`} type="range" min={0} max={100} value={values[s.key] ?? 0} onChange={ev => setStat(s.key,Number(ev.target.value))} className="min-w-0 flex-1 accent-[var(--accent)]" /><span className="w-7 text-right">{values[s.key] ?? 0}</span></label>)}</div>
    <Button className="w-full" disabled={busy || !loaded || !!loadError} onClick={save}>{busy ? "Saving…" : "Save season"}</Button>
  </div>;
}