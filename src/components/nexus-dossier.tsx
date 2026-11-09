import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookOpen, ChevronDown, Fingerprint, Pencil, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { characterLinksQuery, entitiesQuery, type Entity } from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { abilityDef } from "@/lib/abilities";
import { COMBAT_STATS, getCombatStats } from "@/lib/combat-stats";
import { useIsStaff } from "@/hooks/use-admin";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Per-season dossier data lives in entities.stats.dossier, keyed `${seriesId}:${seasonNumber}`. */
export type SeasonDossier = {
  story?: string;
  role?: string;
  impact?: string;
  stats?: Record<string, number>;
};
type DossierMap = Record<string, SeasonDossier>;

function readDossier(e: Entity): DossierMap {
  const raw = (e.stats as Record<string, unknown> | null)?.["dossier"];
  return raw && typeof raw === "object" ? (raw as DossierMap) : {};
}

type Menu = "story" | "role" | "details";
const MENU: Array<{ key: Menu; label: string; icon: typeof BookOpen }> = [
  { key: "story", label: "Story", icon: BookOpen },
  { key: "role", label: "Role", icon: Swords },
  { key: "details", label: "Details", icon: Fingerprint },
];

export function NexusDossier({ e }: { e: Entity }) {
  const qc = useQueryClient();
  const isStaff = useIsStaff();
  const masked = useSpoilerMask("characters");
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [season, setSeason] = useState<{ seriesId: string; n: number } | null>(null);
  const [menu, setMenu] = useState<Menu>("story");
  const [statFocus, setStatFocus] = useState(0);
  const [editing, setEditing] = useState(false);

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

  const stats = (e.stats ?? {}) as Record<string, unknown>;
  const bloodline = typeof stats["bloodline"] === "string" ? (stats["bloodline"] as string) : null;
  const realName = typeof stats["real_name"] === "string" ? (stats["real_name"] as string) : null;
  const dossier = readDossier(e);
  const seasonKey = season ? `${season.seriesId}:${season.n}` : null;
  const sd: SeasonDossier = (seasonKey && dossier[seasonKey]) || {};
  const membership = (memberships ?? []).find((m) => m.series_id === season?.seriesId);

  const seriesCards = useMemo(
    () =>
      (memberships ?? [])
        .filter((m) => m.series)
        .map((m) => {
          const full = (allSeries ?? []).find((s) => s.id === m.series_id);
          const names = full?.season_names ?? [];
          const count = Math.max(full?.season_count ?? 0, names.length, 1);
          return {
            id: m.series_id,
            title: m.series!.title,
            cover: m.series!.cover_image_url,
            seasons: Array.from({ length: count }, (_, i) => names[i] || `Season ${i + 1}`),
          };
        }),
    [memberships, allSeries],
  );
  const seasonLabel = season
    ? `${seriesCards.find((s) => s.id === season.seriesId)?.title ?? ""} · ${
        seriesCards.find((s) => s.id === season.seriesId)?.seasons[season.n - 1] ?? ""
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
    scoped.forEach((r) => m.set(r.ability_key, Math.max(m.get(r.ability_key) ?? 0, r.level)));
    if (!season || !rows.some((r) => r.series_id === season.seriesId))
      (e.abilities ?? []).forEach((a) => !m.has(a) && m.set(a, 1));
    return [...m.entries()]
      .map(([name, level]) => ({ name, level, def: abilityDef(name) }))
      .sort((a, b) => b.level - a.level);
  }, [charAbilities, season, e.abilities]);
  const core = abilities[0];
  const coreColor = core?.def.color ?? "var(--accent)";

  const baseCombat = getCombatStats(e.stats);
  const statVals = COMBAT_STATS.map(({ key, label }) => ({
    key,
    label,
    value: sd.stats?.[key] ?? baseCombat?.[key] ?? 0,
  }));

  const roleBadge = membership?.arc_role || membership?.role_in_series || e.category || "Unclassified";

  return (
    <div className="nexus-dossier relative min-h-dvh overflow-x-hidden bg-background text-foreground">
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
            className="rounded-sm border border-accent/40 bg-accent/10 px-3 py-1 font-display text-[11px] uppercase tracking-[0.3em] text-accent"
          >
            {roleBadge}
          </span>
          {isStaff && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
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
            <h1 className="mt-1 font-display text-4xl tracking-wide md:text-5xl">{e.name}</h1>
            {e.alias && (
              <p data-spoiler="char" className="mt-1 text-sm italic text-accent">
                {e.alias}
              </p>
            )}
            <p data-spoiler="char" className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
              Status · <span className="text-foreground">{membership?.status || e.status}</span>
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
              <div className="grid h-full w-full place-items-center bg-card font-display text-6xl text-muted-foreground">
                {e.name[0]}
              </div>
            )}
          </motion.div>

          <div className="order-3" data-spoiler="char">
            <StatWheel stats={statVals} focus={statFocus} onFocus={setStatFocus} color={coreColor} />
          </div>
        </div>

        {/* Series cards with season drawers */}
        <div className="mt-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Series</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => {
                setSeason(null);
                setOpenSeries(null);
              }}
              className={`shrink-0 rounded-lg border px-4 py-6 text-xs uppercase tracking-widest transition ${
                !season ? "border-accent bg-accent/15 text-accent" : "border-border bg-card/50 hover:border-accent/60"
              }`}
            >
              All
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
                <span className="absolute bottom-2 left-2 right-6 font-display text-sm leading-tight">{s.title}</span>
                <ChevronDown
                  className={`absolute bottom-2 right-2 h-4 w-4 transition-transform ${openSeries === s.id ? "rotate-180" : ""}`}
                />
              </motion.button>
            ))}
            {!seriesCards.length && (
              <p className="self-center text-xs text-muted-foreground">Not linked to any series yet.</p>
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
                          onClick={() => setSeason({ seriesId: openSeries, n: i + 1 })}
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
            <svg aria-hidden viewBox="0 0 60 300" className="absolute -left-2 top-0 hidden h-full md:block">
              <path d="M50 0 Q -20 150 50 300" fill="none" stroke="var(--border)" strokeWidth="1.5" />
            </svg>
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
                    style={on ? { boxShadow: `0 0 24px -4px ${coreColor}` } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.span>
                  <span className={`text-xs uppercase tracking-[0.3em] ${on ? "text-foreground" : "text-muted-foreground"}`}>
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
                      <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Impact</span>
                      {sd.impact || "No impact notes for this selection yet."}
                    </p>
                  </div>
                )}
                {menu === "details" && (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ["Real name", realName],
                      ["Status", membership?.status || e.status],
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
              <h2 className="font-display text-2xl">{e.name}</h2>
              {e.alias && <p data-spoiler="char" className="text-xs italic text-accent">{e.alias}</p>}
            </div>
            <div data-spoiler="char" className="space-y-1 text-xs">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Bloodline</p>
              <p>{bloodline || "—"}</p>
              <p className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Organizations</p>
              <div className="flex flex-wrap gap-1">
                {orgs.length
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
          <AbilityOrbit abilities={abilities} masked={masked} seasonKey={seasonKey ?? "all"} />
          <div className="space-y-2 text-xs">
            <p className="font-display text-lg" style={{ color: coreColor }}>
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
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["entity", e.id] });
            void qc.invalidateQueries({ queryKey: ["entities"] });
          }}
        />
      )}
    </div>
  );
}

function StatWheel({
  stats,
  focus,
  onFocus,
  color,
}: {
  stats: Array<{ key: string; label: string; value: number }>;
  focus: number;
  onFocus: (i: number) => void;
  color: string;
}) {
  const n = stats.length;
  const R = 92;
  const total = Math.round(stats.reduce((s, x) => s + x.value, 0) / Math.max(n, 1));
  const rotate = -(360 / n) * focus;
  const arc = (i: number, r: number) => {
    const a0 = ((i / n) * 360 - 90 - 360 / n / 2 + 3) * (Math.PI / 180);
    const a1 = (((i + 1) / n) * 360 - 90 - 360 / n / 2 - 3) * (Math.PI / 180);
    const p = (a: number, rr: number) => `${110 + rr * Math.cos(a)} ${110 + rr * Math.sin(a)}`;
    return `M ${p(a0, 30)} L ${p(a0, r)} A ${r} ${r} 0 0 1 ${p(a1, r)} L ${p(a1, 30)} A 30 30 0 0 0 ${p(a0, 30)} Z`;
  };
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 220 220" className="w-full">
        <circle cx="110" cy="110" r="104" fill="none" stroke="var(--border)" strokeDasharray="2 6" />
        <motion.g
          animate={{ rotate }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
          style={{ originX: "110px", originY: "110px" }}
        >
          {stats.map((s, i) => (
            <g key={s.key} onClick={() => onFocus(i)} className="cursor-pointer">
              <path d={arc(i, R)} fill="var(--muted)" opacity={0.35} />
              <motion.path
                initial={false}
                animate={{ d: arc(i, 30 + (R - 30) * (s.value / 100)) }}
                transition={{ duration: 0.8, ease: EASE }}
                fill={color}
                opacity={i === focus ? 0.95 : 0.45}
              />
            </g>
          ))}
        </motion.g>
        <circle cx="110" cy="110" r="27" fill="var(--background)" stroke={color} />
        <text x="110" y="106" textAnchor="middle" fontSize="7" fill="var(--muted-foreground)" letterSpacing="2">
          AVG
        </text>
        <text x="110" y="120" textAnchor="middle" fontSize="16" fill="var(--foreground)" className="font-display">
          {total}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {stats.map((s, i) => (
          <button
            key={s.key}
            onClick={() => onFocus(i)}
            className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider transition ${
              i === focus ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label} {s.value}
          </button>
        ))}
      </div>
    </div>
  );
}

function AbilityOrbit({
  abilities,
  masked,
  seasonKey,
}: {
  abilities: Array<{ name: string; level: number; def: ReturnType<typeof abilityDef> }>;
  masked: boolean;
  seasonKey: string;
}) {
  const [core, ...rest] = abilities;
  if (!core)
    return <div className="grid h-72 place-items-center text-sm text-muted-foreground">No abilities recorded.</div>;
  const CoreIcon = core.def.icon;
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
          animate={{ rotate: i % 2 ? -360 : 360 }}
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
            className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 bg-background"
            style={{ borderColor: core.def.color, boxShadow: `0 0 60px -6px ${core.def.color}` }}
          >
            <CoreIcon className="h-10 w-10" style={{ color: core.def.color }} />
            <span className="absolute -bottom-6 whitespace-nowrap text-[10px] uppercase tracking-widest">
              {masked ? "Core" : core.def.label}
            </span>
          </motion.div>
          {rest.slice(0, 8).map((a, i, arr) => {
            const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
            const Icon = a.def.icon;
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
                className="absolute grid h-12 w-12 place-items-center rounded-full border bg-card"
                style={{ borderColor: a.def.color, boxShadow: `0 0 20px -6px ${a.def.color}` }}
                title={a.def.label}
              >
                <Icon className="h-5 w-5" style={{ color: a.def.color }} />
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
}: {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  seasonKey: string | null;
  seasonLabel: string;
  onSaved: () => void;
}) {
  const key = seasonKey ?? "all";
  const current = readDossier(entity)[key] ?? {};
  const base = getCombatStats(entity.stats);
  const [form, setForm] = useState({ story: "", role: "", impact: "" });
  const [vals, setVals] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (open && loadedFor !== key) {
    setLoadedFor(key);
    setForm({ story: current.story ?? "", role: current.role ?? "", impact: current.impact ?? "" });
    setVals(
      Object.fromEntries(COMBAT_STATS.map(({ key: k }) => [k, current.stats?.[k] ?? base?.[k] ?? 0])),
    );
  }
  if (!open && loadedFor) setLoadedFor(null);

  const save = async () => {
    setBusy(true);
    try {
      const { data: fresh, error: readErr } = await supabase
        .from("entities")
        .select("stats")
        .eq("id", entity.id)
        .single();
      if (readErr) throw readErr;
      const stats = { ...((fresh.stats as Record<string, unknown>) ?? {}) };
      const map = { ...((stats["dossier"] as DossierMap) ?? {}) };
      map[key] = { ...form, stats: vals };
      stats["dossier"] = map;
      const { error } = await supabase.from("entities").update({ stats: stats as never }).eq("id", entity.id);
      if (error) throw error;
      toast.success("Dossier saved");
      onSaved();
      onClose();
    } catch {
      toast.error("Couldn't save the dossier");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entity.name} · {seasonLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block">
            Story
            <Textarea rows={5} value={form.story} onChange={(ev) => setForm({ ...form, story: ev.target.value })} />
          </label>
          <label className="block">
            Role
            <Input value={form.role} onChange={(ev) => setForm({ ...form, role: ev.target.value })} />
          </label>
          <label className="block">
            Impact
            <Textarea rows={4} value={form.impact} onChange={(ev) => setForm({ ...form, impact: ev.target.value })} />
          </label>
          <div className="space-y-2">
            <p>Stats (0–100)</p>
            {COMBAT_STATS.map(({ key: k, label }) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <span className="w-36">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vals[k] ?? 0}
                  onChange={(ev) => setVals({ ...vals, [k]: Number(ev.target.value) })}
                  className="flex-1 accent-[var(--accent)]"
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
