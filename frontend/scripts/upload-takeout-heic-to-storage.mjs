#!/usr/bin/env node
/**
 * upload-takeout-heic-to-storage.mjs (v1 — 聖上 7-30 §A 拍板)
 *
 * 流程:
 *   1. 讀 Supabase travel_photo_meta 已有的 metadata (id, filename, day, datetime_original)
 *   2. 在聖上 Takeout zip 路徑找同名 HEIC (含 -已編輯 fallback)
 *   3. sips 轉 JPEG (max 1600px 長邊, quality 80)
 *   4. 上傳到 Supabase Storage `travel-photos/day{N}/{baseName}.jpg`
 *   5. UPDATE travel_photo_meta.google_photos_thumb_url
 *
 * 為什麼用 `travel-photos/day{N}/`?
 *   - 既有 bucket (7-26 photo-album 沿用), 0 新建
 *   - `day{N}` 路徑讓 Supabase Storage RLS policy 簡單 (`bucket_id='travel-photos'`)
 *   - 之後 photo-classifier 用 public URL 直接 fetch
 *
 * 限制:
 *   - sips 一次一張, 412 張串行 ≈ 5-10 分鐘
 *   - HEIC → JPEG 丟失 Apple ProRAW RAW, 但網頁本來就不支援 HEIC, 對聖上看無影響
 *   - 同檔名 (IMG_1217 + IMG_1217-已編輯) 兩個 row 寫同一路徑, 後者覆蓋前者
 *     → 聖上看照片會看到「已編輯」版本 (反正原圖也在 metadata)
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const execFileP = promisify(execFile);

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://bphhksbzedadaoscjctz.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

const TAKEOT_DIR =
  process.env.TAKEOT_DIR ||
  "/Users/brian/Downloads/Takeout/Google 相簿/杭州共享相簿";

const BUCKET = "travel-photos";
const JPEG_QUALITY = 80;
const JPEG_MAX_DIM = 1600; // 長邊 max 1600px (Instagram 級, 對網頁足夠)

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * sips 轉 HEIC/PNG/MOV → JPEG
 * @returns {Promise<string>} 暫存 JPEG 路徑
 */
async function convertToJpeg(srcPath) {
  const tmpPath = path.join(
    os.tmpdir(),
    `takeout-${Date.now()}-${path.basename(srcPath)}.jpg`
  );
  // 🆕 2026-07-30 §A 修法: sips 參數順序敏感 — 所有 -s 設定要在 input/output 之前
  //   否則 sips 會把 -s formatOptions 80 當成 input 檔名, 產生空 tmpPath
  await execFileP("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    String(JPEG_QUALITY),
    "--resampleHeightWidthMax",
    String(JPEG_MAX_DIM),
    srcPath,
    "--out",
    tmpPath,
  ]);
  return tmpPath;
}

/**
 * 上傳 JPEG 到 Supabase Storage
 * @returns {Promise<string>} public URL
 */
async function uploadToStorage(localPath, storagePath) {
  const buffer = fs.readFileSync(localPath);
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "image/jpeg",
        "x-upsert": "true", // 同檔名覆蓋 (IMG_1217 + IMG_1217-已編輯)
      },
      body: buffer,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload ${storagePath} 失敗: HTTP ${res.status} ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/**
 * UPDATE travel_photo_meta.google_photos_thumb_url
 */
async function updateThumbUrl(id, url) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ google_photos_thumb_url: url }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update ${id} 失敗: HTTP ${res.status} ${text}`);
  }
}

/**
 * 在 TAKEOT_DIR 找聖上 photo (含 -已編輯 fallback)
 * 聖上可能上傳 IMG_1217.HEIC 或 IMG_1217-已編輯.HEIC
 * 都對同一個 DB row
 */
function findPhotoFile(filename) {
  const baseName = path.parse(filename).name; // IMG_1217
  const ext = path.parse(filename).ext; // .HEIC
  const candidates = [
    path.join(TAKEOT_DIR, filename),
    path.join(TAKEOT_DIR, `${baseName}-已編輯${ext}`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("📸  Takeout HEIC → Supabase Storage 上傳");
  console.log("═══════════════════════════════════════════════\n");

  if (!SUPABASE_KEY) {
    console.error("❌ 缺少 SUPABASE_KEY");
    process.exit(1);
  }
  if (!fs.existsSync(TAKEOT_DIR)) {
    console.error(`❌ 資料夾不存在: ${TAKEOT_DIR}`);
    process.exit(1);
  }

  // 1. 撈 DB 全部 metadata (排除已經有 thumb_url 的, 支援重跑)
  console.log(`📂 ${TAKEOT_DIR}`);
  console.log(`📡 撈 Supabase travel_photo_meta 全部 row ...\n`);

  const fetchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=id,filename,day,datetime_original&order=filename.asc&limit=2000`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!fetchRes.ok) {
    console.error(`❌ DB fetch 失敗: HTTP ${fetchRes.status}`);
    process.exit(1);
  }
  const allRows = await fetchRes.json();
  console.log(`   DB 共 ${allRows.length} 筆 row\n`);

  // 2. 找本機檔案
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  const t0 = Date.now();

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const pct = Math.round(((i + 1) / allRows.length) * 100);
    const filename = row.filename;
    const day = row.day ?? 0;

    // 找本機 HEIC/PNG/MOV
    const srcPath = findPhotoFile(filename);
    if (!srcPath) {
      console.log(
        `  [${pct}%] ⚠️  ${filename} (D${day}) — 本機無檔, 跳過`
      );
      skipped++;
      continue;
    }

    // 跳過 MOV (影片不轉 JPEG)
    if (path.extname(srcPath).toLowerCase() === ".mov") {
      console.log(
        `  [${pct}%] ⏭️  ${filename} (D${day}) — MOV 影片, 跳過上傳`
      );
      skipped++;
      continue;
    }

    // storage path: day{N}/{baseName-without-edited-suffix}.jpg
    // IMG_1217-已編輯.HEIC → day1/IMG_1217.jpg (統一 basename)
    const baseName = path.parse(filename).name.replace(/-已編輯$/, "");
    const storagePath = `day${day}/${baseName}.jpg`;
    const publicUrl = `https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/${BUCKET}/${storagePath}`;

    try {
      // HEIC/PNG → JPEG
      const jpegPath = await convertToJpeg(srcPath);
      // 上傳
      await uploadToStorage(jpegPath, storagePath);
      // UPDATE DB
      await updateThumbUrl(row.id, publicUrl);
      // 先讀 sizeKB 再刪 (7-30 §A 修法)
      const sizeKB = Math.round(fs.statSync(jpegPath).size / 1024);
      fs.unlinkSync(jpegPath);

      console.log(
        `  [${pct}%] ✅ ${filename} (D${day}) → ${storagePath} (${sizeKB} KB)`
      );
      processed++;
    } catch (err) {
      console.error(
        `  [${pct}%] ❌ ${filename} (D${day}) — ${err.message}`
      );
      errors.push({ filename, error: err.message });
      failed++;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`🎉 完成!`);
  console.log(`   ✅ 上傳: ${processed} 張`);
  console.log(`   ⏭️  跳過: ${skipped} 張 (MOV 或本機無檔)`);
  console.log(`   ❌ 失敗: ${failed} 張`);
  console.log(`   ⏱️  耗時: ${elapsed}s`);

  if (errors.length > 0) {
    console.log(`\n❌ 失敗清單:`);
    for (const e of errors.slice(0, 10)) {
      console.log(`   - ${e.filename}: ${e.error}`);
    }
    if (errors.length > 10) {
      console.log(`   ... 還有 ${errors.length - 10} 個`);
    }
  }

  console.log(`\n💡 聖上下一步:`);
  console.log(`   1. 改 photo-classifier ClientPage.tsx — useState[] 改 useEffect fetch Supabase`);
  console.log(`   2. 開 https://travel-china.netlify.app/travel/photo-classifier 看真實照片`);
  console.log(`═══════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error("💥 錯誤:", e.message);
  console.error(e.stack);
  process.exit(1);
});