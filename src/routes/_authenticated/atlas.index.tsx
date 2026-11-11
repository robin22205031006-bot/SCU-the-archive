import { createFileRoute } from "@tanstack/react-router";
import { WorldAtlasSections } from "@/components/atlas-pages";

export const Route = createFileRoute("/_authenticated/atlas/")({
  head: () => ({ meta: [
    { title: "World Atlas — Sentinels Cinematic Universe" },
    { name: "description", content: "Explore every SCU realm on one page: Nilanjona's Realm, Aethmos, Yasnaya and Ruin City, with scenic, top-view and animated maps." },
    { property: "og:title", content: "World Atlas — SCU" },
    { property: "og:description", content: "All four SCU realms with scenic, top-down and era-by-era animated maps." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
    <header className="mb-10"><p className="text-[11px] uppercase tracking-[0.25em] text-accent">Cartography</p><h1 className="mt-2 text-5xl font-medium glow-text">World Atlas</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Every realm in one scroll. Open any place for scenic maps, a true top view, or a frame-by-frame simulation across its eras.</p></header>
    <WorldAtlasSections />
  </main>,
});
