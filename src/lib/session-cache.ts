import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

/** Remove account-dependent data before exposing a new identity. */
export function syncSessionCache(client: QueryClient, user: User | null, force = false) {
  const previous = client.getQueryData<User | null>(["session"]);
  if (!force && user && previous?.id === user.id) {
    client.setQueryData(["session"], user);
    return false;
  }
  void client.cancelQueries();
  client.removeQueries();
  client.setQueryData(["session"], user);
  return true;
}
