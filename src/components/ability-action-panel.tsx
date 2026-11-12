import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allAbilityDefs, abilityDef } from "@/lib/abilities";
import { abilityFxRecipe } from "@/lib/ability-fx";
import {
  FIGHT_STYLES,
  STORY_FIGHTS,
  actionNote,
  styleFor,
  type FightStyleId,
  choreography,
  totalDuration,
  type Gender,
} from "@/lib/ability-action";
import { AbilityActionCanvas } from "@/components/ability-action-canvas";
import {
  CHARACTER_COMBAT,
  characterCombat,
  type CombatBackdrop,
  type CombatSceneId,
} from "@/lib/character-combat";

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export function AbilityActionPanel() {
  const defs = allAbilityDefs().sort((a, b) => a.label.localeCompare(b.label));
  const [k, setK] = useState("crimson_astrapo");
  const [gender, setGender] = useState<Gender>("male");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState({ label: "Ready", i: 0, n: 1 });
  const [fstyle, setFstyle] = useState<FightStyleId>("auto");
  const [fightId, setFightId] = useState<string | null>(null);
  const [beat, setBeat] = useState(0);
  const [sceneId, setSceneId] = useState<CombatSceneId | undefined>();
  const [backdrop, setBackdrop] = useState<CombatBackdrop>("rooftop");
  const [frame, setFrame] = useState<number | undefined>();
  const scene = characterCombat(sceneId);
  const fight = STORY_FIGHTS.find((f) => f.id === fightId) ?? null,
    cur = fight?.beats[beat];
  useEffect(() => {
    if (!fight || !playing) return;
    const b = fight.beats[beat];
    if (!b) return;
    const ms = (totalDuration(choreography(b.ability, b.gender, styleFor(b.who))) * 1000) / speed;
    const id = window.setTimeout(() => setBeat((i) => (i + 1) % fight.beats.length), ms);
    return () => window.clearTimeout(id);
  }, [fight, beat, playing, speed]);
  const ability = scene?.ability ?? cur?.ability ?? k,
    fg = scene?.gender ?? cur?.gender ?? gender,
    fs: FightStyleId = cur ? styleFor(cur.who) : fstyle;
  const frameCount = Math.ceil(totalDuration(scene?.beats ?? choreography(ability, fg, fs)) * 24);
  const step = (delta: number) => {
    setPlaying(false);
    setFrame((f) => Math.max(0, Math.min(frameCount - 1, (f ?? 0) + delta)));
  };
  const d = abilityDef(ability),
    r = abilityFxRecipe(ability);
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
      <header className="grid gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Ability in Action</h1>
        <p className="text-sm text-muted-foreground">
          How a fighter actually uses each power: wind-up, movement, release and impact.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${sel} max-w-full`}
          value={sceneId ?? "free"}
          onChange={(e) => {
            setSceneId(e.target.value === "free" ? undefined : (e.target.value as CombatSceneId));
            setFightId(null);
            setFrame(undefined);
            setPlaying(true);
          }}
          aria-label="Combat scene"
        >
          <option value="free">Free practice</option>
          {CHARACTER_COMBAT.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={`${sel} max-w-full`}
          value={k}
          onChange={(e) => {
            setK(e.target.value);
            setFightId(null);
            setSceneId(undefined);
            setFrame(undefined);
          }}
          aria-label="Ability"
        >
          {defs.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </select>
        <div
          role="radiogroup"
          aria-label="Fighter"
          className="flex rounded-full border border-border p-0.5"
        >
          {(["male", "female"] as const).map((g) => (
            <Button
              key={g}
              variant="ghost"
              size="sm"
              role="radio"
              aria-checked={fg === g}
              onClick={() => {
                setGender(g);
                setFightId(null);
                setSceneId(undefined);
                setFrame(undefined);
              }}
              className={`rounded-full px-3 py-1 text-sm capitalize transition ${fg === g ? "bg-accent/20 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {g}
            </Button>
          ))}
        </div>
        <select
          className={`${sel} max-w-full`}
          value={fstyle}
          onChange={(e) => {
            setFstyle(e.target.value as FightStyleId);
            setFightId(null);
            setSceneId(undefined);
            setFrame(undefined);
          }}
          aria-label="Fighting style"
        >
          <option value="auto">Style: ability default</option>
          {Object.entries(FIGHT_STYLES).map(([id, v]) => (
            <option key={id} value={id}>
              Style: {v.label}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="Playback speed"
        >
          <option value={0.25}>0.25× (frame study)</option>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
        </select>
        <select
          className={`${sel} max-w-full`}
          aria-label="Combat background"
          value={scene?.backdrop ?? backdrop}
          onChange={(e) => {
            setBackdrop(e.target.value as CombatBackdrop);
            setSceneId(undefined);
          }}
        >
          <option value="rooftop">Moonlit rooftop</option>
          <option value="water">Water courtyard</option>
          <option value="ocean">Open sea</option>
          <option value="shatter">Shattered stone</option>
          <option value="arena">Training arena</option>
          <option value="night">Moonlit cliffs</option>
          <option value="street">Highway</option>
          <option value="void">Chaos void</option>
          <option value="ember">Ember hall</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setFrame(undefined);
            setPlaying((p) => !p);
          }}
        >
          {playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border">
        <AbilityActionCanvas
          key={sceneId ?? (fight ? `${fight.id}-${beat}` : "free")}
          caption={scene?.label ?? (cur ? `${cur.who} · ${d.label}` : undefined)}
          sceneId={sceneId}
          backdrop={backdrop}
          frame={frame}
          name={ability}
          gender={fg}
          style={fs}
          speed={speed}
          playing={playing}
          onPhase={(label, i, n) => setPhase({ label, i, n })}
        />
        <span
          className="absolute left-3 top-3 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-xs uppercase tracking-widest"
          style={{ color: r.palette[0] }}
        >
          {phase.i + 1}/{phase.n} · {phase.label}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          title="Previous frame"
          aria-label="Previous frame"
          onClick={() => step(-1)}
        >
          <SkipBack className="size-4" />
        </Button>
        <input
          className="min-w-0 flex-1 accent-primary"
          aria-label="Animation frame"
          type="range"
          min={0}
          max={frameCount - 1}
          value={frame ?? 0}
          onChange={(e) => {
            setPlaying(false);
            setFrame(Number(e.target.value));
          }}
        />
        <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {frame === undefined ? "24 fps" : `${frame + 1}/${frameCount}`}
        </span>
        <Button
          variant="outline"
          size="icon"
          title="Next frame"
          aria-label="Next frame"
          onClick={() => step(1)}
        >
          <SkipForward className="size-4" />
        </Button>
      </div>
      {scene && (
        <section className="border-l-2 border-primary pl-4">
          <h2 className="font-semibold">{scene.label}</h2>
          <p className="text-sm text-muted-foreground">{scene.note}</p>
          <p className="mt-1 text-xs text-muted-foreground">Reference choreography</p>
        </section>
      )}
      {fight && cur && (
        <div className="grid gap-1 rounded-2xl border border-primary/40 bg-card/60 p-4 text-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Story fight · {fight.when} · beat {beat + 1}/{fight.beats.length}
          </p>
          <p className="font-semibold text-foreground">{cur.label}</p>
          <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground">
            "{fight.quote}"
          </blockquote>
          {fight.note && <p className="text-xs text-muted-foreground">{fight.note}</p>}
          <div>
            <Button size="sm" variant="ghost" onClick={() => setFightId(null)}>
              Back to free practice
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-1 rounded-2xl border border-border bg-card/50 p-4 text-sm">
        <p className="font-semibold text-foreground">
          {d.label} <span className="font-normal text-muted-foreground">· {d.tier}</span>
        </p>
        <p className="text-foreground">{actionNote(ability)}</p>
        <p className="text-muted-foreground">{r.note}</p>
        {fs !== "auto" && (
          <p className="text-foreground">
            <span className="font-semibold">{FIGHT_STYLES[fs].label}:</span> {FIGHT_STYLES[fs].note}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {fg === "male"
            ? "Male fighters hit heavier: grounded punches and stomps with screen-shaking impacts."
            : "Female fighters move with more agility: kicks, flips and aerial approaches."}
        </p>
      </div>
      <section className="grid gap-3" aria-labelledby="story-fights">
        <h2 id="story-fights" className="text-xl font-semibold text-foreground">
          Story fights
        </h2>
        <p className="text-sm text-muted-foreground">
          Fights written in the archive, replayed beat by beat. Only fights with a story passage
          appear here.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STORY_FIGHTS.map((f) => (
            <Button
              variant="ghost"
              key={f.id}
              onClick={() => {
                setSceneId(undefined);
                setFrame(undefined);
                setFightId(f.id);
                setBeat(0);
                setPlaying(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`grid h-auto gap-1 whitespace-normal rounded-2xl border p-4 text-left text-sm transition hover:border-primary/60 ${fightId === f.id ? "border-primary bg-accent/10" : "border-border bg-card/40"}`}
            >
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {f.when}
              </span>
              <span className="font-semibold text-foreground">{f.title}</span>
              <span className="line-clamp-3 italic text-muted-foreground">"{f.quote}"</span>
              <span className="text-xs text-muted-foreground">
                {f.beats.map((b) => b.who).join(" → ")}
              </span>
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
