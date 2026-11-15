import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Layers, Pause, Play, SkipBack, SkipForward, Swords, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ABILITY_GROUP_LABELS, abilityDef, normalizeAbilityKey } from "@/lib/abilities";
import { abilityFxRecipe, simulateCombat } from "@/lib/ability-fx";
import {
  ABILITY_RANKS,
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import {
  useAbilityHolders,
  useAllHubAbilities,
  hydrateAbilityRegistry,
} from "@/hooks/use-ability-registry";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityHoldersChips } from "@/components/ability-holders-chips";
import { AbilityImpactOverlay } from "@/components/ability-impact-overlay";
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
import { CelCombatStage } from "@/components/lazy-three";
import { MotionCard, MotionSection } from "@/components/app-motion";
import {
  CHARACTER_COMBAT,
  characterCombat,
  type CombatBackdrop,
  type CombatSceneId,
} from "@/lib/character-combat";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";
import {
  isHighTierAbility,
  useOptionalAbilityContext,
  type AbilityImpactState,
} from "@/context/AbilityContext";

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export function AbilityActionPanel({ initialAbility }: { initialAbility?: string | undefined }) {
  const ctx = useOptionalAbilityContext();
  const holdersMasked = useSpoilerMask("abilities");
  const { holdersMap } = useAbilityHolders();
  const hubAbilities = useAllHubAbilities();
  const defs = useMemo(
    () => [...hubAbilities].sort((a, b) => a.label.localeCompare(b.label)),
    [hubAbilities],
  );
  const [k, setK] = useState(() =>
    initialAbility ? abilityDef(initialAbility).key : (ctx?.abilityKey ?? "crimson_astrapo"),
  );
  const [localRank, setLocalRank] = useState<AbilityEmblemRank>(() => {
    const startKey = initialAbility ? abilityDef(initialAbility).key : (ctx?.abilityKey ?? "crimson_astrapo");
    return ctx && ctx.abilityKey === startKey
      ? ctx.rank
      : tierToIntrinsicRank(abilityDef(startKey).tier);
  });
  const [localImpact, setLocalImpact] = useState<AbilityImpactState | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const impactSeqRef = useRef(0);

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
  const [stageMode, setStageMode] = useState<"2d" | "3d">("2d");

  const fireImpact = useCallback(
    (key: string, rank: AbilityEmblemRank, force = false) => {
      const targetDef = abilityDef(key);
      if (!force && !isHighTierAbility(targetDef.tier, rank)) return;
      if (ctx) {
        ctx.triggerAbilityImpact({
          abilityKey: targetDef.key,
          rank,
          force,
          reason: force ? "manual" : "high-tier",
        });
        return;
      }
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
      impactSeqRef.current += 1;
      setLocalImpact({
        id: impactSeqRef.current,
        active: true,
        abilityKey: targetDef.key,
        label: targetDef.label,
        color: targetDef.color,
        tier: targetDef.tier,
        rank,
        reason: force ? "manual" : "high-tier",
        startedAt: Date.now(),
      });
      impactTimerRef.current = window.setTimeout(() => {
        setLocalImpact(null);
        impactTimerRef.current = null;
      }, 1400);
    },
    [ctx],
  );

  useEffect(
    () => () => {
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    void hydrateAbilityRegistry(true);
  }, []);

  useEffect(() => {
    if (!initialAbility) return;
    const resolved = abilityDef(initialAbility).key;
    setK(resolved);
    setSceneId(undefined);
    setFightId(null);
    setFrame(undefined);
    const nextRank =
      ctx && ctx.abilityKey === resolved
        ? ctx.rank
        : tierToIntrinsicRank(abilityDef(resolved).tier);
    setLocalRank(nextRank);
    ctx?.selectAbility(resolved, { rank: nextRank, triggerImpact: false });
    // Sync only when initialAbility changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAbility]);

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
  const d = abilityDef(ability);
  const activeRank: AbilityEmblemRank =
    ctx && ctx.abilityKey === d.key
      ? ctx.rank
      : !scene && !cur
        ? localRank
        : tierToIntrinsicRank(d.tier);
  const r = abilityFxRecipe(ability, activeRank);
  const combat = simulateCombat(d.key, d.tier, activeRank);
  const activeImpact = ctx ? ctx.abilityImpact : localImpact;
  const impactOnStage = Boolean(activeImpact?.active && activeImpact.abilityKey === d.key);
  const wielders = useMemo(
    () => holdersMap.get(normalizeAbilityKey(d.key)) ?? [],
    [holdersMap, d.key],
  );
  const selectedProgression = useMemo(
    () =>
      ctx?.selectedEntityId ? ctx.getCharacterSeasonProgression(ctx.selectedEntityId, d.key) : [],
    [ctx, d.key],
  );

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6">
      <MotionSection as="header" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent">
              <Swords className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Ability in Action</h1>
          </div>
          <SpoilerToggle scope="abilities" />
        </div>
        <p className="text-sm text-muted-foreground">
          How a fighter actually uses each power: wind-up, movement, release and impact.
        </p>
      </MotionSection>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${sel} max-w-full`}
          value={sceneId ?? "free"}
          onChange={(e) => {
            const val = e.target.value === "free" ? undefined : (e.target.value as CombatSceneId);
            setSceneId(val);
            setFightId(null);
            setFrame(undefined);
            setPlaying(true);
            triggerAnimeActionCut({ color: d.color, label: val ? "COMBAT CUT" : d.label });
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
            const nextDef = abilityDef(e.target.value);
            const nextRank = tierToIntrinsicRank(nextDef.tier);
            setK(nextDef.key);
            setLocalRank(nextRank);
            setFightId(null);
            setSceneId(undefined);
            setFrame(undefined);
            if (ctx) {
              ctx.selectAbility(nextDef.key, { rank: nextRank });
            } else {
              fireImpact(nextDef.key, nextRank);
            }
            triggerAnimeActionCut({ color: nextDef.color, label: nextDef.label });
          }}
          aria-label="Ability"
        >
          {defs.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={activeRank}
          onChange={(e) => {
            const nextRank = clampDbAbilityLevel(Number(e.target.value));
            setLocalRank(nextRank);
            if (ctx) {
              ctx.selectAbility(d.key, {
                rank: nextRank,
                triggerImpact: nextRank >= 4,
              });
            } else {
              fireImpact(d.key, nextRank);
            }
          }}
          aria-label="Mastery rank"
        >
          {ABILITY_RANKS.map((rk) => (
            <option key={rk} value={rk}>
              {ABILITY_RANK_META[rk].label}
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
        <Button
          size="sm"
          variant={impactOnStage ? "default" : "outline"}
          onClick={() => fireImpact(d.key, activeRank, true)}
        >
          <Zap className="mr-1 h-4 w-4" aria-hidden="true" />
          AbilityImpact
        </Button>
        <Button
          size="sm"
          variant={stageMode === "3d" ? "default" : "outline"}
          onClick={() => {
            triggerAnimeActionCut({
              color: d.color,
              label: stageMode === "2d" ? "3D ARENA" : "2D CEL",
              intensity: "heavy",
            });
            setStageMode((m) => (m === "2d" ? "3d" : "2d"));
          }}
          aria-pressed={stageMode === "3d"}
        >
          {stageMode === "3d" ? (
            <Box className="mr-1 h-4 w-4" />
          ) : (
            <Layers className="mr-1 h-4 w-4" />
          )}
          {stageMode === "3d" ? "3D Cel Arena" : "2D Canvas"}
        </Button>
      </div>

      {!holdersMasked && !scene && !cur && wielders.length > 0 && ctx && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-card/40 px-3 py-2 text-xs">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Wielder mastery:
          </span>
          {wielders.map((w) => {
            const assigned = ctx.resolveCharacterRank(w.id, d.key);
            const isSel = ctx.selectedEntityId === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  ctx.selectAbility(d.key, { entityId: isSel ? null : w.id, triggerImpact: false });
                  if (!isSel) ctx.selectWielder(w.id);
                }}
                className={`rounded-full border px-2.5 py-0.5 transition ${
                  isSel
                    ? "border-accent bg-accent/20 font-medium text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.name}
                {assigned ? ` · Lv.${ABILITY_RANK_META[assigned].roman}` : ""}
              </button>
            );
          })}
          {ctx.selectedEntityId && selectedProgression.length > 0 && (
            <span className="ml-1 flex flex-wrap items-center gap-1 border-l border-border pl-2">
              {selectedProgression.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    ctx.setSeasonScope(step.seriesId, step.seasonNumber);
                    ctx.setRank(step.level, { triggerImpact: step.level >= 4 });
                  }}
                  className={`rounded border px-1.5 py-0.5 text-[11px] ${
                    ctx.selectedSeriesId === step.seriesId &&
                    ctx.selectedSeasonNumber === step.seasonNumber
                      ? "border-accent bg-accent/20 text-foreground"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {step.seriesId ? step.seriesTitle : "Base"}
                  {step.seasonNumber != null ? ` S${step.seasonNumber}` : ""} · Lv.
                  {ABILITY_RANK_META[step.level].roman}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      <MotionSection
        delay={0.04}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border"
      >
        {stageMode === "3d" ? (
          <CelCombatStage
            key={`cel-${sceneId ?? (fight ? `${fight.id}-${beat}` : "free")}`}
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
        ) : (
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
        )}
        {impactOnStage && <AbilityImpactOverlay impact={activeImpact} />}
        <span
          className="absolute left-3 top-3 z-10 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-xs uppercase tracking-widest"
          style={{ color: r.palette[0] }}
        >
          {phase.i + 1}/{phase.n} · {phase.label}
        </span>
      </MotionSection>
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
      <div className="grid gap-1.5 rounded-2xl border border-border bg-card/50 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-foreground">
            {d.label}{" "}
            <span className="font-normal text-muted-foreground">
              · {d.tier} · {ABILITY_GROUP_LABELS[d.group]} · {combat.role} ({combat.meters} m reach)
            </span>
          </p>
          <AbilityRankPips rank={activeRank} showLabel compact />
        </div>
        {d.description && <p className="text-foreground">{d.description}</p>}
        <p className="text-foreground">{actionNote(ability)}</p>
        {r.note && r.note !== d.description && (
          <p className="text-muted-foreground">FX signature: {r.note}</p>
        )}
        <div className="pt-0.5">
          <AbilityHoldersChips abilityKey={d.key} />
        </div>
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
          {STORY_FIGHTS.map((f, idx) => (
            <MotionCard key={f.id} index={idx}>
              <Button
                variant="ghost"
                onClick={() => {
                  triggerAnimeActionCut({
                    color: "#e86a33",
                    label: f.title,
                    intensity: "heavy",
                  });
                  setSceneId(undefined);
                  setFrame(undefined);
                  setFightId(f.id);
                  setBeat(0);
                  setPlaying(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`grid h-auto w-full gap-1 whitespace-normal rounded-2xl border p-4 text-left text-sm transition hover:border-primary/60 ${fightId === f.id ? "border-primary bg-accent/10" : "border-border bg-card/40"}`}
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
            </MotionCard>
          ))}
        </div>
      </section>
    </main>
  );
}
