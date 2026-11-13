import { describe, expect, it } from "vitest";
import { canonicalCharacterName } from "./adminLoreSync";
import { SEASON_STATUSES } from "./series";
import { NEXUS_ROLES } from "./nexus-roster";

describe("duplicate characters resolve to the in-story name card", () => {
  it("Zayn merges into Zayn Hayes", () =>
    expect(canonicalCharacterName("Zayn")).toBe("zayn hayes"));
  it("Bunny merges into Ethan", () => expect(canonicalCharacterName("Bunny")).toBe("ethan"));
  it("real name Humayra resolves to Amaya", () =>
    expect(canonicalCharacterName("Humayra")).toBe("amaya"));
  it("Ramij resolves to Ramiz Al-Ahd", () =>
    expect(canonicalCharacterName("Ramij")).toBe("ramiz al-ahd"));
  it("The Umbral resolves to The Obsidians", () =>
    expect(canonicalCharacterName("The Umbral")).toBe("the obsidians"));
  it("DEW resolves to D.E.W.", () => expect(canonicalCharacterName("DEW")).toBe("d.e.w."));
  it("codename Nyxia resolves to Xinea", () =>
    expect(canonicalCharacterName("Nyxia")).toBe("xinea"));
});

describe("per-season options", () => {
  it("offers every requested status", () =>
    expect(SEASON_STATUSES).toEqual(
      expect.arrayContaining(["Alive", "Dead", "Missing", "Presumed Dead", "Realive"]),
    ));
  it("offers the exceptional roles", () =>
    expect(NEXUS_ROLES).toEqual(
      expect.arrayContaining(["Main Protagonist", "Main Antagonist", "Impactful Character"]),
    ));
});

describe("latest merges", () => {
  it("Robi resolves to Elizah", () => expect(canonicalCharacterName("Robi")).toBe("elizah"));
  it("Vanguard resolves to Derek Miles", () =>
    expect(canonicalCharacterName("Vanguard")).toBe("derek miles"));
  it("Alter Ethan resolves to Alt Ethan", () =>
    expect(canonicalCharacterName("Alter Ethan")).toBe("alt ethan"));
  it("Corvani resolves to Marcello Corvani", () =>
    expect(canonicalCharacterName("Corvani")).toBe("marcello corvani"));
  it("Aariz resolves to Aariz Maddox", () =>
    expect(canonicalCharacterName("Aariz")).toBe("aariz maddox"));
  it("Damian resolves to Damian Brown", () =>
    expect(canonicalCharacterName("Damian")).toBe("damian brown"));
  it("Silas resolves to Silas Duskmoor", () =>
    expect(canonicalCharacterName("Silas")).toBe("silas duskmoor"));
  it("Anna resolves to Anna Al-Ahd", () =>
    expect(canonicalCharacterName("Anna")).toBe("anna al-ahd"));
  it("Sparda resolves to Prince of Demons (Sparda)", () =>
    expect(canonicalCharacterName("Sparda")).toBe("prince of demons (sparda)"));
  it("Ayaan Siddiqi resolves to Ayaan Siddique", () =>
    expect(canonicalCharacterName("Ayaan Siddiqi")).toBe("ayaan siddique"));
  it("Prime Nyxia resolves to Xinea", () =>
    expect(canonicalCharacterName("Prime Nyxia")).toBe("xinea"));
});

describe("canonical series and standalone epics", () => {
  it("provides 5 canonical series", async () => {
    const { DEFAULT_CANON_SERIES } = await import("./series");
    const titles = DEFAULT_CANON_SERIES.map((s) => s.title);
    expect(titles).toEqual([
      "The Sentinels",
      "Redline",
      "Bloodline",
      "Divine Beast",
      "Standalone Epics",
    ]);
  });

  it("Standalone Epics includes Zaan, Khalid, and Alister", async () => {
    const { DEFAULT_CANON_SERIES } = await import("./series");
    const standalone = DEFAULT_CANON_SERIES.find((s) => s.title === "Standalone Epics");
    expect(standalone).toBeDefined();
    expect(standalone?.season_names).toEqual(["Zaan", "Khalid", "Alister"]);
  });

  it("canonical rosters cover core characters in Standalone Epics", async () => {
    const { CANON_SERIES_ROSTERS } = await import("./series");
    const standaloneRoster = CANON_SERIES_ROSTERS["Standalone Epics"];
    expect(standaloneRoster).toBeDefined();
    const names = (standaloneRoster ?? []).map((r) => r.characterName);
    expect(names).toEqual(expect.arrayContaining(["Zaan", "Khalid", "Alistair Quinn"]));
  });
});
