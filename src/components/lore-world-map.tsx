import { AnimatePresence, motion } from "framer-motion";

type Props = {
  activeId: string;
  eras: Record<string, string>; // location id -> active era id
  onSelect: (id: string) => void;
};

const TONE_COLOR: Record<string, string> = {
  alive: "var(--accent)",
  hidden: "var(--primary)",
  ruin: "var(--destructive)",
};

const ERA_TONE: Record<string, string> = {
  ancient: "hidden", golden: "alive", "redline-s2": "ruin",
  enclave: "hidden", exile: "alive",
  pre: "alive", post: "ruin",
};

const REGIONS = [
  { id: "yasnaya", name: "Yasnaya", sector: "N-01 · Highlands", cx: 250, cy: 140,
    path: "M150,110 C170,60 260,50 320,80 C370,105 360,175 310,200 C250,225 170,210 150,170 Z" },
  { id: "aethmos", name: "Aethmos", sector: "W-07 · Veiled Jungle", cx: 200, cy: 380,
    path: "M90,340 C110,290 210,280 270,310 C320,340 300,430 240,450 C170,470 90,430 90,380 Z" },
  { id: "ruincity", name: "RuinCity", sector: "E-13 · Border Rift", cx: 620, cy: 300,
    path: "M520,240 C560,200 690,210 730,260 C760,310 720,380 650,390 C580,400 510,350 510,300 Z" },
];

/** Era-specific glyphs drawn inside each region. */
function RegionDetail({ id, era }: { id: string; era: string }) {
  const c = TONE_COLOR[ERA_TONE[era] ?? "alive"] ?? "var(--accent)";
  const trees = (pts: [number, number][], dead = false) =>
    pts.map(([x, y], i) => (
      <g key={i} opacity={dead ? 0.6 : 0.85}>
        <line x1={x} y1={y} x2={x} y2={y + 10} stroke={c} strokeWidth={1.2} />
        {dead ? (
          <path d={`M${x - 5},${y + 2} L${x},${y - 4} L${x + 5},${y + 1}`} stroke={c} fill="none" />
        ) : (
          <circle cx={x} cy={y} r={6} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={0.8} />
        )}
      </g>
    ));

  if (id === "yasnaya") {
    if (era === "ancient")
      return <g>{trees([[190, 110], [215, 95], [240, 120], [270, 100], [295, 130], [220, 160], [260, 165], [190, 160]])}
        <rect x={243} y={138} width={12} height={10} fill="none" stroke={c} /></g>;
    if (era === "golden")
      return <g>
        {[30, 48, 66].map((r) => <ellipse key={r} cx={250} cy={140} rx={r} ry={r * 0.45} fill="none" stroke={c} strokeOpacity={0.5} strokeDasharray="3 3" />)}
        <path d="M235,150 L235,125 L250,110 L265,125 L265,150 Z" fill={c} fillOpacity={0.3} stroke={c} />
        {trees([[180, 170], [320, 160], [200, 105], [300, 100]])}
      </g>;
    return <g>
      {trees([[190, 115], [230, 100], [280, 110], [300, 160], [200, 170]], true)}
      <path d="M215,150 L240,135 L232,128 L262,118 M255,160 L275,140" stroke={c} strokeWidth={1.5} fill="none" />
      <circle cx={250} cy={140} r={22} fill={c} fillOpacity={0.15} />
    </g>;
  }
  if (id === "aethmos") {
    const jungle = trees([[130, 360], [160, 330], [200, 320], [240, 340], [140, 410], [270, 390], [220, 430], [170, 440]]);
    if (era === "enclave")
      return <g>{jungle}
        <ellipse cx={200} cy={380} rx={115} ry={78} fill="none" stroke={c} strokeDasharray="2 5" strokeWidth={1.5} />
        <text x={200} y={384} textAnchor="middle" fontSize={8} fill={c} letterSpacing={2}>NO SIGNAL</text></g>;
    return <g>{jungle}
      <ellipse cx={200} cy={380} rx={115} ry={78} fill="none" stroke={c} strokeOpacity={0.4} strokeDasharray="6 4" />
      <ellipse cx={205} cy={385} rx={34} ry={22} fill={c} fillOpacity={0.2} stroke={c} />
      <circle cx={205} cy={385} r={3} fill={c} />
      <text x={205} y={420} textAnchor="middle" fontSize={7} fill={c} letterSpacing={2}>SAFEHOUSE</text></g>;
  }
  // ruincity
  const towers: [number, number, number][] = [[560, 300, 40], [585, 290, 60], [610, 295, 50], [635, 280, 75], [660, 300, 45], [685, 290, 55]];
  if (era === "pre")
    return <g>
      {towers.map(([x, y, h], i) => <rect key={i} x={x} y={y - h + 40} width={16} height={h} fill={c} fillOpacity={0.25} stroke={c} />)}
      <path d="M530,345 Q620,315 720,345" stroke={c} fill="none" strokeWidth={1.5} />
      <path d="M530,355 Q620,330 720,355" stroke={c} fill="none" strokeOpacity={0.5} />
    </g>;
  return <g>
    {towers.map(([x, y, h], i) => (
      <path key={i} d={`M${x},${y + 40} L${x},${y - h * 0.5 + 40} L${x + 6},${y - h * 0.65 + 40} L${x + 10},${y - h * 0.4 + 40} L${x + 16},${y - h * 0.55 + 40} L${x + 16},${y + 40}`}
        fill="none" stroke={c} strokeOpacity={0.8} />
    ))}
    <path d="M530,345 Q570,330 595,338 M640,330 Q690,335 720,345" stroke={c} fill="none" strokeDasharray="4 3" />
    {[[575, 360], [650, 365], [700, 320]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill={c} fillOpacity={0.15} />)}
  </g>;
}

export function LoreWorldMap({ activeId, eras, onSelect }: Props) {
  return (
    <div className="glass relative mb-4 overflow-hidden rounded-2xl border border-border">
      <svg viewBox="0 0 800 500" className="block h-auto w-full" role="img" aria-label="Map of SCU lore locations">
        <defs>
          <pattern id="lwm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40,0 L0,0 0,40" fill="none" stroke="var(--border)" strokeWidth={0.6} />
          </pattern>
          <radialGradient id="lwm-sweep">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#lwm-grid)" />
        {/* contour lines */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M0,${230 + i * 22} C200,${190 + i * 30} 420,${300 + i * 15} 800,${240 + i * 25}`}
            fill="none" stroke="var(--muted-foreground)" strokeOpacity={0.12} />
        ))}
        {/* realm divide */}
        <path d="M470,0 C450,120 500,220 470,320 C450,400 480,460 470,500" fill="none" stroke="var(--destructive)" strokeOpacity={0.4} strokeDasharray="8 6" />
        <text x={480} y={24} fontSize={9} fill="var(--destructive)" opacity={0.7} letterSpacing={3}>DEMON REALM ▸</text>
        <text x={460} y={24} fontSize={9} fill="var(--muted-foreground)" textAnchor="end" letterSpacing={3}>◂ HUMAN REALM</text>
        {/* routes */}
        <path d="M250,200 Q230,280 200,310" stroke="var(--muted-foreground)" strokeOpacity={0.3} strokeDasharray="2 6" fill="none" />
        <path d="M310,160 Q450,200 525,270" stroke="var(--muted-foreground)" strokeOpacity={0.3} strokeDasharray="2 6" fill="none" />

        {REGIONS.map((r) => {
          const era = eras[r.id] ?? "";
          const color = TONE_COLOR[ERA_TONE[era] ?? "alive"] ?? "var(--accent)";
          const active = r.id === activeId;
          return (
            <g key={r.id} onClick={() => onSelect(r.id)} className="cursor-pointer" role="button" aria-label={r.name}>
              <motion.path d={r.path} animate={{ fill: color, stroke: color, fillOpacity: active ? 0.16 : 0.07, strokeOpacity: active ? 0.9 : 0.4 }}
                transition={{ duration: 0.6 }} strokeWidth={active ? 2 : 1} />
              <AnimatePresence mode="wait">
                <motion.g key={era} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }} style={{ transformOrigin: `${r.cx}px ${r.cy}px` }}>
                  <RegionDetail id={r.id} era={era} />
                </motion.g>
              </AnimatePresence>
              {active && (
                <motion.circle cx={r.cx} cy={r.cy} r={20} fill="url(#lwm-sweep)"
                  animate={{ r: [20, 130], opacity: [0.8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
              )}
              <text x={r.cx} y={r.cy - 95 < 20 ? r.cy + 100 : r.cy - 85} textAnchor="middle" fontSize={14}
                fill={active ? "var(--accent)" : "var(--foreground)"} fontWeight={600} letterSpacing={2}>
                {r.name.toUpperCase()}
              </text>
              <text x={r.cx} y={(r.cy - 95 < 20 ? r.cy + 100 : r.cy - 85) + 14} textAnchor="middle" fontSize={8}
                fill="var(--muted-foreground)" letterSpacing={2}>{r.sector}</text>
            </g>
          );
        })}
        {/* compass */}
        <g transform="translate(750,450)" opacity={0.6}>
          <circle r={18} fill="none" stroke="var(--muted-foreground)" />
          <path d="M0,-16 L4,0 L0,16 L-4,0 Z" fill="var(--accent)" />
          <text y={-22} textAnchor="middle" fontSize={8} fill="var(--muted-foreground)">N</text>
        </g>
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        SCU Theater · Click a region
      </div>
    </div>
  );
}
