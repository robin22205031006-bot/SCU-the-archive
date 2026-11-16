import { describe, expect, it } from "vitest";
import { tiltAngle } from "@/hooks/use-nexus-tilt";
describe("nexus tilt", () => {
  it("caps tilt at 4 degrees", () => {
    expect(tiltAngle(0.5)).toBe(4);
    expect(tiltAngle(-0.9)).toBe(-4);
    expect(tiltAngle(0.25)).toBe(2);
  });
});
