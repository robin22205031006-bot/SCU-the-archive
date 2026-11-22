import { createFileRoute } from "@tanstack/react-router";
import { Clans } from "@/components/pages/clans-page";

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
