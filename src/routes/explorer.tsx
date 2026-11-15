import { createFileRoute } from "@tanstack/react-router";
import { LoreExplorer, type LoreItem } from "@/components/LoreExplorer";
import { useIsManga } from "@/hooks/use-ui-mode";

const EXPLORER_FALLBACK_ITEMS: LoreItem[] = [
  {
    id: "char-ethan-reed",
    name: "Ethan Reed",
    tier: "Mythic",
    category: "Vanguard",
    bio: "Frontline Sentinel commander balancing kinetic resonance and tactical foresight across the northern breach.",
    combat_style: "Redline Kinetics / Counter-Tempo",
  },
  {
    id: "char-elizah-arashi",
    name: "Elizah Arashi",
    tier: "Legendary",
    category: "Sentinel",
    bio: "Storm-blade archivist whose thunderstep technique bridges lost Corvani and Arashi lineages.",
    combat_style: "Tempest Iai / Arc Steps",
  },
  {
    id: "char-samuel-duskmoor",
    name: "Samuel Duskmoor",
    tier: "Ancient",
    category: "Clan",
    bio: "Warden of the Duskmoor seal keeping abyssal echoes tethered behind the Obsidian Vault.",
    combat_style: "Ashbound Wardenship",
  },
  {
    id: "char-freya-kurohana",
    name: "Freya Kurohana",
    tier: "Exceptional",
    category: "Sentinel",
    bio: "Precision scout and frost-petal duelist of the shattered Kurohana district.",
    combat_style: "White-Petal Rapier",
  },
  {
    id: "char-khalid-al-mansur",
    name: "Khalid Al-Mansur",
    tier: "Legendary",
    category: "Sovereign",
    bio: "Solar-forged tactician leading coalition expeditions into the outer rift zones.",
    combat_style: "Dawnbreaker Halberd",
  },
  {
    id: "char-arzuna-kain",
    name: "Arzuna Kain",
    tier: "Mythic",
    category: "Antagonist",
    bio: "Harbinger of the Diablo War whose ash-lattice barriers shatter standard sentinel formations.",
    combat_style: "Cinder Lattice",
  },
];

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Lore Explorer — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Browse Sentinels Cinematic Universe characters, factions, and timeline entries with quick bookmarks, sharing, and pinned access.",
      },
      { property: "og:title", content: "Lore Explorer — Sentinels Cinematic Universe" },
      {
        property: "og:description",
        content:
          "Browse Sentinels Cinematic Universe lore cards with long-press bookmark, share, and pin actions.",
      },
    ],
  }),
  component: ExplorerRoute,
});

function ExplorerRoute() {
  const isManga = useIsManga();
  return (
    <div className={isManga ? "pt-2 pb-16" : "pt-24 pb-16 sm:pt-28"}>
      <LoreExplorer fallbackItems={EXPLORER_FALLBACK_ITEMS} />
    </div>
  );
}
