#!/usr/bin/env node
// Builds public/codex/index.html from the Codex source page plus the host bridge.
// The Codex layout and story data stay untouched; this only inserts small hooks so the
// app can add missing characters/abilities, route host tabs and draw the season dossier.
// Usage: node scripts/build-codex.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

let html = read("codex/codex.base.html");
const head = read("codex/bridge-head.js");
const body = read("codex/bridge.js") + "\n" + read("codex/bridge-atlas.js");
const css = read("codex/bridge.css") + "\n" + read("codex/bridge-atlas.css");

function patch(label, re, fn) {
  const next = html.replace(re, fn);
  if (next === html) throw new Error(`build-codex: hook "${label}" did not apply`);
  html = next;
}

// 1. head bridge runs before every Codex script
patch("head", /<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/d3/, (m) => `<script>\n${head}\n</script>\n${m}`);
// 2. cast merge right after the cast table is declared
patch("cast", /(\nconst CAST = \[.*\];\n)/, (m) => `${m}try{window.__codexHook&&window.__codexHook("cast",{CAST:CAST})}catch(e){}\n`);
// 3. ability merge after every branch is declared
// (after the Codex's own guardian/canon additions, so its entries are known before ours)
patch("abilities", /\nconst clean=n=>n\.replace/, (m) => `\ntry{window.__codexHook&&window.__codexHook("abilities",{BR:BR,G:G,GLY:GLY,DEF:typeof DEF!=="undefined"?DEF:null})}catch(e){}${m}`);
// 4a. series catalogue merge (fill blank season titles, add missing series)
patch("series", /(\nconst SER0=\[.*\);)/, (m) => `${m}\ntry{window.__codexHook&&window.__codexHook("series",{SER0:SER0})}catch(e){}`);
// 4. extra host destinations in the dock
patch("tabs", /(\nconst NT=\[.*\];)/, (m) => `${m}\ntry{NT.push.apply(NT,window.__codexExtraTabs||[]);if(window.__codexLocalMap)NT.forEach(function(n){if(n[0]==="map")n[4]="local";});}catch(e){}`);
// 5. expose the dock router to the bridge
patch("api", /\nrender\(\);\n\}\)\(\);\n<\/script>\n<\/body>/, () => `\ntry{window.__codexApi={NT:NT,showTab:showTab,ntNow:ntNow,drawDock:drawDock,stAt:stAt}}catch(e){}\nrender();\n})();\n</script>\n<style id="codex-host-css">\n${css}\n</style>\n<script id="codex-host-bridge">\n${body}\n</script>\n</body>`);

html = html.replace("<title>SCU Codex</title>", "<title>SCU Codex</title>\n<meta name=\"robots\" content=\"noindex\">");

const out = resolve(root, "public/codex/index.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`build-codex: wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
