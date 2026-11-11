import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { entitiesQuery, type Entity } from "@/lib/entities";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { membershipsQuery } from "@/components/nexus-constellation";
import { PanelSkeleton } from "@/components/route-skeleton";

const KINDS: Entity["kind"][] = ["character", "organization", "clan", "bloodline", "faction"];
const COLOR: Record<string, string> = { clan: "#86efac", bloodline: "#c4b5fd", organization: "#7dd3fc", faction: "#fb923c" };
const LEAD = /founder|patriarch|matriarch|leader|head|king|queen|chief|commander|lord|emperor|elder/i;

/** Nexus-only ancestral tree: group crest at the root, sub-groups as branches, members tiered (leaders first when roles are not spoiler-masked), with glowing conduits flowing up from the root. */
export function NexusLineage() {
  const nav = useNavigate();
  const masked = useSpoilerMask("characters");
  const { data: entities, isLoading } = useQuery(entitiesQuery(KINDS));
  const { data: mems } = useQuery(membershipsQuery);
  const byId = useMemo(() => new Map((entities ?? []).map(e => [e.id, e])), [entities]);
  const groups = useMemo(() => {
    const has = new Set((mems ?? []).map(m => m.group_id));
    return (entities ?? []).filter(e => e.kind !== "character" && (has.has(e.id) || (entities ?? []).some(c => c.parent_id === e.id)));
  }, [entities, mems]);
  const [gid, setGid] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const g = byId.get(gid) ?? groups[0];
  const tree = useMemo(() => {
    if (!g) return null;
    const members = (id: string) => (mems ?? []).filter(m => m.group_id === id).map(m => byId.get(m.character_id)).filter((c): c is Entity => !!c && c.kind === "character");
    const own = members(g.id);
    const leaders = masked ? [] : own.filter(c => LEAD.test(c.role ?? ""));
    const rest = own.filter(c => !leaders.includes(c));
    const subs = (entities ?? []).filter(e => e.parent_id === g.id && e.kind !== "character").map(s => ({ s, m: members(s.id) }));
    return { leaders, rest, subs };
  }, [g, mems, byId, entities, masked]);

  if (isLoading) return <PanelSkeleton />;
  if (!g || !tree) return <p className="text-sm text-muted-foreground">No clans or bloodlines with members yet.</p>;
  const col = COLOR[g.kind] ?? "var(--accent)";
  const Node = ({ c }: { c: Entity }) => <button onClick={() => nav({ to: "/reader", search: { e: c.id } })} className="nx-lin-node group flex w-24 flex-col items-center gap-1 text-center" style={{ ["--c" as string]: col }}>
    <span className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-background" style={{ borderColor: col, boxShadow: `0 0 18px ${col}` }}>
      {c.image_url ? <img src={c.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-medium">{c.name[0]}</span>}
    </span>
    <span className="line-clamp-2 text-[11px] leading-tight">{c.name}</span>
  </button>;
  const Tier = ({ label, list }: { label: string; list: Entity[] }) => list.length ? <div className="relative">
    <p className="mb-2 text-center text-[10px] uppercase tracking-[0.25em]" style={{ color: col }}>{label}</p>
    <div className="flex flex-wrap justify-center gap-3">{list.map(c => <Node key={c.id} c={c} />)}</div>
  </div> : null;

  return <div className="relative overflow-hidden rounded-3xl border border-border bg-background/40 p-4 sm:p-6">
    <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(ellipse at 50% 100%, ${col}33, transparent 60%)` }} />
    <div className="relative mb-5 flex gap-2 overflow-x-auto pb-1">
      {groups.map(x => <button key={x.id} onClick={() => setGid(x.id)} className="shrink-0 rounded-full border px-3 py-1 text-xs" style={{ borderColor: x.id === g.id ? COLOR[x.kind] : "var(--border)", color: COLOR[x.kind] }}>{x.name}</button>)}
    </div>
    <div className="relative flex flex-col-reverse items-center gap-8">
      {/* root crest */}
      <div className="flex flex-col items-center">
        <span className="nx-lin-crest grid h-24 w-24 place-items-center rounded-full border-2 text-3xl font-medium" style={{ borderColor: col, color: col, ["--c" as string]: col }}>{g.name[0]}</span>
        <p className="mt-2 text-lg font-medium">{g.name}</p><p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{g.kind} · root</p>
      </div>
      <svg aria-hidden className="h-10 w-2 overflow-visible"><line x1="1" y1="0" x2="1" y2="40" stroke={col} strokeWidth="2" className="nx-lin-flow" /></svg>
      <Tier label={masked ? "Members" : "Members"} list={tree.rest} />
      {tree.leaders.length > 0 && <><svg aria-hidden className="h-8 w-2 overflow-visible"><line x1="1" y1="0" x2="1" y2="32" stroke={col} strokeWidth="2" className="nx-lin-flow" /></svg><Tier label="Leadership" list={tree.leaders} /></>}
    </div>
    {tree.subs.length > 0 && <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
      {tree.subs.map(({ s, m }) => { const isOpen = open.has(s.id); return <div key={s.id} className="rounded-2xl border border-border bg-background/60 p-3">
        <button className="flex w-full items-center justify-between text-sm" aria-expanded={isOpen} onClick={() => setOpen(o => { const n = new Set(o); if (isOpen) n.delete(s.id); else n.add(s.id); return n; })}>
          <span><span style={{ color: COLOR[s.kind] }}>{s.name}</span> <span className="text-xs text-muted-foreground">· {m.length} members</span></span><ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div className="grid transition-all duration-500" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}><div className="overflow-hidden"><div className="flex flex-wrap justify-center gap-3 pt-3">{m.map(c => <Node key={c.id} c={c} />)}</div></div></div>
      </div>; })}
    </div>}
    {masked && <p className="relative mt-4 text-center text-[11px] text-muted-foreground">Leadership tiers are hidden while character spoilers are masked.</p>}
  </div>;
}
