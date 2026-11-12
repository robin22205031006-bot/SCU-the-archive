import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { NexusSign } from "@/components/nexus-sign";

export type NexusRecord = {
  id: string;
  title: string;
  group: string;
  subtitle?: string | undefined;
  image?: string | null;
  icon?: ReactNode;
};

/** Presentation only: callers provide already-visible records and their existing actions. */
export function NexusExplorer<T extends NexusRecord>({
  records,
  label,
  renderDetail,
  initialQuery = "",
  loading = false,
}: {
  records: T[];
  label: string;
  renderDetail: (record: T) => ReactNode;
  initialQuery?: string;
  loading?: boolean;
}) {
  const id = useId();
  const moving = useNexusMotion();
  const [group, setGroup] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const groups = useMemo(() => [...new Set(records.map((r) => r.group))], [records]);
  const needle = query.trim().toLocaleLowerCase();
  const visible = records.filter(
    (r) =>
      (group === null || group === "all" || r.group === group) &&
      (!needle || `${r.title} ${r.subtitle ?? ""} ${r.group}`.toLocaleLowerCase().includes(needle)),
  );
  const selected = visible.find((r) => r.id === selectedId);
  const selectedIndex = selected ? visible.indexOf(selected) : -1;
  const transition = moving
    ? { type: "spring" as const, stiffness: 240, damping: 30, mass: 0.9 }
    : { duration: 0 };
  const reset = () => {
    setSelectedId(null);
    setGroup(null);
  };

  return (
    <LayoutGroup id={id}>
      <section className="nexus-explorer min-w-0" aria-label={`${label} Nexus browser`}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {group !== null && (
            <Button variant="outline" size="sm" onClick={reset}>
              <ArrowLeft className="h-4 w-4" /> Categories
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {group === "all" ? `All ${label.toLowerCase()}` : (group ?? label)}{" "}
            <span className="ml-2 text-accent">{visible.length}</span>
          </p>
          <div className="relative ml-auto w-full sm:w-64">
            <Search aria-hidden className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label={`Search ${label.toLowerCase()}`}
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <p role="status" className="py-16 text-center text-muted-foreground">
            Loading {label.toLowerCase()}…
          </p>
        ) : !visible.length ? (
          <p className="py-16 text-center text-muted-foreground">
            {records.length ? "No matching records." : `No ${label.toLowerCase()} yet.`}
          </p>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {group === null && !needle ? (
              <motion.div
                key="categories"
                initial={{ opacity: 0, scale: moving ? 0.96 : 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: moving ? 1.03 : 1 }}
                transition={transition}
                className="grid grid-cols-2 gap-3 lg:grid-cols-4"
              >
                {["all", ...groups].map((g, index) => {
                  const members = g === "all" ? records : records.filter((r) => r.group === g);
                  return (
                    <motion.div
                      key={g}
                      whileHover={{ y: moving ? -4 : 0 }}
                      transition={transition}
                      className="nexus-cluster relative overflow-hidden rounded-lg border border-border bg-card/60"
                    >
                      <Button
                        variant="ghost"
                        className="relative block h-auto min-h-48 w-full whitespace-normal p-4 text-left"
                        onClick={() => {
                          setGroup(g);
                          setSelectedId(null);
                        }}
                        aria-label={`${g === "all" ? `All ${label.toLowerCase()}` : g}, ${members.length}`}
                      >
                        <span className="block text-xs font-medium">
                          {g === "all" ? `All ${label.toLowerCase()}` : g}
                        </span>
                        <span className="relative mx-auto my-2 block h-32 w-full max-w-[12rem]">
                          <svg
                            aria-hidden
                            viewBox="0 0 160 120"
                            className="absolute inset-0 m-auto h-28 w-36 max-w-full opacity-60"
                          >
                            <circle
                              cx="80"
                              cy="60"
                              r="43"
                              fill="none"
                              stroke="var(--nexus-border)"
                              strokeDasharray="2 5"
                            />
                            <circle
                              cx="80"
                              cy="60"
                              r="26"
                              fill="none"
                              stroke="var(--nexus-border)"
                            />
                            {members.slice(0, 32).map((r, i) => {
                              const a = i * 2.39996 + index;
                              const radius =
                                10 + Math.sqrt((i + 1) / Math.min(members.length, 32)) * 39;
                              const x = 80 + Math.cos(a) * radius,
                                y = 60 + Math.sin(a) * radius;
                              return (
                                <g key={r.id}>
                                  <line
                                    x1="80"
                                    y1="60"
                                    x2={x}
                                    y2={y}
                                    stroke="var(--nexus-border)"
                                  />
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={i % 5 === 0 ? 3 : 2}
                                    fill={`var(--nexus-c${(index % 6) + 1})`}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                          <NexusSpotlight members={members} offset={index} moving={moving} />
                        </span>
                        <span className="flex items-center justify-between text-accent">
                          <span className="font-mono text-lg">{members.length}</span>
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </Button>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="records"
                initial={{ opacity: 0, y: moving ? 12 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className={`grid min-w-0 gap-5 ${selected ? "lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,2fr)]" : ""}`}
              >
                <div
                  className={`grid content-start gap-2 ${selected ? "max-h-80 overflow-y-auto lg:max-h-[75dvh]" : "sm:grid-cols-2 lg:grid-cols-3"}`}
                  role="list"
                  aria-label={label}
                >
                  {visible.map((r) => (
                    <motion.div
                      layout={moving ? "position" : false}
                      key={r.id}
                      transition={transition}
                      role="listitem"
                    >
                      <Button
                        variant="ghost"
                        aria-pressed={r.id === selectedId}
                        className={`nexus-record h-auto min-h-20 w-full justify-start whitespace-normal rounded-lg border px-4 py-3 text-left ${r.id === selectedId ? "border-accent bg-accent/10" : "border-border bg-card/40"}`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        {r.image ? (
                          <NexusSign symbolName={r.title} className="h-12 w-12 shrink-0">
                            <img
                              src={r.image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="h-12 w-12 rounded-md object-cover"
                            />
                          </NexusSign>
                        ) : (
                          <NexusSign
                            symbolName={r.title}
                            className="h-10 w-10 shrink-0 text-accent"
                          >
                            {r.icon ?? <span className="nexus-mark h-4 w-4" />}
                          </NexusSign>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium">{r.title}</span>
                          <span className="mt-1 block break-words text-xs text-muted-foreground">
                            {r.subtitle ?? r.group}
                          </span>
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-accent" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {selected && (
                    <motion.article
                      key={selected.id}
                      initial={{ opacity: 0, x: moving ? 20 : 0, scale: moving ? 0.98 : 1 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: moving ? -12 : 0 }}
                      transition={transition}
                      className="min-w-0 scroll-mt-24 rounded-lg border border-border bg-card/60 p-4 sm:p-6"
                      aria-label={`${selected.title} details`}
                    >
                      <div className="mb-5 flex items-center justify-between gap-2 border-b border-border pb-3">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                          <ArrowLeft className="h-4 w-4" /> {label}
                        </Button>
                        <div className="flex items-center gap-1">
                          <span className="mr-2 text-xs text-muted-foreground">
                            {selectedIndex + 1} / {visible.length}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Previous record"
                            disabled={selectedIndex <= 0}
                            onClick={() => setSelectedId(visible[selectedIndex - 1]?.id ?? null)}
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Next record"
                            disabled={selectedIndex >= visible.length - 1}
                            onClick={() => setSelectedId(visible[selectedIndex + 1]?.id ?? null)}
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      </div>
                      {renderDetail(selected)}
                    </motion.article>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </section>
    </LayoutGroup>
  );
}

export function NexusWorkspace({
  views,
}: {
  views: { id: string; title: string; icon: ReactNode; content: ReactNode }[];
}) {
  const [active, setActive] = useState(views[0]?.id ?? "");
  const moving = useNexusMotion();
  const view = views.find((v) => v.id === active) ?? views[0];
  if (!view) return null;
  return (
    <section className="nexus-workspace min-w-0">
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Workspace views">
        {views.map((v) => (
          <Button
            key={v.id}
            role="tab"
            id={`nexus-tab-${v.id}`}
            aria-controls={`nexus-panel-${v.id}`}
            aria-selected={view.id === v.id}
            variant={view.id === v.id ? "secondary" : "ghost"}
            onClick={() => setActive(v.id)}
          >
            <NexusSign>{v.icon}</NexusSign>
            {v.title}
          </Button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view.id}
          id={`nexus-panel-${view.id}`}
          role="tabpanel"
          aria-labelledby={`nexus-tab-${view.id}`}
          initial={{ opacity: 0, scale: moving ? 0.97 : 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: moving ? 0.35 : 0 }}
          className="min-w-0"
        >
          {view.content}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
/** Cycles a cluster's own records through its card so no Nexus card sits blank. */
export function NexusSpotlight({
  members,
  offset,
  moving,
}: {
  members: NexusRecord[];
  offset: number;
  moving: boolean;
}) {
  const [i, setI] = useState(() => (offset * 7) % Math.max(1, members.length));
  useEffect(() => {
    if (!moving || members.length < 2) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % members.length), 2400 + offset * 170);
    return () => window.clearInterval(t);
  }, [moving, members.length, offset]);
  const r = members[i % Math.max(1, members.length)];
  if (!r) return null;
  return (
    <span className="nexus-spotlight absolute inset-0" aria-hidden>
      <span className="nexus-spotlight-ring" />
      <span className="nexus-spotlight-halo" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={r.id}
          className="relative flex flex-col items-center gap-1"
          initial={{ opacity: 0, scale: 0.6, filter: "blur(6px)", y: 8 }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, scale: 1.25, filter: "blur(8px)", y: -6 }}
          transition={{ duration: moving ? 0.55 : 0, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="grid h-14 w-14 place-items-center text-accent">
            {r.image ? (
              <img
                src={r.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              (r.icon ?? <span className="nexus-mark h-4 w-4" />)
            )}
          </span>
          <span className="max-w-[10rem] truncate text-[11px] text-foreground">{r.title}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
