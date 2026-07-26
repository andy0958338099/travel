#!/usr/bin/env node
/**
 * retry-vlog-e-failed.mjs
 *
 * Re-generate ONLY the 4 e-img-* files that failed content_policy_violation
 * in the previous gen-vlog-e-images.mjs run. Reads /tmp/vlog-e-images.json
 * for the failed list and the (now-patched) prompts from src/app/vlog/data.ts.
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

const START_TIME_MS = Date.now();
const TOTAL_BUDGET_MS = 20 * 60 * 1000; // 20 min is plenty for 4 images

function ts() {
  return new Date().toISOString().slice(11, 19);
}
function log(...args) {
  console.log(ts(), ...args);
}

function parseEDays(text) {
  const startIdx = text.indexOf("const E_DAYS: DayBlock[] = [");
  if (startIdx < 0) throw new Error("E_DAYS not found");
  const eqIdx = text.indexOf("= [", startIdx);
  const openIdx = eqIdx + 2;
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
  const block = text.slice(startIdx, endIdx);
  const lineRe = /src=(https:\/\/[^\s]+?\.jpg)\s+—\s+"([^"]+)"/g;
  const items = [];
  let m;
  while ((m = lineRe.exec(block)) !== null) {
    const url = m[1];
    const prompt = m[2];
    const dayMatch = url.match(/\/vlog\/day(\d+)\//);
    const fileMatch = url.match(/\/([^/]+)\.jpg$/);
    if (!dayMatch || !fileMatch) continue;
    const day = parseInt(dayMatch[1], 10);
    const filename = fileMatch[1];
    items.push({ url, prompt, day, filename });
  }
  return items;
}

async function callPockgo(prompt) {
  const MAX_ATTEMPTS = 3;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
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
      if (!data?.image) throw new Error("no image returned");
      return data;
    } catch (e) {
      lastErr = e;
      log(`    ⚠ attempt ${attempt}/${MAX_ATTEMPTS} failed: ${(e.message || e).slice(0, 120)}`);
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  throw lastErr;
}

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
  if (r.ok) return { ok: true, status: r.status };
  if (r.status === 409) return { ok: true, status: 409, note: "exists" };
  const txt = (await r.text()).slice(0, 300);
  throw new Error(`supabase HTTP ${r.status}: ${txt}`);
}

async function main() {
  log(`=== retry-vlog-e-failed start ===`);

  // Load progress to get failed list
  const progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
  const failed = progress.failed || [];
  if (failed.length === 0) {
    log("no failed items to retry");
    return;
  }
  log(`📋 failed list (${failed.length}):`);
  for (const f of failed) log(`    - day${f.day}/${f.filename}`);

  // Parse data.ts to get CURRENT (patched) prompts
  const txt = readFileSync(DATA_TS, "utf8");
  const allItems = parseEDays(txt);
  const itemByKey = new Map(allItems.map((it) => [`${it.day}/${it.filename}`, it]));

  // Build retry queue using current prompts
  const queue = failed
    .map((f) => {
      const cur = itemByKey.get(`${f.day}/${f.filename}`);
      if (!cur) {
        log(`  ! no current prompt found for ${f.day}/${f.filename} (skipping)`);
        return null;
      }
      return cur;
    })
    .filter(Boolean);

  log(`🔧 retry queue: ${queue.length}`);

  // Mark each retried one as removed from failed list
  const stillFailed = [];

  for (const item of queue) {
    if (Date.now() - START_TIME_MS > TOTAL_BUDGET_MS) {
      log(`⏱ budget exceeded`);
      break;
    }
    const t0 = Date.now();
    log(`\n▶ day${item.day}/${item.filename}`);
    log(`    prompt=${item.prompt.slice(0, 80)}…`);
    try {
      log(`    🎨 generating (60-120s) ...`);
      const result = await callPockgo(item.prompt);
      log(`    ✓ pockgo OK (${result.image.length} chars)`);
      const buf = Buffer.from(result.image, "base64");
      log(`    ✓ decoded ${buf.length} bytes`);
      log(`    ⬆ uploading ...`);
      const up = await uploadToSupabase(item.day, item.filename, buf);
      log(`    ✓ upload HTTP ${up.status} [${((Date.now() - t0) / 1000).toFixed(1)}s]`);
      // Move from failed → done
      progress.done.push({
        day: item.day,
        filename: item.filename,
        bytes: buf.length,
        model: result.model,
        duration_s: ((Date.now() - t0) / 1000).toFixed(1),
        retry: true,
      });
    } catch (e) {
      log(`    ❌ RETRY FAILED: ${(e.message || e).slice(0, 200)}`);
      stillFailed.push(item);
    }
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  }

  // Replace failed list with whatever still failed
  progress.failed = stillFailed;
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  log(`\n=== retry summary ===`);
  log(`✓ retried ${queue.length - stillFailed.length}, ✗ still failed ${stillFailed.length}`);
  log(`TOTAL: done=${progress.done.length}, failed=${progress.failed.length}`);

  if (stillFailed.length === 0) {
    log(`\n🔍 verifying 2 random retried images ...`);
    const retried = progress.done.filter((d) => d.retry);
    for (const v of retried.slice(0, 2)) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/vlog/day${v.day}/${v.filename}.jpg`;
      const r = await fetch(url, { method: "HEAD" });
      log(`  ${r.ok ? "✓" : "✗"} ${url} → HTTP ${r.status} (${r.headers.get("content-length") || "?"} bytes)`);
    }
  }
  log(`\n=== DONE ===`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});