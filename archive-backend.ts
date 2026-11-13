/** Public connection defaults for the archive owned by this project. */
export const ARCHIVE_BACKEND = {
  url: "https://csdmkmtfhgxkjmucepjo.supabase.co",
  key: "sb_publishable_sILQFbQTWnkvbDG1BTZ2Cw_0i5HpMIx",
  projectId: "csdmkmtfhgxkjmucepjo",
};

export function resolveArchiveBackend(env: Record<string, string | undefined>) {
  const url = env["VITE_SUPABASE_URL"];
  // Imported configuration belongs to a different archive. Never ship it again.
  if (!url || url.includes("placeholder") || url.includes("2c3743b4-a0ff-4079-b412-eba03e4ddcc7") || url.includes("raplydgyiqrxoyxzdpbr")) {
    return ARCHIVE_BACKEND;
  }
  return {
    url: url.replace(/\/+$/, ""),
    key: env["VITE_SUPABASE_PUBLISHABLE_KEY"] || ARCHIVE_BACKEND.key,
    projectId: env["VITE_SUPABASE_PROJECT_ID"] || ARCHIVE_BACKEND.projectId,
  };
}