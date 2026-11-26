import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVisualUiMode, uiModeCssVars, VISUAL_UI_MODES } from "@/hooks/use-ui-mode";
import { isClassicBackedMode } from "@/lib/ui-style";
import { resolveUIMode, UI_MODE_OPTIONS } from "@/context/UIStateContext";
import { buildCodexFeed, codexSeasonsFor, codexTabForPath, safeCodexPath } from "@/lib/codex-feed";

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
      "s1:2": { codename: "Gale Warden", status: "Dead", stats: { power: 70, agility: 65 } },
    },
  };

  it("builds the season rail only from seasons that hold dossier data", () => {
    const seasons = codexSeasonsFor(stats, series);
    expect(seasons.map((s) => s.key)).toEqual(["s1:1", "s1:2"]);
    expect(seasons[0]?.label).toBe("Season 1");
    expect(seasons[1]?.status).toBe("Dead");
    expect(seasons[1]?.stats.find((s) => s.key === "power")?.value).toBe(70);
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
    expect(feed.abilities.map((a) => a.name)).toEqual(["Described", "Windstep"]);
    expect(feed.abilities[1]?.holders).toEqual(["Ethan Thorne"]);
    expect(Object.keys(feed.dossiers)).toEqual(["Ethan Thorne"]);
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
  });
});
