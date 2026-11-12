import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, entityRelationsQuery } from "@/lib/entities";
import { FAMILY_LABEL, generations, isFamilyRel, type FamilyRel } from "@/lib/family";
import { useIsStaff } from "@/hooks/use-admin";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { FamilyEditor } from "@/components/family-tree";

const TINT: Record<FamilyRel, string> = {
  parent: "hsl(45 95% 68%)",
  ancestor: "hsl(270 85% 75%)",
  sibling: "hsl(190 90% 65%)",
  spouse: "hsl(335 90% 70%)",
};

/** Nexus-only family tree: glowing generational constellation with flowing light veins; reuses the shared family links and editor. */
export function NexusFamilyTree() {
  const nav = useNavigate();
  const isStaff = useIsStaff();
  const masked = useSpoilerMask("characters");
  const { data: chars = [] } = useQuery(entitiesQuery(["character"]));
  const { data: groups = [] } = useQuery(entitiesQuery(["clan", "bloodline"]));
  const { data: relations = [] } = useQuery(entityRelationsQuery);
  const { data: memberships = [] } = useQuery({
    queryKey: ["entity-links", "all-family"],
    queryFn: async () =>
      (await supabase.from("entity_memberships").select("character_id,group_id")).data ?? [],
  });
  const [group, setGroup] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const family = useMemo(() => relations.filter((r) => isFamilyRel(r.rel)), [relations]);

  const layout = useMemo(() => {
    const linked = new Set(family.flatMap((r) => [r.source_id, r.target_id]));
    let ids = linked;
    if (group) {
      ids = new Set(memberships.filter((m) => m.group_id === group).map((m) => m.character_id));
      for (const r of family)
        if (ids.has(r.source_id) || ids.has(r.target_id)) {
          ids.add(r.source_id);
          ids.add(r.target_id);
        }
    }
    const people = chars.filter((c) => ids.has(c.id));
    const gen = generations(
      people.map((p) => p.id),
      family,
    );
    const rows = [...new Set(gen.values())]
      .sort((a, b) => a - b)
      .map((g) =>
        people.filter((p) => gen.get(p.id) === g).sort((a, b) => a.name.localeCompare(b.name)),
      );
    const W = Math.max(720, Math.max(1, ...rows.map((r) => r.length)) * 128),
      RH = 150,
      H = rows.length * RH + 60;
    const pos = new Map<string, { x: number; y: number }>();
    rows.forEach((r, gi) =>
      r.forEach((p, i) => pos.set(p.id, { x: ((i + 1) * W) / (r.length + 1), y: 70 + gi * RH })),
    );
    return { people, rows, W, H, pos };
  }, [chars, family, group, memberships]);

  const lineage = useMemo(() => {
    if (!sel) return null;
    const s = new Set([sel]);
    const walk = (id: string, up: boolean) => {
      for (const r of family) {
        const from = up ? r.target_id : r.source_id,
          to = up ? r.source_id : r.target_id;
        if (from === id && (r.rel === "parent" || r.rel === "ancestor") && !s.has(to)) {
          s.add(to);
          walk(to, up);
        }
      }
    };
    walk(sel, true);
    walk(sel, false);
    for (const r of family)
      if (
        (r.rel === "spouse" || r.rel === "sibling") &&
        (r.source_id === sel || r.target_id === sel)
      ) {
        s.add(r.source_id);
        s.add(r.target_id);
      }
    return s;
  }, [sel, family]);
  const groupName = (id: string) =>
    memberships
      .filter((m) => m.character_id === id)
      .map((m) => groups.find((g) => g.id === m.group_id)?.name)
      .filter(Boolean)[0];
  const selected = sel ? chars.find((c) => c.id === sel) : null;
  const { W, H, pos, people, rows } = layout;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap gap-1.5">
        {[{ id: "", name: "All families" }, ...groups].map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGroup(g.id);
              setSel(null);
            }}
            aria-pressed={group === g.id}
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider backdrop-blur transition ${group === g.id ? "border-accent bg-accent/15 text-accent" : "border-border bg-background/50 text-muted-foreground"}`}
          >
            {g.name}
          </button>
        ))}
      </div>
      {people.length === 0 ? (
        <p className="rounded-3xl border border-border p-8 text-center text-sm text-muted-foreground">
          No family links recorded{group ? " for this clan" : ""} yet.
        </p>
      ) : (
        <div
          className="relative overflow-auto rounded-3xl border border-border"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, hsl(230 60% 14%), hsl(230 70% 4%))",
            maxHeight: "75vh",
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ minWidth: Math.min(W, 960) }}
            className="w-full"
            role="img"
            aria-label="Family tree"
          >
            <defs>
              <filter id="nft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="nft-star">
                <stop offset="0" stopColor="#fff" />
                <stop offset=".35" stopColor="hsl(45 95% 75%)" />
                <stop offset="1" stopColor="hsl(45 95% 60%)" stopOpacity="0" />
              </radialGradient>
            </defs>
            {rows.map((_, gi) => (
              <g key={gi}>
                <line
                  x1={0}
                  x2={W}
                  y1={70 + gi * 150}
                  y2={70 + gi * 150}
                  stroke="hsl(220 60% 70%)"
                  strokeOpacity={0.06}
                  strokeDasharray="2 10"
                />
                <text
                  x={14}
                  y={64 + gi * 150}
                  fontSize={10}
                  fill="hsl(220 60% 80%)"
                  opacity={0.45}
                  letterSpacing={3}
                >
                  GEN {gi + 1}
                </text>
              </g>
            ))}
            {family.map((r, i) => {
              const a = pos.get(r.source_id),
                b = pos.get(r.target_id);
              if (!a || !b) return null;
              const on = !lineage || (lineage.has(r.source_id) && lineage.has(r.target_id));
              const c = TINT[r.rel as FamilyRel];
              const vertical = r.rel === "parent" || r.rel === "ancestor";
              const d = vertical
                ? `M${a.x},${a.y + 22} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y - 22}`
                : `M${a.x},${a.y} Q${(a.x + b.x) / 2},${a.y - 46} ${b.x},${b.y}`;
              return (
                <g key={r.id} opacity={on ? 1 : 0.08} style={{ transition: "opacity .4s" }}>
                  <path
                    d={d}
                    fill="none"
                    stroke={c}
                    strokeWidth={6}
                    opacity={0.15}
                    filter="url(#nft-glow)"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={c}
                    strokeWidth={1.6}
                    strokeDasharray={
                      r.rel === "ancestor" ? "7 6" : r.rel === "sibling" ? "2 5" : undefined
                    }
                    opacity={0.85}
                  >
                    <title>{FAMILY_LABEL[r.rel as FamilyRel]}</title>
                  </path>
                  <path
                    d={d}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeDasharray="4 60"
                    opacity={0.9}
                    className="motion-safe:animate-none"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="64"
                      to="0"
                      dur={`${2.4 + (i % 5) * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              );
            })}
            {people.map((p, i) => {
              const q = pos.get(p.id)!;
              const on = !lineage || lineage.has(p.id);
              const gname = groupName(p.id);
              const isSel = p.id === sel;
              return (
                <g
                  key={p.id}
                  transform={`translate(${q.x},${q.y})`}
                  opacity={on ? 1 : 0.15}
                  style={{ cursor: "pointer", transition: "opacity .4s" }}
                  onClick={() => setSel(isSel ? null : p.id)}
                  role="button"
                  aria-label={p.name}
                >
                  <circle r={26} fill="url(#nft-star)" opacity={0.35}>
                    <animate
                      attributeName="r"
                      values="22;29;22"
                      dur={`${3 + (i % 4) * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {p.image_url ? (
                    <>
                      <clipPath id={`nft-c${i}`}>
                        <circle r={17} />
                      </clipPath>
                      <image
                        href={p.image_url}
                        x={-17}
                        y={-17}
                        width={34}
                        height={34}
                        clipPath={`url(#nft-c${i})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    <circle r={9} fill="#fff" filter="url(#nft-glow)" />
                  )}
                  <circle
                    r={19}
                    fill="none"
                    stroke={isSel ? "#fff" : "hsl(45 95% 70%)"}
                    strokeWidth={isSel ? 2 : 1}
                    strokeDasharray={isSel ? "18 6" : undefined}
                    opacity={0.8}
                  >
                    {isSel && (
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="6s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                  <text y={38} textAnchor="middle" fontSize={11} fill="hsl(220 40% 94%)">
                    {p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}
                  </text>
                  {gname && (
                    <text
                      y={51}
                      textAnchor="middle"
                      fontSize={8}
                      letterSpacing={1.5}
                      fill="hsl(45 90% 72%)"
                      opacity={0.75}
                    >
                      {gname.toUpperCase().slice(0, 22)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {selected && (
            <div className="sticky bottom-3 left-3 m-3 max-w-xs rounded-2xl border border-border bg-background/80 p-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Lineage focus</p>
              <h3 className="text-lg font-medium">{selected.name}</h3>
              <ul
                className="mt-1 max-h-28 overflow-auto text-xs text-muted-foreground"
                data-spoiler={masked || undefined}
              >
                {family
                  .filter((r) => r.source_id === sel || r.target_id === sel)
                  .map((r) => (
                    <li key={r.id}>
                      {chars.find((c) => c.id === r.source_id)?.name}{" "}
                      {FAMILY_LABEL[r.rel as FamilyRel]}{" "}
                      {chars.find((c) => c.id === r.target_id)?.name}
                    </li>
                  ))}
              </ul>
              <button
                onClick={() => nav({ to: "/reader", search: { e: selected.id } })}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent"
              >
                <BookOpen className="h-3.5 w-3.5" /> Open dossier
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(Object.keys(TINT) as FamilyRel[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-4 rounded-full"
              style={{ background: TINT[k], boxShadow: `0 0 8px ${TINT[k]}` }}
            />
            {FAMILY_LABEL[k].replace("is ", "").replace(" of", "")}
          </span>
        ))}
        <span>Tap a star to trace its bloodline.</span>
      </div>
      {isStaff && <FamilyEditor chars={chars} family={family} />}
    </div>
  );
}
