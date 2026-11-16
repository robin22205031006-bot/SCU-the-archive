import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { resolveArchiveBackend } from "./archive-backend";

const { url, key, projectId: pid } = resolveArchiveBackend(process.env);
// Runtime server credentials are managed by Cloud; do not overwrite them with
// browser build-time values or a preview proxy URL.

function isProxyAbortError(err: unknown, aborted: boolean): boolean {
  if (aborted) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: unknown; message?: unknown; code?: unknown };
  return (
    e.name === "AbortError" ||
    e.code === "ECONNRESET" ||
    e.code === "ERR_STREAM_PREMATURE_CLOSE" ||
    e.message === "aborted"
  );
}

function supabaseProxyPlugin(targetOrigin: string): Plugin {
  return {
    name: "supabase-proxy",
    configureServer(server) {
      server.middlewares.use("/_supabase", async (req, res) => {
        const controller = new AbortController();
        const abortProxy = () => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        };
        req.once("aborted", abortProxy);
        res.once("close", () => {
          if (!res.writableEnded) abortProxy();
        });

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
              if (controller.signal.aborted) return;
              chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks);
            }
          }

          if (controller.signal.aborted || res.destroyed || res.writableEnded) return;

          const response = await fetch(fullTargetUrl, {
            method: req.method ?? "GET",
            headers,
            signal: controller.signal,
            ...(body ? { body: new Uint8Array(body), duplex: "half" } : {}),
          });

          if (controller.signal.aborted || res.destroyed || res.writableEnded) return;

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
          if (controller.signal.aborted || res.destroyed || res.writableEnded) return;
          res.end(Buffer.from(arrayBuffer));
        } catch (err: unknown) {
          if (isProxyAbortError(err, controller.signal.aborted || req.destroyed || res.destroyed)) {
            if (!res.writableEnded && !res.destroyed) {
              res.end();
            }
            return;
          }
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
      watch: {
        ignored: ["**/.output/**", "**/android/**", "**/.aistudio/**"],
      },
    },
    plugins: [supabaseProxyPlugin(url)],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(pid),
    },
    build: {
      target: "esnext",
      chunkSizeWarningLimit: 1200,
    },
    environments: {
      client: {
        build: {
          target: "esnext",
          rollupOptions: {
            output: {
              manualChunks(id: string) {
                if (id.includes("/lore-export/") || id.includes("\\lore-export\\")) {
                  return "lore-export";
                }
                if (
                  id.includes("/node_modules/three/") ||
                  id.includes("\\node_modules\\three\\") ||
                  id.includes("/node_modules/@react-three/") ||
                  id.includes("\\node_modules\\@react-three\\")
                ) {
                  return "vendor-three";
                }
                if (
                  id.includes("/node_modules/framer-motion/") ||
                  id.includes("\\node_modules\\framer-motion\\")
                ) {
                  return "vendor-motion";
                }
                if (
                  id.includes("/node_modules/recharts/") ||
                  id.includes("\\node_modules\\recharts\\") ||
                  id.includes("/node_modules/d3-") ||
                  id.includes("\\node_modules\\d3-")
                ) {
                  return "vendor-charts";
                }
                return undefined;
              },
            },
          },
        },
      },
    },
  },
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
