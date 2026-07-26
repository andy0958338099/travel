#!/usr/bin/env node
/**
 * import-photos-from-folder.mjs (v2 — 智慧版)
 *
 * 不需要 CSV、不需要 Excel。直接把 00-inbox 裡的照片批次匯入 Supabase。
 *
 * 工作流程:
 *   1. 聖上把所有原檔照片丟到 /Volumes/Transcend/travel-archive/2026-jiangnan/00-inbox/
 *   2. 跑這條:
 *      node scripts/import-photos-from-folder.mjs
 *   3. 腳本會:
 *      a. 跑 exiftool 抓每張照片的 DateTimeOriginal + GPS + Artist
 *      b. 自動從 DateTimeOriginal 推 day (1-8) 跟 hour (0-23)
 *      c. 自動從檔名 / EXIF Artist 推 uploader (用 13 位團員名單模糊比對)
 *      d. 從日期 7/17-7/24 自動對應 D1-D8 中文標題
 *      e. 批次 INSERT 到 Supabase travel_photo_meta
 *
 * 智慧推導規則:
 *   - day: DateTimeOriginal 月日 → D1=7/17, D2=7/18, ... D8=7/24
 *   - hour: DateTimeOriginal 小時 → 0-23
 *   - uploader: 先看 EXIF Artist, 再看檔名包含團員名 (e.g. IMG_阿喜_xxx.jpg)
 *   - location_name: 看檔名包含地點關鍵字 (西湖/外灘/烏鎮/...)
 *
 * 跳過規則:
 *   - 沒 EXIF DateTimeOriginal 的照片 (可能被 LINE/IG 壓縮過)
 *   - 日期不在 7/17-7/24 的照片 (非本次行程)
 *   - 重複 INSERT (filename 已存在)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bphhksbzedadaoscjctz.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

const INBOX_DIR =
  process.env.INBOX_DIR ||
  "/Volumes/Transcend/travel-archive/2026-jiangnan/00-inbox";

const SUPPORTED_EXT = [
  ".jpg",
  ".jpeg",
  ".JPG",
  ".JPEG",
  ".heic",
  ".HEIC",
  ".heif",
  ".HEIF",
  ".png",
  ".PNG",
  ".mov",
  ".MOV",
  ".mp4",
  ".MP4",
];

// 8 天對照表 (2026 聖上實際出發日)
const DAY_MAP = [
  { date: "2026:07:17", day: 1, title: "D1 台北→上海" },
  { date: "2026:07:18", day: 2, title: "D2 上海→西塘" },
  { date: "2026:07:19", day: 3, title: "D3 西塘→烏鎮東柵" },
  { date: "2026:07:20", day: 4, title: "D4 烏鎮西柵" },
  { date: "2026:07:21", day: 5, title: "D5 烏鎮→杭州" },
  { date: "2026:07:22", day: 6, title: "D6 杭州宋城" },
  { date: "2026:07:23", day: 7, title: "D7 杭州運河宮宴" },
  { date: "2026:07:24", day: 8, title: "D8 杭州→台北" },
];

// 13 位團員 (Brian/Mana 兩位固定 + 13 位家人)
const TEAM_MEMBERS = [
  "Brian",
  "Mana",
  "阿喜",
  "黃阿分",
  "阿美",
  "阿評",
  "吳董",
  "黃倩",
  "大宇",
  "小宇",
  "宸瑋",
  "恩齊",
  "阿橋",
  "阿茹",
  "阿伸",
];

// 地點關鍵字 (檔名包含 → 自動推 location_name)
const LOCATION_KEYWORDS = [
  ["西湖", "西湖(主湖區)"],
  ["斷橋", "斷橋殘雪"],
  ["雷峰塔", "雷峰塔"],
  ["靈隱", "靈隱寺"],
  ["飛來峰", "飛來峰"],
  ["龍井", "龍井茶園"],
  ["河坊街", "河坊街"],
  ["蘇堤", "蘇堤"],
  ["外灘", "外灘夜景"],
  ["豫園", "豫園"],
  ["城隍廟", "城隍廟"],
  ["西塘", "西塘古鎮"],
  ["烏鎮", "烏鎮西柵"],
  ["東柵", "烏鎮東柵"],
  ["西柵", "烏鎮西柵"],
  ["宋城", "宋城千古情"],
  ["運河", "京杭大運河遊船"],
  ["宮宴", "宮宴"],
  ["海底撈", "海底撈火鍋"],
  ["南翔", "南翔饅頭"],
  ["小楊生煎", "小楊生煎"],
  ["桃園機場", "桃園機場"],
  ["虹橋", "上海虹橋"],
  ["杭州蕭山", "杭州蕭山機場"],
  ["飯店", null], // 略過, 讓更精準的關鍵字先匹配
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function dmsToDecimal(dms, ref) {
  if (!dms) return null;
  const parts = String(dms).split(/[^\d.]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const [d, m, s] = parts.map(parseFloat);
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return dec;
}

function inferDay(datetimeOriginal) {
  if (!datetimeOriginal) return null;
  const datePart = datetimeOriginal.substring(0, 10).replace(/-/g, ":");
  const match = DAY_MAP.find((d) => d.date === datePart);
  return match ? match.day : null;
}

function inferHour(datetimeOriginal) {
  if (!datetimeOriginal) return null;
  const hourMatch = datetimeOriginal.match(/T(\d{2}):/);
  return hourMatch ? parseInt(hourMatch[1]) : null;
}

function inferUploader(exifArtist, filename) {
  // 先看 EXIF Artist
  if (exifArtist) {
    const matched = TEAM_MEMBERS.find((m) => exifArtist.includes(m));
    if (matched) return matched;
  }
  // 再看檔名
  if (filename) {
    const matched = TEAM_MEMBERS.find((m) => filename.includes(m));
    if (matched) return matched;
  }
  return null;
}

function inferLocation(filename) {
  if (!filename) return null;
  // 先比對長關鍵字 (避免「西湖」先於「西湖天地」)
  const sorted = [...LOCATION_KEYWORDS]
    .filter(([_, v]) => v !== null)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, location] of sorted) {
    if (filename.includes(keyword)) return location;
  }
  return null;
}

// ── Exiftool batch call ────────────────────────────────────────────────────
function readExifBatch(files) {
  const fileList = files.map((f) => `"${f}"`).join(" ");
  const cmd = `exiftool -j -s \
    -filename -DateTimeOriginal -Artist \
    -GPSLatitude -GPSLatitudeRef -GPSLongitude -GPSLongitudeRef \
    -description -ImageWidth -ImageHeight \
    ${fileList}`;

  try {
    const output = execSync(cmd, { maxBuffer: 50 * 1024 * 1024 }).toString();
    return JSON.parse(output);
  } catch (e) {
    console.error(`❌ exiftool 失敗: ${e.message.slice(0, 200)}`);
    return [];
  }
}

// ── Supabase query ──────────────────────────────────────────────────────────
async function getExistingFilenames() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=filename`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) return new Set();
  const data = await res.json();
  return new Set((data ?? []).map((r) => r.filename));
}

async function insertBatch(records) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/travel_photo_meta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(records),
  });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("📸  8 天 7 夜多人旅行 · 智慧匯入 EXIF");
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(INBOX_DIR)) {
    console.error(`❌ 資料夾不存在: ${INBOX_DIR}`);
    console.error(`   請先建立並把照片原檔放進去。`);
    process.exit(1);
  }

  if (!SUPABASE_KEY) {
    console.error(`❌ 缺少 SUPABASE_KEY 環境變數`);
    console.error(`   export SUPABASE_KEY=sb_publishable_xxx`);
    process.exit(1);
  }

  // 1. 掃描檔案
  const allFiles = fs.readdirSync(INBOX_DIR);
  const photoFiles = allFiles
    .filter((f) => SUPPORTED_EXT.includes(path.extname(f)))
    .map((f) => path.join(INBOX_DIR, f));

  console.log(`📂 掃描 ${INBOX_DIR}`);
  console.log(`   找到 ${photoFiles.length} 張照片/影片\n`);

  if (photoFiles.length === 0) {
    console.log(`💡 請先把原檔照片複製到此資料夾,再重跑本腳本。`);
    process.exit(0);
  }

  // 2. 查 Supabase 已存在 filename (跳過重複 INSERT)
  console.log(`🔍 查 Supabase 已存在的 filename...`);
  const existing = await getExistingFilenames();
  const newFiles = photoFiles.filter(
    (f) => !existing.has(path.basename(f))
  );
  console.log(`   已存在: ${existing.size} 張`);
  console.log(`   待匯入: ${newFiles.length} 張\n`);

  if (newFiles.length === 0) {
    console.log(`🎉 全部已匯入,沒有新檔案需要處理。`);
    process.exit(0);
  }

  // 3. 跑 exiftool 批次讀 EXIF
  console.log(`📷 跑 exiftool 讀 EXIF (${newFiles.length} 張, 可能需 30 秒)...`);
  const exifData = readExifBatch(newFiles);
  console.log(`   讀到 ${exifData.length} 筆 EXIF\n`);

  // 4. 解析 + 智慧推導
  console.log(`🔮 智慧推導 day/hour/uploader/location:`);
  const records = [];
  let skipNoExif = 0;
  let skipOutOfRange = 0;

  for (const meta of exifData) {
    const filename = path.basename(meta.SourceFile || meta.FileName || "");
    const datetimeOriginal = meta.DateTimeOriginal
      ? meta.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T")
      : null;
    const day = inferDay(datetimeOriginal);
    const hour = inferHour(datetimeOriginal);
    const lat = dmsToDecimal(meta.GPSLatitude, meta.GPSLatitudeRef);
    const lng = dmsToDecimal(meta.GPSLongitude, meta.GPSLongitudeRef);
    const uploader = inferUploader(meta.Artist, filename);
    const location = inferLocation(filename);

    if (!datetimeOriginal) {
      skipNoExif++;
      console.log(
        `  ⚠️  ${filename} — 無 DateTimeOriginal,跳過(可能 LINE/IG 壓縮過)`
      );
      continue;
    }
    if (!day) {
      skipOutOfRange++;
      console.log(
        `  ⚠️  ${filename} — 日期 ${datetimeOriginal.substring(0, 10)} 不在 7/17-7/24`
      );
      continue;
    }

    records.push({
      filename,
      datetime_original: datetimeOriginal,
      day,
      hour,
      lat,
      lng,
      location_name: location,
      uploader_name: uploader,
      uploader_id: uploader,
      caption: meta.description || null,
      google_drive_url: null,
      google_photos_thumb_url: null,
      likes_count: 0,
      views_count: 0,
    });

    console.log(
      `  ✅ ${filename} → D${day} ${hour}:xx ${uploader ?? "(未署名)"} ${location ?? "(無地點)"} ${lat ? "📍" : "—"}`
    );
  }

  console.log(`\n📊 統計:`);
  console.log(`   待 INSERT: ${records.length}`);
  console.log(`   跳過(無 EXIF): ${skipNoExif}`);
  console.log(`   跳過(非行程日): ${skipOutOfRange}\n`);

  if (records.length === 0) {
    console.log(`💡 沒有可匯入的記錄,檢查檔案是否為本次行程。`);
    process.exit(0);
  }

  // 5. 批次 INSERT (每批 50)
  const BATCH_SIZE = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { ok, status, text } = await insertBatch(batch);

    if (ok) {
      inserted += batch.length;
      const pct = Math.round((inserted / records.length) * 100);
      console.log(
        `  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)} — ${pct}% (${inserted}/${records.length})`
      );
    } else {
      failed += batch.length;
      console.error(
        `  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} 失敗: HTTP ${status}`
      );
      console.error(`     ${text.slice(0, 200)}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`🎉 完成!`);
  console.log(`   ✅ 成功: ${inserted} 張`);
  console.log(`   ❌ 失敗: ${failed} 張`);
  console.log(`\n👉 打開 http://localhost:3000/travel/photo-album 看效果`);
  console.log(`═══════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error("💥 腳本錯誤:", e.message);
  process.exit(1);
});