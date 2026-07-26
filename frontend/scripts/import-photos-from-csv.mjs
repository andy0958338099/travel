#!/usr/bin/env node
/**
 * import-photos-from-csv.mjs
 *
 * 聖上跑完 exiftool 之後, 用此腳本把 CSV 匯入 Supabase.
 *
 * 工作流程:
 *   1. 聖上在 Mac 終端機跑:
 *      cd /Volumes/Transcend/travel-archive/2026-jiangnan/00-inbox
 *      exiftool -csv \
 *        -filename -DateTimeOriginal -Artist \
 *        -GPSLatitude -GPSLatitudeRef -GPSLongitude -GPSLongitudeRef \
 *        -description \
 *        *.jpg *.jpeg *.heic *.png > /tmp/photos-meta.csv
 *
 *   2. 手動補欄位 (因為 exiftool 不會直接給 day/hour/location_name/uploader_name):
 *      - 把 CSV 開啟 (Numbers / Excel)
 *      - 加 4 欄: day / hour / location_name / uploader_name / google_drive_url
 *      - 從檔名 / 資料夾對應填好
 *
 *   3. 跑這個腳本:
 *      SUPABASE_URL=https://... SUPABASE_KEY=... \
 *      node scripts/import-photos-from-csv.mjs /tmp/photos-meta.csv
 *
 * 腳本會:
 *   - 讀 CSV
 *   - 用 fetch + anon key 批次 INSERT 到 travel_photo_meta
 *   - 跳過已存在 (filename 相同) 的 row
 *   - 顯示進度
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bphhksbzedadaoscjctz.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!SUPABASE_KEY) {
  console.error(
    "❌ 請設 SUPABASE_KEY 環境變數 (或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
  );
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("用法: node scripts/import-photos-from-csv.mjs <csv-path>");
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV 檔不存在: ${csvPath}`);
  process.exit(1);
}

// ── 簡單 CSV parser (支援雙引號 escape) ────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ── DMS GPS → decimal ──────────────────────────────────────────────────────
function dmsToDecimal(dms, ref) {
  if (!dms) return null;
  const parts = String(dms).split(/[^\d.]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const [d, m, s] = parts.map(parseFloat);
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec;
}

// ── Main ────────────────────────────────────────────────────────────────────
const csvText = fs.readFileSync(csvPath, "utf-8");
const rows = parseCSV(csvText);
if (rows.length < 2) {
  console.error("❌ CSV 至少要有 header + 1 row");
  process.exit(1);
}

const headers = rows[0].map((h) => h.trim().toLowerCase());
const colIdx = (name) => headers.indexOf(name.toLowerCase());

const idx = {
  filename: colIdx("filename"),
  datetimeOriginal: colIdx("datetimeoriginal"),
  artist: colIdx("artist"),
  gpsLatitude: colIdx("gpslatitude"),
  gpsLatitudeRef: colIdx("gpslatituderef"),
  gpsLongitude: colIdx("gpslongitude"),
  gpsLongitudeRef: colIdx("gpslongituderef"),
  description: colIdx("description"),
  // 手動加的欄位
  day: colIdx("day"),
  hour: colIdx("hour"),
  locationName: colIdx("location_name"),
  uploaderName: colIdx("uploader_name"),
  googleDriveUrl: colIdx("google_drive_url"),
};

const missing = Object.entries(idx).filter(([, v]) => v < 0).map(([k]) => k);
if (missing.length > 0) {
  console.warn(`⚠️  CSV 缺欄位:${missing.join(", ")}`);
  console.warn(`   請確認 CSV header 包含: ${Object.keys(idx).join(", ")}`);
}

console.log(`📊 CSV 共 ${rows.length - 1} 筆資料,開始處理...`);

const payloads = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[idx.filename]) continue;
  const lat =
    idx.gpsLatitude >= 0
      ? dmsToDecimal(r[idx.gpsLatitude], r[idx.gpsLatitudeRef])
      : null;
  const lng =
    idx.gpsLongitude >= 0
      ? dmsToDecimal(r[idx.gpsLongitude], r[idx.gpsLongitudeRef])
      : null;

  payloads.push({
    filename: r[idx.filename],
    datetime_original:
      idx.datetimeOriginal >= 0 && r[idx.datetimeOriginal]
        ? new Date(r[idx.datetimeOriginal].replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T")).toISOString()
        : null,
    lat,
    lng,
    location_name: idx.locationName >= 0 ? r[idx.locationName] || null : null,
    uploader_name: idx.uploaderName >= 0 ? r[idx.uploaderName] || null : null,
    uploader_id: idx.uploaderName >= 0 ? r[idx.uploaderName] || null : null, // fallback: 用 name 當 id
    caption: idx.description >= 0 ? r[idx.description] || null : null,
    day: idx.day >= 0 ? parseInt(r[idx.day]) || null : null,
    hour: idx.hour >= 0 ? parseInt(r[idx.hour]) || null : null,
    google_drive_url:
      idx.googleDriveUrl >= 0 ? r[idx.googleDriveUrl] || null : null,
    google_photos_thumb_url: null,
    likes_count: 0,
    views_count: 0,
  });
}

console.log(`✅ 準備 INSERT ${payloads.length} 筆到 travel_photo_meta`);

// ── 批次 INSERT (每批 50 筆) ───────────────────────────────────────────────
const BATCH_SIZE = 50;
let inserted = 0;
let errors = 0;

for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
  const batch = payloads.slice(i, i + BATCH_SIZE);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/travel_photo_meta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(batch),
  });

  if (res.ok) {
    inserted += batch.length;
    console.log(
      `  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(payloads.length / BATCH_SIZE)} — ${inserted}/${payloads.length}`
    );
  } else {
    errors += batch.length;
    const errText = await res.text();
    console.error(
      `  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} 失敗: ${res.status} ${errText.slice(0, 200)}`
    );
  }
}

console.log(`\n🎉 完成: ✅ ${inserted} 成功 · ❌ ${errors} 失敗`);
console.log(
  `👉 接下來打開 http://localhost:3000/travel/photo-album 看效果`
);