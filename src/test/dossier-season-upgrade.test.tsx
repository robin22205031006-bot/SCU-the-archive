import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOSSIER_GENDERS,
  DOSSIER_ROLES,
  DOSSIER_STATUSES,
  nexusRole,
  resolveCharacterSeasonAbilities,
  resolveDossierMeta,
} from "@/lib/nexus-season";
import { resolveArtifactSeasonalWielders } from "@/lib/artifacts";
import type { Entity } from "@/lib/entities";

// Mock Supabase client cleanly for SeasonEditor & NexusRosterEditor tests
const mockSelectData: Record<string, unknown[]> = {
  artifacts: [
    {
      id: "art-1",
      name: "Kara Yazgi",
      category: "cursed_weapon",
      weapon_type: "Katana",
      wielders: ["Arzuna"],
      materials: null,
      colors: null,
      curse_level: 4,
      how_it_works: "Cursed blade.",
      lore: "Forged in ash.",
      model_3d_url: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  character_abilities: [
    {
      id: "ca-s1",
      entity_id: "char-grace",
      series_id: "series-sentinels",
      season_number: 1,
      ability_key: "red_lightning",
      level: 2,
      note: null,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "ca-s3",
      entity_id: "char-grace",
      series_id: "series-sentinels",
      season_number: 3,
      ability_key: "dark_flame",
      level: 4,
      note: null,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  series_characters: [
    {
      id: "sc-1",
      series_id: "series-sentinels",
      character_id: "char-grace",
      status: "Alive",
      role_in_series: "Support",
      arc_role: "Support",
    },
  ],
  entities: [
    {
      id: "org-vanguard",
      name: "Vanguard Division",
      kind: "organization",
      category: "Squad",
      role: "Defense",
      status: "Active",
      alias: null,
      description: "Defense force",
      abilities: [],
      beast_traits: [],
      sketches: [],
      image_url: null,
      character_tier: null,
      locked_fields: [],
      stats: {
        dossier: {
          "series-sentinels:2": { roster: true },
        },
      },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "org-horizon",
      name: "Horizon Institute",
      kind: "organization",
      category: "Academy",
      role: "Training",
      status: "Active",
      alias: null,
      description: "Hero academy",
      abilities: [],
      beast_traits: [],
      sketches: [],
      image_url: null,
      character_tier: null,
      locked_fields: [],
      stats: { dossier: {} },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
};

const { updateCalls, insertCalls, deleteCalls } = vi.hoisted(() => ({
  updateCalls: [] as Array<{ table: string; payload: unknown }>,
  insertCalls: [] as Array<{ table: string; payload: unknown }>,
  deleteCalls: [] as Array<{ table: string }>,
}));

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();
  return {
    ...actual,
    useServerFn: () => vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      ilike: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () =>
        Promise.resolve({
          data: {
            id: "char-grace",
            stats: { dossier: {} },
            locked_fields: [],
            status: "Alive",
            role: "Support",
          },
          error: null,
        }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      update: (payload: unknown) => {
        updateCalls.push({ table, payload });
        return {
          eq: () => Promise.resolve({ error: null }),
        };
      },
      insert: (payload: unknown) => {
        insertCalls.push({ table, payload });
        return Promise.resolve({ error: null });
      },
      delete: () => {
        deleteCalls.push({ table });
        return chain;
      },
      then: (resolve: (val: { data: unknown[]; error: null }) => unknown) => {
        const rows = mockSelectData[table] ?? [];
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
    },
  };
});

import { SeasonEditor } from "@/components/nexus-dossier";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";

function makeGraceEntity(): Entity {
  return {
    id: "char-grace",
    name: "Grace",
    kind: "character",
    category: "Support",
    role: "Support",
    status: "Alive",
    alias: "Angel",
    description: "Field operative",
    abilities: [],
    beast_traits: [],
    sketches: [],
    image_url: null,
    character_tier: "sentinel",
    locked_fields: [],
    stats: {
      power: 61,
      agility: 42,
      dossier: {
        "series-sentinels:1": {
          roster: true,
          status: "Alive",
          role: "Support",
          gender: "Female",
          weapons: ["Kara Yazgi"],
          stats: { power: 65, agility: 48 },
        },
        "series-sentinels:2": {
          roster: true,
          status: "Sealed",
          role: "Main Lead",
          gender: "Female",
          weapons: ["Kara Yazgi", "Aether Bow"],
          stats: { power: 78, agility: 60 },
        },
      },
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as Entity;
}

function wrapWithQc(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["artifacts"], mockSelectData["artifacts"]);
  qc.setQueryData(["entities", "bloodline,clan,faction,organization"], mockSelectData["entities"]);
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("Seasonal Dossier Upgrade & Cross-App Sync", () => {
  beforeEach(() => {
    updateCalls.length = 0;
    insertCalls.length = 0;
    deleteCalls.length = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it("carries S1 abilities to S2, isolates S3 future abilities, and respects upgrades & removals", () => {
    const rows = [
      { ability_key: "red_lightning", level: 2, series_id: "s1", season_number: 1, note: null },
      { ability_key: "red_lightning", level: 4, series_id: "s1", season_number: 2, note: null },
      { ability_key: "dark_flame", level: 3, series_id: "s1", season_number: 3, note: null },
      { ability_key: "wind_veil", level: 1, series_id: "s1", season_number: 2, note: null },
    ];

    const s1 = resolveCharacterSeasonAbilities({
      entityAbilities: [],
      rows,
      seriesId: "s1",
      seasonNumber: 1,
    });
    expect(s1.active.map((a) => `${a.canonKey}:${a.level}`)).toEqual(["red_lightning:2"]);

    const s2 = resolveCharacterSeasonAbilities({
      entityAbilities: [],
      rows,
      seriesId: "s1",
      seasonNumber: 2,
    });
    expect(s2.carriedOver.map((a) => `${a.canonKey}:${a.baseLevel}->${a.level}`)).toEqual([
      "red_lightning:2->4",
    ]);
    expect(s2.newlyAcquired.map((a) => `${a.canonKey}:${a.level}`)).toEqual(["wind_veil:1"]);
    // Future S3 dark_flame must not bleed into S2
    expect(s2.active.some((a) => a.canonKey === "dark_flame")).toBe(false);

    // Season removal excludes carried-over S1 ability in S2 (SeasonEditor deletes S2 override + omits from abilityKeys)
    const rowsWithoutS2Override = rows.filter(
      (r) => !(r.ability_key === "red_lightning" && r.season_number === 2),
    );
    const s2Removed = resolveCharacterSeasonAbilities({
      entityAbilities: [],
      rows: rowsWithoutS2Override,
      seriesId: "s1",
      seasonNumber: 2,
      allowedAbilityKeys: ["wind_veil"],
    });
    expect(s2Removed.carriedOver[0]?.excluded).toBe(true);
    expect(s2Removed.active.map((a) => a.canonKey)).toEqual(["wind_veil"]);
    // S1 still retains red_lightning untouched
    const s1After = resolveCharacterSeasonAbilities({
      entityAbilities: [],
      rows: rowsWithoutS2Override,
      seriesId: "s1",
      seasonNumber: 1,
    });
    expect(s1After.active.map((a) => `${a.canonKey}:${a.level}`)).toEqual(["red_lightning:2"]);
  });

  it("resolves Status, Role, Gender, and Weapons per Series + Season and maps Main Lead to hero", () => {
    const grace = makeGraceEntity();
    const s1 = resolveDossierMeta(grace, "series-sentinels", 1);
    const s2 = resolveDossierMeta(grace, "series-sentinels", 2);

    expect(s1.status).toBe("Alive");
    expect(s1.role).toBe("Support");
    expect(s1.gender).toBe("Female");
    expect(s1.weapons).toEqual(["Kara Yazgi"]);

    expect(s2.status).toBe("Sealed");
    expect(s2.role).toBe("Main Lead");
    expect(s2.weapons).toEqual(["Kara Yazgi", "Aether Bow"]);
    expect(nexusRole("Main Lead")).toBe("hero");
    expect(DOSSIER_STATUSES).toEqual(["Alive", "Dead", "Missing", "Presumed Dead", "Sealed"]);
    expect(DOSSIER_ROLES).toEqual([
      "Main Lead",
      "Main Antagonist",
      "Support",
      "Anti-Hero",
      "Anti-Villain",
      "Cameo",
    ]);
    expect(DOSSIER_GENDERS).toEqual(["Male", "Female"]);
  });

  it("resolves artifact seasonal wielders from character dossiers", () => {
    const grace = makeGraceEntity();
    const seriesMap = new Map([["series-sentinels", "The Sentinels"]]);
    const wielders = resolveArtifactSeasonalWielders("Kara Yazgi", [grace], seriesMap);
    expect(wielders).toHaveLength(1);
    expect(wielders[0]?.entityName).toBe("Grace");
    expect(wielders[0]?.labels).toContain("The Sentinels · S1");
    expect(wielders[0]?.labels).toContain("The Sentinels · S2");
  });

  it("renders SeasonEditor header controls (Abilities tab + 5-option Status), Role/Gender/Weapons selectors, and season-filtered Stats dropdown", async () => {
    const grace = makeGraceEntity();
    render(
      wrapWithQc(
        <SeasonEditor
          open
          onClose={vi.fn()}
          entity={grace}
          seasonKey="series-sentinels:2"
          seasonLabel="The Sentinels · Season 2"
          onSaved={vi.fn()}
          seriesCards={[
            { id: "series-sentinels", title: "The Sentinels", seasons: ["S1", "S2", "S3"] },
          ]}
          onSeasonChange={vi.fn()}
        />,
      ),
    );

    // Header Status selector has exact 5 options
    const statusSelect = screen.getByLabelText("Character season status") as HTMLSelectElement;
    expect(Array.from(statusSelect.options).map((o) => o.value)).toEqual([
      "Alive",
      "Dead",
      "Missing",
      "Presumed Dead",
      "Sealed",
    ]);
    expect(statusSelect.value).toBe("Sealed");

    // Role & Gender selectors
    const roleSelect = screen.getByLabelText("Role") as HTMLSelectElement;
    expect(Array.from(roleSelect.options).map((o) => o.text)).toContain("Main Lead");
    expect(Array.from(roleSelect.options).map((o) => o.text)).toContain("Cameo");
    expect(roleSelect.value).toBe("Main Lead");

    const genderSelect = screen.getByLabelText("Gender") as HTMLSelectElement;
    expect(Array.from(genderSelect.options).map((o) => o.value)).toEqual(["", "Male", "Female"]);
    expect(genderSelect.value).toBe("Female");

    // Weapons selector adds and removes weapons
    fireEvent.change(screen.getByLabelText("Custom weapon name"), {
      target: { value: "Chrono Lance" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^Add$/i })[0]!);
    expect(screen.getByText("Chrono Lance")).toBeTruthy();

    // Stats profile dropdown waits for character_abilities load: has S1 carried-over red_lightning, excludes future S3 dark_flame
    const statsProfile = screen.getByLabelText("Edit stats profile") as HTMLSelectElement;
    await waitFor(() => {
      const texts = Array.from(statsProfile.options).map((o) => o.text);
      expect(texts[0]).toBe("Character stats");
      expect(texts.some((t) => /Red Lightning/i.test(t))).toBe(true);
      expect(texts.some((t) => /Dark Flame/i.test(t))).toBe(false);
    });

    // Open Abilities manager tab in header bar
    fireEvent.click(screen.getByRole("tab", { name: /Abilities/i }));
    expect(screen.getByText(/Newly Acquired Abilities \(This Season\)/i)).toBeTruthy();
    expect(screen.getByText(/Existing \/ Carried-Over Abilities/i)).toBeTruthy();

    // Upgrade carried-over Red Lightning -> shows Cancel button -> Cancel reverts back
    const upgradeBtn = screen.getByRole("button", { name: /Upgrade Red Lightning/i });
    fireEvent.click(upgradeBtn);
    expect(screen.getByRole("button", { name: /Cancel Red Lightning upgrade/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Cancel Red Lightning upgrade/i }));
    expect(screen.queryByRole("button", { name: /Cancel Red Lightning upgrade/i })).toBeNull();

    // Save writes dossier + abilities + series_characters
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateCalls.some((c) => c.table === "entities")).toBe(true);
    });
  });

  it("displays Characters and Organizations in NexusRosterEditor and allows adding an organization to the season", async () => {
    const grace = makeGraceEntity();
    render(
      wrapWithQc(
        <NexusRosterEditor
          open
          onClose={vi.fn()}
          entities={[grace]}
          seriesId="series-sentinels"
          season={2}
          label="The Sentinels · S2"
        />,
      ),
    );

    await waitFor(() => {
      expect(screen.getByText(/Characters in this season/i)).toBeTruthy();
      expect(screen.getByText(/Organizations \/ Clans \/ Factions/i)).toBeTruthy();
      expect(screen.getAllByText("Vanguard Division").length).toBeGreaterThan(0);
    });

    const addSelect = screen.getByLabelText(
      "Add character or organization to season",
    ) as HTMLSelectElement;
    expect(Array.from(addSelect.options).some((o) => /Horizon Institute/.test(o.text))).toBe(true);
  });
});
