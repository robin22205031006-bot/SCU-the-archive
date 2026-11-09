import { createFileRoute } from "@tanstack/react-router";
import { ClanGraph } from "@/components/clan-graph";
import { RelationshipGraph } from "@/components/relationship-graph";
import { NexusWorkspace } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { Network, Castle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clans")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Clan & Lineage Graph — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Hierarchies, squad structures and rivalries across SCU clans, bloodlines and organizations.",
      },
      { property: "og:title", content: "Clan & Lineage Graph — SCU" },
      {
        property: "og:description",
        content: "The web of clans, bloodlines and squads in the Sentinels Cinematic Universe.",
      },
    ],
  }),
  component: Clans,
});

export function Clans() {
  const nexus = useUiStyle() === "nexus";
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Chronicle</p>
        <h1 className="mt-2 text-5xl font-medium glow-text">Clan &amp; Lineage Graph</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Hierarchies, squad command structures and the rivalries that bind the clans, bloodlines
          and organizations of the archive.
        </p>
      </header>
      {nexus ? <NexusWorkspace views={[
        { id: "clans", title: "Clan structures", icon: <Castle className="h-4 w-4" />, content: <ClanGraph /> },
        { id: "bonds", title: "Connections", icon: <Network className="h-4 w-4" />, content: <RelationshipGraph /> },
      ]} /> : <ClanGraph />}
    </main>
  );
}
