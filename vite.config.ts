import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

const REAL_SUPABASE_URL = "https://c--2c3743b4-a0ff-4079-b412-eba03e4ddcc7-prod.lovable.cloud";
const REAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FSGOMkkM8_gDbaY7lfAyEg_d7tLjyhW";
const REAL_SUPABASE_PROJECT_ID = "raplydgyiqrxoyxzdpbr";

function cleanUrl(val: string | undefined): string {
  if (!val || val.includes("placeholder.supabase.co")) return REAL_SUPABASE_URL;
  return val.replace(/\/+$/, "");
}

function cleanKey(val: string | undefined): string {
  if (!val || val.includes("placeholder")) return REAL_SUPABASE_PUBLISHABLE_KEY;
  return val;
}

function cleanPid(val: string | undefined): string {
  if (!val || val.includes("placeholder")) return REAL_SUPABASE_PROJECT_ID;
  return val;
}

const url = cleanUrl(process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"]);
const key = cleanKey(
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"],
);
const pid = cleanPid(process.env["VITE_SUPABASE_PROJECT_ID"] || process.env["SUPABASE_PROJECT_ID"]);

// Populate server process environment so SSR and server functions have access to real Supabase variables
process.env["SUPABASE_URL"] = url;
process.env["SUPABASE_PUBLISHABLE_KEY"] = key;
process.env["VITE_SUPABASE_URL"] = url;
process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] = key;
process.env["VITE_SUPABASE_PROJECT_ID"] = pid;

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
