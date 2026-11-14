import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe2, MapPin } from "lucide-react";
import { LoreWorldMap } from "@/components/lore-world-map";
import { AtlasOverlay } from "@/components/nexus-atlas";
import { useUiStyle } from "@/lib/ui-style";
import { useIsManga } from "@/hooks/use-ui-mode";

type Era = {
  id: string;
  era: string;
  state: string;
  description: string;
  visual: string;
  status: string;
  tone: "alive" | "hidden" | "ruin";
};
type Location = { id: string; name: string; epithet: string; eras: Era[] };

const LOCATIONS: Location[] = [
  {
    id: "istanbul-1417",
    name: "Istanbul",
    epithet: "Ottoman 1417 crossroads to modern Bosphorus",
    eras: [
      {
        id: "1417",
        era: "1417 (Ottoman)",
        state: "Architect Cube Hunt & Forgotten Ones",
        tone: "hidden",
        description:
          "Francisco (Nasab ibn Khalil) and Ramiz searched the Bazaar Quarter for fragments of the Architect Cube, while outside the Land Walls Dirham and Abbas led the Forgotten Ones outcast camp that inspired Zaan's Hidden Ones.",
        visual:
          "Ottoman minarets, Golden Horn war galleys, fortified sea walls, and lantern-lit spice bazaars.",
        status: "1417 · Ottoman capital & underground hunt",
      },
      {
        id: "istanbul-present",
        era: "Present",
        state: "Transcontinental Crossroads",
        tone: "alive",
        description:
          "Historic Ottoman domes and Byzantine seawalls stand below Levent's modern skyline and Bosphorus bridges, while Hidden Ones cistern relays and Sentinel informants watch modern shipping lanes.",
        visual:
          "Suspension bridge spanning golden twilight waters between historic minarets and modern glass towers.",
        status: "Present · Active Sentinel & Hidden Ones hub",
      },
    ],
  },
  {
    id: "rome",
    name: "Rome",
    epithet: "15th-century Nullborn catacombs to Eternal City",
    eras: [
      {
        id: "rome-15th",
        era: "15th Century",
        state: "Papal Rome & Nullborn Catacombs",
        tone: "ruin",
        description:
          "Following Ramij's death after the flight from Istanbul, Khalid and Ayesha entered Nullborn's underground compound beneath Rome alongside Issabela, Marco, Mehnaz, and Abdul—before Cesare Borgia's raid shattered the cell.",
        visual:
          "Dusk-lit Tiber bridges, Castel Sant'Angelo bastion, Colosseum ruins, and amber lantern tunnels beneath the city.",
        status: "15th Century · Secret Nullborn cell",
      },
      {
        id: "rome-present",
        era: "Present",
        state: "Eternal City & Sealed Vaults",
        tone: "alive",
        description:
          "Sunlit boulevards, tram piazzas, St. Peter's dome, and the illuminated Colosseum rise above ancient Borgia-era catacomb chambers quietly monitored by present-day archivists.",
        visual:
          "Warm sunlit streets and bridges linking Vatican hill and historic ruins over sealed underground corridors.",
        status: "Present · Monitored historic sector",
      },
    ],
  },
  {
    id: "romania-15th",
    name: "Romania",
    epithet: "15th-century Carpathian frontier",
    eras: [
      {
        id: "romania-15th",
        era: "15th Century",
        state: "Wallachian & Transylvanian Keeps",
        tone: "hidden",
        description:
          "Guarded by jagged Carpathian passes, cliffside stone citadels, fortified river towns, and forest monasteries bridging medieval Europe to the 15th-century Ottoman frontier and ancient bloodline sanctuaries.",
        visual:
          "Crimson-amber twilight over mist-cloaked Carpathian ridges, cliff fortress beacons, and walled valley spires.",
        status: "15th Century · Frontier stronghold",
      },
    ],
  },
  {
    id: "pocket-dimension",
    name: "Pocket Dimension",
    epithet: "Timeless fracture outside space & time",
    eras: [
      {
        id: "timeless",
        era: "Timeless",
        state: "Slow-Time Obsidian Fracture",
        tone: "hidden",
        description:
          "A natural slow-time fracture where Aeric Valenheart fell in 1354 AD and forged Kara Yazgi, Marcello Corvani fought Alt David in 2005, and Zaan confronted Khalid before Corvani and Aeric escaped in 2025.",
        visual:
          "Suspended obsidian shards cracked with crimson and azure rifts beneath a swirling cosmic time vortex.",
        status: "Timeless · Dilated continuum",
      },
    ],
  },
  {
    id: "yasnaya",
    name: "Yasnaya",
    epithet: "The Sky Guardian Sanctuary",
    eras: [
      {
        id: "ancient",
        era: "Ancient Epoch",
        state: "Primal Jungle",
        tone: "hidden",
        description:
          "Before any palace rose, Yasnaya was untamed wilderness — a sacred jungle where the first worshippers raised crude shrines to the sky.",
        visual:
          "Dense, layered canopies; moss-choked primitive shrines; shafts of light through mist.",
        status: "Untouched · Sacred wilds",
      },
      {
        id: "golden",
        era: "Golden Era / Bloodlines",
        state: "Divine Sanctuary",
        tone: "alive",
        description:
          "The height of the Sky Guardians. A pristine palace of white stone above vibrant emerald greenery — the place where Ethan ascended.",
        visual: "Pristine white-stone palace, floating terraces, vibrant emerald gardens.",
        status: "Sanctified · Fully inhabited",
      },
      {
        id: "redline-s2",
        era: "Redline Season 2",
        state: "The Barren Scar",
        tone: "ruin",
        description:
          "After Ethan's death, the Redline vs. Obsidian clash tore through the sanctuary and left it a wound in the land.",
        visual: "Petrified dead trees, scorched earth, shattered masonry of the grand palace.",
        status: "Devastated · Battle site",
      },
    ],
  },
  {
    id: "aethmos",
    name: "Aethmos",
    epithet: "The Hidden Nature Sanctuary",
    eras: [
      {
        id: "enclave",
        era: "The Hidden Enclave",
        state: "Veiled Sanctuary",
        tone: "hidden",
        description:
          "Concealed behind a Nytherie barrier, Aethmos emits no network telemetry and cannot be tracked by satellite — which is why Isaac could find no trace of it.",
        visual: "Untouched natural jungles, organic dwellings grown into the trees.",
        status: "Cloaked · Zero telemetry",
      },
      {
        id: "exile",
        era: "The Exile Period",
        state: "Safehouse of the Fallen",
        tone: "alive",
        description:
          "The classified refuge where Valeria secretly moved Xinea after staging her death, while Xinea wrestled with grief and the return of her powers.",
        visual: "Deep-jungle safehouse; outer perimeter patrolled, inner sanctum sealed.",
        status: "Classified · Occupied in secret",
      },
    ],
  },
  {
    id: "ruincity",
    name: "RuinCity",
    epithet: "The Fallen Border Nexus",
    eras: [
      {
        id: "pre",
        era: "Pre-Diablo War 2nd",
        state: "Metropolitan Nexus",
        tone: "alive",
        description:
          "A thriving, progressive city bridging the Demon and Human realms before the great breach.",
        visual: "Cathedral spires, grand markets, active coastal harbor.",
        status: "Operational · High population",
      },
      {
        id: "post",
        era: "Post-Diablo War 2nd",
        state: "The Skeletal Grid",
        tone: "ruin",
        description:
          "The second Diablo War gutted the city, leaving overgrown ruins, stagnant plazas, and wildlife.",
        visual: "Broken cathedral arches, flooded amphitheater, wrecked harbor.",
        status: "Abandoned · Hazard zone",
      },
    ],
  },
  {
    id: "nilanjona",
    name: "Nilanjona's Realm",
    epithet: "The Water Kingdom",
    eras: [
      {
        id: "pre-asetra",
        era: "Before Asetra",
        state: "Coastal Temples & Valleys",
        tone: "alive",
        description:
          "Before the Asetra earthquake raised glacial peaks, ancient temples and aqueducts stood above ground.",
        visual: "Hilltop stone palace, warm valley villages, and open plains.",
        status: "Historical · Pre-earthquake",
      },
      {
        id: "nila-present",
        era: "Present",
        state: "Ice Mountains & Warm Valleys",
        tone: "hidden",
        description:
          "Three-fifths glacial peaks and crystal ice palace; two-fifths fertile warm valleys above the Sunken Temple.",
        visual: "Crystal palace spire, frozen cascades, and submerged domes.",
        status: "Present · Guardian domain",
      },
    ],
  },
];

const TONE: Record<Era["tone"], string> = {
  alive: "from-accent/30 via-accent/5 to-transparent",
  hidden: "from-primary/30 via-primary/5 to-transparent",
  ruin: "from-destructive/30 via-destructive/5 to-transparent",
};

export function LoreLocations() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const [locId, setLocId] = useState(LOCATIONS[0]!.id);
  const [eraIdx, setEraIdx] = useState<Record<string, number>>({});
  const [atlasStart, setAtlasStart] = useState<string | null>(null);
  const loc = LOCATIONS.find((l) => l.id === locId)!;
  const idx = Math.min(eraIdx[loc.id] ?? 0, loc.eras.length - 1);
  const era = loc.eras[idx]!;

  const activeEras = Object.fromEntries(
    LOCATIONS.map((l) => [l.id, l.eras[Math.min(eraIdx[l.id] ?? 0, l.eras.length - 1)]!.id]),
  );

  return (
    <>
      <LoreWorldMap activeId={locId} eras={activeEras} onSelect={setLocId} />
      <section
        className="mb-10 grid gap-4 lg:grid-cols-[240px_1fr]"
        aria-label="Key lore locations"
      >
        <div className="flex gap-2 overflow-x-auto lg:max-h-[420px] lg:flex-col lg:overflow-y-auto">
          {LOCATIONS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocId(l.id)}
              className={
                isManga
                  ? `shrink-0 border-2 border-foreground p-3.5 text-left transition ${
                      l.id === locId
                        ? "bg-foreground text-background shadow-[3px_3px_0_#b91c1c]"
                        : "bg-card text-foreground hover:bg-secondary"
                    }`
                  : `glass shrink-0 rounded-xl p-3.5 text-left transition-all ${l.id === locId ? "glow-ring border-accent/50" : "hover:glow-ring"}`
              }
            >
              <MapPin
                className={`h-4 w-4 ${
                  isManga
                    ? l.id === locId
                      ? "text-[#fca5a5]"
                      : "text-foreground"
                    : l.id === locId
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
              />
              <div
                className={`mt-1.5 ${isManga ? "font-display text-lg uppercase" : "font-medium"}`}
              >
                {l.name}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-75">
                {l.eras.map((e) => e.era).join(" · ")}
              </div>
            </button>
          ))}
        </div>

        <div
          className={
            isManga
              ? "manga-halftone relative overflow-hidden border-[3px] border-foreground bg-card p-5 shadow-[5px_5px_0_currentColor]"
              : "glass relative overflow-hidden rounded-2xl border border-border p-5"
          }
        >
          {!isManga && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`bg-${loc.id}-${era.id}`}
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${TONE[era.tone]}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            </AnimatePresence>
          )}
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p
                  className={`text-[11px] font-bold uppercase tracking-[0.25em] ${
                    isManga ? "font-mono text-[#b91c1c] dark:text-[#fca5a5]" : "text-accent"
                  }`}
                >
                  {loc.epithet}
                </p>
                <h2
                  className={
                    isManga
                      ? "manga-display-title mt-1 text-4xl uppercase"
                      : "mt-1 text-3xl font-medium glow-text"
                  }
                >
                  {loc.name}
                </h2>
              </div>
              {nexus && (
                <button
                  type="button"
                  onClick={() => setAtlasStart(loc.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-background/70 px-3 py-1.5 text-xs text-primary backdrop-blur transition hover:bg-primary hover:text-primary-foreground"
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  Open Interactive Map
                </button>
              )}
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Era">
              {loc.eras.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  onClick={() => setEraIdx((s) => ({ ...s, [loc.id]: i }))}
                  className={
                    isManga
                      ? `border-2 border-foreground px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
                          i === idx
                            ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                            : "bg-background text-foreground hover:bg-secondary"
                        }`
                      : `relative rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${i === idx ? "border-accent/60 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`
                  }
                >
                  {!isManga && i === idx && (
                    <motion.span
                      layoutId="era-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-accent/15"
                    />
                  )}
                  Era {i + 1} · {e.era}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${loc.id}-${era.id}`}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.35 }}
                className="mt-6 grid gap-4 md:grid-cols-3"
              >
                <div className="md:col-span-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    State
                  </div>
                  <div
                    className={isManga ? "font-display text-3xl uppercase" : "text-2xl font-medium"}
                  >
                    {era.state}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{era.description}</p>
                </div>
                <div
                  className={
                    isManga
                      ? "border-2 border-foreground bg-background p-4 md:col-span-2"
                      : "rounded-xl border border-border bg-background/40 p-4 md:col-span-2"
                  }
                >
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Visual state
                  </div>
                  <p className="mt-1 text-sm">{era.visual}</p>
                </div>
                <div
                  className={
                    isManga
                      ? "border-2 border-foreground bg-foreground p-4 text-background"
                      : "rounded-xl border border-border bg-background/40 p-4"
                  }
                >
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                    Environment status
                  </div>
                  <p
                    className={`mt-1 text-sm font-bold ${isManga ? "text-[#fca5a5]" : "text-accent"}`}
                  >
                    {era.status}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
      <AnimatePresence>
        {atlasStart && <AtlasOverlay start={atlasStart} onClose={() => setAtlasStart(null)} />}
      </AnimatePresence>
    </>
  );
}
