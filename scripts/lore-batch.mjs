// Parallel PDF → lore JSON extractor.
// Usage: GOOGLE_API_KEY=... GOOGLE_API_KEY_2=... node scripts/lore-batch.mjs ./lore-docs
// One worker per available key; each PDF gets a hard 30s budget, then is skipped.
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const TIMEOUT_MS = 30_000;
const SRC_DIR = process.argv[2] || "./lore-docs";
const OUT_DIR = path.resolve("lore-export");
const KEYS = ["GOOGLE_API_KEY", "GOOGLE_API_KEY_2", "GOOGLE_API_KEY_3", "GOOGLE_API_KEY_4"]
  .map((n) => process.env[n])
  .filter(Boolean);

if (!KEYS.length) {
  console.error("No GOOGLE_API_KEY* variables set.");
  process.exit(1);
}

const PROMPT = `Extract structured SCU lore from this text. Only include facts stated in the text,
and give a short verbatim "quote" from the text for each item. Return strictly valid JSON:
{"characters":[{"name":"","bio":"","faction":"","quote":""}],
 "organizations":[{"name":"","description":"","quote":""}],
 "timeline_events":[{"year":"","event_name":"","description":"","quote":""}]}
Text:
`;

async function pdfText(file) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    text += (await page.getTextContent()).items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

function withTimeout(fn) {
  const ctrl = new AbortController();
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => {
      ctrl.abort();
      rej(new Error(`timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);
  });
  return Promise.race([fn(ctrl.signal), timeout]).finally(() => clearTimeout(timer));
}

async function processFile(ai, file) {
  return withTimeout(async (signal) => {
    const text = await pdfText(file);
    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: PROMPT + text.slice(0, 30000),
      config: { responseMimeType: "application/json", abortSignal: signal },
    });
    const data = JSON.parse(res.text ?? "{}");
    const out = path.join(OUT_DIR, path.basename(file) + ".json");
    fs.writeFileSync(out, JSON.stringify({ source: path.basename(file), ...data }, null, 2));
    return data;
  });
}

const files = fs
  .readdirSync(SRC_DIR)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .map((f) => path.join(SRC_DIR, f));
fs.mkdirSync(OUT_DIR, { recursive: true });

const queue = [...files];
const ok = [];
const failed = [];
const started = Date.now();

async function worker(key, id) {
  const ai = new GoogleGenAI({ apiKey: key });
  for (let file = queue.shift(); file; file = queue.shift()) {
    const t = Date.now();
    try {
      await processFile(ai, file);
      ok.push(file);
      console.log(`[w${id}] ✓ ${path.basename(file)} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
    } catch (err) {
      failed.push({ file: path.basename(file), error: err?.message ?? String(err) });
      console.error(`[w${id}] ✗ ${path.basename(file)}: ${err?.message ?? err}`);
    }
  }
}

console.log(`Processing ${files.length} PDFs with ${KEYS.length} parallel workers...`);
await Promise.all(KEYS.map((k, i) => worker(k, i + 1)));

fs.writeFileSync(path.join(OUT_DIR, "batch-errors.json"), JSON.stringify(failed, null, 2));
console.log(
  `Done in ${((Date.now() - started) / 1000).toFixed(1)}s: ${ok.length} ok, ${failed.length} failed (see lore-export/batch-errors.json)`,
);
process.exit(0);
