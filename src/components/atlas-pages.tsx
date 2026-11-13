import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Film, Map as MapIcon, Mountain, ArrowRight, MapPin } from "lucide-react";
import {
  ATLAS,
  WORLD_IMAGE_HEIGHT,
  WORLD_IMAGE_WIDTH,
  WORLD_TOP,
  type AtlasLocation,
} from "@/lib/nexus-atlas";
import { AtlasOverlay, type AtlasMode } from "@/components/nexus-atlas";
import { AtlasSimulation } from "@/components/atlas-simulation";
import { Link, useHydrated } from "@tanstack/react-router";

const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function OpenButtons({
  loc,
  open,
}: {
  loc: AtlasLocation;
  open: (id: string, m: AtlasMode) => void;
}) {
  const b =
    "flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-2 text-xs backdrop-blur hover:border-primary whitespace-nowrap shrink-0";
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={b} onClick={() => open(loc.id, "illustrated")}>
        <Mountain className="h-3.5 w-3.5" />
        Scenic map
      </button>
      <button type="button" className={b} onClick={() => open(loc.id, "top")}>
        <MapIcon className="h-3.5 w-3.5" />
        Top view
      </button>
      <button type="button" className={b} onClick={() => open(loc.id, "sim")}>
        <Film className="h-3.5 w-3.5" />
        Simulate
      </button>
    </div>
  );
}

/** /atlas: whole world plus all realms in fit-to-screen proportions. */
export function WorldAtlasSections() {
  const [open, setOpen] = useState<{ id: string; mode?: AtlasMode | undefined } | null>(null);
  return (
    <div className="space-y-20">
      <motion.section
        {...reveal}
        className="relative flex justify-center overflow-hidden rounded-3xl border border-border bg-card/40 p-3 sm:p-5"
      >
        <img
          src={WORLD_TOP}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl"
        />
        <div
          style={{ aspectRatio: `${WORLD_IMAGE_WIDTH} / ${WORLD_IMAGE_HEIGHT}` }}
          className="relative max-h-[78dvh] w-auto max-w-full overflow-hidden rounded-2xl border border-border/60 shadow-2xl"
        >
          <img
            src={WORLD_TOP}
            alt="The whole world map"
            width={WORLD_IMAGE_WIDTH}
            height={WORLD_IMAGE_HEIGHT}
            className="h-full w-full object-contain"
          />
          <div className="atlas-vignette pointer-events-none absolute inset-0" />
          {ATLAS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              style={{ left: `${l.worldX}%`, top: `${l.worldY}%` }}
              className="atlas-banner absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 text-[10px] font-medium hover:border-accent hover:text-accent sm:text-[11px]"
            >
              {l.name}
            </a>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-background via-background/80 to-transparent p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">The known world</p>
            <h2 className="text-3xl font-medium glow-text">{ATLAS.length} Realms</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen({ id: "world" })}
            className="rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground"
          >
            Explore full screen
          </button>
        </div>
      </motion.section>

      {ATLAS.map((loc, i) => {
        const latest = loc.eras[loc.eras.length - 1]!;
        return (
          <motion.section key={loc.id} id={loc.id} {...reveal} className="scroll-mt-24">
            <div
              className={`grid items-center gap-6 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              <button
                type="button"
                onClick={() => setOpen({ id: loc.id })}
                className="group relative flex items-center justify-center overflow-hidden rounded-3xl border border-border bg-card/40 p-3"
              >
                <img
                  src={latest.image}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-xl"
                />
                <div
                  style={{ aspectRatio: `${latest.width} / ${latest.height}` }}
                  className="relative max-h-[62dvh] w-auto max-w-full overflow-hidden rounded-2xl"
                >
                  <img
                    src={latest.image}
                    alt={`${loc.name} map`}
                    loading="lazy"
                    width={latest.width}
                    height={latest.height}
                    className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="atlas-vignette pointer-events-none absolute inset-0" />
                </div>
                <img
                  src={loc.top.image}
                  alt=""
                  loading="lazy"
                  width={loc.top.width}
                  height={loc.top.height}
                  style={{ aspectRatio: `${loc.top.width} / ${loc.top.height}` }}
                  className="absolute bottom-4 right-4 max-h-24 w-auto max-w-28 rounded-lg border border-border bg-background/80 object-contain shadow-lg"
                />
              </button>
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
                  Realm {i + 1} · {loc.epithet}
                </p>
                <h2 className="text-4xl font-medium glow-text">{loc.name}</h2>
                <p className="text-sm text-muted-foreground">{latest.summary}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  Eras: {loc.eras.map((e) => e.label).join(" · ")}
                </p>
                <OpenButtons loc={loc} open={(id, mode) => setOpen({ id, mode })} />
                <Link
                  to="/atlas/$place"
                  params={{ place: loc.id }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary"
                >
                  Open {loc.name} section <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.section>
        );
      })}
      <AnimatePresence>
        {open && <AtlasOverlay start={open.id} mode={open.mode} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** /atlas/$place: one realm with eras, top view and an inline fit-to-screen simulation. */
export function PlaceAtlasSections({ loc }: { loc: AtlasLocation }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState<{ id: string; mode?: AtlasMode | undefined } | null>(null);
  const simEra = loc.eras[loc.eras.length - 1] ?? loc.eras[0]!;
  return (
    <div className="space-y-16">
      <OpenButtons loc={loc} open={(id, mode) => setOpen({ id, mode })} />
      <section className="space-y-6">
        <h2 className="text-2xl font-medium">Eras</h2>
        {loc.eras.map((e, i) => (
          <motion.article
            key={e.id}
            {...reveal}
            className="grid items-start gap-5 rounded-3xl border border-border bg-card/40 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <button
              type="button"
              onClick={() => setOpen({ id: loc.id, mode: "illustrated" })}
              className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-background/60 p-2"
            >
              <div
                style={{ aspectRatio: `${e.width} / ${e.height}` }}
                className="relative max-h-[65dvh] w-auto max-w-full overflow-hidden rounded-xl"
              >
                <img
                  src={e.image}
                  alt={`${loc.name} — ${e.label}`}
                  loading="lazy"
                  width={e.width}
                  height={e.height}
                  className="h-full w-full object-contain transition duration-700 hover:scale-[1.03]"
                />
                <span className="atlas-banner absolute left-3 top-3 px-2 py-1 text-[10px]">
                  Era {i + 1}
                </span>
              </div>
            </button>
            <div className="space-y-3">
              <h3 className="text-xl font-medium">{e.label}</h3>
              <p className="text-sm text-muted-foreground">{e.summary}</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {e.landmarks.map((l) => (
                  <li key={l.id} className="rounded-xl border border-border p-2.5 text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {l.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{l.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </section>
      <motion.section {...reveal} className="space-y-4">
        <h2 className="text-2xl font-medium">Top view · {loc.top.era}</h2>
        <button
          type="button"
          onClick={() => setOpen({ id: loc.id, mode: "top" })}
          className="relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-card/40 p-3"
        >
          <div
            style={{ aspectRatio: `${loc.top.width} / ${loc.top.height}` }}
            className="relative max-h-[78dvh] w-auto max-w-full overflow-hidden rounded-2xl"
          >
            <img
              src={loc.top.image}
              alt={`${loc.name} top-down map`}
              loading="lazy"
              width={loc.top.width}
              height={loc.top.height}
              className="h-full w-full object-contain"
            />
            {loc.top.landmarks.map((l) => (
              <span
                key={l.id}
                style={{ left: `${l.x}%`, top: `${l.y}%` }}
                className="atlas-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap px-2 text-[10px]"
              >
                {l.name}
              </span>
            ))}
          </div>
        </button>
      </motion.section>
      <motion.section {...reveal} className="space-y-4">
        <h2 className="text-2xl font-medium">Frame-by-frame simulation</h2>
        <p className="text-sm text-muted-foreground">
          {loc.eras.length > 1
            ? "Watch the realm change from era to era. Pause and step one frame at a time."
            : "One known era, so this plays a full atmospheric cycle."}
        </p>
        <div
          style={{ aspectRatio: `${simEra.width} / ${simEra.height}` }}
          className="relative mx-auto max-h-[82dvh] w-full max-w-5xl overflow-hidden rounded-3xl border border-border"
        >
          {hydrated && <AtlasSimulation loc={loc} />}
        </div>
      </motion.section>
      <AnimatePresence>
        {open && <AtlasOverlay start={open.id} mode={open.mode} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </div>
  );
}
