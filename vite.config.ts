import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { resolveArchiveBackend } from "./archive-backend";

const { url, key, projectId: pid } = resolveArchiveBackend(process.env);
// Runtime server credentials are managed by Cloud; do not overwrite them with
// browser build-time values or a preview proxy URL.

function supabaseProxyPlugin(targetOrigin: string): Plugin {
  return {
    name: "supabase-proxy",
    configureServer(server) {
      server.middlewares.use("/_supabase", async (req, res) => {
        try {
          const reqUrl = req.url || "/";
          const fullTargetUrl = `${targetOrigin}${reqUrl}`;

          const headers = new Headers();
          for (const [headerKey, val] of Object.entries(req.headers)) {
            if (val && !["host", "connection", "keep-alive"].includes(headerKey.toLowerCase())) {
              headers.set(headerKey, Array.isArray(val) ? val.join(", ") : val);
            }
          }
          headers.set("host", new URL(targetOrigin).host);

          let body: Buffer | undefined;
          if (req.method !== "GET" && req.method !== "HEAD") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks);
            }
          }

          const response = await fetch(fullTargetUrl, {
            method: req.method ?? "GET",
            headers,
            ...(body ? { body: new Uint8Array(body), duplex: "half" } : {}),
          });

          res.statusCode = response.status;
          response.headers.forEach((value, name) => {
            const lower = name.toLowerCase();
            if (
              !["content-encoding", "content-length", "transfer-encoding", "connection"].includes(
                lower,
              )
            ) {
              res.setHeader(name, value);
            }
          });
          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (err: unknown) {
          const cause =
            err && typeof err === "object" && "cause" in err
              ? (err as { cause?: unknown }).cause
              : undefined;
          console.error("[supabase-proxy] Error:", err, cause);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end(String(cause || err));
          }
        }
      });
    },
  };
}

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
    plugins: [supabaseProxyPlugin(url)],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(pid),
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
