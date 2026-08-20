#!/usr/bin/env node
/**
 * 🆕 2026-08-20 聖上拍板 🅐: Supabase Storage Cached Egress 驗證
 *
 * 目的: 驗證 Supabase Storage bucket 的 Cache-Control header 是否生效,
 *       確認 30 天內重訪是否走 CDN cache (不計 egress)。
 *
 * 用法:
 *   node scripts/verify-cache-headers.mjs                    # 驗證預設 3 張範例圖
 *   node scripts/verify-cache-headers.mjs --url "https://..."  # 驗證單張圖
 *   node scripts/verify-cache-headers.mjs --bucket travel-photos  # 列出 bucket 前 5 張圖逐一驗證
 *
 * 輸出:
 *   表格列出每張圖的:
 *     - HTTP status
 *     - cache-control header (期望: max-age=2592000)
 *     - age header (CDN 命中時會有值, MISS 時為 0 或無)
 *     - cf-cache-status (Cloudflare, HIT/MISS/EXPIRED)
 *     - x-vercel-cache 或 x-cache (視 CDN 而定)
 *     - content-length (圖片大小)
 *
 * 🛑 不會動 Supabase 後台, 純 GET 驗證。
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// 載 env (不引入 dotenv, 簡單 regex 解析)
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error("❌ .env.local 缺 NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

// 用 curl 抓 headers (比 fetch 更容易看完整 header)
// 不用 -I (HEAD), 因為 Supabase Storage 對 HEAD 不友善, 改用 -D 抓 header + --output /dev/null 丟 body
function curlHeaders(url) {
  try {
    const out = execSync(
      `curl -s --max-time 15 -D - --output /dev/null "${url}"`,
      { encoding: "utf-8", maxBuffer: 1024 * 64 }
    );
    return out;
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function parseHeaders(raw) {
  const headers = {};
  // curl 在 macOS 回的是 CRLF (\r\n), 先 split 再處理
  const lines = raw.split(/\r?\n/);
  let status = "?";
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("HTTP/")) {
      const m = line.match(/HTTP\/[\d.]+\s+(\d+)/);
      if (m) status = m[1];
      continue;
    }
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[key] = value;
    }
  }
  return { status, headers };
}

function fmtBytes(b) {
  if (!b) return "?";
  const n = parseInt(b, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function checkUrl(url) {
  console.log(`\n🔍 ${url}`);
  const raw = curlHeaders(url);
  if (raw.startsWith("ERROR")) {
    console.log(`  ❌ ${raw}`);
    return null;
  }
  const { status, headers } = parseHeaders(raw);

  const cacheControl = headers["cache-control"] || "(無)";
  const age = headers["age"] || "(無 — 代表 CDN MISS)";
  const cfStatus = headers["cf-cache-status"] || "(無 — 可能不在 Cloudflare)";
  const xCache = headers["x-cache"] || "(無)";
  const xVercel = headers["x-vercel-cache"] || "(無)";
  // 圖片 size 從 Content-Length (body 被丟掉, 不會回 Content-Range)
  const contentLen = headers["content-length"] || "?";
  const contentType = headers["content-type"] || "?";

  console.log(`  HTTP ${status}  |  ${fmtBytes(contentLen)}  |  ${contentType}`);
  console.log(`  Cache-Control: ${cacheControl}`);

  // 預期: max-age=2592000 (30 天)
  const expected = "2592000";
  const pass = cacheControl.includes(`max-age=${expected}`);
  console.log(`  ${pass ? "✅" : "⚠️"} 期望 max-age=${expected} (30天) ${pass ? "PASS" : "FAIL"}`);

  console.log(`  CDN 命中指標:`);
  console.log(`    age:        ${age}`);
  console.log(`    cf-cache:   ${cfStatus}`);
  console.log(`    x-cache:    ${xCache}`);
  console.log(`    x-vercel:   ${xVercel}`);

  return { url, status, cacheControl, age, cfStatus, contentLen };
}

// CLI 參數解析
function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1];
}

const customUrl = getArg("url");
const bucket = getArg("bucket");

// 從 Supabase Storage API 列出 bucket 真實檔案
// 必須給 prefix, 給空字串 = root (但很多 bucket 檔案在子資料夾)
// 策略: 從 posts 表撈真實 image_url, 這是 production 真正在用的路徑
async function fetchRealUrlsFromDb(limit = 3) {
  const KEY = env.SUPABASE_SERVICE_KEY;
  if (!KEY) {
    console.error("❌ .env.local 缺 SUPABASE_SERVICE_KEY");
    process.exit(1);
  }
  // posts 表 (story-blog 主圖)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=id,image_url&order=created_at.desc&limit=${limit}&image_url=not.is.null`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) {
    throw new Error(`posts query failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const rows = await res.json();
  return rows
    .filter((r) => r.image_url)
    .map((r) => ({ url: r.image_url, source: "posts", id: r.id }));
}

// 向後相容: 也保留 storage list 邏輯 (若 DB 沒資料時 fallback)
async function listBucketObjects(bucketName, limit = 3) {
  const KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!KEY) {
    console.error("❌ .env.local 缺 SUPABASE_SERVICE_KEY 或 SUPABASE_ANON_KEY");
    process.exit(1);
  }

  async function fetchPrefix(prefix) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucketName}`, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix, limit, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${bucketName}/${prefix} failed: ${res.status}`);
    return res.json();
  }

  const root = await fetchPrefix("");
  const rootFiles = root.filter((it) => it.name && (it.metadata?.size || 0) > 0);
  if (rootFiles.length > 0) return rootFiles.slice(0, limit);

  const subfolders = root
    .filter((it) => it.name && (!it.metadata?.size || it.metadata.size === 0))
    .map((it) => it.name);
  if (subfolders.length === 0) return [];

  const preferred = ["day1/", "vlog/", "public/", "story-blog/", "photos/", "story-uploads/"];
  const sorted = [
    ...subfolders.filter((s) => preferred.includes(s)),
    ...subfolders.filter((s) => !preferred.includes(s)).sort(),
  ];

  for (const folder of sorted) {
    try {
      const sub = await fetchPrefix(folder);
      const subFiles = sub.filter((it) => it.name && (it.metadata?.size || 0) > 0);
      if (subFiles.length > 0) {
        return subFiles.slice(0, limit).map((it) => ({
          ...it,
          name: `${folder}${it.name}`,
        }));
      }
      const nestedFolders = sub
        .filter((it) => it.name && (!it.metadata?.size || it.metadata.size === 0))
        .map((it) => it.name);
      for (const nested of nestedFolders.slice(0, 3)) {
        const nestedSub = await fetchPrefix(`${folder}${nested}`);
        const nestedFiles = nestedSub.filter((it) => it.name && (it.metadata?.size || 0) > 0);
        if (nestedFiles.length > 0) {
          return nestedFiles.slice(0, limit).map((it) => ({
            ...it,
            name: `${folder}${nested}${it.name}`,
          }));
        }
      }
    } catch (e) { continue; }
  }
  return [];
}

if (customUrl) {
  checkUrl(customUrl);
} else {
  // 主流程: 從 DB posts 表撈真實 production URL
  let realUrls = [];
  try {
    realUrls = await fetchRealUrlsFromDb(3);
  } catch (e) {
    console.log(`⚠️ 從 DB 撈 URL 失敗: ${e.message}`);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("📜 Supabase Storage Cache Header 驗證");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`預期 Cache-Control: max-age=2592000 (30 天)`);
  console.log("═══════════════════════════════════════════════════════════");

  if (realUrls.length > 0) {
    console.log(`\n📊 從 posts 表撈到 ${realUrls.length} 張 production 真實 URL:`);
    for (const r of realUrls) {
      checkUrl(r.url);
    }
  } else {
    console.log("\n⚠️ posts 表無資料, fallback 到 Storage API 掃描");
    const bucketsToCheck = bucket
      ? [bucket]
      : ["travel-photos", "user-attraction-photos"];

    for (const b of bucketsToCheck) {
      console.log(`\n📦 Bucket: ${b}`);
      let samples = [];
      try {
        samples = await listBucketObjects(b, 3);
      } catch (e) {
        console.log(`  ❌ list 失敗: ${e.message}`);
        continue;
      }
      if (samples.length === 0) {
        console.log(`  ⚠️ bucket 找不到檔案`);
        continue;
      }
      for (const s of samples) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${b}/${s.name}`;
        checkUrl(publicUrl);
      }
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
    console.log("📖 怎麼讀結果:");
    console.log("  ✅ PASS = Cache-Control 有 max-age=2592000 → 30 天內重訪 0 egress");
    console.log("  ⚠️ FAIL = 還是 Supabase 預設 3600 (1h) 或其他 → 需去 Dashboard 改");
    console.log("");
    console.log("  cf-cache-status / age 解讀:");
    console.log("    HIT  + age>0  = CDN 命中, 不計 egress 🎉");
    console.log("    MISS + age=0  = CDN 沒命中, 還是吃 egress");
    console.log("    EXPIRED       = 過期, 會重抓一次後再 cache");
    console.log("");
    console.log("  第一次跑通常會 MISS (CDN 還沒東西), 等幾秒再跑一次 = HIT");
    console.log("═══════════════════════════════════════════════════════════");
  }