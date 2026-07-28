#!/usr/bin/env node
/**
 * import-new-photos.mjs
 *
 * 2026-07-26 聖上拍板: 匯入 ~/Downloads/杭州共享相簿/ 內 122 個新檔到 Supabase
 *   - 跑 exiftool 抽 EXIF
 *   - 對應到 D1-D8 (IMG_1217-2128 → 7/17-7/24)
 *   - 對應台灣時間 (UTC+8)
 *   - 跳過 (1) 後綴副本
 *   - 用 on_conflict=filename upsert
 *
 * 輸出: 寫到 Supabase travel_photo_meta,聖上看 localhost /travel/photo-album 驗證
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { resolve } from "node:path";
import process from "node:process";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGhrc2J6ZWRhZGFvc2NqY3R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4ODYxNywiZXhwIjoyMDk1NTY0NjE3fQ.jvJ-K7zzPYVXQq5PvIHTCBoNiFuYkWNKdBK0WFJbJjg";

const INBOX_DIR = "/Users/brian/Downloads/杭州共享相簿";

// 8 天行程 7/17-7/24, IMG 編號大致對應 (手機連拍)
const DAY_RANGES = [
  { day: 1, date: "2026-07-17", minNum: 1217, maxNum: 1300 },
  { day: 2, date: "2026-07-18", minNum: 1301, maxNum: 1400 },
  { day: 3, date: "2026-07-19", minNum: 1401, maxNum: 1500 },
  { day: 4, date: "2026-07-20", minNum: 1501, maxNum: 1600 },
  { day: 5, date: "2026-07-21", minNum: 1601, maxNum: 1700 },
  { day: 6, date: "2026-07-22", minNum: 1701, maxNum: 1800 },
  { day: 7, date: "2026-07-23", minNum: 1801, maxNum: 1900 },
  { day: 8, date: "2026-07-24", minNum: 1901, maxNum: 2128 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function inferDay(imgNum) {
  for (const r of DAY_RANGES) {
    if (imgNum >= r.minNum && imgNum <= r.maxNum) return { day: r.day, date: r.date };
  }
  return null;
}

function dmsToDecimal(dms, ref) {
  // exiftool GPS:GPSLatitude 格式: "25 deg 1' 2.34\" N"
  const m = dms.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"/);
  if (!m) return null;
  let deg = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
  if (ref === "S" || ref === "W") deg = -deg;
  return deg;
}

function readExif(filepath) {
  // 跑 exiftool -S 拿結構化 output
  const result = execSync(
    `exiftool -S -DateTimeOriginal -GPSLatitude -GPSLatitudeRef -GPSLongitude -GPSLongitudeRef -Make -Model "${filepath}"`,
    { encoding: "utf-8", timeout: 5000 }
  );
  const data = {};
  for (const line of result.split("\n")) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) data[m[1].trim()] = m[2].trim();
  }
  return data;
}

function exifToRecord(filename, exif) {
  // DateTimeOriginal: "2026:07:19 07:54:04"
  const dto = exif.DateTimeOriginal || "";
  const m = dto.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  // EXIF 給的是 UTC, 轉台灣時間
  const [_, y, mo, d, hh, mm, ss] = m;
  let hour = parseInt(hh);
  const dateUtc = `${y}-${mo}-${d}`;
  // 加上 8 小時
  hour += 8;
  let day = parseInt(d);
  let month = parseInt(mo);
  let year = parseInt(y);
  if (hour >= 24) {
    hour -= 24;
    // date + 1 (用 Date 計算避免月底跨月)
    const dt = new Date(Date.UTC(year, month - 1, day));
    dt.setUTCDate(dt.getUTCDate() + 1);
    year = dt.getUTCFullYear();
    month = dt.getUTCMonth() + 1;
    day = dt.getUTCDate();
  }
  const dayInfo = inferDay(parseInt(extractImgNum(filename)));
  // 重新推算的 day 跟 EXIF 日期
  const dayFromExif = dayFromDateStr(`${year}-${pad(month)}-${pad(day)}`);

  const imgNum = parseInt(extractImgNum(filename));
  const dayByNum = dayInfo?.day;
  const finalDay = dayByNum || dayFromExif;

  // GPS
  let lat = null, lng = null;
  if (exif.GPSLatitude && exif.GPSLatitudeRef) {
    lat = dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
    lng = dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);
  }

  return {
    filename,
    day: finalDay,
    hour,
    datetime_original: `${dateUtc}T${hh}:${mm}:${ss}+00:00`,
    lat,
    lng,
    location_name: null,
  };
}

function extractImgNum(filename) {
  const m = filename.match(/IMG_(\d+)/);
  return m ? m[1] : "0";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dayFromDateStr(dateStr) {
  // 2026-07-17 → D1
  for (const r of DAY_RANGES) {
    if (r.date === dateStr) return r.day;
  }
  return null;
}

async function main() {
  // 1. 列出 INBOX 內 IMG_1217-2128 的所有檔
  const allFiles = readdirSync(INBOX_DIR)
    .filter((f) => /IMG_\d+/.test(f))
    .filter((f) => /^\./.test(f) === false)
    .filter((f) => /[.](heic|HEIC|jpg|JPG|jpeg|JPEG|png|PNG|mov|MOV|mp4|MP4)$/.test(f))
    .map((f) => join(INBOX_DIR, f))
    .filter((f) => {
      const m = basename(f).match(/IMG_(\d+)/);
      return m && parseInt(m[1]) >= 1217 && parseInt(m[1]) <= 2128;
    });

  console.log(`📂 INBOX 共 ${allFiles.length} 個 8 天行程檔案`);

  // 2. 跳過 (1)/(2) 後綴的副本
  const duplicates = allFiles.filter((f) => /\(\d+\)/.test(basename(f)));
  const candidates = allFiles.filter((f) => !/\(\d+\)/.test(basename(f)));
  console.log(`   🔁 副本 (跳過): ${duplicates.length}`);
  console.log(`   🆕 候選: ${candidates.length}`);

  // 3. 對每個候選跑 exiftool
  console.log(`\n🔧 跑 exiftool 抽 EXIF...`);
  const records = [];
  let failed = 0;
  for (const filepath of candidates) {
    try {
      const exif = readExif(filepath);
      if (!exif.DateTimeOriginal) {
        failed++;
        continue;
      }
      const record = exifToRecord(basename(filepath), exif);
      if (record) records.push(record);
      else failed++;
    } catch (e) {
      failed++;
    }
  }
  console.log(`   ✅ 成功: ${records.length}, ❌ 失敗: ${failed}`);

  // 4. 用 Service Role upsert 到 Supabase
  console.log(`\n📤 Upsert 到 Supabase...`);
  const BATCH = 50;
  let success = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/travel_photo_meta?on_conflict=filename`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify(batch),
      }
    );
    if (res.ok) success += batch.length;
    else {
      const err = await res.text();
      console.log(`   ❌ Batch ${i / BATCH + 1}: ${res.status} ${err.slice(0, 200)}`);
    }
  }
  console.log(`   ✅ ${success} / ${records.length} 寫入 Supabase`);

  // 5. 順便: 更新 Storage thumb_url 給新寫入的 122 筆
  console.log(`\n🖼️  為新筆更新 Storage thumb_url...`);
  const urlRes = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=filename&order=created_at.desc&limit=122`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  const urlData = await urlRes.json();
  console.log(`   取最新 ${urlData.length} 筆`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
