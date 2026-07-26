#!/usr/bin/env node
/**
 * gen-vlog-e-images.mjs
 *
 * Generate 32 chibi-style AI photos for vlog script E (4 Taiwanese boys with GoPros)
 * and upload them to Supabase storage.
 *
 * Pipeline:
 *   1. Parse src/app/vlog/data.ts → extract 32 e-img-* lines from E_DAYS (L2969-3708)
 *   2. For each line: POST to local dev server /api/postcard/generate-pockgo
 *      body: { prompt: <prompt text>, model: "gpt-image-2-2k" }
 *      → returns { image: <base64 jpeg>, ... }
 *   3. Decode base64 → Buffer
 *   4. POST to Supabase storage with upsert:true
 *      URL: https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/user-attraction-photos/vlog/day{N}/{filename}.jpg
 *      (NOTE: bucket prefix is `vlog/` — confirmed via curl on existing img-01-t1-airport.jpg)
 *
 * Failure handling:
 *   - pockgo 500: retry 2x with 5s sleep, then skip
 *   - gpt-image-2-2k no-channel / content policy: retry 2x, then skip with log
 *   - Supabase 409 (already exists): treat as success
 *   - Save progress to /tmp/vlog-e-images.json every 5 images for resumability
 *
 * Total budget: 90 minutes. Sequential only (gpt-image-2-2k takes 60-120s/image).
 *
 * Usage:
 *   cd /Volumes/Transcend/manga-studio/frontend
 *   node scripts/gen-vlog-e-images.mjs                # process all 32
 *   node scripts/gen-vlog-e-images.mjs --limit 4      # process first 4 (test)
 *   node scripts/gen-vlog-e-images.mjs --force        # re-process already-uploaded too
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = resolve(__dirname, "..");
const DATA_TS = resolve(FRONTEND_ROOT, "src/app/vlog/data.ts");

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SB_KEY = "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";
const POCKGO_URL = "http://localhost:3001/api/postcard/generate-pockgo";
const BUCKET = "user-attraction-photos";
const PROGRESS_FILE = "/tmp/vlog-e-images.json";

// 90 min total timeout
const START_TIME_MS = Date.now();
const TOTAL_BUDGET_MS = 90 * 60 * 1000;

const args = process.argv.slice(2);
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i > -1 ? parseInt(args[i + 1], 10) || Infinity : Infinity;
})();
const FORCE = args.includes("--force");

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(...args) {
  console.log(ts(), ...args);
}
function truncPrompt(p, n = 80) {
  return p.length > n ? p.slice(0, n) + "…" : p;
}

// ─────────────────────────────────────────────────────────
// 1. Parse data.ts → extract 32 (URL, prompt) pairs from E_DAYS
// ─────────────────────────────────────────────────────────
function parseEDays(text) {
  const startIdx = text.indexOf("const E_DAYS: DayBlock[] = [");
  if (startIdx < 0) throw new Error("E_DAYS start not found in data.ts");
  // The "[" in "DayBlock[]" comes BEFORE the array's "[", so find the SECOND "[":
  // the array literal "[" is preceded by "= "
  const eqIdx = text.indexOf("= [", startIdx);
  if (eqIdx < 0) throw new Error("E_DAYS array '[' not found");
  const openIdx = eqIdx + 2; // position of the "["

  // bracket-balance, ignoring braces that occur inside backtick or dq strings
  let depth = 0;
  let i = openIdx;
  let inTick = false, inDq = false, esc = false;
  let endIdx = -1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && (inTick || inDq)) { esc = true; continue; }
    if (!inDq && c === "`") { inTick = !inTick; continue; }
    if (!inTick && c === '"') { inDq = !inDq; continue; }
    if (inTick || inDq) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) { endIdx = i + 1; break; }
    }
  }
  if (endIdx < 0) throw new Error("E_DAYS end not found");
  const block = text.slice(startIdx, endIdx);

  // Each e-img line: "src=<URL> — "<prompt>""
  // Capture: src URL (.jpg) and the quoted prompt
  const lineRe = /src=(https:\/\/[^\s]+?\.jpg)\s+—\s+"([^"]+)"/g;
  const items = [];
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const url = m[1];
    const prompt = m[2];
    // parse day{N} from URL: /vlog/dayN/
    const dayMatch = url.match(/\/vlog\/day(\d+)\//);
    const fileMatch = url.match(/\/([^/]+)\.jpg$/);
    if (!dayMatch || !fileMatch) {
      log(`  ! skip unparseable URL: ${url}`);
      continue;
    }
    const day = parseInt(dayMatch[1], 10);
    const filename = fileMatch[1]; // e.g. "e-img-01-gopro-unbox"
    items.push({ url, prompt, day, filename });
  }
  return items;
}

// ─────────────────────────────────────────────────────────
// 2. Call pockgo API (with retry)
// ─────────────────────────────────────────────────────────
async function callPockgo(prompt) {
  const MAX_ATTEMPTS = 3; // initial + 2 retry
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
      // 150s hard timeout — pockgo is 120s server, give buffer
      const to = setTimeout(() => ctrl.abort(), 150_000);
      const r = await fetch(POCKGO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "gpt-image-2-2k", autoFallback: true }),
        signal: ctrl.signal,
      });
      clearTimeout(to);

      if (!r.ok) {
        const body = (await r.text()).slice(0, 400);
        throw new Error(`pockgo HTTP ${r.status}: ${body}`);
      }
      const data = await r.json();
      if (!data?.image) {
        throw new Error(`pockgo returned no image (model=${data?.model}, err=${data?.error || "?"}, details=${JSON.stringify(data?.details || {}).slice(0, 200)})`);
      }
      return data; // { image: base64, model, ... }
    } catch (e) {
      lastErr = e;
      const isAbort = e?.name === "AbortError";
      log(`    ⚠ pockgo attempt ${attempt}/${MAX_ATTEMPTS} failed: ${isAbort ? "timeout (150s)" : (e.message || e).slice(0, 150)}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }
  throw lastErr || new Error("pockgo: all attempts failed");
}

// ─────────────────────────────────────────────────────────
// 3. Upload to Supabase (POST + x-upsert: true; 409 = success)
// ─────────────────────────────────────────────────────────
async function uploadToSupabase(day, filename, jpegBuf) {
  const path = `vlog/day${day}/${filename}.jpg`;
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: jpegBuf,
  });
  if (r.ok) {
    return { ok: true, status: r.status };
  }
  // 409 = already exists → treat as success per task spec
  if (r.status === 409) {
    return { ok: true, status: 409, note: "already exists" };
  }
  const txt = (await r.text()).slice(0, 300);
  throw new Error(`supabase HTTP ${r.status}: ${txt}`);
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  log(`=== gen-vlog-e-images start ===`);
  log(`Max images: ${LIMIT === Infinity ? "all" : LIMIT}`);

  // Check dev server up
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 5000);
    const h = await fetch("http://localhost:3001/vlog/E", { signal: ctrl.signal });
    clearTimeout(to);
    log(`✓ dev server up (HTTP ${h.status})`);
  } catch (e) {
    log(`❌ dev server NOT reachable at ${POCKGO_URL} — start with: cd ${FRONTEND_ROOT} && PORT=3001 npm run dev`);
    process.exit(1);
  }

  // Parse
  log(`📖 Reading data.ts ...`);
  const txt = readFileSync(DATA_TS, "utf8");
  const items = parseEDays(txt);
  log(`✓ extracted ${items.length} e-img pairs from E_DAYS`);
  if (items.length !== 32) {
    log(`  ⚠ expected 32, got ${items.length}. Continuing anyway.`);
  }

  // Resume support — skip already-uploaded unless --force
  let progress = { done: [], failed: [], started_at: new Date().toISOString() };
  try {
    const prev = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    if (!FORCE) progress = prev;
  } catch {}
  const doneSet = new Set(progress.done.map((d) => `${d.day}/${d.filename}`));

  const queue = items.filter((it) => !doneSet.has(`${it.day}/${it.filename}`)).slice(0, LIMIT === Infinity ? undefined : LIMIT);
  log(`📋 queue: ${queue.length} (skipped ${items.length - queue.length} already-done; FORCE=${FORCE})`);

  let i = 0;
  for (const item of queue) {
    if (Date.now() - START_TIME_MS > TOTAL_BUDGET_MS) {
      log(`⏱ total budget (${TOTAL_BUDGET_MS/60000} min) exceeded — stopping`);
      break;
    }
    i++;
    const tag = `[${progress.done.length + progress.failed.length + 1}/${items.length}] day${item.day}/${item.filename}`;
    const t0 = Date.now();
    log(`\n▶ ${tag}`);
    log(`    url=${item.url}`);
    log(`    prompt=${truncPrompt(item.prompt)}`);
    try {
      // 1) generate
      log(`    🎨 generating (60-120s) ...`);
      const result = await callPockgo(item.prompt);
      log(`    ✓ pockgo OK (model=${result.model || "?"} base64=${result.image.length} chars)`);
      // 2) decode
      const buf = Buffer.from(result.image, "base64");
      log(`    ✓ decoded ${buf.length} bytes`);
      // 3) upload
      log(`    ⬆ uploading to supabase ...`);
      const up = await uploadToSupabase(item.day, item.filename, buf);
      log(`    ✓ upload HTTP ${up.status}${up.note ? " (" + up.note + ")" : ""} [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
      progress.done.push({ day: item.day, filename: item.filename, bytes: buf.length, model: result.model, duration_s: ((Date.now() - t0) / 1000).toFixed(1) });
    } catch (e) {
      log(`    ❌ ${tag} FAILED: ${(e.message || e).slice(0, 200)}`);
      progress.failed.push({ day: item.day, filename: item.filename, prompt: item.prompt, error: (e.message || String(e)).slice(0, 300) });
    }

    // Save progress every image
    try { writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch {}

    // Status every 5
    const totalDone = progress.done.length;
    if (totalDone > 0 && totalDone % 5 === 0) {
      log(`\n── progress: ${progress.done.length} done, ${progress.failed.length} failed ──`);
    }
  }

  // ─────────── final summary ───────────
  const ok = progress.done.length;
  const fail = progress.failed.length;
  log(`\n=== uploading summary ===`);
  log(`✓ uploaded ${ok}/${items.length}, ✗ failed ${fail}`);

  // ─────────── verify 3 random uploaded images ───────────
  if (progress.done.length >= 3) {
    log(`\n🔍 verifying 3 random uploaded images ...`);
    const sample = [];
    const pool = [...progress.done];
    for (let k = 0; k < 3 && pool.length; k++) {
      const idx = Math.floor(Math.random() * pool.length);
      sample.push(pool.splice(idx, 1)[0]);
    }
    const verified = [];
    for (const v of sample) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/vlog/day${v.day}/${v.filename}.jpg`;
      try {
        const r = await fetch(url, { method: "HEAD" });
        const ct = r.headers.get("content-type") || "?";
        const cl = r.headers.get("content-length") || "?";
        log(`  ${r.ok ? "✓" : "✗"} ${url} → HTTP ${r.status} (${ct}, ${cl} bytes)`);
        verified.push({ url, status: r.status, ok: r.ok });
      } catch (e) {
        log(`  ✗ ${url} → ${(e.message || e).slice(0, 100)}`);
        verified.push({ url, ok: false, error: e.message });
      }
    }
    writeFileSync(PROGRESS_FILE, JSON.stringify({ ...progress, verified }, null, 2));
    log(`\n=== verify URLs (200-status): ===`);
    verified.filter(v => v.ok).forEach(v => log(`  ✓ ${v.url}`));
  }

  log(`\nprogress saved to ${PROGRESS_FILE}`);
  if (fail > 0) {
    log(`\nfailed prompts:`);
    progress.failed.forEach((f) => log(`  - day${f.day}/${f.filename}: ${truncPrompt(f.prompt)} — ${f.error}`));
  }
  log(`\n=== DONE ===`);
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
