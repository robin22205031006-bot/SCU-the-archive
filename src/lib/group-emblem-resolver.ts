export type GroupEmblemGenre =
  | "satanism-cult"
  | "dark-cult"
  | "cult"
  | "black-ops"
  | "dark-org"
  | "organization"
  | "clan"
  | "bloodline"
  | "faction";

export interface GroupEmblemInput {
  name?: string | null;
  kind?: string | null;
  category?: string | null;
  role?: string | null;
  alias?: string | null;
  description?: string | null;
}

export interface GroupEmblemSpec {
  genre: GroupEmblemGenre;
  label: string;
  shortCode: string;
  kanji: string;
  accentColor: string;
}

export const GROUP_EMBLEM_META: Record<GroupEmblemGenre, GroupEmblemSpec> = {
  "satanism-cult": {
    genre: "satanism-cult",
    label: "Satanic Cult",
    shortCode: "SAT",
    kanji: "魔",
    accentColor: "#ef4444",
  },
  "dark-cult": {
    genre: "dark-cult",
    label: "Dark Cult",
    shortCode: "DKC",
    kanji: "邪",
    accentColor: "#a855f7",
  },
  cult: {
    genre: "cult",
    label: "Cult",
    shortCode: "CLT",
    kanji: "教",
    accentColor: "#f59e0b",
  },
  "black-ops": {
    genre: "black-ops",
    label: "Black Ops",
    shortCode: "OPS",
    kanji: "特",
    accentColor: "#38bdf8",
  },
  "dark-org": {
    genre: "dark-org",
    label: "Dark Org",
    shortCode: "DKO",
    kanji: "闇",
    accentColor: "#e11d48",
  },
  organization: {
    genre: "organization",
    label: "Organization",
    shortCode: "ORG",
    kanji: "機",
    accentColor: "#60a5fa",
  },
  clan: {
    genre: "clan",
    label: "Clan",
    shortCode: "CLN",
    kanji: "族",
    accentColor: "#34d399",
  },
  bloodline: {
    genre: "bloodline",
    label: "Bloodline",
    shortCode: "BLD",
    kanji: "血",
    accentColor: "#c084fc",
  },
  faction: {
    genre: "faction",
    label: "Faction",
    shortCode: "FAC",
    kanji: "派",
    accentColor: "#fb923c",
  },
};

const SATANIC_RE =
  /satan(?:ism|ic|ist)?|lucifer(?:ian)?|baphomet|inverted pentagram|devil worship|diablo cult|sabbath|infernal pact|unholy altar|demonic cult|blood altar/i;
const DARK_CULT_RE =
  /dark cult|abyssal cult|void cult|eclipse cult|blood cult|shadow cult|occult coven|coven of|heretic sect|forbidden ritual|nightmare cult|sacrifice cult|umbr(?:a|al) cult/i;
const CULT_SIGNAL_RE =
  /\b(?:cult|sect|coven|covenant|zealot|initiates?|ritualist|worship|devotee)\b/i;
const DARK_MODIFIER_RE =
  /\b(?:dark|abyss|void|shadow|black|blood|sacrifice|occult|forbidden|nightmare|corrupt|abyssal|heretic|necromanc|curse)\b/i;
const BLACK_OPS_RE =
  /black[\s_-]*ops|special[\s_-]*operations?|strike[\s_-]*team|covert[\s_-]*(?:unit|ops|team|squad|force)|task[\s_-]*force|recon(?:naissance)?|\bh\.?a\.?w\.?k\.?s\.?\b|redline[\s_-]*team|vanguard|ghost[\s_-]*01|tactical[\s_-]*(?:squad|unit|ops)/i;
const DARK_ORG_RE =
  /dark[\s_-]*org(?:anization)?|shadow[\s_-]*(?:org(?:anization)?|syndicate|directorate)|\bd\.?e\.?w\.?\b|old[\s_-]*order|the[\s_-]*obsidians|nullborn|biomed[\s_-]*black|experimental[\s_-]*warfare|rogue[\s_-]*(?:lab|program)|syndicate|cabal|cartel|underworld|assassin[\s_-]*(?:network|guild)|villain[\s_-]*org/i;
const BLOODLINE_RE =
  /bloodline|lineage|dynasty|royal[\s_-]*blood|inheritor|ancestral[\s_-]*vein|duskmoor|aldercrest|corvani|el[\s_-]*mansur|paleborne/i;
const CLAN_RE =
  /\bclan\b|\bclans\b|shinobi|kurohana|\barashi\b|al[\s_-]*ahd|nine[\s_-]*clans|hidden[\s_-]*ones|ancestral[\s_-]*house/i;
const ORG_RE =
  /\borganization\b|\binstitute\b|\bacademy\b|\bbureau\b|\bfoundation\b|\bcouncil\b|\be\.?c\.?a\.?p\.?\b|sentinels[\s_-]*(?:institute|academy|agency)/i;

/**
 * Resolves the emblem genre of an organization, cult, black ops unit, clan, bloodline, or faction
 * by examining category, kind, name, alias, role, and lore description context.
 */
export function resolveGroupEmblem(input: GroupEmblemInput): GroupEmblemSpec {
  const category = (input.category ?? "").trim().toLowerCase();
  const kind = (input.kind ?? "").trim().toLowerCase();
  const primary = [category, input.name, input.alias].filter(Boolean).join(" ").toLowerCase();
  const context = [input.role, input.description].filter(Boolean).join(" ").toLowerCase();
  const combined = `${primary} ${kind} ${context}`.trim();

  // 1. Cult hierarchy: Satanism Cult -> Dark Cult -> General Cult
  if (SATANIC_RE.test(combined)) {
    return GROUP_EMBLEM_META["satanism-cult"];
  }
  if (
    DARK_CULT_RE.test(combined) ||
    ((category.includes("cult") || CULT_SIGNAL_RE.test(primary)) && DARK_MODIFIER_RE.test(combined))
  ) {
    return GROUP_EMBLEM_META["dark-cult"];
  }
  if (
    category.includes("cult") ||
    CULT_SIGNAL_RE.test(primary) ||
    /\bcult\b|\bsect\b/i.test(context)
  ) {
    return GROUP_EMBLEM_META.cult;
  }

  // 2. Black Ops Team / Covert Operations Unit
  if (BLACK_OPS_RE.test(combined)) {
    return GROUP_EMBLEM_META["black-ops"];
  }

  // 3. Dark Organization / Syndicates / Clandestine Programs
  if (
    DARK_ORG_RE.test(combined) ||
    ((category.includes("organization") || kind === "organization") &&
      DARK_MODIFIER_RE.test(primary))
  ) {
    return GROUP_EMBLEM_META["dark-org"];
  }

  // 4. Respect explicit structural category/kind before broad description keywords
  if (category.includes("bloodline") || kind === "bloodline") {
    return GROUP_EMBLEM_META.bloodline;
  }
  if (category.includes("clan") || kind === "clan") {
    return GROUP_EMBLEM_META.clan;
  }
  if (category.includes("organization") || kind === "organization") {
    return GROUP_EMBLEM_META.organization;
  }

  // 5. Fallback to description / name cues
  if (BLOODLINE_RE.test(combined)) return GROUP_EMBLEM_META.bloodline;
  if (CLAN_RE.test(combined)) return GROUP_EMBLEM_META.clan;
  if (ORG_RE.test(combined)) return GROUP_EMBLEM_META.organization;

  return GROUP_EMBLEM_META.faction;
}
