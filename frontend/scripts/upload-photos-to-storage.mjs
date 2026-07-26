#!/usr/bin/env node
/**
 * upload-photos-to-storage.mjs
 *
 * 並行 sips 轉 HEIC → JPEG → 上傳 Supabase Storage
 * - 用 Node.js + child_process 並行 (CPU 並行 4)
 * - 跳過已上傳 (x-upsert idempotent)
 * - 回傳 {uploaded, failed} 給 Python 端整合
 */

import { execSync, spawn } from "node:child_process";
import { readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import process from "node:process";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://bphhksbzedadaoscjctz.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwaGhrc2J6ZWRhZGFvc2NqY3R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4ODYxNywiZXhwIjoyMDk1NTY0NjE3fQ.jvJ-K7zzPYVXQq5PvIHTCBoNiFuYkWNKdBK0WFJbJjg";
const INBOX_DIR = process.env.INBOX_DIR || "/Volumes/Transcend/travel-archive/2026-jiangnan/00-inbox";
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "6");

const SUPPORTED_EXT = new Set([".heic", ".HEIC", ".jpg", ".JPG", ".jpeg", ".png", ".PNG"]);

// 列出 inbox 所有支援的檔案
const allFiles = readdirSync(INBOX_DIR)
  .filter((f) => SUPPORTED_EXT.has(extname(f)))
  .filter((f) => !f.includes("-已編輯"))
  .filter((f) => f.startsWith("IMG_"));

console.log(`📂 INBOX: ${allFiles.length} 個檔案`);
console.log(`⚡ 並行數: ${CONCURRENCY}\n`);

const start = Date.now();
let uploaded = 0;
let skipped = 0;
let failed = 0;
const failedList = [];

// 跑 sips 轉 JPEG (用 spawn 不用 execSync 才能 timeout)
function sipsToJpeg(srcPath, destPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("sips", [
      "-s", "format", "jpeg",
      "-Z", "1600",
      srcPath,
      "--out", destPath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0 && existsSync(destPath)) resolve(destPath);
      else reject(new Error(`sips exit ${code}: ${stderr.slice(0, 200)}`));
    });
    proc.on("error", reject);
  });
}

// 上傳到 Supabase Storage (用 curl, 比較快)
async function uploadToStorage(srcPath, storageKey) {
  const url = `${SUPABASE_URL}/storage/v1/object/${storageKey}`;
  // 直接用 sips 輸出到 storage 的標準輸出, pipe 到 curl
  // 不行, 必須先存到 /tmp 再 curl
  return new Promise((resolve, reject) => {
    const proc = spawn("curl", [
      "-s", "-X", "POST",
      "-H", `apikey: ${SERVICE_KEY}`,
      "-H", `Authorization: Bearer ${SERVICE_KEY}`,
      "-H", "Content-Type: image/jpeg",
      "-H", "x-upsert: true",
      "--data-binary", `@${srcPath}`,
      "-w", "\n%{http_code}",
      url,
    ]);
    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`curl exit ${code}`));
      const httpCode = parseInt(stdout.split("\n").pop());
      if (httpCode === 200 || httpCode === 409) resolve(httpCode);
      else reject(new Error(`HTTP ${httpCode}: ${stdout.slice(-200)}`));
    });
    proc.on("error", reject);
  });
}

// 處理單張照片
async function processPhoto(filename) {
  const srcPath = join(INBOX_DIR, filename);
  const stem = basename(filename, extname(filename));
  const storageKey = `travel-photos/${stem}.jpg`;
  const tmpJpg = `/tmp/upload-${stem}.jpg`;

  try {
    // 1. sips 轉 JPEG
    await sipsToJpeg(srcPath, tmpJpg);

    // 2. 上傳 (idempotent via x-upsert)
    await uploadToStorage(tmpJpg, storageKey);

    uploaded++;
    if (existsSync(tmpJpg)) unlinkSync(tmpJpg);
    return { ok: true };
  } catch (e) {
    failed++;
    failedList.push({ filename, error: e.message });
    if (existsSync(tmpJpg)) unlinkSync(tmpJpg);
    return { ok: false, error: e.message };
  }
}

// 並行控制 (semaphore)
async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      const item = items[i];
      results.push(await fn(item, i));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// 進度報告
const PROGRESS_INTERVAL = 30;
const progressTimer = setInterval(() => {
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  const rate = (uploaded + failed) / elapsed || 0;
  const eta = ((allFiles.length - uploaded - failed) / rate).toFixed(0);
  process.stdout.write(
    `\r📊 [${uploaded + failed}/${allFiles.length}] 上傳 ${uploaded}, 失敗 ${failed}, 速度 ${rate.toFixed(1)}/s, 剩 ${eta}s`
  );
}, PROGRESS_INTERVAL * 1000);

await runWithConcurrency(allFiles, processPhoto, CONCURRENCY);
clearInterval(progressTimer);

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(
  `\n\n🎉 完成: ✅ ${uploaded} 上傳, ❌ ${failed} 失敗, ⏱️  ${elapsed}s`
);
if (failed > 0) {
  console.log("\n失敗清單 (前 10):");
  for (const f of failedList.slice(0, 10)) {
    console.log(`  ${f.filename}: ${f.error.slice(0, 80)}`);
  }
}