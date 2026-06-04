// Trigger fire-and-forget regeneration for all failed manga rows
// Posts to production /api/manga/generate which fires Worker background
import fs from "node:fs";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SB_KEY = "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";
const NETLIFY_BASE = "https://travel-china.netlify.app";
const PROGRESS_FILE = "/tmp/manga-regen-failed.json";

async function getFailedRows() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_mangas?status=eq.failed&select=id,source_name,source_type,source_id&order=updated_at.desc&limit=50`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  return await r.json();
}

async function triggerRegen(row) {
  const start = Date.now();
  try {
    const r = await fetch(`${NETLIFY_BASE}/api/manga/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: row.source_type,
        sourceId: row.source_id,
        sourceName: row.source_name,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const text = await r.text();
    const ok = r.ok;
    console.log(`  ${ok ? "✓" : "✗"} [${elapsed}s] ${row.source_name} (${row.source_type}) → HTTP ${r.status} ${text.slice(0, 100)}`);
    return { ok, status: r.status, elapsed };
  } catch (e) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ✗ [${elapsed}s] ${row.source_name} → ${e.message}`);
    return { ok: false, error: e.message, elapsed };
  }
}

async function main() {
  const rows = await getFailedRows();
  console.log(`找到 ${rows.length} 個 failed row`);
  if (rows.length === 0) return;
  console.log(`source_type 分布: ${[...new Set(rows.map(r => r.source_type))].join(', ')}`);

  const results = [];
  for (const row of rows) {
    console.log(`▶ ${row.source_name} (${row.id.slice(0, 8)})`);
    const r = await triggerRegen(row);
    results.push({ source: row.source_name, id: row.id, ...r });
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ results, total: rows.length }, null, 2));
    await new Promise((r) => setTimeout(r, 300));
  }
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== DONE: ${ok} triggered, ${fail} failed to trigger ===`);
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });
