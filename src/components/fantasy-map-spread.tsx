import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Compass, Flame, Globe2, Heart, MapPin, Radio, Sparkles } from "lucide-react";
import { BotanicalCanopyOverlay, JadeScrollCartouche } from "@/components/botanical-foliage-canopy";
import { LoreWorldMap } from "@/components/lore-world-map";
import { TacticalMap } from "@/components/tactical-map";
import { AtlasOverlay } from "@/components/nexus-atlas";
import { useAnimationsEnabled } from "@/lib/animations";
import { useUIFeedback } from "@/hooks/use-ui-feedback";
import {
  readCurrentLoreLocation,
  resolveLocationAtmosphere,
  setCurrentLoreLocation,
  useAmbientAtmosphere,
} from "@/lib/ambient-atmosphere";

interface RealmEraSpec {
  id: string;
  era: string;
  state: string;
  description: string;
  visual: string;
  status: string;
  tone: "alive" | "hidden" | "ruin";
}

interface RealmSpec {
  id: string;
  name: string;
  epithet: string;
  telemetryBadge: string;
  vitalityRank: string;
  dangerRank: string;
  aetherRank: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  mountainA: string;
  mountainB: string;
  accentGlow: string;
  eras: RealmEraSpec[];
}

const REALMS: readonly RealmSpec[] = [
  {
    id: "yasnaya",
    name: "Yasnaya",
    epithet: "The Sky Guardian Sanctuary",
    telemetryBadge: "EASTERN SANCTUM · 200 AETHER",
    vitalityRank: "IX",
    dangerRank: "IV",
    aetherRank: "SSS",
    skyTop: "#132c28",
    skyMid: "#2c685e",
    skyBottom: "#8dd5be",
    mountainA: "#16352e",
    mountainB: "#254e45",
    accentGlow: "#5ce1b8",
    eras: [
      {
        id: "golden",
        era: "Golden Era / Bloodlines",
        state: "Divine Sanctuary",
        tone: "alive",
        description:
          "The height of the Sky Guardians. A pristine palace of white stone veiled above emerald terraced canopies — the consecrated sanctum where Ethan ascended.",
        visual: "Floating white-stone terraces, waterfall cascades, and sunlit emerald gardens.",
        status: "Sanctified · Fully inhabited",
      },
      {
        id: "ancient",
        era: "Ancient Epoch",
        state: "Primal Jungle",
        tone: "hidden",
        description:
          "Before any palace rose, Yasnaya was untamed wilderness — a sacred canopy where the first worshippers carved shrines beneath towering vines.",
        visual: "Dense mossy monoliths, shafts of amber light through canopy mist.",
        status: "Untouched · Sacred wilds",
      },
      {
        id: "redline-s2",
        era: "Redline Season 2",
        state: "The Barren Scar",
        tone: "ruin",
        description:
          "After Ethan's fall, the Redline and Obsidian clash shattered the white masonry and scorched the ancient terraces into silent ash.",
        visual: "Petrified timber, ember drifts, and fractured sky-palace colonnades.",
        status: "Devastated · Battle site",
      },
    ],
  },
  {
    id: "aethmos",
    name: "Aethmos",
    epithet: "The Hidden Nature Sanctuary",
    telemetryBadge: "VEILED DOMAIN · ZERO TELEMETRY",
    vitalityRank: "VIII",
    dangerRank: "III",
    aetherRank: "S+",
    skyTop: "#0f221b",
    skyMid: "#1e4b3d",
    skyBottom: "#7ac7a6",
    mountainA: "#102820",
    mountainB: "#1e4336",
    accentGlow: "#6ee7b7",
    eras: [
      {
        id: "enclave",
        era: "The Hidden Enclave",
        state: "Veiled Sanctuary",
        tone: "hidden",
        description:
          "Concealed behind a shimmering Nytherie ward, Aethmos emits zero network telemetry — leaving orbital arrays completely blind to its verdant canopy.",
        visual: "Untouched bioluminescent jungles and dwellings woven into living boughs.",
        status: "Cloaked · Zero telemetry",
      },
      {
        id: "exile",
        era: "The Exile Period",
        state: "Safehouse of the Fallen",
        tone: "alive",
        description:
          "The secret refuge where Valeria sheltered Xinea after staging her disappearance, veiled beneath wind-swept ferns and ancient guardian roots.",
        visual: "Deep-jungle safehouse; outer mist perimeter patrolled, inner sanctum sealed.",
        status: "Classified · Occupied in secret",
      },
    ],
  },
  {
    id: "nilanjona",
    name: "Nilanjona's Realm",
    epithet: "The Water Kingdom",
    telemetryBadge: "GLACIAL NORTH · 180 EXP",
    vitalityRank: "VII",
    dangerRank: "V",
    aetherRank: "SS",
    skyTop: "#0d1f2d",
    skyMid: "#1d4e6b",
    skyBottom: "#7dd3fc",
    mountainA: "#122b3d",
    mountainB: "#255a7a",
    accentGlow: "#7dd3fc",
    eras: [
      {
        id: "nila-present",
        era: "Present",
        state: "Ice Mountains & Warm Valleys",
        tone: "hidden",
        description:
          "Three-fifths towering crystal peaks and frost palaces; two-fifths fertile spring valleys suspended quietly above the Sunken Temple.",
        visual: "Translucent glacier spires, cascading waterfalls, and submerged arcane domes.",
        status: "Present · Guardian domain",
      },
      {
        id: "pre-asetra",
        era: "Before Asetra",
        state: "Coastal Temples & Valleys",
        tone: "alive",
        description:
          "Before the Asetra seismic upheaval lifted the glacial ridges, ancient white-marble aqueducts and tide-temples stood open to warm sea winds.",
        visual: "Hilltop stone palace, warm valley villages, and coastal plains.",
        status: "Historical · Pre-earthquake",
      },
    ],
  },
  {
    id: "istanbul-1417",
    name: "Istanbul",
    epithet: "Ottoman 1417 Crossroads",
    telemetryBadge: "BOSPHORUS HUB · 120 EXP",
    vitalityRank: "VIII",
    dangerRank: "VI",
    aetherRank: "A+",
    skyTop: "#1f1814",
    skyMid: "#5b3b24",
    skyBottom: "#eab364",
    mountainA: "#241914",
    mountainB: "#432c1d",
    accentGlow: "#f59e0b",
    eras: [
      {
        id: "1417",
        era: "1417 (Ottoman)",
        state: "Architect Cube Hunt",
        tone: "hidden",
        description:
          "Francisco and Ramiz combed the spice bazaars for fragments of the Architect Cube while Dirham's Forgotten Ones watched from beyond the Land Walls.",
        visual: "Ottoman minarets, Golden Horn war galleys, and lantern-lit sea walls.",
        status: "1417 · Underground relic hunt",
      },
      {
        id: "istanbul-present",
        era: "Present",
        state: "Transcontinental Crossroads",
        tone: "alive",
        description:
          "Ottoman domes stand beside suspension bridges and modern glass towers while Hidden Ones cistern relays monitor international sea lanes.",
        visual: "Twilight Bosphorus waters reflecting minarets and modern skyline lights.",
        status: "Present · Active Sentinel hub",
      },
    ],
  },
  {
    id: "rome",
    name: "Rome",
    epithet: "Nullborn Catacombs & Eternal City",
    telemetryBadge: "TIBER VAULTS · 150 EXP",
    vitalityRank: "VI",
    dangerRank: "VII",
    aetherRank: "A",
    skyTop: "#1c1317",
    skyMid: "#4d2730",
    skyBottom: "#d97757",
    mountainA: "#221619",
    mountainB: "#40252b",
    accentGlow: "#fb923c",
    eras: [
      {
        id: "rome-15th",
        era: "15th Century",
        state: "Papal Rome & Catacombs",
        tone: "ruin",
        description:
          "Beneath Castel Sant'Angelo and ruined amphitheaters, Khalid and Ayesha entered Nullborn's subterranean cell prior to Cesare Borgia's midnight raid.",
        visual: "Amber torch-lit catacombs, Tiber bridges, and twilight Colosseum arches.",
        status: "15th Century · Sealed Nullborn cell",
      },
      {
        id: "rome-present",
        era: "Present",
        state: "Eternal City & Vaults",
        tone: "alive",
        description:
          "Warm sunlit travertine piazzas rise peacefully above centuries-old underground passages quietly cataloged by present-day archivists.",
        visual: "Golden-hour stone arches and historic bastions over sealed tunnels.",
        status: "Present · Monitored historic sector",
      },
    ],
  },
  {
    id: "romania-15th",
    name: "Romania",
    epithet: "15th-Century Carpathian Frontier",
    telemetryBadge: "CARPATHIAN KEEPS · 160 EXP",
    vitalityRank: "V",
    dangerRank: "VIII",
    aetherRank: "S",
    skyTop: "#16111c",
    skyMid: "#3c233a",
    skyBottom: "#c0566b",
    mountainA: "#191321",
    mountainB: "#331f33",
    accentGlow: "#fb7185",
    eras: [
      {
        id: "romania-15th",
        era: "15th Century",
        state: "Wallachian & Transylvanian Keeps",
        tone: "hidden",
        description:
          "Jagged Carpathian ridges, cliffside stone fortresses, and mist-drenched valley monasteries guarding ancient bloodline sanctuaries.",
        visual: "Crimson-amber twilight over pine peaks and fortified cliff bastions.",
        status: "15th Century · Frontier stronghold",
      },
    ],
  },
  {
    id: "ruincity",
    name: "RuinCity",
    epithet: "The Fallen Border Nexus",
    telemetryBadge: "BORDER HAZARD · 250 EXP",
    vitalityRank: "III",
    dangerRank: "IX",
    aetherRank: "S+",
    skyTop: "#1a1412",
    skyMid: "#472721",
    skyBottom: "#b45348",
    mountainA: "#1d1715",
    mountainB: "#352623",
    accentGlow: "#f87171",
    eras: [
      {
        id: "post",
        era: "Post-Diablo War 2nd",
        state: "The Skeletal Grid",
        tone: "ruin",
        description:
          "The second Diablo War tore the border metropolis apart, leaving ivy-entwined cathedral arches, flooded plazas, and silent harbor cranes.",
        visual: "Shattered gothic spires reclaimed by emerald creeping vines and mist.",
        status: "Abandoned · Hazard zone",
      },
      {
        id: "pre",
        era: "Pre-Diablo War 2nd",
        state: "Metropolitan Nexus",
        tone: "alive",
        description:
          "A vibrant bridge city uniting Demon and Human commerce beneath grand harbor towers and illuminated cathedrals before the breach.",
        visual: "Cathedral spires, bustling coastal markets, and lantern docks.",
        status: "Operational · Historical record",
      },
    ],
  },
  {
    id: "pocket-dimension",
    name: "Pocket Dimension",
    epithet: "Timeless Obsidian Fracture",
    telemetryBadge: "OUTSIDE TIME · 300 AETHER",
    vitalityRank: "∞",
    dangerRank: "X",
    aetherRank: "EX",
    skyTop: "#0e0c1d",
    skyMid: "#291d4f",
    skyBottom: "#7c5ce1",
    mountainA: "#131026",
    mountainB: "#251c48",
    accentGlow: "#a78bfa",
    eras: [
      {
        id: "timeless",
        era: "Timeless",
        state: "Slow-Time Obsidian Fracture",
        tone: "hidden",
        description:
          "A dilated continuum beyond linear centuries where Aeric Valenheart forged Kara Yazgi in 1354 AD and Marcello Corvani clashed across eras.",
        visual: "Suspended obsidian shards veined with azure rifts beneath a vortex sky.",
        status: "Timeless · Dilated continuum",
      },
    ],
  },
];

type RailMode = "vista" | "theater" | "deployments";

function RealmLandscapeArt({ realm }: { realm: RealmSpec }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className="h-full w-full object-cover"
      role="img"
      aria-label={`${realm.name} landscape vista`}
    >
      <defs>
        <linearGradient id={`sky-${realm.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={realm.skyTop} />
          <stop offset="52%" stopColor={realm.skyMid} />
          <stop offset="100%" stopColor={realm.skyBottom} />
        </linearGradient>
        <radialGradient id={`sun-${realm.id}`} cx="52%" cy="38%" r="42%">
          <stop offset="0%" stopColor="#fff7e6" stopOpacity="0.88" />
          <stop offset="38%" stopColor={realm.accentGlow} stopOpacity="0.4" />
          <stop offset="100%" stopColor={realm.accentGlow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="400" height="400" fill={`url(#sky-${realm.id})`} />
      <circle cx="208" cy="148" r="145" fill={`url(#sun-${realm.id})`} />

      {/* Distant sunlit clouds */}
      <path
        d="M40 120 Q120 96 190 116 Q255 92 350 118"
        fill="none"
        stroke="#f5ebe6"
        strokeOpacity="0.24"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Far mountain ridge */}
      <path
        d="M0 250 L68 176 L132 222 L205 142 L278 214 L344 166 L400 226 L400 400 L0 400 Z"
        fill={realm.mountainB}
      />

      {/* Midground cliffs & emerald canyon */}
      <path
        d="M0 285 L95 215 L175 268 L248 198 L335 256 L400 228 L400 400 L0 400 Z"
        fill={realm.mountainA}
      />

      {/* Winding luminous river / rift down the valley center */}
      <path
        d="M210 252 C196 278, 224 295, 200 326 C182 348, 214 372, 194 400 L236 400 C252 372, 222 350, 232 325 C244 294, 218 276, 224 252 Z"
        fill={realm.accentGlow}
        fillOpacity="0.45"
      />

      {/* Realm Sanctuary Landmark */}
      <g transform="translate(200, 174)" opacity="0.85">
        <path
          d="M-24 22 L-24 0 L0 -18 L24 0 L24 22 Z"
          fill="#f5ebe6"
          fillOpacity="0.22"
          stroke="#c5a869"
          strokeWidth="1.2"
        />
        <line x1="0" y1="-26" x2="0" y2="-18" stroke="#f5ebe6" strokeWidth="1.4" />
      </g>

      {/* Foreground mist wash */}
      <rect x="0" y="295" width="400" height="105" fill={realm.skyTop} fillOpacity="0.32" />
    </svg>
  );
}

/**
 * Botanical Diamond Map & Realm Explorer spread modeled directly after the
 * Diamond Viewport + Stacked Elemental Sockets + Double-Hairline Lore Panel + Discover CTA.
 */
export function FantasyMapSpread() {
  const animOn = useAnimationsEnabled();
  const { triggerFeedback } = useUIFeedback();
  const [ambientAtmosphere, setAmbientAtmosphere] = useAmbientAtmosphere();

  const [railMode, setRailMode] = useState<RailMode>("vista");
  const [realmId, setRealmId] = useState<string>(() => {
    const saved = readCurrentLoreLocation().locationId;
    return REALMS.some((r) => r.id === saved) ? saved : REALMS[0]!.id;
  });
  const [eraByRealm, setEraByRealm] = useState<Record<string, number>>(() => {
    const saved = readCurrentLoreLocation();
    const found = REALMS.find((r) => r.id === saved.locationId);
    if (!found) return {};
    const idx = found.eras.findIndex((e) => e.id === saved.eraId);
    return idx >= 0 ? { [found.id]: idx } : {};
  });
  const [atlasOpenFor, setAtlasOpenFor] = useState<string | null>(null);

  const realm = REALMS.find((r) => r.id === realmId) ?? REALMS[0]!;
  const eraIdx = Math.min(eraByRealm[realm.id] ?? 0, realm.eras.length - 1);
  const activeEra = realm.eras[eraIdx]!;
  const locAtmosphere = resolveLocationAtmosphere(realm.id, activeEra.id);

  useEffect(() => {
    setCurrentLoreLocation(realm.id, activeEra.id);
  }, [realm.id, activeEra.id]);

  const activeErasMap = Object.fromEntries(
    REALMS.map((r) => [r.id, r.eras[Math.min(eraByRealm[r.id] ?? 0, r.eras.length - 1)]!.id]),
  );

  return (
    <div data-fantasy-map-spread="true" className="space-y-6">
      {/* Top Filigree Horizontal Navigation Rail (Inspo Image 3) */}
      <nav
        aria-label="Realm Explorer Navigation"
        className="relative flex flex-col items-center justify-center gap-2 py-2"
      >
        <div className="relative flex w-full max-w-3xl items-center justify-center">
          {/* Left tapering filigree rule */}
          <span
            aria-hidden="true"
            className="hidden h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[#c5a869] to-[#5ce1b8] sm:block"
          />
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-full border border-[#c5a869]/70 bg-[#15221b]/95 px-3 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_16px_rgba(92,225,184,0.18)]">
            <Link
              to="/characters"
              className="rounded-full px-3 py-1.5 font-display text-xs uppercase tracking-wider text-[#e6dcc5]/80 transition hover:text-[#5ce1b8]"
            >
              Character
            </Link>

            <button
              type="button"
              onClick={() => {
                setRailMode("vista");
                triggerFeedback("switch");
              }}
              aria-pressed={railMode === "vista"}
              className={`relative rounded-full px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
                railMode === "vista" ? "text-[#f5ebe6]" : "text-[#e6dcc5]/80 hover:text-[#5ce1b8]"
              }`}
            >
              {railMode === "vista" && (
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -inset-1.5 rounded-full border border-[#5ce1b8]/80 shadow-[0_0_16px_rgba(92,225,184,0.55),inset_0_0_12px_rgba(92,225,184,0.3)] ${
                    animOn ? "astrolabe-ring-cw" : ""
                  }`}
                />
              )}
              <span className="relative">Map</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRailMode("theater");
                triggerFeedback("switch");
              }}
              aria-pressed={railMode === "theater"}
              className={`relative rounded-full px-3.5 py-1.5 font-display text-xs uppercase tracking-wider transition ${
                railMode === "theater"
                  ? "bg-[#2e5a52] text-[#f5ebe6] shadow-[0_0_12px_rgba(92,225,184,0.4)]"
                  : "text-[#e6dcc5]/80 hover:text-[#5ce1b8]"
              }`}
            >
              Theater
            </button>

            <button
              type="button"
              onClick={() => {
                setRailMode("deployments");
                triggerFeedback("switch");
              }}
              aria-pressed={railMode === "deployments"}
              className={`relative rounded-full px-3.5 py-1.5 font-display text-xs uppercase tracking-wider transition ${
                railMode === "deployments"
                  ? "bg-[#2e5a52] text-[#f5ebe6] shadow-[0_0_12px_rgba(92,225,184,0.4)]"
                  : "text-[#e6dcc5]/80 hover:text-[#5ce1b8]"
              }`}
            >
              Deployments
            </button>

            <Link
              to="/abilities"
              className="rounded-full px-3 py-1.5 font-display text-xs uppercase tracking-wider text-[#e6dcc5]/80 transition hover:text-[#5ce1b8]"
            >
              Skills
            </Link>
          </div>
          {/* Right tapering filigree rule */}
          <span
            aria-hidden="true"
            className="hidden h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-[#c5a869] to-[#5ce1b8] sm:block"
          />
        </div>
      </nav>

      {/* Main Diamond Realm Explorer Spread (Exact Inspo 3 Layout + Living Botanical Ivy) */}
      <section className="relative overflow-hidden rounded-xl border-2 border-[#c5a869]/80 bg-[radial-gradient(circle_at_28%_45%,#1a332a_0%,#111c18_52%,#0c1311_100%)] p-4 text-[#f5ebe6] shadow-[0_24px_60px_rgba(0,0,0,0.65)] sm:p-7">
        <BotanicalCanopyOverlay variant="map" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,430px)_1fr]">
          {/* LEFT COLUMN: Stacked Elemental Sockets + Sharp Filigree Diamond Viewport + Bottom Wing Filigree */}
          <div className="relative flex flex-col items-center">
            <div className="relative flex w-full items-center justify-center">
              {/* Top-Left Stacked Glowing Elemental Sockets (Heart + Flame + Sparkles) */}
              <div
                aria-label="Realm elemental ratings"
                className="absolute left-0 top-3 z-20 flex flex-col gap-2.5 sm:left-2"
              >
                <div
                  title={`Vitality Rank: ${realm.vitalityRank}`}
                  className="grid h-11 w-11 place-items-center rounded-md border border-[#c5a869] bg-[#15221b]/95 shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                >
                  <Heart className="h-4 w-4 text-[#fb7185] drop-shadow-[0_0_6px_rgba(251,113,133,0.75)]" />
                  <span className="font-mono text-[8px] font-bold text-[#e6dcc5]">
                    {realm.vitalityRank}
                  </span>
                </div>
                <div
                  title={`Conflict Threat: ${realm.dangerRank}`}
                  className="grid h-11 w-11 place-items-center rounded-md border border-[#c5a869] bg-[#15221b]/95 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
                >
                  <Flame className="h-4 w-4 text-[#fbbf24] drop-shadow-[0_0_6px_rgba(251,191,36,0.75)]" />
                  <span className="font-mono text-[8px] font-bold text-[#e6dcc5]">
                    {realm.dangerRank}
                  </span>
                </div>
                <div
                  title={`Aether Resonance: ${realm.aetherRank}`}
                  className="grid h-11 w-11 place-items-center rounded-md border border-[#5ce1b8]/75 bg-[#15221b]/95 shadow-[0_0_16px_rgba(92,225,184,0.35)]"
                >
                  <Sparkles className="h-4 w-4 text-[#5ce1b8]" />
                  <span className="font-mono text-[8px] font-bold text-[#5ce1b8]">
                    {realm.aetherRank}
                  </span>
                </div>
              </div>

              {/* Large Sharp Filigree Diamond Viewport */}
              <div className="relative h-[300px] w-[300px] sm:h-[360px] sm:w-[360px]">
                <AnimatePresence mode="sync" initial={false}>
                  <motion.div
                    key={`${realm.id}-${activeEra.id}`}
                    initial={animOn ? { opacity: 0, scale: 0.96 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    {...(animOn ? { exit: { opacity: 0, scale: 0.96 } } : {})}
                    transition={{ duration: 0.28 }}
                    className="fantasy-diamond-viewport relative h-full w-full overflow-hidden bg-[#101c18] shadow-[0_0_32px_rgba(92,225,184,0.28)]"
                  >
                    <RealmLandscapeArt realm={realm} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
                      <span className="rounded-full border border-[#c5a869]/80 bg-[#111915]/85 px-3 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#5ce1b8]">
                        {activeEra.era}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Crisp Multi-Layer Filigree Diamond Overlay */}
                <svg
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  <polygon
                    points="50,2 98,50 50,98 2,50"
                    fill="none"
                    stroke="#e6dcc5"
                    strokeOpacity="0.88"
                    strokeWidth="0.9"
                  />
                  <polygon
                    points="50,5.5 94.5,50 50,94.5 5.5,50"
                    fill="none"
                    stroke="#5ce1b8"
                    strokeOpacity="0.7"
                    strokeWidth="0.6"
                  />
                  <circle cx="50" cy="2" r="1.4" fill="#c5a869" />
                  <circle cx="98" cy="50" r="1.4" fill="#c5a869" />
                  <circle cx="50" cy="98" r="1.4" fill="#c5a869" />
                  <circle cx="2" cy="50" r="1.4" fill="#c5a869" />
                </svg>
              </div>
            </div>

            {/* Bottom Twin Filigree Ornaments + Realm Switcher */}
            <div className="mt-3 flex w-full items-center justify-center gap-4">
              <svg
                viewBox="0 0 64 24"
                aria-hidden="true"
                className="h-5 w-14 text-[#e6dcc5]/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <path d="M4 12 L24 4 L58 12 L24 20 Z" />
                <circle cx="32" cy="12" r="2.2" fill="#5ce1b8" stroke="none" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#c5a869]">
                SELECT REALM
              </span>
              <svg
                viewBox="0 0 64 24"
                aria-hidden="true"
                className="h-5 w-14 -scale-x-100 text-[#e6dcc5]/80"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <path d="M4 12 L24 4 L58 12 L24 20 Z" />
                <circle cx="32" cy="12" r="2.2" fill="#5ce1b8" stroke="none" />
              </svg>
            </div>

            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {REALMS.map((r) => {
                const selected = r.id === realm.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRealmId(r.id);
                      triggerFeedback("click");
                    }}
                    className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      selected
                        ? "border-[#5ce1b8] bg-[#2e5a52] text-[#f5ebe6] shadow-[0_0_12px_rgba(92,225,184,0.4)]"
                        : "border-[#c5a869]/45 bg-[#15221b]/85 text-[#e6dcc5]/85 hover:border-[#5ce1b8]"
                    }`}
                  >
                    <MapPin className="h-3 w-3 text-[#5ce1b8]" />
                    <span>{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Double-Hairline Grimoire Description Frame + Telemetry + Luminous DISCOVER CTA */}
          <div className="relative flex flex-col items-center">
            <div className="relative w-full border border-[#e6dcc5]/55 bg-[#121c18]/94 p-5 shadow-[0_14px_34px_rgba(0,0,0,0.45)] sm:p-7">
              {/* Double-hairline offset inner border + corner filigree curls */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[6px] border border-[#c5a869]/55"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1.5 -top-1.5 h-4 w-4 border-l-2 border-t-2 border-[#5ce1b8]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1.5 -bottom-1.5 h-4 w-4 border-b-2 border-r-2 border-[#5ce1b8]"
              />

              <div className="relative text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-[#c5a869]">
                  {realm.epithet}
                </p>
                <h2 className="mt-1 font-display text-3xl font-bold tracking-wide text-[#f5ebe6] sm:text-4xl">
                  {realm.name}
                </h2>
                <div className="mx-auto mt-2 flex max-w-xs items-center gap-2 text-[#c5a869]">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c5a869]" />
                  <span className="text-xs text-[#5ce1b8]">✧</span>
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c5a869]" />
                </div>
              </div>

              {/* Era Selection Tabs */}
              <div
                role="tablist"
                aria-label={`${realm.name} eras`}
                className="relative mt-4 flex flex-wrap justify-center gap-1.5"
              >
                {realm.eras.map((er, idx) => (
                  <button
                    key={er.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === eraIdx}
                    onClick={() => {
                      setEraByRealm((prev) => ({ ...prev, [realm.id]: idx }));
                      triggerFeedback("switch");
                    }}
                    className={`rounded border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      idx === eraIdx
                        ? "border-[#5ce1b8] bg-[#2e5a52] text-[#f5ebe6]"
                        : "border-[#c5a869]/45 bg-[#15221b] text-[#e6dcc5]/80 hover:border-[#5ce1b8]"
                    }`}
                  >
                    {er.era}
                  </button>
                ))}
              </div>

              {/* Lore Chronicle Copy */}
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${realm.id}-${activeEra.id}-desc`}
                  initial={animOn ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  {...(animOn ? { exit: { opacity: 0, y: -6 } } : {})}
                  transition={{ duration: 0.2 }}
                  className="relative mt-4 space-y-3 text-sm leading-relaxed text-[#e6dcc5]"
                >
                  <p className="parchment-dot-grid rounded border border-[#c5a869]/75 p-3 text-[#15221b]">
                    <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-[#2e5a52]">
                      {activeEra.state}
                    </span>
                    {activeEra.description}
                  </p>
                  <p className="text-xs text-[#e6dcc5]/85">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#c5a869]">
                      VISTA:{" "}
                    </span>
                    {activeEra.visual}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Entry Telemetry Line (exact Price of entry 200 EXP styling) */}
              <div className="relative mt-5 flex flex-wrap items-center justify-center gap-3 text-center">
                <p className="font-display text-sm uppercase tracking-[0.18em] text-[#e6dcc5]">
                  {realm.telemetryBadge.split("·")[0]}{" "}
                  <span className="font-bold text-[#5ce1b8] tabular-nums">
                    {realm.telemetryBadge.split("·")[1] ?? activeEra.status}
                  </span>
                </p>
                <button
                  type="button"
                  aria-pressed={ambientAtmosphere}
                  onClick={() => {
                    setAmbientAtmosphere(!ambientAtmosphere);
                    triggerFeedback("switch");
                  }}
                  className="rounded border border-[#c5a869]/55 bg-[#15221b] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#e6dcc5] hover:border-[#5ce1b8]"
                >
                  {locAtmosphere.weatherLabel}: {ambientAtmosphere ? "ON" : "OFF"}
                </button>
              </div>
            </div>

            {/* Luminous DISCOVER CTA Framed by Ornate Filigree Endcaps */}
            <div className="relative mt-5 flex items-center justify-center gap-2">
              <span aria-hidden="true" className="hidden h-[1.5px] w-10 bg-[#c5a869]/80 sm:block" />
              <button
                type="button"
                data-fantasy-discover-btn="true"
                onClick={(e) => {
                  triggerFeedback("cta", { target: e });
                  setAtlasOpenFor(realm.id);
                }}
                className="fantasy-discover-btn inline-flex min-h-[44px] items-center gap-2.5 rounded-md px-10 py-2.5 font-display text-base font-bold uppercase tracking-[0.26em] text-[#f5ebe6]"
              >
                <Globe2 className="h-4 w-4 text-[#5ce1b8]" />
                <span>DISCOVER</span>
              </button>
              <span aria-hidden="true" className="hidden h-[1.5px] w-10 bg-[#c5a869]/80 sm:block" />
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Survey & Tactical Deployment Sections */}
      {(railMode === "theater" || railMode === "vista") && (
        <div className="space-y-4">
          <JadeScrollCartouche
            kicker="BOTANICAL CARTOGRAPHY"
            title="SCU Continental & Realm Survey"
            badge={`${REALMS.length} REALMS`}
            rightSlot={<Compass className="h-4 w-4 text-[#2e5a52]" />}
          />
          <LoreWorldMap
            activeId={realm.id}
            eras={activeErasMap}
            onSelect={(id) => {
              setRealmId(id);
              triggerFeedback("click");
            }}
          />
        </div>
      )}

      {(railMode === "deployments" || railMode === "vista") && (
        <div className="space-y-4">
          <JadeScrollCartouche
            kicker="SENTINEL FIELD SURVEY"
            title="Tactical Deployment Pins & Faction Reports"
            badge="ACTIVE BOARD"
            rightSlot={<Radio className="h-4 w-4 text-[#2e5a52]" />}
          />
          <TacticalMap />
        </div>
      )}

      <AnimatePresence>
        {atlasOpenFor && (
          <AtlasOverlay start={atlasOpenFor} onClose={() => setAtlasOpenFor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
