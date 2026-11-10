import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useIsAdmin } from "@/hooks/use-admin";
import { abilityLineagesQuery, useAbilityLineages } from "@/hooks/use-ability-lineages";
import { TIER_ORDER, abilityDef, allAbilityDefs, type AbilityTier } from "@/lib/abilities";
import { ABILITY_FX_LINEAGES_KEY, TIER_POWER, abilityFxRecipe, lineageFor, simulateCombat, type FxLineage } from "@/lib/ability-fx";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import { AbilityFxShowcase } from "@/components/ability-fx-showcase";

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function FxCard({ k, onOpen }: { k: string; onOpen: (k: string) => void }) {
  const [hot, setHot] = useState(false);
  const d = abilityDef(k); const recipe = useMemo(() => abilityFxRecipe(k), [k]);
  return (
    <button onClick={() => onOpen(k)} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)} onFocus={() => setHot(true)} onBlur={() => setHot(false)}
      className="group overflow-hidden rounded-2xl border border-border bg-card/50 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="relative aspect-square w-full bg-background/60"><AbilityFxCanvas recipe={recipe} playing={hot} label={`${d.label} animation`} /></div>
      <div className="grid gap-0.5 p-2.5">
        <span className="truncate text-sm font-medium text-foreground">{d.label}</span>
        <span className="text-[10px] uppercase tracking-widest" style={{ color: recipe.palette[0] }}>{d.tier} · power {TIER_POWER[d.tier]}/8</span>
      </div>
    </button>
  );
}

export function FxLibrary() {
  const [q, setQ] = useState(""); const [tier, setTier] = useState<"all" | AbilityTier>("all"); const [open, setOpen] = useState<string | null>(null);
  const defs = allAbilityDefs().filter(d => (tier === "all" || d.tier === tier) && d.label.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.label.localeCompare(b.label));
  return <section className="grid gap-4">
    <div className="flex flex-wrap gap-2">
      <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search abilities…" className="max-w-xs" aria-label="Search abilities" />
      <select className={sel} value={tier} onChange={e => setTier(e.target.value as typeof tier)} aria-label="Filter by tier">
        <option value="all">All tiers</option>{TIER_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <span className="self-center text-xs text-muted-foreground">{defs.length} abilities · hover to play, tap to open</span>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{defs.map(d => <FxCard key={d.key} k={d.key} onOpen={setOpen} />)}</div>
    <AbilityFxShowcase name={open ?? "lightning"} open={!!open} onOpenChange={o => !o && setOpen(null)} />
  </section>;
}

export function FxChains() {
  const lineages = useAbilityLineages(); const admin = useIsAdmin(); const qc = useQueryClient();
  const [draft, setDraft] = useState<FxLineage[] | null>(null); const [saving, setSaving] = useState(false);
  const list = draft ?? lineages; const defs = allAbilityDefs();
  const chained = new Set(list.flatMap(l => l.steps));
  const unchained = defs.filter(d => !chained.has(d.key) && d.tier !== "Role");
  const edit = (fn: (l: FxLineage[]) => FxLineage[]) => setDraft(fn(structuredClone(list)));
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ key: ABILITY_FX_LINEAGES_KEY, value: { lineages: list } as unknown as Json, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(`Could not save chains: ${error.message}`); return; }
    await qc.invalidateQueries({ queryKey: abilityLineagesQuery.queryKey }); setDraft(null); toast.success("Upgrade chains saved");
  };
  return <section className="grid gap-4">
    {admin && <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => edit(l => [...l, { id: `chain-${Date.now()}`, label: "New chain", steps: [] }])}><Plus className="mr-1 h-4 w-4" />New chain</Button>
      {draft && <><Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "Saving…" : "Save chains"}</Button><Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button></>}
      <span className="text-xs text-muted-foreground">Chains need at least two steps to be saved.</span>
    </div>}
    {list.map((l, li) => <motion.div layout key={l.id} className="grid gap-2 rounded-2xl border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2">
        {admin ? <Input value={l.label} onChange={e => edit(x => { x[li]!.label = e.target.value; return x; })} className="h-8 max-w-sm" aria-label="Chain name" /> : <h3 className="text-sm font-semibold text-foreground">{l.label}</h3>}
        {admin && <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" aria-label="Delete chain" onClick={() => edit(x => x.filter((_, i) => i !== li))}><Trash2 className="h-4 w-4" /></Button>}
      </div>
      <ol className="flex flex-wrap items-center gap-1.5">
        {l.steps.map((k, si) => <li key={`${k}-${si}`} className="flex items-center gap-1">
          {si > 0 && <span aria-hidden className="text-muted-foreground">→</span>}
          <span className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground" style={{ boxShadow: `0 0 10px ${abilityFxRecipe(k).palette[0]}55` }}>
            {abilityDef(k).label}
            {admin && <>
              <button aria-label="Move earlier" disabled={si === 0} onClick={() => edit(x => { const s = x[li]!.steps; [s[si - 1], s[si]] = [s[si]!, s[si - 1]!]; return x; })} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3 -rotate-90" /></button>
              <button aria-label="Move later" disabled={si === l.steps.length - 1} onClick={() => edit(x => { const s = x[li]!.steps; [s[si + 1], s[si]] = [s[si]!, s[si + 1]!]; return x; })} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3 -rotate-90" /></button>
              <button aria-label="Remove step" onClick={() => edit(x => { x[li]!.steps.splice(si, 1); return x; })} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
            </>}
          </span>
        </li>)}
        {admin && <li><select className={`${sel} h-8 text-xs`} value="" aria-label="Add step" onChange={e => { const v = e.target.value; if (v) edit(x => { x[li]!.steps.push(v); return x; }); }}>
          <option value="">+ add step</option>{defs.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select></li>}
      </ol>
    </motion.div>)}
    <div className="rounded-2xl border border-dashed border-border p-3">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Not in any chain ({unchained.length})</h3>
      <div className="flex flex-wrap gap-1.5">{unchained.map(d => <span key={d.key} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{d.label}</span>)}</div>
    </div>
  </section>;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="grid gap-1"><div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="tabular-nums text-foreground">{value}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full" style={{ background: color }} initial={false} animate={{ width: `${value}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></div></div>;
}

export function FxSimulator() {
  const defs = allAbilityDefs().filter(d => d.tier !== "Role").sort((a, b) => a.label.localeCompare(b.label));
  const [k, setK] = useState("red_lightning"); const [tier, setTier] = useState<AbilityTier>(abilityDef("red_lightning").tier);
  const lineages = useAbilityLineages();
  const base = useMemo(() => abilityFxRecipe(k), [k]);
  const recipe = useMemo(() => ({ ...base, power: TIER_POWER[tier] }), [base, tier]);
  const st = simulateCombat(k, tier); const col = recipe.palette[0]; const lineage = lineageFor(lineages, k);
  const reach = 12 + st.range * .34, dash = st.mobility * .3;
  return <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={k} onChange={e => { setK(e.target.value); setTier(abilityDef(e.target.value).tier); }} aria-label="Ability">{defs.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}</select>
        <select className={sel} value={tier} onChange={e => setTier(e.target.value as AbilityTier)} aria-label="Tier">{TIER_ORDER.filter(t => t !== "Role").map(t => <option key={t} value={t}>{t} (power {TIER_POWER[t]})</option>)}</select>
      </div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card/40"><AbilityFxCanvas key={`${k}-${tier}`} recipe={recipe} label={`${abilityDef(k).label} at ${tier} tier`} /></div>
      <p className="text-sm text-muted-foreground">{base.note}{lineage ? ` · Part of ${lineage.label}.` : ""}</p>
    </div>
    <div className="grid content-start gap-4 rounded-2xl border border-border bg-card/50 p-4">
      <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Combat role</p><p className="text-lg font-semibold text-foreground">{st.role}</p></div>
      <Bar label="Damage" value={st.damage} color={col} /><Bar label="Speed" value={st.speed} color={col} /><Bar label="Range" value={st.range} color={col} /><Bar label="Mobility" value={st.mobility} color={col} />
      <div><p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Positioning · effective reach ≈ {st.meters} m</p>
        <svg viewBox="0 0 100 60" className="w-full rounded-xl border border-border bg-background/60" role="img" aria-label={`Positioning: reach ${st.meters} metres`}>
          <line x1="5" y1="30" x2="95" y2="30" stroke="currentColor" className="text-border" strokeDasharray="2 2" />
          <motion.circle cx="14" cy="30" initial={false} animate={{ r: reach }} fill={col} fillOpacity=".12" stroke={col} strokeOpacity=".6" transition={{ type: "spring", stiffness: 90, damping: 18 }} />
          <motion.circle cy="30" r="3" fill={col} initial={false} animate={{ cx: [14, 14 + dash, 14] }} transition={{ duration: Math.max(.6, 2.4 - st.speed / 50), repeat: Infinity, ease: "easeInOut" }} />
          <circle cx="80" cy="30" r="3" className="fill-muted-foreground" />
          <text x="80" y="42" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Opponent</text>
          <text x="14" y="42" textAnchor="middle" fill={col} fontSize="5">You</text>
        </svg>
        <p className="mt-2 text-xs text-muted-foreground">{14 + reach >= 80 ? "Can hit the opponent from the starting position." : `Must close ${Math.round((80 - 14 - reach) / 66 * 30)} m before landing a hit.`}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">These are reader estimates from the ability type and tier, not official story stats.</p>
    </div>
  </section>;
}
