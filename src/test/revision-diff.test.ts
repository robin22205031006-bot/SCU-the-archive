import { it, expect } from "vitest";
import { revisionDiff } from "@/lib/revision-diff";
it("compares season role changes without unrelated unchanged values", () =>
  expect(
    revisionDiff(
      { stats: { dossier: { "s:1": { role: "Support", power: 20 } } } },
      { stats: { dossier: { "s:1": { role: "Main Protagonist", power: 20 } } } },
    ),
  ).toEqual([
    { field: "stats.dossier.s:1.role", before: '"Support"', after: '"Main Protagonist"' },
  ]));
it("preserves deleted values for comparison", () =>
  expect(revisionDiff({ status: "Dead" }, {})).toEqual([
    { field: "status", before: '"Dead"', after: "—" },
  ]));
