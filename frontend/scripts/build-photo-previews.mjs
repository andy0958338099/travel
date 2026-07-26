#!/usr/bin/env node
/**
 * build-photo-previews.mjs
 *
 * 把 Takeout 解壓的 HEIC / MOV 原檔, 用 macOS 內建 sips 轉成 JPEG,
 * 放到 Next.js public/photos-previews/, 讓 <img> tag 能直接顯示.
 *
 * 為什麼需要這個:
 *   - HEIC 瀏覽器原生不支援 (Safari 17+ 才有, Chrome/Edge 不行)
 *   - Google Photos 的 thumb URL 有 session token, 從 external fetch 會 302 redirect 登入
 *   - Takeout 沒給 .jpg preview (iOS 14+ 改用 HDR Gain Map, 沒有 embedded JPEG)
 *   - sips 是 macOS 內建, 不需裝額外套件, 速度還可以 (~1-2 秒/張)
 *
 * 跑一次:
 *   node scripts/build-photo-previews.mjs
 *
 * 預期時間: 297 張 HEIC 約 5-10 分鐘 (m1 macbook air ~ 3 分鐘)
 * 預期大小: ~300 MB (1MB/張 JPEG)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SOURCE_DIR =
  process.env.SOURCE_DIR ||
  "/Volumes/Transcend/travel-archive/2026-jiangnan/00-inbox";
const OUTPUT_DIR =
  process.env.OUTPUT_DIR ||
  "/Volumes/Transcend/manga-studio/frontend/public/photos-previews";

const SUPPORTED = [".HEIC", ".heic", ".JPG", ".jpg", ".JPEG", ".jpeg", ".PNG", ".png"];

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("📸  照片縮圖建構腳本");
  console.log("═══════════════════════════════════════════════\n");
  console.log(`📂 來源: ${SOURCE_DIR}`);
  console.log(`📂 輸出: ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 來源不存在: ${SOURCE_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ 建立輸出目錄`);
  }

  const allFiles = fs.readdirSync(SOURCE_DIR);
  const photoFiles = allFiles.filter((f) =>
    SUPPORTED.includes(path.extname(f))
  );

  console.log(`📊 找到 ${photoFiles.length} 張照片/影片\n`);

  if (photoFiles.length === 0) {
    console.log(`💡 沒有照片`);
    process.exit(0);
  }

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < photoFiles.length; i++) {
    const filename = photoFiles[i];
    const src = path.join(SOURCE_DIR, filename);
    // 統一檔名: IMG_1224.HEIC -> IMG_1224.jpg (即使原檔是 jpg 也覆蓋)
    const stem = filename.replace(/\.[^.]+$/, "");
    const dst = path.join(OUTPUT_DIR, `${stem}.jpg`);

    if (fs.existsSync(dst)) {
      skipped++;
      console.log(`  ⏭️  ${filename} → ${stem}.jpg (已存在)`);
      continue;
    }

    try {
      // sips -s format jpeg <src> --out <dst>
      execSync(`sips -s format jpeg "${src}" --out "${dst}" 2>&1`, {
        stdio: "pipe",
        timeout: 30,
      });
      converted++;
      const size = fs.statSync(dst).size;
      const sizeStr = size > 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(1)} MB`
        : `${(size / 1024).toFixed(0)} KB`;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `  ✅ ${filename} → ${stem}.jpg (${sizeStr}) [${i + 1}/${photoFiles.length} ${elapsed}s]`
      );
    } catch (e) {
      failed++;
      console.error(`  ❌ ${filename} 失敗: ${e.message.slice(0, 100)}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`🎉 完成!`);
  console.log(`   ✅ 轉檔: ${converted}`);
  console.log(`   ⏭️  跳過: ${skipped}`);
  console.log(`   ❌ 失敗: ${failed}`);
  console.log(`   ⏱️  耗時: ${totalTime}s`);
  console.log(`═══════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error("💥 錯誤:", e);
  process.exit(1);
});