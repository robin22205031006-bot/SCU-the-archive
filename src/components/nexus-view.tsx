import { useEffect, useMemo, useRef, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Minus, Plus, Repeat, Search, X } from "lucide-react";
import { entitiesQuery, matchesSearch, type Entity } from "@/lib/entities";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { sfx } from "@/lib/scu-audio";
import { seriesQuery, seriesCharactersQuery } from "@/lib/series";
import { supabase } from "@/integrations/supabase/client";
import { NEXUS_ROLES, normalizeNexusRole, nexusDotRole, projectSeasonRoster } from "@/lib/nexus-roster";
import { readDossier } from "@/lib/nexus-season";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";
import { Button } from "@/components/ui/button";
const charactersRoute = getRouteApi("/_authenticated/characters");

const EASE = [0.22, 1, 0.36, 1] as const;
const ALTER_EGOS: Record<string, string> = { ethan: "Elizah", elizah: "Ethan" };

type Node = { e: Entity; lat: number; lon: number; color: string; hex: boolean };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function stat(e: Entity, k: string): string | null {
  const v = (e.stats as Record<string, unknown> | null)?.[k];
  return typeof v === "string" && v.trim() ? v : null;
}

/** Second interface: characters as a living constellation sphere with camera zoom. */
export function NexusView({
  data: originalData,
  categories,
  isAdmin,
  onEdit,
}: {
  data: Entity[];
  categories: string[];
  isAdmin: boolean;
  onEdit: (e: Entity) => void;
}) {
  const masked = useSpoilerMask("characters");
  const search = charactersRoute.useSearch();
  const navigate = charactersRoute.useNavigate();
  const seriesId = search.series ?? "";
  const seasonNumber = search.season ?? null;
  const [rosterOpen, setRosterOpen] = useState(false);
  const { data: series = [] } = useQuery(seriesQuery);
  const { data: groups = [] } = useQuery(entitiesQuery(["organization", "clan", "bloodline", "faction"]));
  const seasonGroups = seriesId ? projectSeasonRoster(groups, seriesId, seasonNumber, []) : [];
  const { data: memberships = [] } = useQuery(seriesCharactersQuery(seriesId));
  const { data: abilityRows = [] } = useQuery({ queryKey: ["nexus-series-abilities", seriesId], enabled: !!seriesId, queryFn: async () => {
    const { data, error } = await supabase.from("character_abilities").select("*").eq("series_id", seriesId);
    if (error) throw error;
    return data;
  }});
  const selectedSeries = series.find(s => s.id === seriesId);
  const seasonNames = Array.from({ length: Math.max(selectedSeries?.season_count ?? 0, selectedSeries?.season_names.length ?? 0, 1) }, (_, i) => selectedSeries?.season_names[i] || `Season ${i+1}`);
  const data = useMemo(() => projectSeasonRoster(originalData, seriesId, seasonNumber, memberships).map(e => {
    if (!seriesId) return { ...e, category: normalizeNexusRole(e.category) };
    const profile = readDossier(e.stats)[`${seriesId}:${seasonNumber ?? "all"}`];
    const rows = abilityRows.filter(a => a.entity_id === e.id && (seasonNumber == null || a.season_number == null || a.season_number === seasonNumber) && (profile?.abilityKeys === undefined || profile.abilityKeys.includes(a.ability_key)));
    return { ...e, abilities: [...new Set(rows.map(a => a.ability_key))], stats: { ...(e.stats as Record<string, unknown>), ...(profile?.bloodline !== undefined ? { bloodline: profile.bloodline } : {}) } as Entity["stats"] };
  }), [originalData, seriesId, seasonNumber, memberships, abilityRows]);
  const [cluster, setCluster] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const colorOf = useMemo(() => {
    return (c: string | null) => `var(--nexus-dot-${nexusDotRole(c, masked)})`;
  }, [masked]);

  const clusters = useMemo(() => {
    const available = [...new Set([...NEXUS_ROLES, ...categories.map(normalizeNexusRole), ...data.map(e => e.category ?? "Unclassified")])];
    const present = available.filter((c) => data.some((e) => e.category === c));
    return ["all", ...present];
  }, [categories, data]);

  return (
    <div className="relative -mx-4 overflow-hidden rounded-3xl border border-nexus-glow/15 bg-nexus-bg px-4 py-6 text-nexus-fg sm:-mx-5 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, color-mix(in oklab, var(--nexus-glow) 22%, transparent), transparent 70%)",
        }}
      />
      <LayoutGroup>
        <div className="relative mb-5 flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 flex-1 gap-1 text-xs">Series<select aria-label="Character series" value={seriesId} onChange={ev => { setCluster(null); void navigate({ search: prev => ({ ...prev, series: ev.target.value || undefined, season: undefined }) }); }} className="h-10 w-full rounded-md border border-border bg-background px-3"><option value="">All series</option>{series.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          <label className="grid min-w-0 flex-1 gap-1 text-xs">Season<select aria-label="Character season" disabled={!seriesId} value={seasonNumber ?? ""} onChange={ev => { setCluster(null); void navigate({ search: prev => ({ ...prev, season: ev.target.value ? Number(ev.target.value) : undefined }) }); }} className="h-10 w-full rounded-md border border-border bg-background px-3"><option value="">All seasons</option>{seriesId && seasonNames.map((s,i) => <option key={i} value={i+1}>{s}</option>)}</select></label>
          {isAdmin && <Button variant="outline" disabled={!seriesId || !seasonNumber} onClick={() => setRosterOpen(true)}>Season roster</Button>}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          {cluster === null ? (
            <motion.div
              key="clusters"
              initial={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
              transition={{ duration: 0.55, ease: EASE }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {clusters.map((c, i) => {
                  const members = c === "all" ? data : data.filter((e) => e.category === c);
                  const label = c === "all" ? "All characters" : masked ? `Cluster ${i}` : c;
                  return (
                    <motion.div
                      key={c}
                      layoutId={`cluster-${c}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, ease: EASE } }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="group relative overflow-hidden rounded-2xl border border-nexus-glow/20 bg-nexus-fg/[0.03] text-left"
                    >
                      <Button variant="ghost" className="block h-auto min-h-40 w-full whitespace-normal p-3 text-left hover:bg-transparent" onClick={() => { sfx.tierReveal?.(null); setCluster(c); }} aria-label={`${label}, ${members.length}`}>
                      <span className="text-[11px] font-medium">{label}</span>
                      <MiniConstellation
                        members={members}
                        color={c === "all" ? null : colorOf(c)}
                        colorOf={colorOf}
                      />
                      <span className="absolute bottom-2 right-3 font-display text-lg text-nexus-glow">
                        {members.length}
                      </span>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sphere"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCluster(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-nexus-glow/25 px-3 py-1 text-xs hover:bg-nexus-fg/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <div className="relative ml-auto w-full max-w-xs sm:w-60">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nexus-muted" />
                  <input
                    value={q}
                    onChange={(ev) => setQ(ev.target.value)}
                    placeholder="Search for character"
                    className="h-9 w-full rounded-full border border-nexus-glow/20 bg-nexus-fg/5 pl-9 pr-3 text-xs text-nexus-fg outline-none placeholder:text-nexus-muted focus:border-nexus-glow/60"
                  />
                </div>
              </div>
              <Sphere
                cluster={cluster}
                members={cluster === "all" ? data : data.filter((e) => e.category === cluster)}
                all={data}
                query={q}
                colorOf={colorOf}
                masked={masked}
                isAdmin={isAdmin}
                onEdit={onEdit}
                seriesId={seriesId}
                seasonNumber={seasonNumber}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
      {!data.length && <p className="relative py-8 text-center text-sm text-muted-foreground">No characters recorded for this selection.</p>}
      {seasonGroups.length > 0 && <div data-spoiler="char" className="relative mt-5 border-t border-border pt-4"><h3 className="mb-3 text-sm">Impactful organizations, bloodlines & cults</h3><div className="grid gap-3 sm:grid-cols-3">{seasonGroups.map(g => <div key={g.id} className="rounded-lg border border-border p-3"><p className="text-sm">{g.name}</p><p className="text-xs text-muted-foreground">{g.role || g.category} · {g.status}</p>{readDossier(g.stats)[`${seriesId}:${seasonNumber ?? "all"}`]?.impact && <p className="mt-2 text-xs">{readDossier(g.stats)[`${seriesId}:${seasonNumber ?? "all"}`]?.impact}</p>}</div>)}</div></div>}
      {isAdmin && seriesId && seasonNumber && <NexusRosterEditor open={rosterOpen} onClose={() => setRosterOpen(false)} entities={originalData} seriesId={seriesId} season={seasonNumber} label={`${selectedSeries?.title ?? ""} · ${seasonNames[seasonNumber-1] ?? ""}`} />}
    </div>
  );
}

function MiniConstellation({
  members,
  color,
  colorOf,
}: {
  members: Entity[];
  color: string | null;
  colorOf: (c: string | null) => string;
}) {
  const pts = members.slice(0, 26).map((e) => {
    const a = hash(e.id) * Math.PI * 2;
    const r = Math.sqrt(hash(e.id + "r")) * 38;
    return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r, c: color ?? colorOf(e.category), role: nexusDotRole(e.category, colorOf(e.category) === "var(--nexus-dot-neutral)") };
  });
  return (
    <svg
      viewBox="0 0 100 100"
      className="mx-auto mt-1 h-24! w-24! shrink-0 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--nexus-glow)" strokeOpacity="0.25" />
      {pts.slice(1).map((p, i) => (
        <line
          key={i}
          x1={pts[i]?.x ?? p.x}
          y1={pts[i]?.y ?? p.y}
          x2={p.x}
          y2={p.y}
          stroke="var(--nexus-line)"
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
      ))}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={p.c} data-dot-role={p.role} className="nexus-role-dot" />
      ))}
    </svg>
  );
}

function Sphere({
  cluster,
  members,
  all,
  query,
  colorOf,
  masked,
  isAdmin,
  onEdit,
  seriesId,
  seasonNumber,
}: {
  cluster: string;
  members: Entity[];
  all: Entity[];
  query: string;
  colorOf: (c: string | null) => string;
  masked: boolean;
  isAdmin: boolean;
  onEdit: (e: Entity) => void;
  seriesId: string;
  seasonNumber: number | null;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(560);
  const [t, setT] = useState(0);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([en]) => setSize(Math.min(en!.contentRect.width, 640)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Idle rotation; freezes while a dossier is focused.
  useEffect(() => {
    if (selected) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setT((v) => v + (now - last) * 0.00012);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  const nodes: Node[] = useMemo(() => {
    const n = members.length || 1;
    return members.map((e, i) => {
      // Fibonacci sphere distribution, stable per list order.
      const y = 1 - ((i + 0.5) / n) * 2;
      return {
        e,
        lat: Math.asin(y) * 0.92,
        lon: i * 2.399963 + hash(e.id) * 0.4,
        color: colorOf(e.category),
        hex: !!e.character_tier,
      };
    });
  }, [members, colorOf]);

  const R = size * 0.44;
  const proj = nodes.map((nd) => {
    const x = Math.cos(nd.lat) * Math.sin(nd.lon + t);
    const z = Math.cos(nd.lat) * Math.cos(nd.lon + t);
    const y = Math.sin(nd.lat);
    return { ...nd, px: x * R, py: -y * R, z };
  });
  const matchIds = query.trim()
    ? new Set(members.filter((e) => matchesSearch(e, query)).map((e) => e.id))
    : null;

  // Constellation chains: link nodes of the same category in order.
  const links: [number, number][] = [];
  const lastByCat = new Map<string, number>();
  proj.forEach((p, i) => {
    const k = p.e.category ?? "";
    const prev = lastByCat.get(k);
    if (prev !== undefined) links.push([prev, i]);
    lastByCat.set(k, i);
  });

  const focus = (e: Entity) => {
    const p = proj.find((x) => x.e.id === e.id);
    sfx.tierReveal?.(e.character_tier);
    setSelected(e);
    const z = 2.1;
    setZoom(z);
    setCamera({ x: -(p?.px ?? 0) * z, y: -(p?.py ?? 0) * z });
  };
  const release = () => {
    setSelected(null);
    setZoom(1);
    setCamera({ x: 0, y: 0 });
  };

  const selIdx = selected ? proj.findIndex((p) => p.e.id === selected.id) : -1;
  const sel = selIdx >= 0 ? proj[selIdx] : null;

  return (
    <div className="relative flex flex-col gap-4 lg:flex-row">
      <motion.div
        ref={wrap}
        layout
        transition={{ duration: 0.7, ease: EASE }}
        className="relative min-w-0 flex-1"
        onWheel={(ev) => {
          if (!ev.ctrlKey && !ev.metaKey) return;
          ev.preventDefault();
          setZoom((z) => Math.min(3.2, Math.max(0.7, z - ev.deltaY * 0.002)));
        }}
      >
        <motion.div
          layoutId={`cluster-${cluster}`}
          className="relative mx-auto overflow-hidden rounded-full"
          style={{
            width: size,
            height: size,
            background:
              "radial-gradient(circle at 50% 40%, color-mix(in oklab, var(--nexus-line) 14%, transparent), color-mix(in oklab, var(--nexus-bg) 90%, black) 70%)",
            boxShadow:
              "inset 0 0 60px color-mix(in oklab, var(--nexus-glow) 30%, transparent), 0 0 80px -20px color-mix(in oklab, var(--nexus-glow) 50%, transparent)",
          }}
        >
          <motion.svg
            viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
            width={size}
            height={size}
            animate={{ scale: zoom, x: camera.x, y: camera.y }}
            transition={{ type: "spring", stiffness: 70, damping: 18, mass: 0.9 }}
            className="absolute inset-0"
            onClick={(ev) => ev.target === ev.currentTarget && selected && release()}
          >
            {links.map(([a, b], i) => {
              const A = proj[a]!;
              const B = proj[b]!;
              const depth = (A.z + B.z + 2) / 4;
              return (
                <line
                  key={i}
                  x1={A.px}
                  y1={A.py}
                  x2={B.px}
                  y2={B.py}
                  stroke="var(--nexus-line)"
                  strokeWidth={0.8 / zoom}
                  strokeDasharray={`${3 / zoom} ${3 / zoom}`}
                  strokeOpacity={selected ? 0.12 : 0.15 + depth * 0.45}
                />
              );
            })}
            {sel &&
              proj
                .filter((p) => p.e.id !== sel.e.id && p.e.category === sel.e.category)
                .map((p) => (
                  <motion.line
                    key={`s-${p.e.id}`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    transition={{ duration: 0.9, ease: EASE }}
                    x1={sel.px}
                    y1={sel.py}
                    x2={p.px}
                    y2={p.py}
                    stroke={sel.color}
                    strokeWidth={0.7 / zoom}
                  />
                ))}
            {[...proj]
              .map((p, i) => ({ p, i }))
              .sort((a, b) => a.p.z - b.p.z)
              .map(({ p }) => {
                const depth = (p.z + 1) / 2;
                const isSel = selected?.id === p.e.id;
                const dim = matchIds ? !matchIds.has(p.e.id) : false;
                const r = (p.hex ? 9 : 5.5) * (0.6 + depth * 0.6);
                return (
                  <g
                    key={p.e.id}
                    transform={`translate(${p.px} ${p.py})`}
                    style={{ cursor: "pointer" }}
                    opacity={dim ? 0.12 : 0.35 + depth * 0.65}
                    onMouseEnter={() => setHover(p.e.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => focus(p.e)}
                    role="button"
                    aria-label={p.e.name}
                  >
                    <circle r={r * 2.4} fill={p.color} opacity={isSel ? 0.35 : 0.12} />
                    {p.hex ? (
                      <polygon
                        points={hexPts(r)}
                        fill={p.color}
                        data-dot-role={nexusDotRole(p.e.category, masked)}
                        className="nexus-role-dot"
                        stroke="var(--nexus-fg)"
                        strokeOpacity="0.5"
                        strokeWidth={0.6}
                      />
                    ) : (
                      <circle r={r} fill={p.color} data-dot-role={nexusDotRole(p.e.category, masked)} className="nexus-role-dot" />
                    )}
                    {isSel && (
                      <motion.circle
                        r={r * 2}
                        fill="none"
                        stroke={p.color}
                        strokeWidth={0.8}
                        initial={{ scale: 0.6, opacity: 1 }}
                        animate={{ scale: 2.2, opacity: 0 }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    {(hover === p.e.id || isSel || (matchIds?.has(p.e.id) ?? false)) && (
                      <text
                        y={-r - 6}
                        textAnchor="middle"
                        fontSize={11 / Math.max(zoom, 1)}
                        fill="var(--nexus-fg)"
                        style={{ pointerEvents: "none" }}
                      >
                        {p.e.name}
                      </text>
                    )}
                  </g>
                );
              })}
          </motion.svg>
        </motion.div>

        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          {[
            [Plus, () => setZoom((z) => Math.min(3.2, z + 0.3)), "Zoom in"],
            [Minus, () => setZoom((z) => Math.max(0.7, z - 0.3)), "Zoom out"],
          ].map(([Icon, fn, label]) => {
            const I = Icon as typeof Plus;
            return (
              <button
                key={label as string}
                aria-label={label as string}
                onClick={fn as () => void}
                className="grid h-8 w-8 place-items-center rounded-full border border-nexus-glow/25 bg-nexus-bg/80 hover:bg-nexus-fg/10"
              >
                <I className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
        <div className="absolute bottom-2 left-2 hidden flex-col gap-1 rounded-xl border border-nexus-glow/15 bg-nexus-bg/80 p-2 text-[10px] sm:flex">
          <span className="text-nexus-muted">{members.length} nodes</span>
          <span className="text-nexus-muted">⬢ ranked tier · ● character</span>
        </div>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {selected && (
          <DossierPanel
            key={selected.id}
            e={selected}
            color={sel?.color ?? "var(--nexus-glow)"}
            all={all}
            masked={masked}
            isAdmin={isAdmin}
            onEdit={onEdit}
            seriesId={seriesId}
            seasonNumber={seasonNumber}
            onClose={release}
            onJump={(e) => (members.some((m) => m.id === e.id) ? focus(e) : setSelected(e))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function hexPts(r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  }).join(" ");
}

const item = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: EASE } },
};

function DossierPanel({
  e,
  color,
  all,
  masked,
  isAdmin,
  onEdit,
  onClose,
  onJump,
  seriesId,
  seasonNumber,
}: {
  e: Entity;
  color: string;
  all: Entity[];
  masked: boolean;
  isAdmin: boolean;
  onEdit: (e: Entity) => void;
  onClose: () => void;
  onJump: (e: Entity) => void;
  seriesId: string;
  seasonNumber: number | null;
}) {
  const alterName = ALTER_EGOS[e.name.trim().toLowerCase()];
  const alter = alterName
    ? all.find((x) => x.name.toLowerCase() === alterName.toLowerCase())
    : undefined;
  const rows: [string, string | null, boolean][] = [
    ["Title / Codename", e.alias, true],
    ["Bloodline", stat(e, "bloodline"), true],
    ["Real name", stat(e, "real_name"), false],
    ["Status", e.status, true],
    ["Role", e.role, true],
    ["Category", e.category, true],
  ];
  return (
    <motion.aside
      layout
      initial={{ opacity: 0, x: 60, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-nexus-glow/20 bg-nexus-bg/95 p-4 backdrop-blur lg:w-80"
    >
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-medium" style={{ color }}>
            {e.name}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dossier"
            className="rounded-full p-1 text-nexus-muted hover:bg-nexus-fg/10 hover:text-nexus-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>

        <motion.div
          variants={item}
          className="relative mt-3 grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-nexus-glow/20"
          style={{
            background: `radial-gradient(circle, color-mix(in oklab, ${color} 25%, transparent), transparent 70%)`,
          }}
        >
          {e.image_url ? (
            <motion.img
              src={e.image_url}
              alt={e.name}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: EASE }}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-6xl" style={{ color }}>
              {e.name[0]}
            </span>
          )}
          <span className="absolute bottom-2 left-2 h-3 w-3 border-b border-l border-nexus-glow/60" />
        </motion.div>

        <motion.p
          variants={item}
          className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-nexus-muted"
        >
          Dossier
        </motion.p>
        <motion.dl variants={item} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {rows
            .filter(([, v]) => v)
            .map(([k, v, spoil]) => (
              <div key={k} data-spoiler={spoil ? "char" : undefined}>
                <dt className="text-nexus-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
        </motion.dl>

        {(e.abilities?.length ?? 0) > 0 && (
          <motion.div variants={item} data-spoiler="char" className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-nexus-muted">
              Abilities
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(masked ? [] : e.abilities).slice(0, 8).map((a) => (
                <span
                  key={a}
                  className="rounded-full border px-2 py-0.5 text-[10px]"
                  style={{ borderColor: color, color }}
                >
                  {a}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {e.description && (
          <motion.p
            variants={item}
            className="mt-4 line-clamp-6 text-xs leading-relaxed text-nexus-muted"
          >
            {e.description}
          </motion.p>
        )}

        <motion.div variants={item} className="mt-5 flex flex-wrap gap-2">
          {alter && (
            <button
              onClick={() => onJump(alter)}
              className="inline-flex items-center gap-1.5 rounded-full border border-nexus-glow/50 px-3 py-1.5 text-xs text-nexus-glow hover:bg-nexus-glow/10"
            >
              <Repeat className="h-3.5 w-3.5" /> Alter ego: {alter.name}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onEdit(e)}
              className="rounded-full border border-nexus-glow/25 px-3 py-1.5 text-xs hover:bg-nexus-fg/5"
            >
              Edit
            </button>
          )}
          <Link
            to="/character"
            search={{ e: e.id, series: seriesId || undefined, season: seasonNumber ?? undefined }}
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-nexus-glow px-3 py-1.5 text-xs font-semibold text-nexus-bg"
          >
            Full dossier <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </motion.div>
    </motion.aside>
  );
}
