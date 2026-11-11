import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { abilityDef } from "@/lib/abilities";
import { abilityFxRecipe, lineageFor, TIER_POWER } from "@/lib/ability-fx";
import { useAbilityLineages } from "@/hooks/use-ability-lineages";
import { Link } from "@tanstack/react-router";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { useNexusAdvancedFx } from "@/hooks/use-nexus-advanced-fx";

/** Expanded Nexus ability showcase: cel FX, tier and upgrade lineage playback. */
export function AbilityFxShowcase({ name, open, onOpenChange }: { name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState(name);
  const [ascending, setAscending] = useState(false);
  useEffect(() => { if (open) { setCurrent(name); setAscending(false); } }, [open, name]);
  const lineages = useAbilityLineages();
  const lineage = useMemo(() => lineageFor(lineages, current), [lineages, current]);
  const def = abilityDef(current);
  const recipe = useMemo(() => abilityFxRecipe(current), [current]);
  useEffect(() => {
    if (!ascending || !lineage) return;
    const i = lineage.steps.indexOf(def.key);
    if (i >= lineage.steps.length - 1) { setAscending(false); return; }
    const id = window.setTimeout(() => setCurrent(lineage.steps[i + 1]!), 2600);
    return () => window.clearTimeout(id);
  }, [ascending, lineage, def.key]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(96vw,44rem)] max-w-none overflow-y-auto border-accent/40 bg-background/95 p-4 sm:p-6">
        <DialogTitle className="flex items-center gap-2 text-xl"><NexusAbilitySymbol name={def.key} className="h-8 w-8" />{def.label}</DialogTitle>
        <DialogDescription>{def.tier} tier · power {TIER_POWER[def.tier]}/8</DialogDescription>
        <div className="grid gap-1 text-sm"><p className="text-foreground">{recipe.note}</p>{def.description && def.description !== recipe.note && <p className="text-muted-foreground">{def.description}</p>}</div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card/40">
          <AnimatePresence mode="popLayout">
            <motion.div key={def.key} className="absolute inset-0" initial={{ opacity: 0, scale: .85, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 1.15, filter: "blur(6px)" }} transition={{ duration: .55, ease: [.2, .8, .2, 1] }}>
              <AbilityFxCanvas recipe={recipe} label={`${def.label} animation`} />
            </motion.div>
          </AnimatePresence>
          <span className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-widest" style={{ color: recipe.palette[0] }}>Power {recipe.power}/8</span>
        </div>
        {lineage && <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2"><p className="text-xs uppercase tracking-widest text-muted-foreground">{lineage.label}</p>
            <Button size="sm" variant="outline" onClick={() => { setCurrent(lineage.steps[0]!); setAscending(true); }} disabled={ascending}>{ascending ? "Ascending…" : "Play ascension"}</Button></div>
          <ol className="flex flex-wrap items-center gap-1.5">
            {lineage.steps.map((k, i) => { const d = abilityDef(k); const active = d.key === def.key; return <li key={k} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-muted-foreground">→</span>}
              <button onClick={() => { setAscending(false); setCurrent(k); }} aria-current={active ? "step" : undefined} className={`rounded-full border px-2.5 py-1 text-xs transition ${active ? "border-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`} style={active ? { boxShadow: `0 0 12px ${abilityFxRecipe(k).palette[0]}` } : undefined}>{d.label}</button>
            </li>; })}
          </ol>
        </div>}
        <Link to="/abilities" search={{ tab: "fx" }} onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Open the Ability FX library and combat simulator →</Link>
      </DialogContent>
    </Dialog>
  );
}

/** Nexus detail-panel launcher; hidden unless Advanced ability FX is on. */
export function AbilityFxLauncher({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const on = useNexusAdvancedFx();
  if (!on) return null;
  return <>
    <Button variant="outline" className="mb-3 w-full" onClick={() => setOpen(true)}>Play ability animation</Button>
    <AbilityFxShowcase name={name} open={open} onOpenChange={setOpen} />
  </>;
}
