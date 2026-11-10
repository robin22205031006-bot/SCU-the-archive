import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronDown, Fingerprint, Pencil, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { characterLinksQuery, entitiesQuery, type Entity } from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { abilityDef } from "@/lib/abilities";
import {
  NEXUS_STATS,
  readDossier,
  resolveNexusStats,
  nexusRole,
  type SeasonDossier,
} from "@/lib/nexus-season";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useIsStaff } from "@/hooks/use-admin";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NexusStatWheel } from "@/components/nexus-stat-wheel";

const EASE = [0.22, 1, 0.36, 1] as const;

type Menu = "story" | "role" | "details";
const MENU: Array<{ key: Menu; label: string; icon: typeof BookOpen }> = [
  { key: "story", label: "Story", icon: BookOpen },
  { key: "role", label: "Role", icon: Swords },
  { key: "details", label: "Details", icon: Fingerprint },
];

type SeriesCard = { id: string; title: string; cover: string | null; seasons: string[] };

export function NexusDossier({ e, initialSeason = null }: { e: Entity; initialSeason?: { seriesId: string; n: number } | null }) {
  const qc = useQueryClient();
  const isStaff = useIsStaff();
  const masked = useSpoilerMask("characters");
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [season, setSeason] = useState<{ seriesId: string; n: number } | null>(initialSeason);
  const [menu, setMenu] = useState<Menu>("story");
  const [editing, setEditing] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const moving = useNexusMotion();

  const { data: memberships } = useQuery(characterSeriesQuery(e.id));
  const { data: allSeries } = useQuery(seriesQuery);
  const { data: links } = useQuery(characterLinksQuery(e.id));
  const { data: groups } = useQuery(entitiesQuery(["organization", "clan", "bloodline", "faction"]));
  const { data: charAbilities } = useQuery({
    queryKey: ["character-abilities", e.id],
    queryFn: async () => {
      const { data } = await supabase.from("character_abilities").select("*").eq("entity_id", e.id);
      return data ?? [];
    },
  });

  const alterName = ({ ethan: "Elizah", elizah: "Ethan" } as Record<string, string>)[e.name.toLowerCase()];
  const { data: alter } = useQuery({
    queryKey: ["alter-ego", alterName],
    enabled: !!alterName,
    queryFn: async () => {
      if (!alterName) return null;
      return (
        await supabase.from("entities").select("id").eq("kind", "character").ilike("name", alterName).maybeSingle()
      ).data;
    },
  });

  const stats = (e.stats ?? {}) as Record<string, unknown>;
  const baseBloodline = typeof stats["bloodline"] === "string" ? (stats["bloodline"] as string) : null;
  const realName = typeof stats["real_name"] === "string" ? (stats["real_name"] as string) : null;
  const dossier = readDossier(e.stats);
  const seasonKey = season ? `${season.seriesId}:${season.n}` : null;
  const sd: SeasonDossier = dossier[seasonKey ?? "all"] ?? {};
  const bloodline = sd.bloodline ?? baseBloodline;
  const status = sd.status ?? (memberships ?? []).find(m => m.series_id === season?.seriesId)?.status ?? e.status;
  const membership = (memberships ?? []).find((m) => m.series_id === season?.seriesId);

  // The row under the hero shows the series this character actually appears in.
  const seriesCards = useMemo<SeriesCard[]>(
    () =>
      (allSeries ?? [])
        .filter(full => (memberships ?? []).some(m => m.series_id === full.id) || Object.keys(dossier).some(key => key.startsWith(`${full.id}:`)))
        .map((full) => {
          const names = full?.season_names ?? [];
          const count = Math.max(full?.season_count ?? 0, names.length, 1);
          return {
            id: full.id,
            title: full.title,
            cover: full.cover_image_url,
            seasons: Array.from({ length: count }, (_, i) => names[i] || `Season ${i + 1}`),
          };
        }),
    [memberships, allSeries, e.stats],
  );

  // The editor can target any season of any series, so staff are not blocked by a missing link.
  const editorSeries = useMemo<SeriesCard[]>(
    () =>
      (allSeries ?? []).map((full) => {
        const names = full.season_names ?? [];
        const count = Math.max(full.season_count ?? 0, names.length, 1);
        return {
          id: full.id,
          title: full.title,
          cover: full.cover_image_url,
          seasons: Array.from({ length: count }, (_, i) => names[i] || `Season ${i + 1}`),
        };
      }),
    [allSeries],
  );

  const seasonLabel = season
    ? `${seriesCards.find((s) => s.id === season.seriesId)?.title ?? editorSeries.find((s) => s.id === season.seriesId)?.title ?? ""} · ${
        (seriesCards.find((s) => s.id === season.seriesId) ?? editorSeries.find((s) => s.id === season.seriesId))
          ?.seasons[season.n - 1] ?? ""
      }`
    : "All seasons";

  const orgs = useMemo(() => {
    const byId = new Map((groups ?? []).map((g) => [g.id, g]));
    return (links ?? []).map((l) => byId.get(l.group_id)).filter(Boolean) as Entity[];
  }, [links, groups]);

  // Season-scoped abilities: rows for this series/season; whole-series rows apply to every season.
  const abilities = useMemo(() => {
    const rows = charAbilities ?? [];
    const scoped = season
      ? rows.filter(
          (r) =>
            r.series_id === season.seriesId &&
            (r.season_number == null || r.season_number === season.n),
        )
      : rows;
    const m = new Map<string, number>();
    scoped.filter(r => sd.abilityKeys === undefined || sd.abilityKeys.includes(r.ability_key)).forEach((r) => m.set(r.ability_key, Math.max(m.get(r.ability_key) ?? 0, r.level)));
    if (!season)
      (e.abilities ?? []).forEach((a) => !m.has(a) && m.set(a, 1));
    return [...m.entries()]
      .map(([name, level]) => ({ name, level, def: abilityDef(name) }))
      .sort((a, b) => b.level - a.level);
  }, [charAbilities, season, e.abilities, e.stats]);

  const core = abilities[0];
  const coreColor = core?.def.color ?? "var(--accent)";
  const abilitySelection = abilities.some((a) => a.name === selectedAbility) ? selectedAbility : null;
  const statVals = resolveNexusStats(e.stats, seasonKey, abilitySelection);
  const roleBadge = sd.role || membership?.arc_role || membership?.role_in_series || e.category || "Unclassified";
  const roleTone = nexusRole(roleBadge, masked);
  const codename = sd.codename ?? e.alias;
  const selectSeason = (value: { seriesId: string; n: number } | null) => {
    setSeason(value);
    setSelectedAbility(null);
  };

  return (
    <MotionConfig
      reducedMotion={moving ? "user" : "always"}
      transition={{ duration: moving ? 0.7 : 0, ease: EASE }}
    >
      <div
        data-role={roleTone}
        className="nexus-dossier relative min-h-dvh overflow-x-hidden bg-background text-foreground"
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={roleTone}
            data-role={roleTone}
            aria-hidden
            className="nexus-role-field pointer-events-none fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: moving ? 2.2 : 0 }}
          />
        </AnimatePresence>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-60"
          style={{
            background: `radial-gradient(60% 50% at 50% 20%, color-mix(in oklab, ${coreColor} 22%, transparent), transparent 70%)`,
          }}
        />

        {/* ═════ TOP: hero + stat wheel + series cards ═════ */}
        <section className="relative mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-center gap-3">
            <Link
              to="/characters"
              aria-label="Back to characters"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 backdrop-blur hover:border-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span
              data-spoiler="char"
              className="rounded-sm border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-accent"
            >
              {roleBadge}
            </span>
            {alter && (
              <Link
                to="/character"
                search={{ e: alter.id }}
                className="ml-auto rounded-full border border-accent px-3 py-1 text-xs text-accent hover:bg-accent/15"
              >
                ⇄ Switch to {alterName}
              </Link>
            )}
            {isStaff && (
              <Button size="sm" variant="outline" className={alter ? "" : "ml-auto"} onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit {season ? "this season" : "dossier"}
              </Button>
            )}
          </div>

          <div className="mt-4 grid items-center gap-6 md:grid-cols-[1fr_1.1fr_1fr]">
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="order-2 md:order-1"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">{seasonLabel}</p>
              <h1 className="mt-1 [font-family:var(--font-display)] text-4xl tracking-wide md:text-5xl">{e.name}</h1>
              {codename && (
                <p data-spoiler="char" className="mt-1 text-sm italic text-accent">
                  {codename}
                </p>
              )}
              <p data-spoiler="char" className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
Status · <span className="text-foreground">{status}</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="order-1 mx-auto aspect-[3/4] w-56 overflow-hidden rounded-[40%_40%_8px_8px] border border-border md:order-2 md:w-72"
              style={{ boxShadow: `0 0 80px -20px ${coreColor}` }}
            >
              {e.image_url ? (
                <img src={e.image_url} alt={e.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-card [font-family:var(--font-display)] text-6xl text-muted-foreground">
                  {e.name[0]}
                </div>
              )}
            </motion.div>

            <div className="order-3" data-spoiler="char">
              <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {abilitySelection ? abilityDef(abilitySelection).label : "Character stats"} · {seasonLabel}
              </p>
              <NexusStatWheel stats={statVals} abilities={abilities} selected={abilitySelection} onSelect={setSelectedAbility} />
            </div>
          </div>

          {/* Series cards with season drawers */}
          <div className="mt-8">
            <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Series</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  selectSeason(null);
                  setOpenSeries(null);
                }}
                className={`shrink-0 rounded-lg border px-4 py-6 text-xs uppercase tracking-widest transition ${
                  !season ? "border-accent bg-accent/15 text-accent" : "border-border bg-card/50 hover:border-accent/60"
                }`}
              >
                All seasons
              </button>
              {seriesCards.map((s) => (
                <motion.button
                  key={s.id}
                  layout
                  whileHover={{ y: -4 }}
                  onClick={() => setOpenSeries(openSeries === s.id ? null : s.id)}
                  className={`relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border text-left transition ${
                    openSeries === s.id || season?.seriesId === s.id
                      ? "border-accent"
                      : "border-border hover:border-accent/60"
                  }`}
                >
                  {s.cover && (
                    <img src={s.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-6 [font-family:var(--font-display)] text-sm leading-tight">
                    {s.title}
                  </span>
                  <ChevronDown
                    className={`absolute bottom-2 right-2 h-4 w-4 transition-transform ${openSeries === s.id ? "rotate-180" : ""}`}
                  />
                </motion.button>
              ))}
              {!seriesCards.length && (
                <p className="self-center text-xs text-muted-foreground">
                  Not linked to any series yet.
                  {isStaff && (
                    <Link to="/admin" className="ml-2 text-accent underline">
                      Add series
                    </Link>
                  )}
                </p>
              )}
            </div>
            <AnimatePresence initial={false}>
              {openSeries && (
                <motion.div
                  key={openSeries}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
                    {seriesCards
                      .find((s) => s.id === openSeries)
                      ?.seasons.map((label, i) => {
                        const on = season?.seriesId === openSeries && season.n === i + 1;
                        return (
                          <button
                            key={label + i}
                            onClick={() => selectSeason({ seriesId: openSeries, n: i + 1 })}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              on ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ═════ MIDDLE: arc menu · content · identity ═════ */}
        <section className="relative mx-auto mt-10 max-w-6xl px-4">
          <div className="grid gap-6 rounded-2xl border border-border bg-card/40 p-5 backdrop-blur md:grid-cols-[180px_1fr_240px]">
            <nav className="relative flex flex-row gap-3 md:flex-col md:gap-6 md:py-6">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-1 top-2 bottom-2 hidden w-16 rounded-[50%] border-l border-border md:block"
              />
              {MENU.map((m, i) => {
                const Icon = m.icon;
                const on = menu === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMenu(m.key)}
                    className="relative flex items-center gap-3 text-left"
                    style={{ marginLeft: [24, 6, 24][i] }}
                  >
                    <motion.span
                      animate={{ scale: on ? 1.15 : 1 }}
                      className={`grid h-11 w-11 place-items-center rounded-full border ${
                        on ? "border-accent bg-accent/20 text-accent" : "border-border bg-background text-muted-foreground"
                      }`}
                      style={{ boxShadow: on ? `0 0 24px -4px ${coreColor}` : "none" }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.span>
                    <span
                      className={`text-xs uppercase tracking-[0.3em] ${on ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={menu + (seasonKey ?? "all")}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-accent">
                    {MENU.find((m) => m.key === menu)?.label} · {seasonLabel}
                  </p>
                  {menu === "story" && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {sd.story || (season ? "No story written for this season yet." : e.description || "No story yet.")}
                    </p>
                  )}
                  {menu === "role" && (
                    <div data-spoiler="char" className="space-y-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">Role: </span>
                        {sd.role || membership?.role_in_series || membership?.arc_role || e.role || "—"}
                      </p>
                      <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                        <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          Impact
                        </span>
                        {sd.impact || "No impact notes for this selection yet."}
                      </p>
                      {sd.philosophy && <p className="whitespace-pre-line"><span className="block text-xs text-muted-foreground">Philosophy</span>{sd.philosophy}</p>}
                    </div>
                  )}
                  {menu === "details" && (
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Real name", realName],
                        ["Status", status],
                        ["Category", e.category],
                        ["Tier", e.character_tier],
                      ].map(([k, v]) => (
                        <div key={k} className="rounded-md border border-border bg-background/50 p-2">
                          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                          <dd data-spoiler={k === "Real name" ? undefined : "char"}>{v || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <aside className="space-y-4 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div>
                <p className="font-display break-words text-2xl">{e.name}</p>
                <p className="pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Title / Codename</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={codename || "none"}
                    data-spoiler="char"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="break-words text-xs italic text-accent"
                  >
                    {codename || "—"}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div data-spoiler="char" className="space-y-1 text-xs">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bloodline</p>
                <p>{bloodline || "—"}</p>
                <p className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Organizations</p>
                <div className="flex flex-wrap gap-1">
                  {sd.organizations !== undefined ? sd.organizations.filter(Boolean).join(" · ") || "—" : orgs.length
                    ? orgs.map((o) => (
                        <span key={o.id} className="rounded-sm border border-border px-1.5 py-0.5">
                          {o.name}
                        </span>
                      ))
                    : "—"}
                </div>
              </div>
              <div data-spoiler="char">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Abilities</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {abilities.slice(0, 6).map((a) => (
                    <li key={a.name} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.def.color }} />
                      {a.def.label}
                    </li>
                  ))}
                  {!abilities.length && <li className="text-muted-foreground">None this season</li>}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        {/* ═════ BOTTOM: ability orbit ═════ */}
        <section className="relative mx-auto mb-16 mt-10 max-w-6xl px-4" data-spoiler="char">
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Ability core · {seasonLabel}
          </p>
          <div className="grid gap-6 rounded-2xl border border-border bg-card/40 p-5 md:grid-cols-[1fr_240px]">
            <AbilityOrbit
              abilities={abilities}
              masked={masked}
              seasonKey={seasonKey ?? "all"}
              selected={abilitySelection}
              onSelect={setSelectedAbility}
              moving={moving}
            />
            <div className="space-y-2 text-xs">
              <p className="[font-family:var(--font-display)] text-lg" style={{ color: coreColor }}>
                {core ? core.def.label : "No abilities"}
              </p>
              {core?.def.description && <p className="text-muted-foreground">{core.def.description}</p>}
              {abilities.map((a) => (
                <div key={a.name} className="flex items-center justify-between border-b border-border/60 py-1">
                  <span>{a.def.label}</span>
                  <span style={{ color: a.def.color }}>Lv.{a.level}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isStaff && (
          <SeasonEditor
            open={editing}
            onClose={() => setEditing(false)}
            entity={e}
            seasonKey={seasonKey}
            seasonLabel={seasonLabel}
            seriesCards={editorSeries}
            onSeasonChange={selectSeason}
            abilityNames={abilities.map((a) => a.name)}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ["entity", e.id] });
              void qc.invalidateQueries({ queryKey: ["entities"] });
            }}
          />
        )}
      </div>
    </MotionConfig>
  );
}

function AbilityGlyph({ def, masked, className = "" }: { def: ReturnType<typeof abilityDef>; masked: boolean; className?: string }) {
  const Icon = def.icon;
  if (masked) return <span aria-hidden className={`nexus-mark ${className}`} />;
  return <Icon aria-hidden className={className} style={{ color: def.color }} />;
}

function AbilityOrbit({
  abilities,
  masked,
  seasonKey,
  selected,
  onSelect,
  moving,
}: {
  abilities: Array<{ name: string; level: number; def: ReturnType<typeof abilityDef> }>;
  masked: boolean;
  seasonKey: string;
  selected: string | null;
  onSelect: (name: string) => void;
  moving: boolean;
}) {
  const [core, ...rest] = abilities;
  if (!core)
    return <div className="grid h-72 place-items-center text-sm text-muted-foreground">No abilities recorded.</div>;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {[0.95, 0.72, 0.5].map((s, i) => (
        <motion.div
          key={s}
          className="absolute rounded-full border"
          style={{
            inset: `${((1 - s) / 2) * 100}%`,
            borderColor: `color-mix(in oklab, ${core.def.color} ${40 - i * 10}%, transparent)`,
          }}
          animate={{ rotate: moving ? (i % 2 ? -360 : 360) : 0 }}
          transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <AnimatePresence mode="wait">
        <motion.div key={seasonKey} className="absolute inset-0">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            role="button"
            tabIndex={0}
            aria-label={`Select ${core.def.label} stats`}
            aria-pressed={selected === core.name}
            onClick={() => onSelect(core.name)}
            onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(core.name)}
            className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 bg-background"
            style={{ borderColor: core.def.color, boxShadow: `0 0 60px -6px ${core.def.color}` }}
          >
            <AbilityGlyph def={core.def} masked={masked} className="h-12 w-12" />
            <span className="absolute -bottom-6 whitespace-nowrap text-[10px] uppercase tracking-widest">
              {masked ? "Core" : core.def.label}
            </span>
          </motion.div>
          {rest.slice(0, 8).map((a, i, arr) => {
            const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, x: "-50%", y: "-50%", left: "50%", top: "50%" }}
                animate={{
                  opacity: 1,
                  left: `${50 + Math.cos(ang) * 40}%`,
                  top: `${50 + Math.sin(ang) * 40}%`,
                }}
                exit={{ opacity: 0, left: "50%", top: "50%" }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE }}
                className="absolute grid h-12 w-12 cursor-pointer place-items-center rounded-full border bg-card"
                style={{ borderColor: a.def.color, boxShadow: `0 0 20px -6px ${a.def.color}` }}
                role="button"
                tabIndex={0}
                aria-pressed={selected === a.name}
                aria-label={`Select ${a.def.label} stats`}
                onClick={() => onSelect(a.name)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(a.name)}
                title={a.def.label}
              >
                <AbilityGlyph def={a.def} masked={masked} className="h-5 w-5" />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SeasonEditor({
  open,
  onClose,
  entity,
  seasonKey,
  seasonLabel,
  onSaved,
  seriesCards,
  onSeasonChange,
  abilityNames,
}: {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  seasonKey: string | null;
  seasonLabel: string;
  onSaved: () => void;
  seriesCards: Array<{ id: string; title: string; seasons: string[] }>;
  onSeasonChange: (s: { seriesId: string; n: number } | null) => void;
  abilityNames: string[];
}) {
  const key = seasonKey ?? "all";
  const current = readDossier(entity.stats)[key] ?? {};
  const [form, setForm] = useState<SeasonDossier>({});
  const [ability, setAbility] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setAbility("");
    setForm({
      ...current,
      stats: Object.fromEntries(
        resolveNexusStats(entity.stats, seasonKey, null).map((s) => [s.key, s.value]),
      ),
    });
  }
  if (!open && loadedFor) setLoadedFor(null);
  const vals = ability ? form.abilityStats?.[ability] ?? {} : form.stats ?? {};
  const setValue = (k: string, value: number) =>
    setForm((f) =>
      ability
        ? {
            ...f,
            abilityStats: { ...f.abilityStats, [ability]: { ...f.abilityStats?.[ability], [k]: value } },
          }
        : { ...f, stats: { ...f.stats, [k]: value } },
    );
  const save = async () => {
    setBusy(true);
    try {
      const { data: fresh, error } = await supabase
        .from("entities")
        .select("stats,locked_fields")
        .eq("id", entity.id)
        .single();
      if (error) throw error;
      const stats = { ...((fresh.stats as Record<string, unknown>) ?? {}) };
      const map = { ...readDossier(stats) };
      map[key] = { ...map[key], ...form };
      stats["dossier"] = map;
      const { error: writeError } = await supabase
        .from("entities")
        .update({
          stats: stats as never,
          locked_fields: [...new Set([...(fresh.locked_fields ?? []), "stats"])],
        })
        .eq("id", entity.id);
      if (writeError) throw writeError;
      toast.success("Dossier saved");
      onSaved();
      onClose();
    } catch {
      toast.error("Couldn't save the dossier");
    } finally {
      setBusy(false);
    }
  };
  const seriesId = seasonKey?.split(":")[0] ?? "";
  const seasonNumber = Number(seasonKey?.split(":")[1] ?? 1);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entity.name} · {seasonLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            Series
            <select
              aria-label="Edit series"
              value={seriesId}
              onChange={(ev) => onSeasonChange(ev.target.value ? { seriesId: ev.target.value, n: 1 } : null)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
            >
              <option value="">All seasons</option>
              {seriesCards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Season
            <select
              aria-label="Edit season"
              disabled={!seriesId}
              value={seasonNumber}
              onChange={(ev) => onSeasonChange({ seriesId, n: Number(ev.target.value) })}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
            >
              {(seriesCards.find((s) => s.id === seriesId)?.seasons ?? ["All seasons"]).map((s, i) => (
                <option key={i} value={i + 1}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-3 text-sm">
          <label className="block">
            Title / Codename
            <Input value={form.codename ?? ""} onChange={(ev) => setForm({ ...form, codename: ev.target.value })} />
          </label>
          <label className="block">
            Story
            <Textarea
              rows={5}
              value={form.story ?? ""}
              onChange={(ev) => setForm({ ...form, story: ev.target.value })}
            />
          </label>
          <label className="block">
            Role
            <Input value={form.role ?? ""} onChange={(ev) => setForm({ ...form, role: ev.target.value })} />
          </label>
          <label className="block">
            Impact
            <Textarea
              rows={4}
              value={form.impact ?? ""}
              onChange={(ev) => setForm({ ...form, impact: ev.target.value })}
            />
          </label>
          <label className="block">
            Stats profile
            <select
              aria-label="Edit stats profile"
              value={ability}
              onChange={(ev) => setAbility(ev.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"
            >
              <option value="">Character stats</option>
              {abilityNames.map((a) => (
                <option key={a} value={a}>
                  {abilityDef(a).label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2">
            <p>Stats (0–100)</p>
            {NEXUS_STATS.map(({ key: k, label }) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0">{label}</span>
                <input
                  aria-label={label}
                  type="range"
                  min={0}
                  max={100}
                  value={vals[k] ?? 0}
                  onChange={(ev) => setValue(k, Number(ev.target.value))}
                  className="min-w-0 flex-1 accent-[var(--accent)]"
                />
                <span className="w-8 text-right">{vals[k] ?? 0}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Season abilities are set in Admin → Character abilities (pick the series and season).
          </p>
          <Button onClick={save} disabled={busy} className="w-full">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
