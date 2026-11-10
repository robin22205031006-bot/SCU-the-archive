import { expect, it } from "vitest";
import { resolveStaticEmblems, staticEmblemPresentation, setStaticNexusEmblems, NEXUS_STATIC_EMBLEMS_KEY } from "@/hooks/use-nexus-emblem-motion";

it("static-emblem preference replaces motion with static artwork", () => {
  expect(staticEmblemPresentation(true, true)).toBe(true);
  expect(staticEmblemPresentation(false, true)).toBe(false);
});
it("system reduced motion and paused animations always use static artwork", () => {
  expect(staticEmblemPresentation(false, false)).toBe(true);
  expect(staticEmblemPresentation(true, false)).toBe(true);
});
it("the reader's static-emblem preference persists without changing other motion settings", () => {
  localStorage.setItem("scu-nexus-theme", "fire");
  setStaticNexusEmblems(true);
  expect(resolveStaticEmblems(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY))).toBe(true);
  expect(localStorage.getItem("scu-nexus-theme")).toBe("fire");
  setStaticNexusEmblems(false);
  expect(resolveStaticEmblems(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY))).toBe(false);
});