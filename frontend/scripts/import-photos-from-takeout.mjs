#!/usr/bin/env node
/**
 * import-photos-from-takeout.mjs (v3 — Takeout 專用版)
 *
 * 專門讀 Google Takeout 解壓後的結構:
 *   takeout/Google 相簿/<相簿名>/
 *     IMG_4523.jpg         ← 原檔 (EXIF 完整)
 *     IMG_4523.jpg.json    ← Takeout 給的 metadata (含 GPS + 時間 + 拍攝者 + 地點)
 *     ...
 *
 * 為什麼用 Takeout JSON 不用 exiftool?
 *   - Takeout JSON 有 googlePhotosSpecific 區塊, 含 album / people / geoData / 拍攝裝置
 *   - 拍攝時間格式 ISO 8601 (exiftool 是 "YYYY:MM:DD HH:MM:SS")
 *   - GPS 用 lat/lng 不用 DMS,不用轉換
 *   - 直接告訴聖上地點 (places/geocode),不用我們自己對 8 日行程關鍵字
 *
 * 工作流程:
 *   1. 聖上跑完 Google Takeout → 解壓 → 照片 + JSON 移到 00-inbox + 05-exif-csv
 *   2. 跑這條:
 *      node scripts/import-photos-from-takeout.mjs
 *   3. 腳本會:
 *      a. 掃描 00-inbox 找 .jpg/.jpeg/.heic/.png/.mov/.mp4
 *      b. 找同檔名的 .json metadata (在 05-exif-csv 或同目錄)
 *      c. 從 JSON 抽 title + dateTaken + geoData + peopleNames
 *      d. 智慧推導 day/hour/uploader/location
 *      e. 批次 INSERT 到 Supabase travel_photo_meta
 */

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
const METADATA_DIR =
  process.env.METADATA_DIR ||
  "/Volumes/Transcend/travel-archive/2026-jiangnan/05-exif-csv";

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

const DAY_MAP = [
  { date: "2026-07-17", day: 1 },
  { date: "2026-07-18", day: 2 },
  { date: "2026-07-19", day: 3 },
  { date: "2026-07-20", day: 4 },
  { date: "2026-07-21", day: 5 },
  { date: "2026-07-22", day: 6 },
  { date: "2026-07-23", day: 7 },
  { date: "2026-07-24", day: 8 },
];

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

// 🆕 2026-07-26 Takeout JSON 的 `people[].name` 是 Google 自動臉部辨識的中文全名
// 對應聖上之前拍板的 13 位團員化名 (聖上 7-11 確認資料: 大宇=吳家昇, 小宇=梁勝評, 阿美=李春美...)
// 從 IMG_1343 真實範例看到: 黃佳分 ≠ 黃阿分 (佳 vs 阿 同音異字)
const PEOPLE_ALIAS_MAP = {
  吳家昇: "大宇",
  梁勝評: "小宇",
  李春美: "阿美",
  梁宸瑋: "宸瑋",
  黃倩: "黃倩",
  梁恩齊: "恩齊",
  黃佳分: "黃阿分", // 注意: 是 "佳" 不是 "阿", Takeout 同音異字
  黃阿分: "黃阿分",
  吳董: "吳董",
  阿喜: "阿喜",
  阿評: "阿評",
  阿橋: "阿橋",
  阿茹: "阿茹",
  阿伸: "阿伸",
  Brian: "Brian",
  Mana: "Mana",
};

const LOCATION_KEYWORDS = [
  ["西湖天地", "西湖天地"],
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
  ["烏鎮西柵", "烏鎮西柵"],
  ["烏鎮東柵", "烏鎮東柵"],
  ["東柵", "烏鎮東柵"],
  ["西柵", "烏鎮西柵"],
  ["烏鎮", "烏鎮西柵"],
  ["宋城", "宋城千古情"],
  ["運河", "京杭大運河遊船"],
  ["宮宴", "宮宴"],
  ["海底撈", "海底撈火鍋"],
  ["南翔", "南翔饅頭"],
  ["小楊生煎", "小楊生煎"],
  ["虹橋", "上海虹橋"],
  ["蕭山", "杭州蕭山機場"],
];

// ── Helpers ──────────────────────────────────────────────────────────────────
// 🆕 2026-07-30 §A.5 聖上拍板: 聖上看台灣時間, EXIF/Takeout 給的 photoTakenTime 是 UTC
//   必須先轉 UTC+8 再比對 DAY_MAP (否則 7/17 凌晨台北 = 7/16 UTC, 會被推到 null)
function inferDay(isoDate) {
  if (!isoDate) return null;
  const dt = new Date(isoDate);
  if (isNaN(dt.getTime())) return null;
  // 轉成台灣 UTC+8 datePart (YYYY-MM-DD)
  const tpeMs = dt.getTime() + 8 * 60 * 60 * 1000;
  const tpeDate = new Date(tpeMs);
  const datePart = tpeDate.toISOString().substring(0, 10);
  const match = DAY_MAP.find((d) => d.date === datePart);
  return match ? match.day : null;
}

function inferHour(isoDate) {
  if (!isoDate) return null;
  // 🆕 2026-07-26 聖上拍板: EXIF / Takeout 的 photoTakenTime 是 UTC, 但聖上看的是台灣時間 (UTC+8)
  //   必須把 hour 轉成 UTC+8 才對得起聖上選的時段 chip
  //   例: 2026-07-17T00:25:03+00:00 (UTC) → 台灣 08:25 (上午, 不是凌晨)
  const hourMatch = isoDate.match(/T(\d{2}):/);
  if (!hourMatch) return null;
  let hour = parseInt(hourMatch[1]);
  // ISO 字串有時區 (ex: +00:00 / +08:00) — 用 timezone offset 修正
  const tzMatch = isoDate.match(/[+-]\d{2}:?\d{2}$/);
  if (tzMatch) {
    const tzStr = tzMatch[0].replace(":", "");
    const sign = tzStr[0] === "+" ? 1 : -1;
    const tzH = parseInt(tzStr.substring(1, 3));
    const tzM = parseInt(tzStr.substring(3, 5));
    const tzOffsetMin = sign * (tzH * 60 + tzM);
    // 目標: 台灣 UTC+8 (480 min)
    const targetMin = 8 * 60;
    const diffMin = targetMin - tzOffsetMin;
    hour = ((hour * 60 + diffMin) / 60) % 24;
    if (hour < 0) hour += 24;
  } else {
    // 沒時區 → 假設是 UTC, 轉 +8
    hour = (hour + 8) % 24;
  }
  return Math.floor(hour);
}

function inferUploader(jsonMeta, filename) {
  // 🆕 2026-07-30 §A.5 聖上拍板: 直接用 Takeout people[0].name (iPhone 臉孔辨識 = 真實拍攝者)
  //   不要再做模糊比對, 直接寫正式名 (黃佳分 / 梁恩齊 / 李春美...) 給 photo-classifier 13 位按鈕對應
  //   fallback chain: people[0].name → description (聖上手寫) → filename → null
  const peopleName = jsonMeta?.people?.[0]?.name?.trim();
  if (peopleName) {
    // 先試 alias map (黃佳分 → 黃阿分 同音異字統一)
    return PEOPLE_ALIAS_MAP[peopleName] || peopleName;
  }
  // 向後兼容 (有些 Takeout 版本用 peopleNames)
  const peopleNamesName = jsonMeta?.peopleNames?.[0]?.name?.trim();
  if (peopleNamesName) {
    return PEOPLE_ALIAS_MAP[peopleNamesName] || peopleNamesName;
  }
  // 看檔名 (例如 IMG_阿喜_xxx.jpg)
  if (filename) {
    const matched = TEAM_MEMBERS.find((m) => filename.includes(m));
    if (matched) return matched;
  }
  return null;
}

// 🆕 2026-07-26 Reverse geocode: 從 lat/lng 推城市 (Takeout 不給 city 欄位)
// 用簡化版 bounding box: 聖上 8 天行程區域
function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  // 台灣桃園 (聖上家+出發)
  if (lat > 24.5 && lat < 25.5 && lng > 120.8 && lng < 121.6) return "台灣 · 桃園";
  // 桃園機場 (TPE)
  if (lat > 25.0 && lat < 25.2 && lng > 121.2 && lng < 121.4) return "台灣 · 桃園機場";
  // 杭州蕭山機場 (HGH)
  if (lat > 30.0 && lat < 30.3 && lng > 120.2 && lng < 120.5) return "杭州 · 蕭山機場";
  // 上海虹橋機場
  if (lat > 31.0 && lat < 31.3 && lng > 121.2 && lng < 121.5) return "上海 · 虹橋機場";
  // 上海浦東機場
  if (lat > 31.0 && lat < 31.3 && lng > 121.6 && lng < 121.9) return "上海 · 浦東機場";
  // 🆕 西塘古鎮 (浙江嘉興) - 擴大範圍: lat 30.84-30.95 / lng 120.79-120.95
  if (lat > 30.84 && lat < 30.96 && lng > 120.79 && lng < 120.96) return "西塘古鎮";
  // 🆕 烏鎮西柵 (浙江嘉興桐鄉) - 擴大範圍
  if (lat > 30.70 && lat < 30.82 && lng > 120.66 && lng < 120.82) return "烏鎮西柵";
  // 🆕 烏鎮東柵
  if (lat > 30.73 && lat < 30.81 && lng > 120.60 && lng < 120.74) return "烏鎮東柵";
  // 🆕 桐鄉市區 (嘉興, 烏鎮所在縣)
  if (lat > 30.60 && lat < 30.90 && lng > 120.40 && lng < 120.70) return "浙江 · 桐鄉";
  // 杭州市區 (西湖/上城/下城/拱墅/江干)
  if (lat > 30.1 && lat < 30.4 && lng > 119.9 && lng < 120.3) return "杭州";
  // 🆕 杭州西湖特別區
  if (lat > 30.22 && lat < 30.27 && lng > 120.06 && lng < 120.16) return "杭州 · 西湖";
  // 🆕 杭州靈隱/西湖周邊
  if (lat > 30.20 && lat < 30.30 && lng > 120.00 && lng < 120.18) return "杭州 · 西湖";
  // 🆕 上海外灘
  if (lat > 31.23 && lat < 31.245 && lng > 121.48 && lng < 121.50) return "上海 · 外灘";
  // 上海市區 (黃浦/徐匯/虹口/靜安/浦東)
  if (lat > 31.1 && lat < 31.4 && lng > 121.3 && lng < 121.7) return "上海";
  // 蘇州市區
  if (lat > 31.1 && lat < 31.5 && lng > 120.4 && lng < 120.8) return "蘇州";
  // 🆕 嘉興市區 (D2-D3 過境地)
  if (lat > 30.70 && lat < 30.95 && lng > 120.60 && lng < 121.10) return "浙江 · 嘉興";

  return null; // 沒匹配, 用其他 fallback
}

function inferLocation(filename, jsonMeta) {
  // 🆕 2026-07-26 優先 reverse geocode (Takeout 只給 lat/lng 不給 city)
  if (jsonMeta?.geoData) {
    const geo = jsonMeta.geoData;
    const lat = geo.latitude;
    const lng = geo.longitude;
    const city = reverseGeocode(lat, lng);
    if (city) return city;

    // Takeout 給的 city 例如 "Shanghai" / "Hangzhou" / "Wuzhen" (有些版本會有)
    const cityEn = geo.city?.trim();
    const regionEn = geo.region?.trim();
    const countryEn = geo.country?.trim();
    if (cityEn) {
      const cityMap = {
        Shanghai: "上海",
        Hangzhou: "杭州",
        Wuzhen: "烏鎮",
        Xitang: "西塘",
        Jiaxing: "嘉興",
        Suzhou: "蘇州",
        Huzhou: "湖州",
      };
      const cityCn = cityMap[cityEn] || cityEn;
      if (regionEn && regionEn !== cityEn) {
        const regionMap = {
          Zhejiang: "浙江省",
          Shanghai: "上海市",
          Jiangsu: "江蘇省",
        };
        return `${regionMap[regionEn] || regionEn} · ${cityCn}`;
      }
      return cityCn;
    }
    if (regionEn) {
      const regionMap = {
        Zhejiang: "浙江省",
        Shanghai: "上海市",
        Jiangsu: "江蘇省",
      };
      return regionMap[regionEn] || regionEn;
    }
    if (countryEn) return countryEn;
  }
  // Fallback: 看檔名關鍵字 (優先比對長關鍵字)
  if (filename) {
    const sorted = [...LOCATION_KEYWORDS].sort(
      (a, b) => b[0].length - a[0].length
    );
    for (const [keyword, location] of sorted) {
      if (filename.includes(keyword)) return location;
    }
  }
  return null;
}

function readTakeoutJson(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, "utf-8");
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

// ── Supabase ────────────────────────────────────────────────────────────────
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
  // 🆕 2026-07-26 用 on_conflict=filename 觸發 PostgREST upsert
  // (filename 是 unique constraint, 重跑時會更新欄位而非報 409)
  const url = `${SUPABASE_URL}/rest/v1/travel_photo_meta?on_conflict=filename`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(records),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, text: await res.text() };
  }
  return { ok: true, status: res.status, text: "" };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("📸  Google Takeout 智慧匯入 v3");
  console.log("═══════════════════════════════════════════════\n");

  if (!fs.existsSync(INBOX_DIR)) {
    console.error(`❌ 資料夾不存在: ${INBOX_DIR}`);
    process.exit(1);
  }

  if (!SUPABASE_KEY) {
    console.error(`❌ 缺少 SUPABASE_KEY`);
    process.exit(1);
  }

  // 1. 掃描 00-inbox 找照片
  const allFiles = fs.readdirSync(INBOX_DIR);
  const photoFiles = allFiles
    .filter((f) => SUPPORTED_EXT.includes(path.extname(f)))
    .map((f) => path.join(INBOX_DIR, f));

  console.log(`📂 ${INBOX_DIR}`);
  console.log(`   找到 ${photoFiles.length} 張照片/影片`);

  // 2. 查 metadata dir 也找 .json
  let metadataDirExists = fs.existsSync(METADATA_DIR);
  console.log(`📂 ${METADATA_DIR} — ${metadataDirExists ? "✅ 存在" : "❌ 不存在"}\n`);

  if (photoFiles.length === 0) {
    console.log(`💡 請先把 Takeout 解壓的照片複製到 00-inbox,再重跑。`);
    process.exit(0);
  }

  // 3. 🆕 2026-07-26 改成「全部都處理」(用 on_conflict upsert, 已存在也 UPDATE)
  console.log(`🔍 處理 00-inbox 全部檔案 (含已存在 UPDATE)...`);
  const newFiles = photoFiles; // 全部都跑, upsert 會自動處理已存在
  console.log(`   總共處理: ${newFiles.length} 張\n`);

  // 4. 找對應 .json metadata
  console.log(`📋 讀 Takeout JSON metadata + 智慧推導:`);
  const records = [];
  let skipNoJson = 0;
  let skipNoExif = 0;
  let skipOutOfRange = 0;
  let jsonFound = 0;

  for (const filePath of newFiles) {
    const filename = path.basename(filePath);
    // Takeout JSON 命名規則: IMG_1343.HEIC → IMG_1343.HEIC.supplemental-metadata.json
    // path.parse 拆出 base (IMG_1343) + ext (.HEIC),然後拼成 IMG_1343.HEIC
    const parsed = path.parse(filename);
    const baseWithExt = parsed.name + parsed.ext; // e.g. "IMG_1343.HEIC"

    // 找 .json: 先在 00-inbox 同目錄, 再到 05-exif-csv
    let jsonPath = path.join(INBOX_DIR, baseWithExt + ".supplemental-metadata.json");
    if (!fs.existsSync(jsonPath) && metadataDirExists) {
      jsonPath = path.join(METADATA_DIR, baseWithExt + ".supplemental-metadata.json");
    }

    // Fallback: 已編輯照片 IMG_1217-已編輯.HEIC 對應 IMG_1217.HEIC.supplemental-metadata.json
    if (!fs.existsSync(jsonPath)) {
      // 從 "-已編輯.HEIC" 拆出 "IMG_1217" 再拼
      const stripped = parsed.name.replace(/-已編輯$/, "");
      const fallbackWithExt = stripped + parsed.ext;
      let fallbackPath = path.join(INBOX_DIR, fallbackWithExt + ".supplemental-metadata.json");
      if (!fs.existsSync(fallbackPath) && metadataDirExists) {
        fallbackPath = path.join(METADATA_DIR, fallbackWithExt + ".supplemental-metadata.json");
      }
      if (fs.existsSync(fallbackPath)) {
        jsonPath = fallbackPath;
      }
    }

    let jsonMeta = null;
    if (fs.existsSync(jsonPath)) {
      jsonMeta = readTakeoutJson(jsonPath);
      jsonFound++;
    } else {
      skipNoJson++;
      console.log(
        `  ⚠️  ${filename} — 找不到 .json metadata (可能是影片/HEIC)`
      );
      continue;
    }

    const datetimeOriginal =
      jsonMeta?.photoTakenTime?.timestamp
        ? new Date(jsonMeta.photoTakenTime.timestamp * 1000).toISOString()
        : null;
    const day = inferDay(datetimeOriginal);
    const hour = inferHour(datetimeOriginal);
    const lat =
      jsonMeta?.geoData?.latitude ?? jsonMeta?.geoData?.lat ?? null;
    const lng =
      jsonMeta?.geoData?.longitude ?? jsonMeta?.geoData?.lng ?? null;
    const uploader = inferUploader(jsonMeta, filename);
    const location = inferLocation(filename, jsonMeta);
    const caption =
      jsonMeta?.description || jsonMeta?.title || null;

    if (!datetimeOriginal) {
      skipNoExif++;
      console.log(
        `  ⚠️  ${filename} — 無 photoTakenTime,跳過 (Takeout JSON 缺時間)`
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
      caption,
      google_drive_url: null,
      google_photos_thumb_url:
        jsonMeta?.thumbnailUrl || jsonMeta?.url || null,
      likes_count: 0,
      views_count: 0,
    });

    const tag = [];
    if (lat) tag.push("📍");
    if (uploader) tag.push(uploader);
    if (location) tag.push(location);
    console.log(
      `  ✅ ${filename} → D${day} ${String(hour).padStart(2, "0")}:xx ${tag.join(" ") || "(無 metadata)"}`
    );
  }

  console.log(`\n📊 統計:`);
  console.log(`   找到 JSON: ${jsonFound}/${newFiles.length}`);
  console.log(`   待 INSERT: ${records.length}`);
  console.log(`   跳過(無 JSON): ${skipNoJson}`);
  console.log(`   跳過(無時間): ${skipNoExif}`);
  console.log(`   跳過(非行程日): ${skipOutOfRange}\n`);

  if (records.length === 0) {
    console.log(`💡 沒有可匯入的記錄`);
    process.exit(0);
  }

  // 5. 批次 INSERT
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
      console.error(`  ❌ Batch 失敗: HTTP ${status}`);
      console.error(`     ${text.slice(0, 200)}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`🎉 完成!`);
  console.log(`   ✅ 成功: ${inserted} 張`);
  console.log(`   ❌ 失敗: ${failed} 張`);

  // 🆕 2026-07-30 §A.5 聖上拍板: 檢查 zip 是否涵蓋聖上完整 8 天 7 夜行程
  //   列出缺拍的日期, 提醒聖上是「zip 缺資料」還是「當天真的沒拍」
  const expectedDates = DAY_MAP.map((d) => d.date); // 7/17 - 7/24
  const actualDates = new Set(
    records
      .map((r) => r.datetime_original?.substring(0, 10))
      .filter(Boolean)
      .map((d) => {
        // 把 date 轉成 TPE date
        const dt = new Date(d);
        const tpeMs = dt.getTime() + 8 * 60 * 60 * 1000;
        return new Date(tpeMs).toISOString().substring(0, 10);
      })
  );
  const missingDates = expectedDates.filter((d) => !actualDates.has(d));
  if (missingDates.length > 0) {
    console.log(`\n⚠️  zip 缺拍攝日期 (${missingDates.length}/${expectedDates.length}):`);
    for (const d of missingDates) {
      const dayMatch = DAY_MAP.find((x) => x.date === d);
      console.log(`   - ${d} = D${dayMatch?.day} (zip 內無此日拍攝的照片)`);
    }
    console.log(`\n💡 這 2 種可能:`);
    console.log(`   (a) 聖上當天真的沒拍照 → 正常, D${missingDates.map((x) => DAY_MAP.find((y) => y.date === x)?.day).join("/")} 本就該是 0 張`);
    console.log(`   (b) zip 沒匯到當天照片 → 重新 Takeout (到 takeout.google.com 加這些相簿)`);
    console.log(`\n   聖上拍板前先 grep 一下 Takeout 設定: 確認「包含相簿」清單裡有涵蓋這幾天。\n`);
  } else {
    console.log(`\n✅ zip 涵蓋聖上完整 8 天 7 夜 (7/17 - 7/24 都有拍攝資料)`);
  }

  console.log(`\n👉 打開 http://localhost:3000/travel/photo-album 看效果`);
  console.log(`═══════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error("💥 錯誤:", e.message);
  console.error(e.stack);
  process.exit(1);
});