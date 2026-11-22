/** Orgs page. Lives outside the route file so the route stays code-split and the
 *  archive hub can lazy-load the same component. */
import { useSearch } from "@tanstack/react-router";
import { EntitySection } from "@/components/entity-section";
import { GROUP_CATEGORIES } from "@/lib/entities";

export function Orgs() {
  // strict:false so this also works when embedded inside the Archive page.
  const search = useSearch({ strict: false }) as { q?: unknown; open?: unknown };
  const q = typeof search?.q === "string" ? search.q : undefined;
  const open = typeof search?.open === "string" ? search.open : undefined;
  return (
    <EntitySection
      kinds={["organization", "clan", "bloodline", "faction"]}
      categories={GROUP_CATEGORIES}
      initialQuery={q ?? ""}
      openId={open}
      view="organizations"
      title="Orgs & Bloodlines"
      subtitle="Factions, black ops teams, clans, cults and lineages."
    />
  );
}
