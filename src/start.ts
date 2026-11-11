import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { supabase } from "@/integrations/supabase/client";

// Replaces the generated attacher: refreshes an expired/near-expiry session
// before sending it, so stale tokens on reopened phones are never sent.
const attachFreshAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let { data } = await supabase.auth.getSession();
  const exp = data.session?.expires_at ?? 0;
  if (data.session && exp * 1000 - Date.now() < 60_000) {
    const r = await supabase.auth.refreshSession();
    data = { session: r.data.session } as typeof data;
  }
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachFreshAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
