import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";

type Era = { id: string; era: string; state: string; description: string; visual: string; status: string; tone: "alive" | "hidden" | "ruin" };
type Location = { id: string; name: string; epithet: string; eras: Era[] };

const LOCATIONS: Location[] = [
  {
    id: "yasnaya",
    name: "Yasnaya",
    epithet: "The Sky Guardian Sanctuary",
    eras: [
      { id: "ancient", era: "Ancient Epoch", state: "Primal Jungle", tone: "hidden",
        description: "Before any palace rose, Yasnaya was untamed wilderness — a sacred jungle where the first worshippers raised crude shrines to the sky.",
        visual: "Dense, layered canopies; moss-choked primitive shrines; shafts of light through mist.",
        status: "Untouched · Sacred wilds" },
      { id: "golden", era: "Golden Era / Bloodlines", state: "Divine Sanctuary", tone: "alive",
        description: "The height of the Sky Guardians. A pristine palace of white stone above vibrant emerald greenery — the place where Ethan ascended.",
        visual: "Pristine white-stone palace, floating terraces, vibrant emerald gardens.",
        status: "Sanctified · Fully inhabited" },
      { id: "redline-s2", era: "Redline Season 2", state: "The Barren Scar", tone: "ruin",
        description: "After Ethan's death, the Redline vs. Obsidian clash tore through the sanctuary and left it a wound in the land.",
        visual: "Petrified dead trees, scorched earth, shattered masonry of the grand palace.",
        status: "Devastated · Battle site" },
    ],
  },
  {
    id: "aethmos",
    name: "Aethmos",
    epithet: "The Hidden Nature Sanctuary",
    eras: [
      { id: "enclave", era: "The Hidden Enclave", state: "Veiled Sanctuary", tone: "hidden",
        description: "Concealed behind a Nytherie barrier, Aethmos emits no network telemetry and cannot be tracked by satellite — which is why Isaac could find no trace of it.",
        visual: "Untouched natural jungles, organic dwellings grown into the trees.",
        status: "Cloaked · Zero telemetry" },
      { id: "exile", era: "The Exile Period", state: "Safehouse of the Fallen", tone: "alive",
        description: "The classified refuge where Valeria secretly moved Xinea after staging her death, while Xinea wrestled with grief and the return of her powers. In mid-Season 1, Samuel operated in the outer jungle system without ever knowing she was hidden deeper inside.",
        visual: "Deep-jungle safehouse; outer perimeter patrolled, inner sanctum sealed.",
        status: "Classified · Occupied in secret" },
    ],
  },
  {
    id: "ruincity",
    name: "RuinCity",
    epithet: "The Fallen Border Nexus",
    eras: [
      { id: "pre", era: "Pre-Diablo War 2nd", state: "Metropolitan Nexus", tone: "alive",
        description: "A thriving, progressive high-tech city that bridged the Demon and Human realms.",
        visual: "Neon skyline, active transit overpasses, cross-realm markets.",
        status: "Operational · High population" },
      { id: "post", era: "Post-Diablo War 2nd", state: "The Skeletal Grid", tone: "ruin",
        description: "The second Diablo War gutted the city, leaving only the bones of what it was.",
        visual: "Hollowed-out skyscraper carcasses, collapsed overpasses, ash-covered ruins.",
        status: "Abandoned · Hazard zone" },
    ],
  },
];

const TONE: Record<Era["tone"], string> = {
  alive: "from-accent/30 via-accent/5 to-transparent",
  hidden: "from-primary/30 via-primary/5 to-transparent",
  ruin: "from-destructive/30 via-destructive/5 to-transparent",
};

export function LoreLocations() {
  const [locId, setLocId] = useState(LOCATIONS[0]!.id);
  const [eraIdx, setEraIdx] = useState<Record<string, number>>({});
  const loc = LOCATIONS.find((l) => l.id === locId)!;
  const idx = Math.min(eraIdx[loc.id] ?? 0, loc.eras.length - 1);
  const era = loc.eras[idx]!;

  return (
    <section className="mb-10 grid gap-4 lg:grid-cols-[240px_1fr]" aria-label="Key lore locations">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {LOCATIONS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocId(l.id)}
            className={`glass shrink-0 rounded-xl p-4 text-left transition-all ${l.id === locId ? "glow-ring border-accent/50" : "hover:glow-ring"}`}
          >
            <MapPin className={`h-4 w-4 ${l.id === locId ? "text-accent" : "text-muted-foreground"}`} />
            <div className="mt-2 font-medium">{l.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l.epithet}</div>
          </button>
        ))}
      </div>

      <div className="glass relative overflow-hidden rounded-2xl border border-border p-5">
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
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">{loc.epithet}</p>
          <h2 className="mt-1 text-3xl font-medium glow-text">{loc.name}</h2>

          <div className="relative mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Era">
            {loc.eras.map((e, i) => (
              <button
                key={e.id}
                role="tab"
                aria-selected={i === idx}
                onClick={() => setEraIdx((s) => ({ ...s, [loc.id]: i }))}
                className={`relative rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${i === idx ? "border-accent/60 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {i === idx && (
                  <motion.span layoutId="era-pill" className="absolute inset-0 -z-10 rounded-full bg-accent/15" />
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
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">State</div>
                <div className="text-2xl font-medium">{era.state}</div>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{era.description}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4 md:col-span-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Visual state</div>
                <p className="mt-1 text-sm">{era.visual}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Environment status</div>
                <p className="mt-1 text-sm font-medium text-accent">{era.status}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
