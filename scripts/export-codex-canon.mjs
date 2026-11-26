#!/usr/bin/env node
// Exports the Codex's canon (cast, ability holders, bonds) from the built Codex page into
// src/generated/codex-canon.json, so every UI style can show Codex details where the Codex
// has them. Runs the real page standalone (no app feed, so nothing from the archive leaks
// in) and reads its data after every in-page canon correction has run.
// Dev-only (needs Playwright). Usage: node scripts/build-codex.mjs && node scripts/export-codex-canon.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const page = pathToFileURL(resolve(root, "public/codex/index.html")).href;

const browser = await chromium.launch();
const tab = await browser.newPage();
// The CDN chart library is not needed to read data; block it so export works offline.
await tab.route(/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await tab.goto(page);
await tab.waitForFunction(() => typeof BR !== "undefined" && typeof CAST !== "undefined");
const canon = await tab.evaluate(() => {
  const cl = (n) => (typeof clean === "function" ? clean(n) : String(n).replace(/\*$/, ""));
  const groups = [];
  BR.forEach((br) =>
    br.g.forEach((g) => {
      if (g.p) return; // proposed, not canon
      groups.push({
        name: cl(g.n),
        branch: br.nm,
        tier: br.tier,
        desc: g.d || "",
        holders: (g.h || []).slice(),
        leaves: (g.k || []).map((l) => cl(l.n)),
      });
    }),
  );
  const cast = CAST.map((r) => ({
    name: r[0],
    realName: r[1] || "",
    codename: r[2] || "",
    bloodline: r[3] || "",
    desc: r[4] || "",
    group: r[5] || "",
  }));
  const byId = {};
  BL.N.forEach((n) => {
    byId[n.id] = (typeof castOf === "function" && castOf(n.n)) || n.n;
  });
  const bonds = BL.E.map((e) => ({
    a: byId[e[0]],
    b: byId[e[1]],
    type: e[2],
    label: e[3] || "",
  })).filter((e) => e.a && e.b && e.a !== e.b);
  return { cast, groups, bonds };
});
await browser.close();

const out = resolve(root, "src/generated/codex-canon.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(canon, null, 1) + "\n");
console.log(
  `export-codex-canon: ${canon.cast.length} characters, ${canon.groups.length} ability groups, ${canon.bonds.length} bonds -> ${out}`,
);
