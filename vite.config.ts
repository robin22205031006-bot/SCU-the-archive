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
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/routes/index.tsx",
          "./src/routes/auth.tsx",
          "./src/components/series-page.tsx",
        ],
      },
    },
    plugins: [supabaseProxyPlugin(url)],
    optimizeDeps: {
      holdUntilCrawlEnd: true,
      include: [
        "@radix-ui/react-accordion",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-aspect-ratio",
        "@radix-ui/react-avatar",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-collapsible",
        "@radix-ui/react-context-menu",
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-hover-card",
        "@radix-ui/react-label",
        "@radix-ui/react-menubar",
        "@radix-ui/react-navigation-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-progress",
        "@radix-ui/react-radio-group",
        "@radix-ui/react-scroll-area",
        "@radix-ui/react-select",
        "@radix-ui/react-separator",
        "@radix-ui/react-slider",
        "@radix-ui/react-slot",
        "@radix-ui/react-switch",
        "@radix-ui/react-tabs",
        "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group",
        "@radix-ui/react-tooltip",
        "@react-three/drei",
        "@react-three/fiber",
        "@supabase/supabase-js",
        "@tanstack/react-query",
        "@tanstack/react-query-persist-client",
        "animejs",
        "canvas-confetti",
        "class-variance-authority",
        "clsx",
        "cmdk",
        "date-fns",
        "embla-carousel-react",
        "framer-motion",
        "idb-keyval",
        "input-otp",
        "jspdf",
        "lucide-react",
        "pdfjs-dist",
        "react-day-picker",
        "react-hook-form",
        "react-resizable-panels",
        "react-zoom-pan-pinch",
        "recharts",
        "sonner",
        "tailwind-merge",
        "three",
        "three/addons/controls/OrbitControls.js",
        "three/addons/environments/RoomEnvironment.js",
        "three/addons/libs/meshopt_decoder.module.js",
        "three/addons/lights/RectAreaLightUniformsLib.js",
        "three/addons/loaders/DRACOLoader.js",
        "three/addons/loaders/GLTFLoader.js",
        "use-webmcp-tool",
        "vaul",
        "zod",
      ],
    },
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
                // three.js and recharts are intentionally not forced into manual chunks:
                // shared bundler helpers landed in them and made the entry bundle
                // download ~1.8 MB of 3D and chart code before first paint.
                if (
                  id.includes("/node_modules/framer-motion/") ||
                  id.includes("\\node_modules\\framer-motion\\")
                ) {
                  return "vendor-motion";
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
    output: {
      dir: "dist",
      serverDir: "dist/server",
      publicDir: "dist/client",
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
