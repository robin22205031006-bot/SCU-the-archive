import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Crosshair, Minus, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  entitiesQuery,
  entityRelationsQuery,
  type Entity,
  type EntityMembership,
} from "@/lib/entities";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { PanelSkeleton } from "@/components/route-skeleton";
import { NexusBondEditor } from "@/components/nexus-bond-editor";

const KINDS: Entity["kind"][] = ["character", "organization", "clan", "bloodline", "faction"];
const HUE: Record<Entity["kind"], [number, number, number]> = {
  character: [240, 214, 120],
  organization: [125, 211, 252],
  clan: [134, 239, 172],
  bloodline: [196, 181, 253],
  faction: [251, 146, 60],
};
const BOND: Record<string, [number, number, number]> = {
  rival: [255, 90, 80],
  mentor: [120, 230, 255],
  ally: [140, 255, 170],
  commands: [255, 190, 90],
  kin: [255, 150, 230],
  parent: [255, 150, 230],
  sibling: [255, 150, 230],
  spouse: [255, 120, 180],
  ancestor: [220, 170, 255],
};
type N = { e: Entity; x: number; y: number; vx: number; vy: number; r: number; deg: number };

export const membershipsQuery = {
  queryKey: ["graph-memberships"],
  staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("entity_memberships").select("*");
    if (error) {
      if (/entity_memberships|schema cache|does not exist/i.test(error.message))
        return [] as EntityMembership[];
      throw error;
    }
    return data;
  },
};

/** Nexus-only living constellation: force-settled star field, animated energy conduits, pan/pinch/wheel zoom and a focus dossier. */
export function NexusConstellation() {
  const nav = useNavigate();
  const masked = useSpoilerMask("characters");
  const { data: entities, isLoading } = useQuery({ ...entitiesQuery(KINDS), staleTime: 60_000 });
  const { data: mems } = useQuery(membershipsQuery);
  const { data: rels } = useQuery(entityRelationsQuery);
  const [kinds, setKinds] = useState(new Set(KINDS));
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const cv = useRef<HTMLCanvasElement>(null);
  const view = useRef({ x: 0, y: 0, k: 0.6 });
  const selRef = useRef<string | null>(null);
  selRef.current = sel;

  const graph = useMemo(() => {
    const list = (entities ?? []).filter((e) => kinds.has(e.kind));
    const ids = new Set(list.map((e) => e.id));
    const edges = (mems ?? []).filter((m) => ids.has(m.character_id) && ids.has(m.group_id));
    const deg = new Map<string, number>();
    for (const m of edges) {
      deg.set(m.character_id, (deg.get(m.character_id) ?? 0) + 1);
      deg.set(m.group_id, (deg.get(m.group_id) ?? 0) + 1);
    }
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const nodes: N[] = list.map((e, i) => {
      const a = i * 2.39996,
        rr = 40 * Math.sqrt(i + 1);
      const d = deg.get(e.id) ?? 0;
      return {
        e,
        x: Math.cos(a) * rr,
        y: Math.sin(a) * rr,
        vx: 0,
        vy: 0,
        deg: d,
        r: e.kind === "character" ? 5 + Math.min(d, 6) : 11 + Math.min(d, 20) * 0.7,
      };
    });
    const byId = new Map(nodes.map((n) => [n.e.id, n]));
    const E = edges.map((m) => [byId.get(m.character_id)!, byId.get(m.group_id)!] as const);
    const B = (rels ?? [])
      .filter((r) => byId.has(r.source_id) && byId.has(r.target_id))
      .map((r) => ({
        a: byId.get(r.source_id)!,
        b: byId.get(r.target_id)!,
        rel: r.rel,
        label: r.label,
      }));
    for (const { a, b } of B) {
      a.r += 1.5;
      b.r += 1.5;
    }
    // settle layout once (deterministic) so the canvas only animates FX
    for (let it = 0; it < 220; it++) {
      const cool = 1 - it / 220;
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!,
            b = nodes[j]!;
          let dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = dx * dx + dy * dy || rnd();
          if (d2 > 160000) continue;
          const f = 900 / d2;
          dx *= f;
          dy *= f;
          a.vx += dx;
          a.vy += dy;
          b.vx -= dx;
          b.vy -= dy;
        }
      for (const [a, b] of [...E, ...B.map((x) => [x.a, x.b] as const)]) {
        const dx = b.x - a.x,
          dy = b.y - a.y;
        a.vx += dx * 0.012;
        a.vy += dy * 0.012;
        b.vx -= dx * 0.012;
        b.vy -= dy * 0.012;
      }
      for (const n of nodes) {
        n.vx -= n.x * 0.02;
        n.vy -= n.y * 0.02;
        n.x += Math.max(-20, Math.min(20, n.vx)) * cool;
        n.y += Math.max(-20, Math.min(20, n.vy)) * cool;
        n.vx *= 0.5;
        n.vy *= 0.5;
      }
    }
    const ext = Math.max(200, ...nodes.map((n) => Math.max(Math.abs(n.x), Math.abs(n.y))));
    return { nodes, E, B, byId, fit: Math.min(1, 190 / ext) };
  }, [entities, mems, rels, kinds]);

  const linked = useMemo(() => {
    if (!sel) return null;
    const s = new Set([sel]);
    for (const [a, b] of graph.E) {
      if (a.e.id === sel) s.add(b.e.id);
      if (b.e.id === sel) s.add(a.e.id);
    }
    for (const x of graph.B) {
      if (x.a.e.id === sel) s.add(x.b.e.id);
      if (x.b.e.id === sel) s.add(x.a.e.id);
    }
    return s;
  }, [sel, graph]);
  const linkedRef = useRef(linked);
  linkedRef.current = linked;
  const qRef = useRef(q);
  qRef.current = q;

  useEffect(() => {
    view.current = { x: 0, y: 0, k: graph.fit };
    const c = cv.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = Array.from({ length: 140 }, (_, i) => [
      (i * 97.13) % 1,
      (i * 57.71) % 1,
      (i % 3) + 1,
    ]);
    let raf = 0,
      visible = true;
    const io = new IntersectionObserver(([en]) => {
      visible = !!en?.isIntersecting;
    });
    io.observe(c);
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const dpr = Math.min(devicePixelRatio || 1, 2),
        w = c.clientWidth,
        h = c.clientHeight;
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      const t = reduce ? 0 : now / 1000,
        v = view.current,
        L = linkedRef.current,
        qs = qRef.current.trim().toLowerCase();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
      bg.addColorStop(0, "#0d1530");
      bg.addColorStop(1, "#03050c");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      for (const [sx, sy, z] of stars) {
        ctx.fillStyle = `rgba(200,220,255,${0.25 + 0.25 * Math.sin(t * z! + sx! * 40)})`;
        ctx.fillRect(
          (((sx! * w + v.x * 0.05 * z!) % w) + w) % w,
          (((sy! * h + v.y * 0.05 * z!) % h) + h) % h,
          z! * 0.7,
          z! * 0.7,
        );
      }
      ctx.translate(w / 2 + v.x, h / 2 + v.y);
      ctx.scale(v.k, v.k);
      ctx.globalCompositeOperation = "lighter";
      for (const [a, b] of graph.E) {
        const on = !L || (L.has(a.e.id) && L.has(b.e.id));
        const [r, g, bl] = HUE[b.e.kind];
        ctx.strokeStyle = `rgba(${r},${g},${bl},${on ? (L ? 0.55 : 0.16) : 0.03})`;
        ctx.lineWidth = (on && L ? 1.6 : 0.8) / v.k;
        const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12,
          my = (a.y + b.y) / 2 + (b.x - a.x) * 0.12;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
        if (on && (L || graph.E.length < 400)) {
          const p = (t * 0.35 + a.x * 0.001) % 1,
            q1 = 1 - p;
          const px = q1 * q1 * a.x + 2 * q1 * p * mx + p * p * b.x,
            py = q1 * q1 * a.y + 2 * q1 * p * my + p * p * b.y;
          ctx.fillStyle = `rgba(${r},${g},${bl},0.9)`;
          ctx.beginPath();
          ctx.arc(px, py, 2 / v.k + 1, 0, 6.283);
          ctx.fill();
        }
      }
      // character bonds: braided glowing light lines with travelling sparks both ways
      for (const x of graph.B) {
        const { a, b } = x;
        const on = !L || (L.has(a.e.id) && L.has(b.e.id));
        const [r, g, bl] = BOND[x.rel] ?? [255, 255, 255];
        const al = on ? (L ? 1 : 0.6) : 0.05,
          fl = 0.75 + 0.25 * Math.sin(t * 3 + a.x * 0.01);
        const mx = (a.x + b.x) / 2 - (a.y - b.y) * 0.18,
          my = (a.y + b.y) / 2 - (b.x - a.x) * 0.18;
        for (const [lw, aa] of [
          [7, 0.12],
          [3, 0.35],
          [1.2, 0.95],
        ] as const) {
          ctx.strokeStyle = `rgba(${r},${g},${bl},${aa * al * fl})`;
          ctx.lineWidth = lw / v.k;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
        }
        if (on)
          for (const ph of [0, 0.5]) {
            const p = (t * 0.25 + ph) % 1,
              q1 = 1 - p;
            const px = q1 * q1 * a.x + 2 * q1 * p * mx + p * p * b.x,
              py = q1 * q1 * a.y + 2 * q1 * p * my + p * p * b.y;
            const gl = ctx.createRadialGradient(px, py, 0, px, py, 7 / v.k);
            gl.addColorStop(0, `rgba(255,255,255,${al})`);
            gl.addColorStop(0.4, `rgba(${r},${g},${bl},${0.8 * al})`);
            gl.addColorStop(1, `rgba(${r},${g},${bl},0)`);
            ctx.fillStyle = gl;
            ctx.beginPath();
            ctx.arc(px, py, 7 / v.k, 0, 6.283);
            ctx.fill();
          }
      }
      for (const n of graph.nodes) {
        const on = !L || L.has(n.e.id),
          hit = qs && n.e.name.toLowerCase().includes(qs);
        const [r, g, b] = HUE[n.e.kind];
        const pulse = 1 + 0.12 * Math.sin(t * 2 + n.x * 0.05);
        const a = on ? 1 : 0.12;
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.2 * pulse);
        halo.addColorStop(0, `rgba(${r},${g},${b},${0.55 * a})`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3.2 * pulse, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.45, 0, 6.283);
        ctx.fill();
        if (n.e.kind !== "character" || n.e.id === selRef.current || hit) {
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.7 * a})`;
          ctx.lineWidth = 1 / v.k;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 1.5, t * 0.6, t * 0.6 + 4.6);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.textAlign = "center";
      ctx.font = `${11 / v.k}px ui-sans-serif, system-ui`;
      for (const n of graph.nodes) {
        const on = !L || L.has(n.e.id),
          hit = qs && n.e.name.toLowerCase().includes(qs);
        if (!(hit || (L && on) || (n.e.kind !== "character" && v.k > 0.45) || v.k > 1.3)) continue;
        ctx.fillStyle = on ? "rgba(235,240,255,0.92)" : "rgba(235,240,255,0.15)";
        ctx.fillText(n.e.name, n.x, n.y + n.r * 1.5 + 12 / v.k);
      }
    };
    raf = requestAnimationFrame(draw);
    // gestures
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0,
      pinch = 0;
    const toWorld = (cx: number, cy: number) => {
      const r = c.getBoundingClientRect(),
        v = view.current;
      return {
        x: (cx - r.left - r.width / 2 - v.x) / v.k,
        y: (cy - r.top - r.height / 2 - v.y) / v.k,
      };
    };
    const zoomAt = (cx: number, cy: number, f: number) => {
      const r = c.getBoundingClientRect(),
        v = view.current;
      const nk = Math.max(0.2, Math.min(4, v.k * f));
      const px = cx - r.left - r.width / 2,
        py = cy - r.top - r.height / 2;
      v.x = px - (px - v.x) * (nk / v.k);
      v.y = py - (py - v.y) * (nk / v.k);
      v.k = nk;
    };
    const down = (e: PointerEvent) => {
      c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch) zoomAt((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, d / pinch);
        pinch = d;
      } else {
        view.current.x += dx;
        view.current.y += dy;
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
      if (moved < 6 && pts.size === 0) {
        const w = toWorld(e.clientX, e.clientY);
        let best: N | null = null,
          bd = Infinity;
        for (const n of graph.nodes) {
          const d = Math.hypot(n.x - w.x, n.y - w.y);
          if (d < Math.max(n.r * 2, 14 / view.current.k) && d < bd) {
            bd = d;
            best = n;
          }
        }
        setSel(best ? best.e.id : null);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      zoomAt(e.clientX, e.clientY, Math.exp(-dy * 0.0015));
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
      c.removeEventListener("wheel", wheel);
    };
  }, [graph]);

  const focus = (id: string) => {
    const n = graph.byId.get(id);
    if (!n) return;
    const v = view.current;
    v.k = 1.4;
    v.x = -n.x * v.k;
    v.y = -n.y * v.k;
    setSel(id);
  };
  const runSearch = () => {
    const s = q.trim().toLowerCase();
    const n = graph.nodes.find((n) => n.e.name.toLowerCase().includes(s));
    if (n) focus(n.e.id);
  };
  const selected = sel ? graph.byId.get(sel)?.e : null;
  const bonds = selected
    ? graph.E.filter(([a, b]) => a.e.id === sel || b.e.id === sel).map(
        ([a, b]) => (a.e.id === sel ? b : a).e,
      )
    : [];
  const ties = selected
    ? graph.B.filter((x) => x.a.e.id === sel || x.b.e.id === sel).map((x) => ({
        ...x,
        o: (x.a.e.id === sel ? x.b : x.a).e,
      }))
    : [];
  const btn =
    "grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70 backdrop-blur";

  if (isLoading) return <PanelSkeleton />;
  return (
    <>
      <div className="relative h-[72vh] min-h-[460px] overflow-hidden rounded-3xl border border-border">
        <canvas
          ref={cv}
          className="atlas-keep touch-none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          aria-label="Constellation of characters and groups. Drag to pan, pinch or scroll to zoom, tap a star to focus."
        />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex-1 min-w-[10rem]"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a star…"
              className="h-9 w-full rounded-full border border-border bg-background/70 px-4 text-sm backdrop-blur"
              aria-label="Search the constellation"
            />
          </form>
          <button
            className={btn}
            aria-label="Zoom in"
            onClick={() => {
              view.current.k = Math.min(4, view.current.k * 1.25);
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            className={btn}
            aria-label="Zoom out"
            onClick={() => {
              view.current.k = Math.max(0.2, view.current.k / 1.25);
            }}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            className={btn}
            aria-label="Recenter"
            onClick={() => {
              view.current = { x: 0, y: 0, k: graph.fit };
              setSel(null);
            }}
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute left-3 top-14 flex flex-wrap gap-1.5">
          {KINDS.map((k) => {
            const [r, g, b] = HUE[k];
            const on = kinds.has(k);
            return (
              <button
                key={k}
                onClick={() =>
                  setKinds((s) => {
                    const n = new Set(s);
                    if (on) n.delete(k);
                    else n.add(k);
                    return n;
                  })
                }
                aria-pressed={on}
                className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] uppercase tracking-wider backdrop-blur"
                style={{ opacity: on ? 1 : 0.4, color: `rgb(${r},${g},${b})` }}
              >
                {k}
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 sm:left-auto sm:w-80">
            <div className="flex items-start gap-3">
              {selected.image_url ? (
                <img
                  src={selected.image_url}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="h-14 w-14 rounded-xl border border-border"
                  style={{ background: `rgb(${HUE[selected.kind].join(",")})`, opacity: 0.3 }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent">
                  {selected.kind}
                </p>
                <h3 className="truncate text-lg font-medium">{selected.name}</h3>
                {selected.role && (
                  <p className="text-xs text-muted-foreground" data-spoiler={masked || undefined}>
                    {masked ? "Role hidden (spoiler)" : selected.role}
                  </p>
                )}
              </div>
              <button className={btn} aria-label="Close" onClick={() => setSel(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {ties.length > 0 && (
              <div className="mt-3 space-y-1.5" data-spoiler={masked || undefined}>
                {ties.map((x) => (
                  <button
                    key={x.o.id + x.rel}
                    onClick={() => focus(x.o.id)}
                    className="block w-full rounded-xl border border-border px-2.5 py-1.5 text-left text-[11px]"
                  >
                    <span
                      className="uppercase tracking-wider"
                      style={{ color: `rgb(${(BOND[x.rel] ?? [255, 255, 255]).join(",")})` }}
                    >
                      {x.rel}
                    </span>{" "}
                    · {x.o.name}
                    {x.label && !masked && (
                      <span className="block text-muted-foreground">{x.label}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              {bonds.length} groups
            </p>
            <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-auto">
              {bonds.map((b) => (
                <button
                  key={b.id}
                  onClick={() => focus(b.id)}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px]"
                  style={{ color: `rgb(${HUE[b.kind].join(",")})` }}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => nav({ to: "/reader", search: { e: selected.id } })}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent"
            >
              <BookOpen className="h-3.5 w-3.5" /> Open dossier
            </button>
          </div>
        )}
      </div>
      <NexusBondEditor />
    </>
  );
}
