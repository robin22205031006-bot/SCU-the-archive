import fs from "node:fs";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync("drizzle/migrations/0015_app_settings_admin_writes.sql", "utf8");

describe("app_settings write policy (0015)", () => {
  it("drops the old staff-wide write policies", () => {
    for (const op of ["insert", "update", "delete"]) {
      expect(sql).toContain(`DROP POLICY IF EXISTS "staff ${op} app_settings"`);
    }
  });

  it("limits general writes to admins", () => {
    for (const op of ["insert", "update", "delete"]) {
      const policy = sql.slice(sql.indexOf(`CREATE POLICY "admins ${op} app_settings"`));
      expect(policy.slice(0, 260)).toContain("has_role(auth.uid(), 'admin'::public.app_role)");
    }
  });

  it("lets moderators write only the keys they edit in the app", () => {
    const lists = [...sql.matchAll(/key IN \(([^)]*)\)/g)].map((m) => m[1]);
    expect(lists.length).toBe(4);
    for (const list of lists) {
      expect(list).toBe(
        "'spoiler_mask', 'series_styles', 'series_order', 'nexus_symbol_presentation'",
      );
    }
  });
});
