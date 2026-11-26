import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVisualUiMode, uiModeCssVars, VISUAL_UI_MODES } from "@/hooks/use-ui-mode";
import { isClassicBackedMode } from "@/lib/ui-style";
import { resolveUIMode, UI_MODE_OPTIONS } from "@/context/UIStateContext";
import {
  buildCodexFeed,
  codexSeasonsFor,
  codexTabForPath,
  safeCodexPath,
  safePortrait,
  abilityLabel,
} from "@/lib/codex-feed";

describe("Codex UI mode", () => {
  it("replaces Cinematic in every mode list and sits next to Nexus", () => {
    const ids = VISUAL_UI_MODES.map((m) => m.id);
    expect(ids).toContain("codex");
    expect(ids).not.toContain("cinematic");
    expect(ids.indexOf("codex")).toBe(ids.indexOf("nexus") + 1);
    expect(UI_MODE_OPTIONS.map((m) => m.id)).toContain("codex");
    expect(VISUAL_UI_MODES.filter((m) => m.signature).map((m) => m.id)).toEqual(["nexus", "codex"]);
  });

  it("migrates a stored Cinematic choice to Codex", () => {
    expect(resolveVisualUiMode("cinematic")).toBe("codex");
    expect(resolveVisualUiMode("codex")).toBe("codex");
    expect(resolveUIMode("cinematic")).toBe("codex");
  });

  it("reuses Classic pages for app-only routes so data and permissions stay identical", () => {
    expect(isClassicBackedMode("codex")).toBe(true);
    expect(isClassicBackedMode("cinematic")).toBe(false);
    expect(isClassicBackedMode("nexus")).toBe(false);
  });

  it("uses the Codex palette and type in both themes", () => {
    expect(uiModeCssVars("codex", true)["--background"]).toBe("#090b11");
    expect(uiModeCssVars("codex", false)["--background"]).toBe("#edeff6");
    expect(uiModeCssVars("codex", true)["--font-display"]).toContain("Cormorant Garamond");
  });

  it("maps only Codex pages into the frame and rejects unsafe paths", () => {
    expect(codexTabForPath("/")).toBe("home");
    expect(codexTabForPath("/characters/")).toBe("characters");
    expect(codexTabForPath("/map")).toBeNull();
    expect(safeCodexPath("/ability-fx")).toBe("/ability-fx");
    expect(safeCodexPath("//evil.example")).toBeNull();
    expect(safeCodexPath("https://evil.example")).toBeNull();
    expect(safeCodexPath("/a?b=<x>")).toBeNull();
  });
});

describe("Codex feed", () => {
  const series = [{ id: "s1", title: "Sentinels", season_count: 2, season_names: [] }];
  const stats = {
    dossier: {
      "s1:1": { codename: "Gale Warden", status: "Alive", stats: { power: 40, agility: 60 } },
      "s1:2": {
        codename: "Gale Warden",
        status: "Dead",
        stats: { power: 70, agility: 65 },
        abilityStats: { Windstep: { agility: 90 } },
      },
    },
  };

  it("builds the season rail only from seasons that hold dossier data", () => {
    const seasons = codexSeasonsFor(stats, series);
    expect(seasons.map((s) => s.key)).toEqual(["s1:1", "s1:2"]);
    expect(seasons[0]?.label).toBe("Season 1");
    expect(seasons[1]?.status).toBe("Dead");
    expect(seasons[1]?.stats.find((s) => s.key === "power")?.value).toBe(70);
    expect(seasons[1]?.profiles?.[0]?.name).toBe("Windstep");
    expect(seasons[1]?.profiles?.[0]?.stats.find((s) => s.key === "agility")?.value).toBe(90);
    expect(seasons[0]?.profiles).toEqual([]);
  });

  it("collects characters, holders and dossiers without inventing data", () => {
    const feed = buildCodexFeed({
      entities: [
        {
          name: "Ethan Thorne",
          kind: "character",
          alias: "Gale Warden",
          abilities: ["Windstep"],
          stats,
        },
        { name: "Nobody", kind: "character", abilities: [] },
      ],
      series,
      abilities: [{ label: "Unheld Power" }, { label: "Described", description: "Real text" }],
      staff: false,
      mode: "codex",
      modes: [],
    });
    expect(feed.characters.map((c) => c.name)).toEqual(["Ethan Thorne", "Nobody"]);
    expect(feed.characters[0]?.aliases).toEqual(["Gale Warden"]);
    // the same matcher every style uses decides who is already in the Codex
    expect(feed.characters[0]?.codex).toBe("Ethan Thorne");
    expect(feed.characters[1]?.codex).toBeNull();
    expect(feed.abilities.map((a) => a.name)).toEqual(["Described", "Windstep"]);
    expect(feed.abilities[1]?.holders).toEqual(["Ethan Thorne"]);
    // Like Nexus, every character gets a dossier; one with no stats gets a zero Base profile.
    expect(Object.keys(feed.dossiers)).toEqual(["Ethan Thorne", "Nobody"]);
    expect(feed.dossiers["Ethan Thorne"]?.seasons[0]?.empty).toBeUndefined();
    const nobody = feed.dossiers["Nobody"]?.seasons ?? [];
    expect(nobody.map((x) => x.key)).toEqual(["all"]);
    expect(nobody[0]?.empty).toBe(true);
    expect(nobody[0]?.stats).toHaveLength(7);
    expect(nobody[0]?.stats.every((x) => x.value === 0)).toBe(true);
  });
});

describe("Codex feed: spoiler mask, portraits and family", () => {
  const series = [{ id: "s1", title: "Sentinels", season_count: 1, season_names: [] }];
  const ents = [
    {
      id: "1",
      name: "Ethan Thorne",
      kind: "character",
      role: "Main Lead",
      abilities: ["Windstep"],
      image_url: "data:image/png;base64,AAAA",
      stats: { dossier: { "s1:1": { status: "Alive", stats: { power: 50 } } } },
    },
    { id: "2", name: "Issabela", kind: "character", image_url: "javascript:alert(1)" },
  ];
  const relations = [
    { source_id: "2", target_id: "1", rel: "parent" },
    { source_id: "1", target_id: "2", rel: "rival" },
  ];
  const base = {
    entities: ents,
    series,
    abilities: [],
    relations,
    staff: false,
    mode: "codex",
    modes: [],
  };

  it("passes portraits and only family relations when nothing is masked", () => {
    const feed = buildCodexFeed(base);
    expect(feed.characters[0]?.image).toContain("data:image/png");
    expect(feed.characters[1]?.image).toBeUndefined();
    expect(feed.relations).toEqual([{ a: "Issabela", b: "Ethan Thorne", rel: "parent" }]);
    expect(Object.keys(feed.dossiers)).toEqual(["Ethan Thorne", "Issabela"]);
  });

  it("removes masked data from the feed itself, not just from view", () => {
    const feed = buildCodexFeed({
      ...base,
      masked: { characters: true, abilities: false, archive: false, series: false },
    });
    expect(feed.characters[0]?.desc).toBeUndefined();
    expect(feed.dossiers).toEqual({});
    expect(feed.relations).toEqual([]);
    expect(feed.abilities).toEqual([]);
  });

  it("hides ability holders when the abilities mask is on", () => {
    const on = buildCodexFeed({
      ...base,
      abilities: [{ label: "Windstep", description: "Fast." }],
      masked: { characters: false, abilities: true, archive: false, series: false },
    });
    expect(on.abilities[0]?.holders).toEqual([]);
    const off = buildCodexFeed({
      ...base,
      abilities: [{ label: "Windstep", description: "Fast." }],
    });
    expect(off.abilities[0]?.holders).toEqual(["Ethan Thorne"]);
  });

  it("holds back season data when the series mask is on", () => {
    const feed = buildCodexFeed({
      ...base,
      masked: { characters: false, abilities: false, archive: false, series: true },
    });
    expect(feed.dossiers).toEqual({});
  });

  it("builds status history from the Nexus resolver and masks it with characters", () => {
    const withHistory = [
      {
        id: "1",
        name: "Ethan Thorne",
        kind: "character",
        status: "Alive",
        stats: {
          dossier: {
            "s1:1": { status: "Alive" },
            "s1:2": { status: "Dead" },
          },
        },
      },
    ];
    const series2 = [{ id: "s1", title: "Sentinels", season_count: 2, season_names: [] }];
    const feed = buildCodexFeed({ ...base, entities: withHistory, series: series2 });
    const steps = feed.status["Ethan Thorne"]?.steps ?? [];
    expect(steps.map((x) => x.status)).toEqual(["Alive", "Dead"]);
    expect(steps[1]?.transition).toBe(true);
    expect(steps[1]?.season).toBe("s1:2");
    const masked = buildCodexFeed({
      ...base,
      entities: withHistory,
      series: series2,
      masked: { characters: true, abilities: false, archive: false, series: false },
    });
    expect(masked.status).toEqual({});
  });

  it("feeds every bond type and group memberships, and masks them", () => {
    const feed = buildCodexFeed({
      ...base,
      relations: [
        { source_id: "2", target_id: "1", rel: "parent" },
        { source_id: "1", target_id: "2", rel: "Rival", label: "Old grudge" },
      ],
      groups: [{ id: "g1", name: "Sentinels", kind: "organization" }],
      memberships: [{ character_id: "1", group_id: "g1" }],
    });
    expect(feed.bonds.map((b) => b.rel)).toEqual(["parent", "rival"]);
    expect(feed.bonds[1]?.label).toBe("Old grudge");
    expect(feed.relations).toHaveLength(1);
    expect(feed.groups).toEqual([
      { name: "Sentinels", kind: "organization", members: ["Ethan Thorne"] },
    ]);
    const masked = buildCodexFeed({
      ...base,
      groups: [{ id: "g1", name: "Sentinels", kind: "organization" }],
      memberships: [{ character_id: "1", group_id: "g1" }],
      masked: { characters: true, abilities: false, archive: false, series: false },
    });
    expect(masked.bonds).toEqual([]);
    expect(masked.groups).toEqual([]);
  });

  it("resolves ability ranks per season like the Nexus rank map", () => {
    const withAbilities = [
      {
        id: "1",
        name: "Ethan Thorne",
        kind: "character",
        abilities: ["Aerokinesis"],
        stats: {
          dossier: {
            "s1:1": { abilityKeys: ["Aerokinesis"], stats: { power: 40 } },
            "s1:2": { abilityKeys: ["Aerokinesis"], stats: { power: 60 } },
          },
        },
      },
    ];
    const series2 = [{ id: "s1", title: "Sentinels", season_count: 2, season_names: [] }];
    const rows = [
      { entity_id: "1", ability_key: "Aerokinesis", level: 2, series_id: "s1", season_number: 1 },
      { entity_id: "1", ability_key: "Aerokinesis", level: 5, series_id: "s1", season_number: 2 },
    ];
    const feed = buildCodexFeed({
      ...base,
      entities: withAbilities,
      series: series2,
      abilityRows: rows,
    });
    const rk = feed.ranks["Ethan Thorne"];
    expect(rk?.seasons["s1:1"]?.["Aerokinesis"]).toBe(2);
    expect(rk?.seasons["s1:2"]?.["Aerokinesis"]).toBe(5);
    expect(feed.rankMeta.map((m) => m.roman)).toEqual(["I", "II", "III", "IV", "V"]);
    const masked = buildCodexFeed({
      ...base,
      entities: withAbilities,
      series: series2,
      abilityRows: rows,
      masked: { characters: true, abilities: false, archive: false, series: false },
    });
    expect(masked.ranks).toEqual({});
  });

  it("sends the series catalogue with positional season titles, and masks it", () => {
    const feed = buildCodexFeed({
      ...base,
      series: [{ id: "s1", title: "Sentinels", season_count: 3, season_names: ["Awakening"] }],
    });
    expect(feed.series).toEqual([
      { title: "Sentinels", desc: undefined, seasons: ["Awakening", "", ""] },
    ]);
    const masked = buildCodexFeed({
      ...base,
      masked: { characters: false, abilities: false, archive: false, series: true },
    });
    expect(masked.series).toEqual([]);
  });

  it("shows ability names, never raw database keys", () => {
    // registry name first (the one Nexus shows), else a readable form of the key
    expect(abilityLabel("aldercrest_arcane")).toBe("Aldercrest Arcane Discipline");
    expect(abilityLabel("made_up_codex_test_key")).toBe("Made Up Codex Test Key");
    expect(abilityLabel("Wind Guardian Mode")).toBe("Wind Guardian Mode");
    const feed = buildCodexFeed({
      ...base,
      entities: [
        { id: "9", name: "Steven Aldercrest", kind: "character", abilities: ["aldercrest_arcane"] },
      ],
    });
    expect(feed.dossiers["Steven Aldercrest"]?.seasons[0]?.abilities).toEqual([
      "Aldercrest Arcane Discipline",
    ]);
    expect(feed.abilities.some((a) => a.name === "aldercrest_arcane")).toBe(false);
  });

  it("accepts only real image URLs", () => {
    expect(safePortrait("data:image/png;base64,AAAA")).toBeTruthy();
    expect(safePortrait("https://example.com/a.png")).toBeTruthy();
    expect(safePortrait("javascript:alert(1)")).toBeUndefined();
    expect(safePortrait("data:text/html;base64,AAAA")).toBeUndefined();
    expect(safePortrait("http://example.com/a.png")).toBeUndefined();
  });
});

describe("Codex page", () => {
  const html = readFileSync(resolve(__dirname, "../../public/codex/index.html"), "utf8");
  it("carries the host bridge hooks and keeps the Codex layout", () => {
    expect(html).toContain('window.__codexHook("cast"');
    expect(html).toContain('window.__codexHook("abilities"');
    expect(html).toContain("window.__codexApi=");
    expect(html).toContain('id="codex-host-bridge"');
    expect(html).toContain("<h1>SCU Codex</h1>");
    // stat wheel + profile carousel, and the exact (non-Aether-fallback) ability lookup
    expect(html).toContain("function wireWheel");
    expect(html).toContain('class="cxc-t"');
    expect(html).toContain("function findKey");
    // Bonds read the Codex Bloodlines web first and respect the reveal dial
    expect(html).toContain("stAt:stAt");
    expect(html).toContain("BL.E.forEach");
    expect(html).toContain("from the archive");
  });
});
