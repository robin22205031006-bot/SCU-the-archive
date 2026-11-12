import { describe, expect, it } from "vitest";
import { canEditEmblemColors } from "@/lib/nexus-symbol-settings";

describe("emblem color permissions", () => {
  it("allows admins", () => expect(canEditEmblemColors(["admin"])).toBe(true));
  it("allows moderators", () => expect(canEditEmblemColors(["moderator"])).toBe(true));
  it("denies readers", () => expect(canEditEmblemColors(["user"])).toBe(false));
  it("denies signed-out visitors", () => expect(canEditEmblemColors([])).toBe(false));
});
