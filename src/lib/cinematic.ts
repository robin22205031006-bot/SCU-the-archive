const SPECIAL_TITLES: Record<string, string> = {
  "": "The Archive",
  ai: "AI Box",
  "ability-fx": "Ability FX",
  "ability-action": "Ability in Action",
  orgs: "Organizations",
};

/** Title-card text for a route: "/ability-fx" -> "Ability FX", "/atlas/rome" -> "Atlas". */
export function cinematicTitleFor(pathname: string): string {
  const slug = pathname.split("/").filter(Boolean)[0] ?? "";
  const special = SPECIAL_TITLES[slug];
  if (special) return special;
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
