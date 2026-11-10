import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allAbilityDefs, abilityDef } from "@/lib/abilities";
import { abilityFxRecipe } from "@/lib/ability-fx";
import { actionNote, type Gender } from "@/lib/ability-action";
import { AbilityActionCanvas } from "@/components/ability-action-canvas";

export const Route = createFileRoute("/_authenticated/ability-action")({
  head: () => ({
    meta: [
      { title: "Ability in Action — Sentinels Cinematic Universe" },
      { name: "description", content: "Watch a shadow fighter use each SCU ability step by step, as a male or female fighter." },
      { property: "og:title", content: "Ability in Action — SCU" },
      { property: "og:description", content: "Step-by-step action animations of how fighters use every SCU ability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbilityActionPage,
});

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function AbilityActionPage() {
  const defs = allAbilityDefs().sort((a, b) => a.label.localeCompare(b.label));
  const [k, setK] = useState("crimson_astrapo"); const [gender, setGender] = useState<Gender>("male");
  const [speed, setSpeed] = useState(1); const [playing, setPlaying] = useState(true); const [phase, setPhase] = useState({ label: "Ready", i: 0, n: 1 });
  const d = abilityDef(k), r = abilityFxRecipe(k);
  return <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
    <header className="grid gap-1"><h1 className="text-3xl font-bold tracking-tight text-foreground">Ability in Action</h1>
      <p className="text-sm text-muted-foreground">How a fighter actually uses each power: wind-up, movement, release and impact.</p></header>
    <div className="flex flex-wrap items-center gap-2">
      <select className={sel} value={k} onChange={e => setK(e.target.value)} aria-label="Ability">{defs.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
      <div role="radiogroup" aria-label="Fighter" className="flex rounded-full border border-border p-0.5">
        {(["male", "female"] as const).map(g => <button key={g} role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`rounded-full px-3 py-1 text-sm capitalize transition ${gender === g ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{g}</button>)}
      </div>
      <select className={sel} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">
        <option value={0.25}>0.25× (frame study)</option><option value={0.5}>0.5×</option><option value={1}>1×</option></select>
      <Button size="sm" variant="outline" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}{playing ? "Pause" : "Play"}</Button>
    </div>
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border">
      <AbilityActionCanvas name={k} gender={gender} speed={speed} playing={playing} onPhase={(label, i, n) => setPhase({ label, i, n })} />
      <span className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-xs uppercase tracking-widest" style={{ color: r.palette[0] }}>{phase.i + 1}/{phase.n} · {phase.label}</span>
    </div>
    <div className="grid gap-1 rounded-2xl border border-border bg-card/50 p-4 text-sm">
      <p className="font-semibold text-foreground">{d.label} <span className="font-normal text-muted-foreground">· {d.tier}</span></p>
      <p className="text-foreground">{actionNote(k)}</p>
      <p className="text-muted-foreground">{r.note}</p>
      <p className="text-xs text-muted-foreground">{gender === "male" ? "Male fighters hit heavier: grounded punches and stomps with screen-shaking impacts." : "Female fighters move with more agility: kicks, flips and aerial approaches."}</p>
    </div>
  </main>;
}
