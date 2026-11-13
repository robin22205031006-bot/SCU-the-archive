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
  ancient: "hidden",
  golden: "alive",
  "redline-s2": "ruin",
  enclave: "hidden",
  exile: "alive",
  pre: "alive",
  post: "ruin",
  "pre-asetra": "alive",
  "nila-present": "hidden",
  timeless: "hidden",
  "1417": "hidden",
  "istanbul-present": "alive",
  "rome-15th": "ruin",
  "rome-present": "alive",
  "romania-15th": "hidden",
};

const REGIONS = [
  {
    id: "nilanjona",
    name: "Nilanjona",
    sector: "N-00 · Glacial North",
    cx: 410,
    cy: 75,
    path: "M340,42 C380,26 445,28 475,55 C495,80 470,115 410,120 C350,118 320,80 340,42 Z",
  },
  {
    id: "yasnaya",
    name: "Yasnaya",
    sector: "E-04 · Wind Coast",
    cx: 650,
    cy: 155,
    path: "M580,120 C610,85 695,90 730,130 C755,165 725,210 660,218 C595,220 560,170 580,120 Z",
  },
  {
    id: "aethmos",
    name: "Aethmos",
    sector: "W-07 · Veiled Jungle",
    cx: 150,
    cy: 210,
    path: "M75,175 C100,135 190,135 225,175 C255,215 225,268 155,275 C90,275 60,225 75,175 Z",
  },
  {
    id: "romania-15th",
    name: "Romania (15th c.)",
    sector: "NW-15 · Carpathians",
    cx: 280,
    cy: 195,
    path: "M235,165 C265,140 325,148 345,182 C355,215 320,248 275,248 C235,245 220,200 235,165 Z",
  },
  {
    id: "istanbul-1417",
    name: "Istanbul",
    sector: "C-14 · Bosphorus",
    cx: 430,
    cy: 255,
    path: "M370,220 C405,195 470,200 495,235 C510,270 480,305 425,305 C375,302 355,260 370,220 Z",
  },
  {
    id: "rome",
    name: "Rome",
    sector: "SW-15 · Tiber Vaults",
    cx: 235,
    cy: 365,
    path: "M170,330 C205,302 275,308 302,345 C318,382 285,422 230,425 C175,422 150,375 170,330 Z",
  },
  {
    id: "ruincity",
    name: "RuinCity",
    sector: "SE-13 · Border Rift",
    cx: 600,
    cy: 365,
    path: "M525,322 C565,295 655,302 685,345 C705,388 665,432 595,432 C530,428 505,375 525,322 Z",
  },
  {
    id: "pocket-dimension",
    name: "Pocket Dim.",
    sector: "X-∞ · Rift Outside Time",
    cx: 775,
    cy: 80,
    path: "M725,45 C758,28 815,35 835,68 C848,100 815,130 770,128 C730,125 708,82 725,45 Z",
  },
];

/** Era-specific glyphs drawn inside each region. */
function RegionDetail({ id, era }: { id: string; era: string }) {
  const c = TONE_COLOR[ERA_TONE[era] ?? "alive"] ?? "var(--accent)";
  if (id === "pocket-dimension") {
    return (
      <g>
        <ellipse cx={775} cy={80} rx={36} ry={20} fill="none" stroke={c} strokeDasharray="3 3" />
        <polygon points="775,62 786,80 775,98 764,80" fill={c} fillOpacity={0.28} stroke={c} />
      </g>
    );
  }
  if (id === "rome") {
    return (
      <g>
        <path d="M190,365 Q235,340 280,368" fill="none" stroke={c} strokeWidth={1.5} />
        <circle cx={235} cy={365} r={14} fill="none" stroke={c} strokeDasharray="2 3" />
        <rect x={227} y={358} width={16} height={12} fill={c} fillOpacity={0.25} stroke={c} />
      </g>
    );
  }
  if (id === "istanbul-1417") {
    return (
      <g>
        <path d="M385,255 Q430,235 475,260" fill="none" stroke={c} strokeWidth={1.6} />
        <path
          d="M416,262 L416,246 L430,236 L444,246 L444,262 Z"
          fill={c}
          fillOpacity={0.28}
          stroke={c}
        />
      </g>
    );
  }
  if (id === "romania-15th") {
    return (
      <g>
        <polyline
          points="250,210 268,176 284,205 300,174 316,210"
          fill="none"
          stroke={c}
          strokeWidth={1.4}
        />
        <rect x={274} y={200} width={12} height={12} fill={c} fillOpacity={0.3} stroke={c} />
      </g>
    );
  }
  if (id === "nilanjona") {
    return (
      <g>
        <polygon points="392,88 410,50 428,88" fill={c} fillOpacity={0.25} stroke={c} />
        <ellipse cx={410} cy={92} rx={36} ry={10} fill="none" stroke={c} strokeDasharray="3 3" />
      </g>
    );
  }
  if (id === "yasnaya") {
    return (
      <g>
        <circle cx={650} cy={155} r={24} fill="none" stroke={c} strokeDasharray="3 3" />
        <path
          d="M636,166 L636,142 L650,130 L664,142 L664,166 Z"
          fill={c}
          fillOpacity={0.28}
          stroke={c}
        />
      </g>
    );
  }
  if (id === "aethmos") {
    return (
      <g>
        <ellipse cx={150} cy={210} rx={52} ry={34} fill="none" stroke={c} strokeDasharray="3 4" />
        <circle cx={150} cy={210} r={12} fill={c} fillOpacity={0.22} stroke={c} />
      </g>
    );
  }
  return (
    <g>
      {[560, 585, 610, 635].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={345 - i * 4}
          width={14}
          height={28 + i * 4}
          fill={c}
          fillOpacity={0.22}
          stroke={c}
        />
      ))}
    </g>
  );
}

export function LoreWorldMap({ activeId, eras, onSelect }: Props) {
  return (
    <div className="glass relative mb-4 overflow-hidden rounded-2xl border border-border">
      <svg
        viewBox="0 0 900 480"
        className="mx-auto block h-auto max-h-[60dvh] w-full"
        role="img"
        aria-label="Map of SCU lore locations"
      >
        <defs>
          <pattern id="lwm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40,0 L0,0 0,40" fill="none" stroke="var(--border)" strokeWidth={0.6} />
          </pattern>
          <radialGradient id="lwm-sweep">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="900" height="480" fill="url(#lwm-grid)" />
        {/* contour lines */}
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M0,${220 + i * 22} C230,${180 + i * 28} 480,${290 + i * 15} 900,${230 + i * 25}`}
            fill="none"
            stroke="var(--muted-foreground)"
            strokeOpacity={0.12}
          />
        ))}
        {/* realm divide */}
        <path
          d="M525,0 C505,120 555,220 525,320 C505,400 535,450 525,480"
          fill="none"
          stroke="var(--destructive)"
          strokeOpacity={0.4}
          strokeDasharray="8 6"
        />
        <text x={538} y={24} fontSize={9} fill="var(--destructive)" opacity={0.7} letterSpacing={3}>
          DEMON &amp; RIFT FRONTIER ▸
        </text>
        <text
          x={512}
          y={24}
          fontSize={9}
          fill="var(--muted-foreground)"
          textAnchor="end"
          letterSpacing={3}
        >
          ◂ HISTORICAL &amp; HUMAN REALMS
        </text>
        {/* lore routes */}
        <path
          d="M430,255 Q330,300 235,365"
          stroke="var(--accent)"
          strokeOpacity={0.35}
          strokeDasharray="3 5"
          fill="none"
        />
        <path
          d="M430,255 Q350,210 280,195"
          stroke="var(--accent)"
          strokeOpacity={0.35}
          strokeDasharray="3 5"
          fill="none"
        />
        <path
          d="M650,155 Q710,120 775,80"
          stroke="var(--primary)"
          strokeOpacity={0.35}
          strokeDasharray="2 5"
          fill="none"
        />
        <path
          d="M430,255 Q520,300 600,365"
          stroke="var(--muted-foreground)"
          strokeOpacity={0.3}
          strokeDasharray="2 6"
          fill="none"
        />

        {REGIONS.map((r) => {
          const era = eras[r.id] ?? "";
          const color = TONE_COLOR[ERA_TONE[era] ?? "alive"] ?? "var(--accent)";
          const active = r.id === activeId;
          return (
            <g
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="cursor-pointer"
              role="button"
              aria-label={r.name}
            >
              <motion.path
                d={r.path}
                animate={{
                  fill: color,
                  stroke: color,
                  fillOpacity: active ? 0.16 : 0.07,
                  strokeOpacity: active ? 0.9 : 0.4,
                }}
                transition={{ duration: 0.6 }}
                strokeWidth={active ? 2 : 1}
              />
              <AnimatePresence mode="wait">
                <motion.g
                  key={era}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  style={{ transformOrigin: `${r.cx}px ${r.cy}px` }}
                >
                  <RegionDetail id={r.id} era={era} />
                </motion.g>
              </AnimatePresence>
              {active && (
                <motion.circle
                  cx={r.cx}
                  cy={r.cy}
                  r={18}
                  fill="url(#lwm-sweep)"
                  animate={{ r: [18, 95], opacity: [0.8, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                />
              )}
              <text
                x={r.cx}
                y={r.cy + 56 > 455 ? r.cy - 54 : r.cy + 62}
                textAnchor="middle"
                fontSize={12}
                fill={active ? "var(--accent)" : "var(--foreground)"}
                fontWeight={600}
                letterSpacing={1.5}
              >
                {r.name.toUpperCase()}
              </text>
              <text
                x={r.cx}
                y={(r.cy + 56 > 455 ? r.cy - 54 : r.cy + 62) + 12}
                textAnchor="middle"
                fontSize={7.5}
                fill="var(--muted-foreground)"
                letterSpacing={1.5}
              >
                {r.sector}
              </text>
            </g>
          );
        })}
        {/* compass */}
        <g transform="translate(855,435)" opacity={0.65}>
          <circle r={18} fill="none" stroke="var(--muted-foreground)" />
          <path d="M0,-16 L4,0 L0,16 L-4,0 Z" fill="var(--accent)" />
          <text y={-22} textAnchor="middle" fontSize={8} fill="var(--muted-foreground)">
            N
          </text>
        </g>
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        SCU Theater · Click a region
      </div>
    </div>
  );
}
