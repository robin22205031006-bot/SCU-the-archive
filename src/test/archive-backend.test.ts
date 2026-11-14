import { describe, expect, it } from "vitest";
import { ARCHIVE_BACKEND, resolveArchiveBackend } from "../../archive-backend";

describe("published archive connection", () => {
  it("uses the project containing the 123 saved character records when build settings are absent", () => {
    expect(resolveArchiveBackend({}).projectId).toBe("csdmkmtfhgxkjmucepjo");
    expect(resolveArchiveBackend({}).url).toBe("https://csdmkmtfhgxkjmucepjo.supabase.co");
  });
  it("rejects the imported old archive instead of publishing its outdated characters", () => {
    expect(
      resolveArchiveBackend({
        VITE_SUPABASE_URL: "https://c--2c3743b4-a0ff-4079-b412-eba03e4ddcc7-prod.lovable.cloud",
        VITE_SUPABASE_PUBLISHABLE_KEY: "old-public-key",
        VITE_SUPABASE_PROJECT_ID: "raplydgyiqrxoyxzdpbr",
      }),
    ).toEqual(ARCHIVE_BACKEND);
  });
  it("keeps the managed preview connection and does not overwrite server runtime settings", () => {
    const env = {
      VITE_SUPABASE_URL: "https://preview.example/",
      VITE_SUPABASE_PUBLISHABLE_KEY: "preview-public-key",
      SUPABASE_URL: "http://runtime.internal",
    };
    expect(resolveArchiveBackend(env).url).toBe("https://preview.example");
    expect(env.SUPABASE_URL).toBe("http://runtime.internal");
  });
});
