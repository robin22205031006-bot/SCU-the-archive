import { useQuery } from "@tanstack/react-query";
import { seriesQuery } from "@/lib/series";
import { journeyScore, timelineRank, type JourneyRow } from "@/lib/journey";
import { useTimelineOrder } from "@/lib/series-order";
import { useIsManga } from "@/hooks/use-ui-mode";

const PALETTE = [
  "var(--accent)",
  "hsl(190 85% 60%)",
  "hsl(30 90% 60%)",
  "hsl(300 75% 65%)",
  "hsl(120 65% 55%)",
];
const MANGA_PALETTE = [
  "var(--foreground)",
  "var(--primary)",
  "var(--accent)",
  "var(--genre-gold, var(--primary))",
  "var(--muted-foreground)",
];
const LEVEL = [
  "",
  "Minor / fallen",
  "Support",
  "Anti / Antagonist",
  "Protagonist / Impactful",
  "Main lead",
];

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(p: { x: number; y: number }[]) {
  if (p.length < 2) return "";
  let d = `M${p[0]!.x},${p[0]!.y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i]!,
      b = p[i]!,
      c = p[i + 1]!,
      e = p[i + 2] ?? c;
    d += ` C${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6},${c.y - (e.y - b.y) / 6} ${c.x},${c.y}`;
  }
  return d;
}

/** Crisp stepped manga panel trajectory path. */
function steppedInk(p: { x: number; y: number }[]) {
  if (p.length === 0) return "";
  if (p.length === 1) return `M${p[0]!.x},${p[0]!.y}`;
  let d = `M${p[0]!.x},${p[0]!.y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]!;
    const b = p[i + 1]!;
    const midX = (a.x + b.x) / 2;
    d += ` L${midX},${a.y} L${midX},${b.y} L${b.x},${b.y}`;
  }
  return d;
}

/**
 * Continuous universe-timeline arc: every series season on one axis in the
 * admin-chosen order, each character drawn as one unbroken curve.
 */
export function JourneyLine({
  lines,
  title = "Journey trajectory",
}: {
  lines: { name: string; rows: JourneyRow[]; color?: string }[];
  title?: string;
}) {
  const isManga = useIsManga();
  const order = useTimelineOrder();
  const { data: series = [] } = useQuery(seriesQuery);
  const slots = new Map<
    number,
    { rank: number; sid: string; season?: number | undefined; title: string }
  >();
  for (const l of lines)
    for (const r of l.rows) {
      const rank = timelineRank(r, order);
      if (!slots.has(rank))
        slots.set(rank, {
          rank,
          sid: r.series?.id ?? "",
          season: r.season,
          title: r.series?.title ?? series.find((s) => s.id === r.series?.id)?.title ?? "?",
        });
    }
  const axis = [...slots.values()].sort((a, b) => a.rank - b.rank);
  if (!axis.length) return null;
  const W = 640,
    H = 190,
    padL = 30,
    padR = 16,
    top = 26,
    bottom = 44;
  const step = (W - padL - padR) / Math.max(axis.length - 1, 1);
  const xOf = (rank: number) =>
    padL +
    (axis.length === 1 ? (W - padL - padR) / 2 : axis.findIndex((a) => a.rank === rank) * step);
  const yOf = (s: number) => top + (1 - (s - 1) / 4) * (H - top - bottom);
  const bands: { sid: string; title: string; from: number; to: number }[] = [];
  axis.forEach((a, i) => {
    const last = bands[bands.length - 1];
    if (last && last.sid === a.sid) last.to = i;
    else bands.push({ sid: a.sid, title: a.title, from: i, to: i });
  });
  const palette = isManga ? MANGA_PALETTE : PALETTE;
  return (
    <figure
      data-manga-chart={isManga ? "journey-stepped" : undefined}
      className={
        isManga
          ? "min-w-0 border-2 border-border bg-card p-3 shadow-[3px_3px_0_currentColor]"
          : "min-w-0 rounded-xl border border-border bg-secondary/20 p-3"
      }
    >
      <figcaption
        className={
          isManga
            ? "mb-2 border-b border-border/60 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-foreground"
            : "mb-1 text-[11px] uppercase tracking-widest text-muted-foreground"
        }
      >
        {title}
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-w-[480px] w-full"
          role="img"
          aria-label={`${title} across the series timeline`}
        >
          {bands.map((b, i) => {
            const x1 = xOf(axis[b.from]!.rank) - step / 2,
              x2 = xOf(axis[b.to]!.rank) + step / 2;
            return (
              <g key={b.sid + i}>
                <rect
                  x={Math.max(padL - 8, x1)}
                  y={top - 14}
                  width={Math.min(W - padR, x2) - Math.max(padL - 8, x1)}
                  height={H - top - bottom + 22}
                  fill={i % 2 ? "transparent" : "currentColor"}
                  opacity={isManga ? 0.06 : 0.04}
                  rx={isManga ? 0 : 6}
                />
                <text
                  x={(xOf(axis[b.from]!.rank) + xOf(axis[b.to]!.rank)) / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={isManga ? 700 : 400}
                  fill="currentColor"
                  opacity={isManga ? 0.9 : 0.75}
                >
                  {b.title.length > 18 ? b.title.slice(0, 17) + "…" : b.title}
                </text>
              </g>
            );
          })}
          {[1, 2, 3, 4, 5].map((g) => (
            <g key={g}>
              <line
                x1={padL}
                x2={W - padR}
                y1={yOf(g)}
                y2={yOf(g)}
                stroke="currentColor"
                strokeDasharray={isManga ? "4 3" : undefined}
                opacity={isManga ? 0.2 : 0.08}
              />
              <text
                x={4}
                y={yOf(g) + 3}
                fontSize={8}
                fontWeight={isManga ? 700 : 400}
                fill="currentColor"
                opacity={isManga ? 0.75 : 0.45}
              >
                <title>{LEVEL[g]}</title>
                {g}
              </text>
            </g>
          ))}
          {axis.map(
            (a) =>
              a.season && (
                <text
                  key={a.rank}
                  x={xOf(a.rank)}
                  y={H - bottom + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={isManga ? 700 : 400}
                  fill="currentColor"
                  opacity={isManga ? 0.8 : 0.55}
                >
                  S{a.season}
                </text>
              ),
          )}
          {lines.map((l, i) => {
            const color = isManga
              ? palette[i % palette.length]!
              : (l.color ?? palette[i % palette.length]!);
            const pts = l.rows
              .map((r) => ({ x: xOf(timelineRank(r, order)), y: yOf(journeyScore(r)), r }))
              .sort((a, b) => a.x - b.x);
            return (
              <g key={l.name + i}>
                <path
                  d={isManga ? steppedInk(pts) : smooth(pts)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isManga ? 2.8 : 2.5}
                  strokeDasharray={isManga && i % 2 === 1 ? "6 3" : undefined}
                  strokeLinecap={isManga ? "square" : "round"}
                />
                {pts.map((p, k) =>
                  isManga ? (
                    <rect
                      key={k}
                      x={p.x - 4}
                      y={p.y - 4}
                      width={8}
                      height={8}
                      fill={k === pts.length - 1 ? "var(--primary)" : "var(--card)"}
                      stroke={color}
                      strokeWidth={2}
                    >
                      <title>{`${l.name} · ${p.r.series?.title ?? ""}${p.r.season ? ` S${p.r.season}` : ""} · ${p.r.arc_role ?? p.r.role_in_series ?? "—"} · ${p.r.status ?? "—"}`}</title>
                    </rect>
                  ) : (
                    <circle key={k} cx={p.x} cy={p.y} r={4} fill={color}>
                      <title>{`${l.name} · ${p.r.series?.title ?? ""}${p.r.season ? ` S${p.r.season}` : ""} · ${p.r.arc_role ?? p.r.role_in_series ?? "—"} · ${p.r.status ?? "—"}`}</title>
                    </circle>
                  ),
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {lines.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
          {lines.map((l, i) => (
            <span
              key={l.name + i}
              className="flex items-center gap-1 font-mono text-[10px] font-bold"
            >
              <span
                className={
                  isManga ? "h-2.5 w-2.5 border border-foreground" : "h-2 w-2 rounded-full"
                }
                style={{
                  background: isManga
                    ? palette[i % palette.length]
                    : (l.color ?? palette[i % palette.length]),
                }}
              />
              {l.name}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
