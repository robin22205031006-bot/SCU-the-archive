import { createFileRoute, Link } from "@tanstack/react-router";
import { SeriesPage } from "./_authenticated/series";
import { UiStylePicker } from "@/components/ui-style-picker";
import { useUiStyle } from "@/lib/ui-style";
import { useIsManga } from "@/hooks/use-ui-mode";
import { NexusExplorer } from "@/components/nexus-explorer";
import { MangaChapterBanner, MangaPanel, MangaSpeechBubble } from "@/components/manga-view";
import { HankoStamp } from "@/components/manga-emblem";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Sentinels Cinematic Universe — The Archive" },
      {
        name: "description",
        content:
          "Characters, orders, bloodlines and the timeline of the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Sentinels Cinematic Universe — The Archive" },
      {
        property: "og:description",
        content: "Characters, orders, bloodlines and the timeline of the SCU.",
      },
    ],
  }),
  component: Index,
});

const sections = [
  {
    to: "/characters",
    n: "01",
    t: "Characters",
    d: "Dossiers of every sentinel, ally and adversary.",
  },
  {
    to: "/abilities",
    n: "02",
    t: "Abilities",
    d: "The master registry of powers, tiers and who wields them.",
  },
  {
    to: "/series",
    n: "03",
    t: "Series",
    d: "Story arcs, episodes and where every character appears.",
  },
  { to: "/archive", n: "04", t: "Archive", d: "Orgs, clans, graph and the full canon timeline." },
  { to: "/orgs", n: "05", t: "Orgs & Bloodlines", d: "Orders, clans, factions and lineages." },
  { to: "/timeline", n: "06", t: "Timeline", d: "The history of the universe, in order." },
] as const;

function Index() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  if (isManga)
    return (
      <main className="mx-auto max-w-6xl px-3 pb-24 pt-6 sm:px-6">
        <MangaChapterBanner
          chapter="ISSUE #01 // MASTER ARCHIVE"
          jp="超人宇宙総覧"
          title="Sentinels Cinematic Universe"
          subtitle="Serialized Tankobon Index — characters, bloodlines, cursed weapons, and five eras of canon chronology."
          stamp="第一巻"
        />

        <MangaPanel caption="EDITION STYLE // 表示切替" badge="INTERFACE" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Select reading layout:
            </span>
            <UiStylePicker />
          </div>
        </MangaPanel>

        <section
          aria-label="Serialized chapter directory"
          className="grid grid-cols-1 gap-4 md:grid-cols-12"
        >
          {sections.map((s, idx) => {
            const span = idx === 0 || idx === 3 ? "md:col-span-7" : "md:col-span-5";
            return (
              <Link
                key={s.to}
                to={s.to}
                className={`manga-panel manga-panel-hover group relative flex flex-col justify-between overflow-hidden border-[3px] border-foreground bg-card p-5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${span} ${
                  idx % 2 === 1 ? "manga-halftone" : ""
                }`}
              >
                <span className="absolute -right-7 top-3 rotate-45 border-y-2 border-foreground bg-[#b91c1c] px-8 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white">
                  CH.{s.n}
                </span>
                <div>
                  <span className="inline-block border border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
                    PLATE #{s.n}
                  </span>
                  <h2 className="mt-3 font-display text-3xl uppercase tracking-wide group-hover:text-[#b91c1c] dark:group-hover:text-[#fca5a5]">
                    {s.t}
                  </h2>
                  <p className="mt-1.5 border-l-2 border-foreground/40 pl-2.5 text-sm text-muted-foreground">
                    {s.d}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-foreground/20 pt-2.5 font-mono text-[10px] font-bold uppercase tracking-widest">
                  <span>ENTER SECTOR</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </section>

        <div className="mt-10">
          <SeriesPage />
        </div>

        <footer className="mt-12 grid gap-4 md:grid-cols-2">
          <MangaPanel caption="COLOPHON & CREDITS // 奥付" badge="STAFF">
            <ul className="space-y-1.5 font-mono text-xs text-muted-foreground">
              <li>
                <span className="font-bold text-foreground">DEVELOPER</span> — Robin (SCU Archives
                engineering)
              </li>
              <li>
                <span className="font-bold text-foreground">ADMIN</span> — zananrobin@gmail.com
              </li>
              <li>
                <span className="font-bold text-foreground">EDITORS</span> — Lore ingestion &amp;
                canon review team
              </li>
              <li>
                <span className="font-bold text-foreground">CONTRIBUTORS</span> — The SCU fandom
                archivists
              </li>
            </ul>
          </MangaPanel>
          <div className="flex flex-col justify-between gap-3">
            <MangaSpeechBubble speaker="ARCHIVE SEAL // 記録">
              <p className="font-serif text-base italic">
                “In the silence between heartbeats, the Sentinel remembers.”
              </p>
            </MangaSpeechBubble>
            <div className="flex items-center justify-between border-2 border-foreground bg-card px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Season 5: The Last Archive awakens when all five seals align.
              </span>
              <HankoStamp kanji="五印" label="CANON" tilt={-4} />
            </div>
          </div>
        </footer>
      </main>
    );
  if (nexus)
    return (
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <h2 className="text-sm">UI Style</h2>
          <UiStylePicker />
        </div>
        <header className="mb-10">
          <p className="text-xs text-accent">SCU / NEXUS</p>
          <h1 className="mt-3 break-words text-4xl font-medium sm:text-5xl">
            Sentinels Cinematic Universe
          </h1>
        </header>
        <NexusExplorer
          label="Archive sectors"
          records={sections.map((s) => ({
            id: s.to,
            title: s.t,
            group: s.to === "/series" || s.to === "/timeline" ? "Chronicle" : "Lore",
            subtitle: s.d,
            section: s,
          }))}
          renderDetail={({ section: s }) => (
            <div className="grid gap-5">
              <h2 className="text-3xl">{s.t}</h2>
              <Button asChild>
                <Link to={s.to}>
                  Open {s.t}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        />
        <div className="mt-12">
          <SeriesPage />
        </div>
      </main>
    );
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 pb-20 pt-32">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="text-sm">UI Style</h2>
        <UiStylePicker />
      </div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-accent">The Archive</p>
      <h1 className="mt-4 text-6xl font-medium leading-[0.95] sm:text-8xl">
        Sentinels
        <br />
        <em className="text-muted-foreground">Cinematic Universe</em>
      </h1>
      <div className="mt-16 grid border-t sm:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group border-b py-6 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"
          >
            <span className="text-xs text-muted-foreground">{s.n}</span>
            <h2 className="mt-2 text-3xl transition-colors group-hover:text-accent">{s.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </Link>
        ))}
      </div>
      <div className="mt-16">
        <SeriesPage />
      </div>

      <footer className="mt-20 border-t border-border pt-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.25em] text-accent">Credits</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">Developer</span> — Robin (SCU Archives
                engineering)
              </li>
              <li>
                <span className="text-foreground">Admin</span> — zananrobin@gmail.com
              </li>
              <li>
                <span className="text-foreground">Editors</span> — Lore ingestion &amp; canon review
                team
              </li>
              <li>
                <span className="text-foreground">Contributors</span> — The SCU fandom archivists
              </li>
            </ul>
          </div>
          <div className="flex flex-col justify-end">
            <p className="font-display text-lg italic text-muted-foreground">
              “In the silence between heartbeats, the Sentinel remembers.”
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60">
              SCU Easter Egg — Season 5: The Last Archive awakens when all five seals align.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
