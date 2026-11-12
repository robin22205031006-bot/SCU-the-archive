import { describe, expect, it } from "vitest";
import { isSuperadminEmail, isVerifiedSuperadmin } from "@/lib/roles";

describe("designated superadmin", () => {
  it("recognizes zananrobin@gmail.com irrespective of email casing", () => {
    expect(isSuperadminEmail(" ZananRobin@gmail.com ")).toBe(true);
    expect(isSuperadminEmail("reader@gmail.com")).toBe(false);
  });
  it("requires a confirmed identity before superadmin bootstrap", () => {
    expect(
      isVerifiedSuperadmin({
        email: "zananrobin@gmail.com",
        email_confirmed_at: "2026-11-09T17:15:03Z",
      }),
    ).toBe(true);
    expect(isVerifiedSuperadmin({ email: "zananrobin@gmail.com" })).toBe(false);
    expect(
      isVerifiedSuperadmin({
        email: "reader@gmail.com",
        email_confirmed_at: "2026-11-09T17:15:03Z",
      }),
    ).toBe(false);
  });
});
