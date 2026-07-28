#!/usr/bin/env node
/**
 * fix-day-from-exif.mjs
 *
 * 2026-07-26 聖上拍板: 用 EXIF 修正所有 413 筆的 day/hour/lat/lng/location
 *
 * - 從 ~/Downloads/杭州共享相簿/ 跟 Takeout 找原檔
 * - 跑 exiftool 抽 DateTimeOriginal + GPS
 * - 從 datetime_original 對應到 7/17-7/24 = D1-D8
 * - 從 GPS reverse geocode 推 location_name
 * - 用 on_conflict=filename upsert 修正
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import process from "node:process";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGhrc2J6ZWRhZGFvc2NqY3R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4ODYxNywiZXhwIjoyMDk1NTY0NjE3fQ.jvJ-K7zzPYVXQq5PvIHTCBoNiFuYkWNKdBK0WFJbJjg";

const NEW_INBOX = "/Users/brian/Downloads/杭州共享相簿";
const OLD_INBOX = "/Users/brian/Downloads/Takeout/Google 相簿/杭州共享相簿";

const DAY_MAP = {
  "2026-07-17": 1, "2026-07-18": 2, "2026-07-19": 3, "2026-07-20": 4,
  "2026-07-21": 5, "2026-07-22": 6, "2026-07-23": 7, "2026-07-24": 8,
};

// GPS bounding box 推 location (沿用 takeout 腳本的邏輯)
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

function dmsToDecimal(dms, ref) {
  const m = dms.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"/);
  if (!m) return null;
  let deg = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
  if (ref === "S" || ref === "W") deg = -deg;
  return deg;
}

function readExif(filepath) {
  try {
    // 用 -s -api 確保拿到完整 EXIF,包括 OffsetTime + QuickTime
    const result = execSync(
      `exiftool -s -api largeoffsettime=1 -DateTimeOriginal -OffsetTime -OffsetTimeOriginal -CreateDate -GPSLatitude -GPSLatitudeRef -GPSLongitude -GPSLongitudeRef "${filepath}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    const data = {};
    for (const line of result.split("\n")) {
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (m) data[m[1].trim()] = m[2].trim();
    }
    return data;
  } catch (e) {
    return {};
  }
}

function exifToRecord(exif) {
  // 聖上 iPhone 預設用 UTC+8 (OffsetTime=+08:00), DateTimeOriginal 已是台灣時間
  // 聖上 Takeout JSON 用 UTC timestamp (秒), 7-26 v3 腳本用 hour + 8 換算
  // 本機 HEIC 拍: DateTimeOriginal 已是 +08:00 本地時間, 不能 +8
  // QuickTime 拍 (MOV): DateTimeOriginal 帶 +08:00, 也不能 +8
  //
  // 解法: 看 OffsetTime 是否有值
  //   - 有 (+08:00): DateTimeOriginal 是本地時間, 直接用
  //   - 無 (iPhone 有時會省略): 假設 UTC, 轉台灣時間 +8

  const dto = exif.DateTimeOriginal || "";
  // 支援 "2026:07:17 07:27:22" (無時區) 或 "2026:07:17 15:03:53+08:00" (帶時區)
  const m = dto.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(.*)$/);
  if (!m) return null;

  const [_y, _mo, _d, hh, mm, ss, rest] = m;
  const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
  let hour = parseInt(hh);

  // 判斷時區
  const offset = (exif.OffsetTime || exif.OffsetTimeOriginal || "").trim();
  let tzOffset = 0;
  if (offset.match(/[+-]\d{2}:?\d{2}/)) {
    // 從 +08:00 解析
    const m2 = offset.match(/([+-])(\d{2}):?(\d{2})/);
    if (m2) {
      const sign = m2[1] === "+" ? 1 : -1;
      tzOffset = sign * (parseInt(m2[2]) * 60 + parseInt(m2[3]));
    }
  } else {
    // 沒時區 → iPhone 預設本地時間 (UTC+8)
    tzOffset = 480;  // 8 * 60
  }

  // 用 offset 把 EXIF 轉成 UTC (然後台灣時間 = UTC + 8)
  // EXIF local time - tzOffset = UTC
  // UTC + 8 = 台灣時間
  // 簡化: 已是 +08:00 (聖上 iPhone), 直接用 DateTimeOriginal 作為台灣時間
  // 但 7-26 v3 腳本說 Takeout 是 UTC, 所以 +8
  // 解法: 統一把 EXIF local 轉 UTC, 再加 8 得台灣時間
  //   img_local = "07:27:22"
  //   img_utc = img_local - 8 = "-00:32:38"  (or +15:32:38)
  //   img_tw = utc + 8 = 07:27:22 (不變!)
  // 所以: 如果 EXIF 已是 +08:00, day/hour 不用變

  if (tzOffset === 480) {
    // iPhone 本地時間, 不用轉
    const day = DAY_MAP[dateStr];
    if (!day) return null;
    const lat = parseGPS(exif);
    const lng = parseGPSLng(exif);
    return {
      day,
      hour,
      datetime_original: `${dateStr}T${hh}:${mm}:${ss}+00:00`,  // 標記為 UTC (Takeout 風格)
      lat,
      lng,
      location_name: gpsToLocation(lat, lng),
    };
  }

  // 其他時區: 轉台灣
  const dt = new Date(`${dateStr}T${hh}:${mm}:${ss}Z`);
  if (isNaN(dt.getTime())) return null;
  // 假設 EXIF 是該時區, 轉 UTC
  // EXIF 數值是當地時間, 需要知道是 UTC+X 才正確
  // 簡化: 直接 + 8
  hour = (parseInt(hh) + 8) % 24;
  const twDate = new Date(dt.getTime() + 8 * 60 * 60 * 1000);
  const twDateStr = twDate.toISOString().substring(0, 10);
  const day = DAY_MAP[twDateStr];
  if (!day) return null;
  const lat = parseGPS(exif);
  const lng = parseGPSLng(exif);
  return {
    day,
    hour,
    datetime_original: `${dateStr}T${hh}:${mm}:${ss}+00:00`,
    lat,
    lng,
    location_name: gpsToLocation(lat, lng),
  };
}

function parseGPS(exif) {
  if (exif.GPSLatitude && exif.GPSLatitudeRef) {
    return dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
  }
  return null;
}

function parseGPSLng(exif) {
  if (exif.GPSLongitude && exif.GPSLongitudeRef) {
    return dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);
  }
  return null;
}

async function main() {
  // 1. 從 DB 拉 413 筆
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=id,filename&limit=1000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const db_data = await res.json();
  console.log(`📊 DB 總筆數: ${db_data.length}`);

  // 2. 建檔案 map
  const fileMap = {};
  for (const dir of [NEW_INBOX, OLD_INBOX]) {
    try {
      for (const f of readdirSync(dir)) {
        const fp = join(dir, f);
        if (statSync(fp).isFile() && !fileMap[f]) {
          fileMap[f] = fp;
        }
      }
    } catch (e) {}
  }
  console.log(`📂 找得到原檔: ${Object.keys(fileMap).length}`);

  // 3. 對每個 DB 筆抽 EXIF
  const updates = [];
  const notFound = [];
  const noExif = [];
  const notInTrip = [];

  for (const dbRow of db_data) {
    const fp = fileMap[dbRow.filename];
    if (!fp) { notFound.push(dbRow.filename); continue; }

    const exif = readExif(fp);
    const newRec = exifToRecord(exif);
    if (!newRec) {
      if (!exif.DateTimeOriginal) {
        noExif.push(dbRow.filename);
      } else {
        notInTrip.push({ fn: dbRow.filename, dto: exif.DateTimeOriginal });
      }
      continue;
    }

    updates.push({ filename: dbRow.filename, ...newRec });
  }

  console.log(`\n📊 統計:`);
  console.log(`   ✅ 可更新: ${updates.length}`);
  console.log(`   ❌ 找不到原檔: ${notFound.length}`);
  console.log(`   ⚠️  無 EXIF: ${noExif.length}`);
  console.log(`   🆕 EXIF 不在 7/17-7/24: ${notInTrip.length}`);

  if (notInTrip.length) {
    console.log(`\n🆕 EXIF 不在行程內的範例 (前 10):`);
    for (const x of notInTrip.slice(0, 10)) {
      console.log(`   ${x.fn}: ${x.dto}`);
    }
  }

  // 4. 用 on_conflict=filename upsert
  console.log(`\n📤 Upsert 到 Supabase...`);
  const BATCH = 50;
  let success = 0;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const upRes = await fetch(
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
    if (upRes.ok) {
      success += batch.length;
    } else {
      const err = await upRes.text();
      console.log(`   ❌ Batch ${i / BATCH + 1}: ${upRes.status} ${err.slice(0, 200)}`);
    }
  }
  console.log(`   ✅ ${success} / ${updates.length} 寫入 Supabase`);
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
