import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, entityRelationsQuery } from "@/lib/entities";
import { FAMILY_LABEL, FAMILY_RELS, generations, isFamilyRel, type FamilyRel } from "@/lib/family";
import { draftFamilyLinks, type FamilyProposal } from "@/lib/family.functions";
import { invalidateArchive } from "@/lib/archive-sync";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/** Family/ancestor tree built from Archive bloodlines, clans and family links; shared by all UI styles. */
export function FamilyTree() {
  const isStaff = useIsStaff();
  const { data: chars = [] } = useQuery(entitiesQuery(["character"]));
  const { data: groups = [] } = useQuery(entitiesQuery(["clan", "bloodline"]));
  const { data: relations = [] } = useQuery(entityRelationsQuery);
  const { data: memberships = [] } = useQuery({
    queryKey: ["entity-links", "all-family"],
    queryFn: async () => (await supabase.from("entity_memberships").select("character_id,group_id")).data ?? [],
  });
  const [group, setGroup] = useState("");
  const family = relations.filter((r) => isFamilyRel(r.rel));
  const people = useMemo(() => {
    const linked = new Set(family.flatMap((r) => [r.source_id, r.target_id]));
    if (!group) return chars.filter((c) => linked.has(c.id));
    const ids = new Set(memberships.filter((m) => m.group_id === group).map((m) => m.character_id));
    for (const r of family) if (ids.has(r.source_id) || ids.has(r.target_id)) { ids.add(r.source_id); ids.add(r.target_id); }
    return chars.filter((c) => ids.has(c.id));
  }, [chars, family, group, memberships]);
  const gen = generations(people.map((p) => p.id), family);
  const rows = [...new Set(gen.values())].sort((a, b) => a - b).map((g) => people.filter((p) => gen.get(p.id) === g).sort((a, b) => a.name.localeCompare(b.name)));
  const W = Math.max(640, Math.max(1, ...rows.map((r) => r.length)) * 130), RH = 110, H = rows.length * RH + 30;
  const pos = new Map<string, { x: number; y: number }>();
  rows.forEach((r, gi) => r.forEach((p, i) => pos.set(p.id, { x: ((i + 1) * W) / (r.length + 1), y: 40 + gi * RH })));
  const groupName = (id: string) => memberships.filter((m) => m.character_id === id).map((m) => groups.find((g) => g.id === m.group_id)?.name).filter(Boolean)[0];

  return (
    <div className="grid min-w-0 gap-4">
      <label className="flex flex-wrap items-center gap-2 text-sm">Clan / bloodline
        <select aria-label="Family tree clan" className="h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-2" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All families</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.kind}</option>)}
        </select>
      </label>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No family links recorded{group ? " for this clan" : ""} yet.{isStaff ? " Add them below or read them from the PDFs." : ""}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-secondary/10">
          <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 900) }} className="w-full" role="img" aria-label="Family tree">
            {family.map((r) => {
              const a = pos.get(r.source_id), b = pos.get(r.target_id);
              if (!a || !b) return null;
              const vertical = r.rel === "parent" || r.rel === "ancestor";
              const d = vertical ? `M${a.x},${a.y + 18} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y - 18}` : `M${a.x},${a.y} Q${(a.x + b.x) / 2},${a.y - 30} ${b.x},${b.y}`;
              return <path key={r.id} d={d} fill="none" stroke={r.rel === "spouse" ? "hsl(340 70% 65%)" : r.rel === "sibling" ? "hsl(190 70% 60%)" : "var(--accent)"} strokeWidth={r.rel === "ancestor" ? 1.5 : 2} strokeDasharray={r.rel === "ancestor" ? "6 5" : r.rel === "sibling" ? "2 4" : undefined} opacity={0.8}><title>{FAMILY_LABEL[r.rel as FamilyRel]}</title></path>;
            })}
            {people.map((p) => { const q = pos.get(p.id)!; const gname = groupName(p.id); return (
              <g key={p.id}>
                <rect x={q.x - 58} y={q.y - 18} width={116} height={gname ? 40 : 34} rx={10} fill="var(--card)" stroke="var(--border)" />
                <text x={q.x} y={q.y + 2} textAnchor="middle" fontSize={11} fill="currentColor">{p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}</text>
                {gname && <text x={q.x} y={q.y + 15} textAnchor="middle" fontSize={8} fill="currentColor" opacity={0.6}>{gname.slice(0, 22)}</text>}
              </g>); })}
          </svg>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Solid: parent → child · dashed: ancestor · dotted: siblings · pink: spouses</p>
      {isStaff && <FamilyEditor chars={chars} family={family} />}
    </div>
  );
}

function FamilyEditor({ chars, family }: { chars: { id: string; name: string }[]; family: { id: string; source_id: string; target_id: string; rel: string }[] }) {
  const qc = useQueryClient();
  const [a, setA] = useState(""); const [rel, setRel] = useState<FamilyRel>("parent"); const [b, setB] = useState("");
  const [proposals, setProposals] = useState<FamilyProposal[]>([]);
  const [reading, setReading] = useState(false);
  const runDraft = useServerFn(draftFamilyLinks);
  const name = (id: string) => chars.find((c) => c.id === id)?.name ?? "?";
  const add = async (s: string, r: string, t: string, quiet = false) => {
    if (!s || !t || s === t) return false;
    if (family.some((f) => f.source_id === s && f.target_id === t && f.rel === r)) return true;
    const { error } = await supabase.from("entity_relations").insert({ source_id: s, target_id: t, rel: r });
    if (error) { if (!quiet) toast.error("Couldn't save that link."); return false; }
    return true;
  };
  const addManual = async () => { if (await add(a, rel, b)) { toast.success("Family link saved."); await invalidateArchive(qc); } };
  const remove = async (id: string) => { const { error } = await supabase.from("entity_relations").delete().eq("id", id); if (error) toast.error("Couldn't remove it."); await invalidateArchive(qc); };
  const read = async () => {
    setReading(true);
    try { const res = await runDraft(); if (res.error) toast.error(res.error); else { setProposals(res.proposals); toast.success(`${res.proposals.length} link(s) found — review before saving.`); } }
    catch { toast.error("Couldn't read the PDFs."); } finally { setReading(false); }
  };
  const accept = async (list: FamilyProposal[]) => {
    let ok = 0; for (const p of list) if (await add(p.sourceId, p.rel, p.targetId, true)) ok++;
    setProposals((cur) => cur.filter((c) => !list.includes(c)));
    await invalidateArchive(qc);
    if (ok < list.length) toast.error(`Saved ${ok} of ${list.length}; some failed.`); else toast.success(`Saved ${ok} link(s).`);
  };
  const sel = "h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <details className="glass rounded-2xl p-4">
      <summary className="cursor-pointer text-sm font-medium">Edit family links (admins & mods)</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
        <select aria-label="First person" className={sel} value={a} onChange={(e) => setA(e.target.value)}><option value="">Person…</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Family relation" className={sel} value={rel} onChange={(e) => setRel(e.target.value as FamilyRel)}>{FAMILY_RELS.map((r) => <option key={r} value={r}>{FAMILY_LABEL[r]}</option>)}</select>
        <select aria-label="Second person" className={sel} value={b} onChange={(e) => setB(e.target.value)}><option value="">Person…</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Button size="sm" onClick={addManual} disabled={!a || !b || a === b}>Add</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={reading} onClick={read}>{reading ? "Reading PDFs…" : "Read family links from PDFs"}</Button>
        {proposals.length > 0 && <Button size="sm" onClick={() => accept(proposals)}>Accept all {proposals.length}</Button>}
      </div>
      {proposals.length > 0 && <ul className="mt-3 grid gap-2">{proposals.map((p, i) => (
        <li key={i} className="rounded-lg border border-border p-2 text-sm">
          <p><b>{p.source}</b> {FAMILY_LABEL[p.rel as FamilyRel]} <b>{p.target}</b></p>
          <p className="mt-1 text-xs italic text-muted-foreground">“{p.quote}”</p>
          <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => accept([p])}>Accept</Button><Button size="sm" variant="ghost" onClick={() => setProposals((c) => c.filter((x) => x !== p))}>Dismiss</Button></div>
        </li>))}</ul>}
      {family.length > 0 && <ul className="mt-4 grid gap-1 text-sm">{family.map((f) => (
        <li key={f.id} className="flex items-center gap-2 border-b border-border/40 py-1"><span className="min-w-0 flex-1 break-words">{name(f.source_id)} {FAMILY_LABEL[f.rel as FamilyRel]} {name(f.target_id)}</span><Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remove link" onClick={() => remove(f.id)}><Trash2 className="h-3 w-3" /></Button></li>))}</ul>}
    </details>
  );
}
