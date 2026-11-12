import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Entity } from "@/lib/entities";

export type Series = Tables<"series">;
export type SeriesCharacter = Tables<"series_characters">;

export const SERIES_STATUSES = [
  "Alive",
  "Dead",
  "Missing",
  "Presumed Dead",
  "Realive",
  "Unknown",
] as const;
/** Per-season character status options (admins pick one per season). */
export const SEASON_STATUSES = ["Alive", "Dead", "Missing", "Presumed Dead", "Realive", "Unknown"];
export type SeriesStatus = (typeof SERIES_STATUSES)[number];

export const seriesStatusClass: Record<string, string> = {
  Alive: "text-status-alive",
  Dead: "text-status-dead",
  Missing: "text-status-legend",
  "Presumed Dead": "text-status-legend",
  Realive: "text-status-alive",
  Revived: "text-status-alive",
  Unknown: "text-status-neutral",
};

const missingTable = (error: { message?: string } | null) =>
  !!error && /series|schema cache|does not exist/i.test(error.message ?? "");

export const DEFAULT_CANON_SERIES: Series[] = [
  {
    id: "00000000-0000-4000-a000-000000000001",
    title: "The Sentinels",
    description:
      "The flagship saga of the Sentinels Cinematic Universe covering the rising heroes, fractured loyalties, and existential conflicts across 5 seasons.",
    cover_image_url: null,
    genres: ["Superhero", "Dark Fantasy", "Sci-Fi", "Action"],
    season_count: 5,
    season_names: ["Season 1", "Season 2", "Season 3", "Season 4", "Season 5"],
    timeline_note: "The modern anchor of the SCU timeline (S1 to S5).",
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    title: "Redline",
    description:
      "High-octane underground racing and black-ops combat following Marcello Corvani, Orion, and the Redline team across dimensions.",
    cover_image_url: null,
    genres: ["Action", "Cyberpunk", "Sci-Fi", "Thriller"],
    season_count: 2,
    season_names: ["Season 1", "Season 2"],
    timeline_note:
      "Prior to and concurrent with early Sentinels eras; dimension breach ~2005 to 2025.",
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    title: "Bloodline",
    description:
      "The ancestral chronicles, sacred oaths, and ancient bloodlines of the Nine Clans dating back to antiquity.",
    cover_image_url: null,
    genres: ["Mythical", "Dark Fantasy", "Occult", "Drama"],
    season_count: 1,
    season_names: ["Season 1"],
    timeline_note: "Ancient origins, 380 BC to late medieval era (1417).",
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-a000-000000000004",
    title: "Divine Beast",
    description:
      "The awakening of primal elemental guardians and catastrophic clashes with Diablo and demonkind.",
    cover_image_url: null,
    genres: ["Fantasy", "Action", "Supernatural"],
    season_count: 1,
    season_names: ["Season 1"],
    timeline_note: "Primal and mythic eras; the origins of elemental wardens.",
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-a000-000000000005",
    title: "Standalone Epics",
    description:
      "Character-defining historical chronicles: the resurrection trials of Zaan al-Murad, Khalid's Nullborn saga, and Alister Quinn's forbidden science.",
    cover_image_url: null,
    genres: ["Mystery", "Thriller", "Dark Fantasy", "Psychological"],
    season_count: 3,
    season_names: ["Zaan", "Khalid", "Alister"],
    timeline_note: "15th century through 1904 Hayrabad; individual standalone journeys.",
    updated_at: "2026-11-12T00:00:00.000Z",
  },
];

export interface CanonRosterEntry {
  characterName: string;
  arc_role: string;
  role_in_series: string;
  status: string;
}

export const CANON_SERIES_ROSTERS: Record<string, CanonRosterEntry[]> = {
  // The Sentinels
  "00000000-0000-4000-a000-000000000001": [
    {
      characterName: "Ethan",
      arc_role: "Lead protagonist",
      role_in_series: "Main Protagonist S1 & S5, Gale Warden",
      status: "Alive",
    },
    {
      characterName: "Zayn Hayes",
      arc_role: "Protagonist",
      role_in_series: "Dorian's Red Lightning",
      status: "Alive",
    },
    {
      characterName: "Xinea",
      arc_role: "Protagonist",
      role_in_series: "Aether Dominion & Sentinel Leader",
      status: "Alive",
    },
    {
      characterName: "Samuel Sterling",
      arc_role: "Anti-hero",
      role_in_series: "Solo Vigilante (Ghost-01)",
      status: "Alive",
    },
    {
      characterName: "David",
      arc_role: "Support",
      role_in_series: "Portal Dagger Specialist",
      status: "Dead",
    },
    {
      characterName: "Maliha",
      arc_role: "Support",
      role_in_series: "Healer & Tech Specialist",
      status: "Dead",
    },
    {
      characterName: "Stitch",
      arc_role: "Antagonist",
      role_in_series: "ECAP Director & Control Obsession",
      status: "Dead",
    },
    {
      characterName: "William Victor",
      arc_role: "Support",
      role_in_series: "Head of ECAP",
      status: "Alive",
    },
    {
      characterName: "Ayaan Siddique",
      arc_role: "Support",
      role_in_series: "Tech Specialist",
      status: "Alive",
    },
    {
      characterName: "Asetra",
      arc_role: "Main antagonist",
      role_in_series: "Architect Shadow Threat",
      status: "Missing",
    },
    {
      characterName: "Valeria",
      arc_role: "Antagonist",
      role_in_series: "Ravenblade / Nullborn",
      status: "Alive",
    },
    {
      characterName: "Grace",
      arc_role: "Support",
      role_in_series: "Healer / Athena's Judgement",
      status: "Retired",
    },
    {
      characterName: "Elizah",
      arc_role: "Lead protagonist",
      role_in_series: "Gravitational Center S2-S3",
      status: "Alive",
    },
    {
      characterName: "Arzuna",
      arc_role: "Main antagonist",
      role_in_series: "Arzuna vs Sentinels",
      status: "Alive",
    },
    {
      characterName: "Altan El-Mansur",
      arc_role: "Legend",
      role_in_series: "Family Protector & Guardian",
      status: "Dead",
    },
    {
      characterName: "Yoshiko Arashi",
      arc_role: "Support",
      role_in_series: "Seraph of the Ash",
      status: "Alive",
    },
    {
      characterName: "Aariz Maddox",
      arc_role: "Support",
      role_in_series: "Beast Lineage",
      status: "Alive",
    },
    {
      characterName: "Silas Duskmoor",
      arc_role: "Legend",
      role_in_series: "Ancient Duskmoor Patriarch",
      status: "Dead",
    },
    {
      characterName: "Arthur",
      arc_role: "Main antagonist",
      role_in_series: "Dragonic Lineage Nemesis",
      status: "Alive",
    },
    {
      characterName: "Rowan Colloway",
      arc_role: "Protagonist",
      role_in_series: "Red/Blue Flame",
      status: "Alive",
    },
    {
      characterName: "Zaan",
      arc_role: "Legend",
      role_in_series: "Cursed Prodigy Ally",
      status: "Alive",
    },
    {
      characterName: "Marcello Corvani",
      arc_role: "Support",
      role_in_series: "Whale / Moral Anchor",
      status: "Alive",
    },
    {
      characterName: "Niharo",
      arc_role: "Main antagonist",
      role_in_series: "Omni-Ergon Villain S4-S5",
      status: "Dead",
    },
    {
      characterName: "Nilanjona",
      arc_role: "Legend",
      role_in_series: "Water Guardian",
      status: "Retired",
    },
    {
      characterName: "Aeric Valenheart",
      arc_role: "Support",
      role_in_series: "Pocket Dimension Survivor",
      status: "Alive",
    },
    {
      characterName: "Derek Miles",
      arc_role: "Support",
      role_in_series: "Vanguard Commander",
      status: "Alive",
    },
    {
      characterName: "Eldrich Aldercrest",
      arc_role: "Legend",
      role_in_series: "Shadow Guardian of the Throne",
      status: "Alive",
    },
  ],
  // Redline
  "00000000-0000-4000-a000-000000000002": [
    {
      characterName: "Marcello Corvani",
      arc_role: "Lead protagonist",
      role_in_series: "Redline Team Leader / Whale",
      status: "Alive",
    },
    {
      characterName: "Orion",
      arc_role: "Protagonist",
      role_in_series: "Circo del Miracolo Recruit",
      status: "Alive",
    },
    {
      characterName: "Aeric Valenheart",
      arc_role: "Protagonist",
      role_in_series: "Dimension Breach Specialist",
      status: "Alive",
    },
    {
      characterName: "Alter David",
      arc_role: "Main antagonist",
      role_in_series: "Alternate Reality Threat",
      status: "Alive",
    },
    {
      characterName: "Weston Hale",
      arc_role: "Support",
      role_in_series: "Combat Veteran",
      status: "Alive",
    },
    {
      characterName: "Sean Stone",
      arc_role: "Legend",
      role_in_series: "Maverick Title Line",
      status: "Alive",
    },
    {
      characterName: "Stitch",
      arc_role: "Antagonist",
      role_in_series: "Shadow Overseer",
      status: "Alive",
    },
    {
      characterName: "William Victor",
      arc_role: "Support",
      role_in_series: "ECAP Liaison",
      status: "Alive",
    },
    {
      characterName: "Ethan",
      arc_role: "Support",
      role_in_series: "Rescued Ally S2",
      status: "Alive",
    },
  ],
  // Bloodline
  "00000000-0000-4000-a000-000000000003": [
    {
      characterName: "Ramiz Al-Ahd",
      arc_role: "Lead protagonist",
      role_in_series: "Al-Ahd Patriarch",
      status: "Alive",
    },
    {
      characterName: "Anna Al-Ahd",
      arc_role: "Protagonist",
      role_in_series: "Bloodline Protector",
      status: "Alive",
    },
    {
      characterName: "Issabela Al-Ahd",
      arc_role: "Protagonist",
      role_in_series: "Keeper of the Oaths",
      status: "Alive",
    },
    {
      characterName: "Altan El-Mansur",
      arc_role: "Legend",
      role_in_series: "El-Mansur Lineage",
      status: "Alive",
    },
    {
      characterName: "Eldrich Aldercrest",
      arc_role: "Legend",
      role_in_series: "Aldercrest Founder",
      status: "Alive",
    },
    {
      characterName: "Silas Duskmoor",
      arc_role: "Legend",
      role_in_series: "Duskmoor Clan Head",
      status: "Alive",
    },
    {
      characterName: "Tedmond Duskmoor",
      arc_role: "Legend",
      role_in_series: "Anchor Zero Legend",
      status: "Alive",
    },
    {
      characterName: "Mashiho Kurohana",
      arc_role: "Support",
      role_in_series: "Kurohana Clan Elder",
      status: "Alive",
    },
    {
      characterName: "Kazumi Kurahana",
      arc_role: "Support",
      role_in_series: "Twin Blade of Kurohana",
      status: "Alive",
    },
  ],
  // Divine Beast
  "00000000-0000-4000-a000-000000000004": [
    {
      characterName: "Nilanjona",
      arc_role: "Lead protagonist",
      role_in_series: "Origin of the Water Guardian",
      status: "Alive",
    },
    {
      characterName: "Ethan",
      arc_role: "Protagonist",
      role_in_series: "Wind Guardian Lineage",
      status: "Alive",
    },
    {
      characterName: "Aariz Maddox",
      arc_role: "Protagonist",
      role_in_series: "Nature Guardian Lineage",
      status: "Alive",
    },
    {
      characterName: "Saya",
      arc_role: "Support",
      role_in_series: "Disciple of Nytheris",
      status: "Alive",
    },
    {
      characterName: "Yoshiko Arashi",
      arc_role: "Legend",
      role_in_series: "Seraph of the Ash & Dragon Slayer",
      status: "Alive",
    },
    {
      characterName: "Arthur",
      arc_role: "Main antagonist",
      role_in_series: "Dragon Heir",
      status: "Alive",
    },
    {
      characterName: "Sparda",
      arc_role: "Antagonist",
      role_in_series: "Prince of Demons",
      status: "Alive",
    },
    {
      characterName: "Diablo",
      arc_role: "Main antagonist",
      role_in_series: "Primal Calamity",
      status: "Alive",
    },
  ],
  // Standalone Epics
  "00000000-0000-4000-a000-000000000005": [
    {
      characterName: "Zaan",
      arc_role: "Lead protagonist",
      role_in_series: "The Cursed Prodigy (Zaan)",
      status: "Alive",
    },
    {
      characterName: "Shina Nasrin",
      arc_role: "Support",
      role_in_series: "Zaan's Companion (Zaan)",
      status: "Dead",
    },
    {
      characterName: "Ayesha Khatoon",
      arc_role: "Support",
      role_in_series: "Grandma Ayesha (Zaan)",
      status: "Dead",
    },
    {
      characterName: "Raisa bint Khalid",
      arc_role: "Antagonist",
      role_in_series: "Forbidden Science Rival (Zaan)",
      status: "Alive",
    },
    {
      characterName: "Alistair Quinn",
      arc_role: "Lead protagonist",
      role_in_series: "Colleague & Alister Lead",
      status: "Alive",
    },
    {
      characterName: "Dirham",
      arc_role: "Support",
      role_in_series: "Village Ally (Zaan)",
      status: "Alive",
    },
    {
      characterName: "Khalid",
      arc_role: "Lead protagonist",
      role_in_series: "Survivor of the Nullborn (Khalid)",
      status: "Alive",
    },
    {
      characterName: "Francisco",
      arc_role: "Support",
      role_in_series: "Nasab ibn Khalil (Khalid)",
      status: "Dead",
    },
    {
      characterName: "Hisham",
      arc_role: "Support",
      role_in_series: "Fallen Comrade (Khalid)",
      status: "Dead",
    },
    {
      characterName: "Anna Al-Ahd",
      arc_role: "Support",
      role_in_series: "Protector (Khalid)",
      status: "Alive",
    },
    {
      characterName: "Ramiz Al-Ahd",
      arc_role: "Legend",
      role_in_series: "Al-Ahd Leader (Khalid)",
      status: "Alive",
    },
    {
      characterName: "Issabela Al-Ahd",
      arc_role: "Support",
      role_in_series: "Allied Survivor (Khalid)",
      status: "Alive",
    },
    {
      characterName: "Dorian Cross",
      arc_role: "Support",
      role_in_series: "Shadow Ally (Khalid & Alister)",
      status: "Alive",
    },
    {
      characterName: "Eldrich Aldercrest",
      arc_role: "Support",
      role_in_series: "Long-Lived Caster (Alister)",
      status: "Alive",
    },
  ],
};

// Also expose lookups by series title for title-based inquiries and tests
CANON_SERIES_ROSTERS["The Sentinels"] =
  CANON_SERIES_ROSTERS["00000000-0000-4000-a000-000000000001"];
CANON_SERIES_ROSTERS["Redline"] = CANON_SERIES_ROSTERS["00000000-0000-4000-a000-000000000002"];
CANON_SERIES_ROSTERS["Bloodline"] = CANON_SERIES_ROSTERS["00000000-0000-4000-a000-000000000003"];
CANON_SERIES_ROSTERS["Divine Beast"] = CANON_SERIES_ROSTERS["00000000-0000-4000-a000-000000000004"];
CANON_SERIES_ROSTERS["Standalone Epics"] =
  CANON_SERIES_ROSTERS["00000000-0000-4000-a000-000000000005"];

const norm = (s: string) => s.trim().toLowerCase();

export const seriesQuery = queryOptions({
  queryKey: ["series"],
  staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("series").select("*").order("title");
    if (error) {
      if (missingTable(error)) return DEFAULT_CANON_SERIES;
      throw error;
    }
    return data?.length ? data : DEFAULT_CANON_SERIES;
  },
});

export const seriesByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["series", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("series").select("*").eq("id", id).maybeSingle();
      if (error && !missingTable(error)) throw error;
      if (data) return data;
      return DEFAULT_CANON_SERIES.find((s) => s.id === id) ?? null;
    },
  });

export const seriesCharactersQuery = (seriesId: string) =>
  queryOptions({
    queryKey: ["series-characters", seriesId],
    enabled: !!seriesId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series_characters")
        .select("*")
        .eq("series_id", seriesId)
        .order("created_at");
      if (error && !missingTable(error)) throw error;
      if (data?.length) return data;

      // Fallback to canon roster for this series
      const targetSeries = DEFAULT_CANON_SERIES.find((s) => s.id === seriesId);
      const canonKey = targetSeries ? targetSeries.id : seriesId;
      const roster = CANON_SERIES_ROSTERS[canonKey];
      if (!roster?.length) return [] as SeriesCharacter[];

      // Resolve character IDs from entities
      const { data: entities } = await supabase
        .from("entities")
        .select("id, name")
        .eq("kind", "character");
      const byName = new Map((entities ?? []).map((e) => [norm(e.name), e.id]));

      const synthetic: SeriesCharacter[] = [];
      for (const entry of roster) {
        const charId = byName.get(norm(entry.characterName));
        if (charId) {
          synthetic.push({
            id: `canon-${seriesId}-${charId}`,
            series_id: seriesId,
            character_id: charId,
            arc_role: entry.arc_role,
            role_in_series: entry.role_in_series,
            status: entry.status,
            card_theme: null,
            created_at: "2026-11-12T00:00:00.000Z",
          });
        }
      }
      return synthetic;
    },
  });

/** All series a character appears in, with their per-series status. */
export const characterSeriesQuery = (characterId: string) =>
  queryOptions({
    queryKey: ["character-series", characterId],
    enabled: !!characterId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series_characters")
        .select("*, series:series_id(id, title, cover_image_url)")
        .eq("character_id", characterId);
      if (error && !missingTable(error)) throw error;
      if (data?.length) {
        return data as unknown as (SeriesCharacter & {
          series: Pick<Series, "id" | "title" | "cover_image_url"> | null;
        })[];
      }

      // Check character name to synthesize canon appearances
      const { data: ent } = await supabase
        .from("entities")
        .select("id, name")
        .eq("id", characterId)
        .maybeSingle();
      if (!ent) return [];

      const charNorm = norm(ent.name);
      const out: (SeriesCharacter & {
        series: Pick<Series, "id" | "title" | "cover_image_url"> | null;
      })[] = [];

      for (const [sid, roster] of Object.entries(CANON_SERIES_ROSTERS)) {
        const match = roster.find((r) => norm(r.characterName) === charNorm);
        if (match) {
          const s = DEFAULT_CANON_SERIES.find((x) => x.id === sid);
          out.push({
            id: `canon-${sid}-${characterId}`,
            series_id: sid,
            character_id: characterId,
            arc_role: match.arc_role,
            role_in_series: match.role_in_series,
            status: match.status,
            card_theme: null,
            created_at: "2026-11-12T00:00:00.000Z",
            series: s ? { id: s.id, title: s.title, cover_image_url: s.cover_image_url } : null,
          });
        }
      }
      return out;
    },
  });

/** Resolve the character entities referenced by a set of series_characters rows. */
export function seriesMembersQuery(rows: SeriesCharacter[] | undefined) {
  const ids = [...new Set((rows ?? []).map((r) => r.character_id))].sort();
  return queryOptions({
    queryKey: ["series-member-entities", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").in("id", ids);
      if (error) throw error;
      return (data ?? []) as Entity[];
    },
  });
}
