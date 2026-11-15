import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ARTIFACTS } from "@/lib/arsenal-art";

const isMissingTable = (error: { message?: string; code?: string } | null, table: string) =>
  !!error &&
  (error.code === "PGRST205" ||
    new RegExp(`${table}|schema cache|does not exist`, "i").test(error.message ?? ""));

export const artifactsQuery = queryOptions({
  queryKey: ["artifacts"],
  staleTime: 1000 * 60 * 15,
  gcTime: 1000 * 60 * 60 * 24,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase.from("artifacts").select("*").order("name");
    if (error) {
      if (isMissingTable(error, "artifacts")) return DEFAULT_ARTIFACTS;
      throw error;
    }
    return data && data.length > 0 ? data : DEFAULT_ARTIFACTS;
  },
});
