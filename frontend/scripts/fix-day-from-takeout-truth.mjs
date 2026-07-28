#!/usr/bin/env node
/**
 * fix-day-from-takeout-truth.mjs
 *
 * 2026-07-27 聖上拍板 (B 方案): 從 Takeout JSON 真實 metadata 修全部 413 筆
 *
 * 問題根因:
 *   - 7-26 跑的 import-photos-from-takeout.mjs 把 Takeout UTC time 換算成台灣時
 *     出了 bug: IMG_1217 真實 7/17 07:27 早上, 寫成 7/17 17:07 17:00 下午
 *   - 7-26 跑的 fix-day-from-exif.mjs 是從本機 HEIC 抽 EXIF, 但本機 HEIC 是
 *     Google 壓縮版 (1280×1707), 已 strip 掉 GPS, 且部分檔案 DateTimeOriginal
 *     也被 strip
 *
 * 真理來源 (single source of truth):
 *   /Volumes/Transcend/travel-archive/2026-jiangnan/05-exif-csv/
 *     IMG_1217.HEIC.supplemental-metadata.json
 *     IMG_1218.HEIC.supplemental-metadata.json
 *     ...
 *     (共 300 個, 對應 Takeout 匯出的 HEIC/MOV 範圍)
 *
 *   每個 JSON 含:
 *     - photoTakenTime.timestamp (UTC epoch seconds, 真實拍攝時間)
 *     - geoData.latitude / longitude (真實 GPS)
 *     - geoData.altitude (海拔)
 *
 * 邏輯:
 *   1. 讀 300 個 Takeout JSON → 建 map: filename → {ts, lat, lng, alt}
 *   2. 從 Supabase 拉全部 413 筆
 *   3. 對每筆: 找對應 Takeout JSON → 重算 day/hour/datetime_original/lat/lng
 *   4. 對 113 筆「短檔名」(從 Google Photos 網頁下載, 無 Takeout JSON):
 *      - filename 短檔名如 121.jpg / 1076.jpg, 沒有 EXIF 來源
 *      - 不處理, 標記為 needs_manual_fix, 給 admin UI 處理
 *   5. 用 PATCH (on_conflict=filename) 寫回 Supabase, 只改有差異的欄位
 *
 * 輸出:
 *   /tmp/day-fix-report.json (audit 報告, 含每筆的舊/新值 + 差異)
 *
 * 安全設計:
 *   - DRY RUN 先跑 (--dry-run): 只 print 將要改的, 不寫 DB
 *   - 真實寫入: 加 --apply
 *   - PATCH 模式: 只 update 欄位有差異的 row, 不覆蓋其他欄位 (不像 POST on_conflict)
 */

import { execSync } from "node:child_process";
import { readdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGhrc2J6ZWRhZGFvc2NqY3R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4ODYxNywiZXhwIjoyMDk1NTY0NjE3fQ.jvJ-K7zzPYVXQq5PvIHTCBoNiFuYkWNKdBK0WFJbJjg";

// 🆕 2026-07-27 自動偵測 Takeout JSON 目錄 (新 zip 解到哪就用哪)
// 優先順序:
//   1. 環境變數 TAKEOUT_JSON_DIR (手動指定)
//   2. /Volumes/Transcend/travel-archive/2026-jiangnan/05-exif-csv/ (現有)
//   3. /Users/brian/Downloads/Takeout/Google 相簿/杭州共享相簿/ (新 Takeout 解壓處)
function detectTakeoutJsonDir() {
  const candidates = [
    process.env.TAKEOUT_JSON_DIR,
    "/Volumes/Transcend/travel-archive/2026-jiangnan/05-exif-csv",
    "/Users/brian/Downloads/Takeout/Google 相簿/杭州共享相簿",
  ];
  for (const dir of candidates) {
    if (dir && existsSync(dir)) {
      const files = readdirSync(dir).filter(f => f.endsWith(".supplemental-metadata.json"));
      if (files.length > 0) {
        return { dir, count: files.length };
      }
    }
  }
  return null;
}

let TAKEOUT_JSON_DIR;
const detected = detectTakeoutJsonDir();
if (!detected) {
  console.error(`❌ 找不到 Takeout JSON 目錄。請設定環境變數 TAKEOUT_JSON_DIR`);
  process.exit(1);
}
TAKEOUT_JSON_DIR = detected.dir;
if (process.env.TAKEOUT_JSON_DIR) {
  console.log(`📂 使用環境變數指定: ${TAKEOUT_JSON_DIR}`);
} else {
  console.log(`📂 自動偵測: ${TAKEOUT_JSON_DIR} (${detected.count} 個 JSON)`);
}

// 7/17-7/24 = D1-D8
const DAY_MAP = {
  "2026-07-17": 1, "2026-07-18": 2, "2026-07-19": 3, "2026-07-20": 4,
  "2026-07-21": 5, "2026-07-22": 6, "2026-07-23": 7, "2026-07-24": 8,
};

// GPS bounding box 推 location (沿用 fix-day-from-exif.mjs 邏輯)
const GPS_ZONES = [
  { name: "台灣 · 桃園", lat: [24.8, 25.4], lng: [121.0, 121.6] },
  { name: "上海 · 浦東機場", lat: [31.10, 31.20], lng: [121.78, 121.85] },
  { name: "上海 · 虹橋機場", lat: [31.10, 31.20], lng: [121.32, 121.42] },
  { name: "上海", lat: [31.10, 31.40], lng: [121.30, 121.65] },
  { name: "西塘古鎮", lat: [30.88, 30.96], lng: [120.86, 120.95] },
  { name: "浙江 · 桐鄉", lat: [30.70, 30.90], lng: [120.50, 120.80] },
  { name: "烏鎮東柵", lat: [30.74, 30.78], lng: [120.67, 120.72] },
  { name: "烏鎮西柵", lat: [30.72, 30.77], lng: [120.70, 120.74] },
  { name: "杭州", lat: [30.0, 30.5], lng: [119.8, 120.5] },
];

function gpsToLocation(lat, lng) {
  if (lat == null || lng == null) return null;
  for (const z of GPS_ZONES) {
    if (lat >= z.lat[0] && lat <= z.lat[1] && lng >= z.lng[0] && lng <= z.lng[1]) {
      return z.name;
    }
  }
  return null;
}

/**
 * 從 Takeout 真實 metadata 算出正確的 day/hour/datetime_original/lat/lng
 * @param {{timestamp: string, latitude: number, longitude: number, altitude: number}} truth
 * @returns {day, hour, datetime_original, lat, lng, location_name}
 */
function calcFromTakeout(truth) {
  const ts = parseInt(truth.timestamp);
  // Takeout timestamp = UTC epoch seconds
  const utcDate = new Date(ts * 1000);
  // 轉台灣 (UTC+8)
  const twMs = utcDate.getTime() + 8 * 60 * 60 * 1000;
  const twDate = new Date(twMs);
  const dateStr = twDate.toISOString().substring(0, 10);
  const day = DAY_MAP[dateStr] || null;
  // hour 用台灣小時
  const hour = twDate.getUTCHours();
  // datetime_original 用台灣時間 + UTC marker (跟原本 schema 一致, 但 hours 是台灣 hour)
  // 原本 schema 是 "2026-07-17T17:07:27+00:00" 標記為 UTC 但 hours 是台灣 → 繼續沿用
  const hh = String(twDate.getUTCHours()).padStart(2, "0");
  const mm = String(twDate.getUTCMinutes()).padStart(2, "0");
  const ss = String(twDate.getUTCSeconds()).padStart(2, "0");
  const datetime_original = `${dateStr}T${hh}:${mm}:${ss}+00:00`;
  const lat = truth.latitude ?? null;
  const lng = truth.longitude ?? null;
  return {
    day,
    hour,
    datetime_original,
    lat,
    lng,
    location_name: gpsToLocation(lat, lng),
  };
}

// ── main ──────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  console.log(`\n🔍 模式: ${dryRun ? "DRY RUN (不寫 DB)" : "APPLY (寫入 Supabase)"}\n`);

  // 1. 讀 300 個 Takeout JSON
  console.log("📂 讀 Takeout JSON metadata...");
  const takeoutMap = new Map();
  if (!existsSync(TAKEOUT_JSON_DIR)) {
    console.error(`❌ 找不到 ${TAKEOUT_JSON_DIR}`);
    process.exit(1);
  }
  for (const f of readdirSync(TAKEOUT_JSON_DIR)) {
    if (!f.endsWith(".supplemental-metadata.json")) continue;
    const filename = f.replace(".supplemental-metadata.json", "");
    try {
      const content = JSON.parse(execSync(`cat "${join(TAKEOUT_JSON_DIR, f)}"`, { encoding: "utf-8" }));
      takeoutMap.set(filename, content);
    } catch (e) {
      console.warn(`   ⚠️  解析 ${f} 失敗: ${e.message}`);
    }
  }
  console.log(`   ✅ 讀到 ${takeoutMap.size} 個 Takeout JSON\n`);

  // 2. 從 Supabase 拉全部
  console.log("📊 從 Supabase 拉全部 travel_photo_meta...");
  const allRes = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=id,filename,day,hour,datetime_original,lat,lng,location_name&limit=1000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const dbRows = await allRes.json();
  console.log(`   ✅ 拉到 ${dbRows.length} 筆\n`);

  // 3. 對每筆找 Takeout, 算新值
  const updates = [];
  const unchanged = [];
  const needsManualFix = [];
  const stats = { dayChanged: 0, hourChanged: 0, dtChanged: 0, gpsChanged: 0, locChanged: 0 };

  for (const row of dbRows) {
    const truth = takeoutMap.get(row.filename);
    if (!truth) {
      // 短檔名 (從 Google Photos 網頁下載, 沒 Takeout JSON)
      needsManualFix.push({ id: row.id, filename: row.filename, reason: "no_takeout_json" });
      continue;
    }
    const truthMeta = truth.photoTakenTime
      ? { ...truth.geoDataExif, timestamp: truth.photoTakenTime.timestamp }
      : null;
    if (!truthMeta || !truthMeta.timestamp) {
      needsManualFix.push({ id: row.id, filename: row.filename, reason: "no_photoTakenTime" });
      continue;
    }
    const calc = calcFromTakeout(truthMeta);

    // 比對差異
    const diff = {};
    if (row.day !== calc.day && calc.day !== null) diff.day = { old: row.day, new: calc.day };
    if (row.hour !== calc.hour) diff.hour = { old: row.hour, new: calc.hour };
    if (row.datetime_original !== calc.datetime_original) diff.datetime_original = { old: row.datetime_original, new: calc.datetime_original };
    if (Math.abs((row.lat ?? 0) - (calc.lat ?? 0)) > 0.0001) diff.lat = { old: row.lat, new: calc.lat };
    if (Math.abs((row.lng ?? 0) - (calc.lng ?? 0)) > 0.0001) diff.lng = { old: row.lng, new: calc.lng };
    if ((row.location_name || null) !== (calc.location_name || null)) diff.location_name = { old: row.location_name, new: calc.location_name };

    if (Object.keys(diff).length === 0) {
      unchanged.push(row.filename);
    } else {
      // 🆕 2026-07-27 PATCH 只送「真的有差異」的欄位, 不動其他
      // (避免「值一樣但送出」造成 Supabase updated_at 變動 / 觸發 realtime)
      const patchPayload = {};
      for (const key of Object.keys(diff)) {
        patchPayload[key] = calc[key];
      }
      updates.push({ id: row.id, filename: row.filename, diff, patchPayload });
      if (diff.day) stats.dayChanged++;
      if (diff.hour) stats.hourChanged++;
      if (diff.datetime_original) stats.dtChanged++;
      if (diff.lat || diff.lng) stats.gpsChanged++;
      if (diff.location_name) stats.locChanged++;
    }
  }

  // 4. 報告
  console.log("📊 比對結果:");
  console.log(`   ✅ 不用改: ${unchanged.length}`);
  console.log(`   🔧 要改: ${updates.length}`);
  console.log(`      dayChanged: ${stats.dayChanged}, hourChanged: ${stats.hourChanged}, dtChanged: ${stats.dtChanged}`);
  console.log(`      gpsChanged: ${stats.gpsChanged}, locChanged: ${stats.locChanged}`);
  console.log(`   ❓ 找不到 Takeout (短檔名, 需手動): ${needsManualFix.length}\n`);

  if (updates.length > 0) {
    console.log("🔍 前 10 筆將改的:");
    for (const u of updates.slice(0, 10)) {
      const changeKeys = Object.keys(u.diff).join(", ");
      console.log(`   ${u.filename}: ${changeKeys}`);
    }
    if (updates.length > 10) console.log(`   ... 還有 ${updates.length - 10} 筆\n`);
  }

  if (needsManualFix.length > 0) {
    console.log("❓ 前 10 筆需手動修 (短檔名):");
    for (const m of needsManualFix.slice(0, 10)) {
      console.log(`   ${m.filename}: ${m.reason}`);
    }
    if (needsManualFix.length > 10) console.log(`   ... 還有 ${needsManualFix.length - 10} 筆\n`);
  }

  // 5. 寫 audit report
  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    total: dbRows.length,
    unchanged: unchanged.length,
    willUpdate: updates.length,
    needsManualFix: needsManualFix.length,
    stats,
    updates: updates.map(u => ({ id: u.id, filename: u.filename, diff: u.diff })),
    manualFixList: needsManualFix,
  };
  writeFileSync("/tmp/day-fix-report.json", JSON.stringify(report, null, 2));
  console.log(`📄 Audit 報告: /tmp/day-fix-report.json\n`);

  if (dryRun) {
    console.log("⚠️  DRY RUN 完成, 沒寫入 DB");
    console.log("   真實寫入: node scripts/fix-day-from-takeout-truth.mjs --apply\n");
    return;
  }

  // 6. 真實寫入: PATCH (只改需要的欄位, 不覆蓋其他)
  console.log("📤 PATCH 到 Supabase...");
  let success = 0;
  let failed = 0;
  for (const u of updates) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/travel_photo_meta?id=eq.${u.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(u.patchPayload),  // 🆕 2026-07-27 只送有差異的欄位
      }
    );
    if (res.ok) {
      success++;
    } else {
      failed++;
      const err = await res.text();
      console.error(`   ❌ ${u.filename}: ${res.status} ${err.slice(0, 200)}`);
    }
  }
  console.log(`   ✅ ${success} / ${updates.length} 寫入成功`);
  if (failed > 0) console.log(`   ❌ ${failed} 筆失敗`);
  console.log(`\n🎉 完成!\n`);
}

main().catch(e => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
