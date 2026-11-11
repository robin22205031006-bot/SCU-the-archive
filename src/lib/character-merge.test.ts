import { describe, expect, it } from "vitest";
import { canonicalCharacterName } from "./adminLoreSync";
import { SEASON_STATUSES } from "./series";
import { NEXUS_ROLES } from "./nexus-roster";

describe("duplicate characters resolve to the in-story name card", () => {
  it("Zayn merges into Zayn Hayes", () => expect(canonicalCharacterName("Zayn")).toBe("zayn hayes"));
  it("Bunny merges into Ethan", () => expect(canonicalCharacterName("Bunny")).toBe("ethan"));
  it("real name Humayra resolves to Amaya", () => expect(canonicalCharacterName("Humayra")).toBe("amaya"));
  it("Ramij resolves to Ramiz Al-Ahd", () => expect(canonicalCharacterName("Ramij")).toBe("ramiz al-ahd"));
  it("The Umbral resolves to The Obsidians", () => expect(canonicalCharacterName("The Umbral")).toBe("the obsidians"));
  it("DEW resolves to D.E.W.", () => expect(canonicalCharacterName("DEW")).toBe("d.e.w."));
  it("codename Nyxia resolves to Xinea", () => expect(canonicalCharacterName("Nyxia")).toBe("xinea"));
});

describe("per-season options", () => {
  it("offers every requested status", () =>
    expect(SEASON_STATUSES).toEqual(expect.arrayContaining(["Alive", "Dead", "Missing", "Presumed Dead", "Realive"])));
  it("offers the exceptional roles", () =>
    expect(NEXUS_ROLES).toEqual(expect.arrayContaining(["Main Protagonist", "Main Antagonist", "Impactful Character"])));
});
