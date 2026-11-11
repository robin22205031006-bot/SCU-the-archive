import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

type Artifact = Tables<"artifacts">;
export const ARTIFACT_CATEGORIES = { weapon: "Weapon", cursed_weapon: "Cursed weapon", cosmic_object: "Cosmic object", relic: "Relic", serum_tech: "Serum / tech", other: "Other" } as const;
type Cat = keyof typeof ARTIFACT_CATEGORIES;

const artifactsQuery = queryOptions({
  queryKey: ["artifacts"],
  queryFn: async () => { const { data, error } = await supabase.from("artifacts").select("*").order("name"); if (error) throw error; return data; },
});

export const Route = createFileRoute("/_authenticated/arsenal")({
  head: () => ({ meta: [
    { title: "Arsenal & Relics — Sentinels Cinematic Universe" },
    { name: "description", content: "Weapons, cursed blades and cosmic objects of the SCU, like Kara Yazgi, the Architect Cube and the Aether Stone." },
    { property: "og:title", content: "Arsenal & Relics — SCU" },
    { property: "og:description", content: "Every SCU weapon, cursed blade and sacred object with wielders, materials and lore." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artifactsQuery),
  component: ArsenalPage,
});

const EMPTY = { name: "", category: "weapon" as Cat, weapon_type: "", wielders: "", materials: "", colors: "", curse_level: 0, how_it_works: "", lore: "" };

function ArsenalPage() {
  const { data } = useSuspenseQuery(artifactsQuery);
  const staff = useIsStaff();
  const qc = useQueryClient();
  const [q, setQ] = useState(""); const [cat, setCat] = useState<Cat | "all">("all");
  const [edit, setEdit] = useState<{ id?: string; v: typeof EMPTY } | null>(null);
  const list = useMemo(() => data.filter(a => (cat === "all" || a.category === cat) && `${a.name} ${a.wielders.join(" ")} ${a.lore}`.toLowerCase().includes(q.toLowerCase())), [data, q, cat]);

  const save = async () => {
    if (!edit || !edit.v.name.trim()) { toast.error("Name is required"); return; }
    const v = edit.v; const row = { name: v.name.trim(), category: v.category, weapon_type: v.weapon_type || null, wielders: v.wielders.split(",").map(s => s.trim()).filter(Boolean), materials: v.materials || null, colors: v.colors || null, curse_level: Number(v.curse_level) || 0, how_it_works: v.how_it_works, lore: v.lore, updated_at: new Date().toISOString() };
    const { error } = edit.id ? await supabase.from("artifacts").update(row).eq("id", edit.id) : await supabase.from("artifacts").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["artifacts"] });
  };
  const remove = async (a: Artifact) => {
    if (!confirm(`Delete ${a.name}?`)) return undefined;
    const { error } = await supabase.from("artifacts").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["artifacts"] });
  };
  const open = (a?: Artifact) => setEdit(a ? { id: a.id, v: { name: a.name, category: (a.category in ARTIFACT_CATEGORIES ? a.category : "other") as Cat, weapon_type: a.weapon_type ?? "", wielders: a.wielders.join(", "), materials: a.materials ?? "", colors: a.colors ?? "", curse_level: a.curse_level, how_it_works: a.how_it_works, lore: a.lore } } : { v: { ...EMPTY } });
  const f = (k: keyof typeof EMPTY) => ({ value: String(edit?.v[k] ?? ""), onChange: (e: { target: { value: string } }) => setEdit(s => s && { ...s, v: { ...s.v, [k]: e.target.value } }) });

  return <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-24 pt-24 sm:px-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-bold tracking-tight text-foreground">Arsenal & Relics</h1>
        <p className="text-sm text-muted-foreground">Weapons, cursed blades and sacred objects of the SCU.</p></div>
      {staff && <Button size="sm" onClick={() => open()}><Plus className="mr-1 size-4" />Add item</Button>}
    </header>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search name, wielder or lore" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="flex flex-wrap gap-1.5">{(["all", ...Object.keys(ARTIFACT_CATEGORIES)] as (Cat | "all")[]).map(c => <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-xs transition ${cat === c ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground"}`}>{c === "all" ? "All" : ARTIFACT_CATEGORIES[c]}</button>)}</div>
    </div>
    {edit && <section className="grid gap-2 rounded-2xl border border-accent/40 bg-card p-4 sm:grid-cols-2">
      <div className="flex items-center justify-between sm:col-span-2"><h2 className="font-semibold">{edit.id ? "Edit item" : "New item"}</h2><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setEdit(null)}><X className="size-4" /></Button></div>
      <Input placeholder="Name" {...f("name")} />
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" {...f("category")}>{Object.entries(ARTIFACT_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <Input placeholder="Type (sword, katana, relic...)" {...f("weapon_type")} />
      <Input placeholder="Wielders (comma separated)" {...f("wielders")} />
      <Input placeholder="Materials" {...f("materials")} />
      <Input placeholder="Colors" {...f("colors")} />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Curse level (0–5)<Input type="number" min={0} max={5} className="w-20" {...f("curse_level")} /></label>
      <Textarea className="sm:col-span-2" placeholder="How it works" {...f("how_it_works")} />
      <Textarea className="sm:col-span-2" placeholder="Lore" {...f("lore")} />
      <div className="sm:col-span-2"><Button onClick={save}>Save</Button></div>
    </section>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(a => <article key={a.id} className="grid gap-2 rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-[11px] uppercase tracking-widest text-accent">{ARTIFACT_CATEGORIES[a.category as Cat] ?? a.category}{a.weapon_type ? ` · ${a.weapon_type}` : ""}</p><h2 className="font-semibold text-foreground">{a.name}</h2></div>
          {staff && <div className="flex shrink-0"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => open(a)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(a)}><Trash2 className="size-4" /></Button></div>}
        </div>
        {a.curse_level > 0 && <p className="text-xs text-destructive">Curse level {a.curse_level}/5</p>}
        {a.how_it_works && <p className="text-sm text-foreground/90">{a.how_it_works}</p>}
        {a.lore && <p className="text-sm text-muted-foreground">{a.lore}</p>}
        <dl className="grid gap-0.5 text-xs text-muted-foreground">
          {a.wielders.length > 0 && <div><dt className="inline font-medium text-foreground">Wielders: </dt><dd className="inline">{a.wielders.join(", ")}</dd></div>}
          {a.materials && <div><dt className="inline font-medium text-foreground">Materials: </dt><dd className="inline">{a.materials}</dd></div>}
          {a.colors && <div><dt className="inline font-medium text-foreground">Colors: </dt><dd className="inline">{a.colors}</dd></div>}
        </dl>
      </article>)}
      {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing found.</p>}
    </div>
  </main>;
}
