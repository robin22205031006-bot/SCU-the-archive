import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allAbilityDefs, abilityDef } from "@/lib/abilities";
import { abilityFxRecipe } from "@/lib/ability-fx";
import { STORY_FIGHTS, actionNote, choreography, totalDuration, type Gender } from "@/lib/ability-action";
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
  const [fightId, setFightId] = useState<string | null>(null); const [beat, setBeat] = useState(0);
  const fight = STORY_FIGHTS.find(f => f.id === fightId) ?? null, cur = fight?.beats[beat];
  useEffect(() => { if (!fight || !playing) return; const b = fight.beats[beat]!; const ms = totalDuration(choreography(b.ability, b.gender)) * 1000 / speed;
    const id = window.setTimeout(() => setBeat(i => (i + 1) % fight.beats.length), ms); return () => window.clearTimeout(id); }, [fight, beat, playing, speed]);
  const ability = cur?.ability ?? k, fg = cur?.gender ?? gender;
  const d = abilityDef(ability), r = abilityFxRecipe(ability);
  return <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
    <header className="grid gap-1"><h1 className="text-3xl font-bold tracking-tight text-foreground">Ability in Action</h1>
      <p className="text-sm text-muted-foreground">How a fighter actually uses each power: wind-up, movement, release and impact.</p></header>
    <div className="flex flex-wrap items-center gap-2">
      <select className={sel} value={k} onChange={e => { setK(e.target.value); setFightId(null); }} aria-label="Ability">{defs.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
      <div role="radiogroup" aria-label="Fighter" className="flex rounded-full border border-border p-0.5">
        {(["male", "female"] as const).map(g => <button key={g} role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`rounded-full px-3 py-1 text-sm capitalize transition ${gender === g ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{g}</button>)}
      </div>
      <select className={sel} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">
        <option value={0.25}>0.25× (frame study)</option><option value={0.5}>0.5×</option><option value={1}>1×</option></select>
      <Button size="sm" variant="outline" onClick={() => setPlaying(p => !p)}>{playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}{playing ? "Pause" : "Play"}</Button>
    </div>
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border">
      <AbilityActionCanvas key={fight ? `${fight.id}-${beat}` : "free"} caption={cur ? `${cur.who} · ${d.label}` : undefined} name={ability} gender={fg} speed={speed} playing={playing} onPhase={(label, i, n) => setPhase({ label, i, n })} />
      <span className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-xs uppercase tracking-widest" style={{ color: r.palette[0] }}>{phase.i + 1}/{phase.n} · {phase.label}</span>
    </div>
    {fight && cur && <div className="grid gap-1 rounded-2xl border border-primary/40 bg-card/60 p-4 text-sm">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Story fight · {fight.when} · beat {beat + 1}/{fight.beats.length}</p>
      <p className="font-semibold text-foreground">{cur.label}</p>
      <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">"{fight.quote}"</blockquote>
      {fight.note && <p className="text-xs text-muted-foreground">{fight.note}</p>}
      <div><Button size="sm" variant="ghost" onClick={() => setFightId(null)}>Back to free practice</Button></div>
    </div>}
    <div className="grid gap-1 rounded-2xl border border-border bg-card/50 p-4 text-sm">
      <p className="font-semibold text-foreground">{d.label} <span className="font-normal text-muted-foreground">· {d.tier}</span></p>
      <p className="text-foreground">{actionNote(ability)}</p>
      <p className="text-muted-foreground">{r.note}</p>
      <p className="text-xs text-muted-foreground">{fg === "male" ? "Male fighters hit heavier: grounded punches and stomps with screen-shaking impacts." : "Female fighters move with more agility: kicks, flips and aerial approaches."}</p>
    </div>
    <section className="grid gap-3" aria-labelledby="story-fights">
      <h2 id="story-fights" className="text-xl font-semibold text-foreground">Story fights</h2>
      <p className="text-sm text-muted-foreground">Fights written in the archive, replayed beat by beat. Only fights with a story passage appear here.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STORY_FIGHTS.map(f => <button key={f.id} onClick={() => { setFightId(f.id); setBeat(0); setPlaying(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className={`grid gap-1 rounded-2xl border p-4 text-left text-sm transition hover:border-primary/60 ${fightId === f.id ? "border-primary bg-accent/10" : "border-border bg-card/40"}`}>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{f.when}</span>
          <span className="font-semibold text-foreground">{f.title}</span>
          <span className="line-clamp-3 italic text-muted-foreground">"{f.quote}"</span>
          <span className="text-xs text-muted-foreground">{f.beats.map(b => b.who).join(" → ")}</span>
        </button>)}
      </div>
    </section>
  </main>;
}
