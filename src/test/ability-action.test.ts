import { describe, expect, it } from "vitest";
import { actionStyle, choreography } from "@/lib/ability-action";
describe("ability in action", () => {
  it("Weston's white lightning is used for speed, not a beam", () => { expect(actionStyle("white_lightning_drive")).toBe("speedBlitz"); });
  it("female fighters kick where male fighters punch", () => {
    expect(choreography("lightning", "female").some(s => s.pose === "kick")).toBe(true);
    expect(choreography("lightning", "male").some(s => s.pose === "punch")).toBe(true);
  });
});
