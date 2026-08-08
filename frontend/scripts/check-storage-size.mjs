#!/usr/bin/env node
/**
 * 查 Supabase Storage travel-photos bucket 大小
 *   - List all objects in day1/, day2/, ... day8/
 *   - Sum sizes
 *   - Count by day
 */
import fs from "node:fs";
import path from "node:path";
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}
const KEY = env.SUPABASE_SERVICE_KEY;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
if (!KEY || !URL) { console.error("❌ env 未設定"); process.exit(1); }

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// 列出 bucket 內所有檔案 (POST + prefix)
async function listPrefix(prefix) {
  const res = await fetch(`${URL}/storage/v1/object/list/travel-photos`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`list ${prefix} failed: ${res.status} ${err.slice(0, 200)}`);
  }
  return res.json();
}

// 格式化 bytes
function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

const summary = [];
let totalBytes = 0;
let totalCount = 0;

for (let day = 1; day <= 8; day++) {
  try {
    const items = await listPrefix(`day${day}/`);
    let dayBytes = 0;
    let dayCount = 0;
    for (const item of items) {
      if (item.name && item.metadata?.size !== undefined) {
        dayBytes += item.metadata.size;
        dayCount++;
      } else if (item.name && item.size !== undefined) {
        dayBytes += item.size;
        dayCount++;
      }
    }
    summary.push({ day, count: dayCount, bytes: dayBytes });
    totalBytes += dayBytes;
    totalCount += dayCount;
    console.log(`day${day}/: ${dayCount} 個檔案, ${fmt(dayBytes)}`);
  } catch (e) {
    console.log(`day${day}/: ❌ ${e.message}`);
  }
}

console.log("");
console.log("=".repeat(50));
console.log(`📊 總計:`);
console.log(`   檔案數: ${totalCount}`);
console.log(`   總大小: ${fmt(totalBytes)} (${totalBytes.toLocaleString()} bytes)`);
console.log("=".repeat(50));

// 估算 Supabase Free Tier 限制
console.log("");
console.log("📋 Supabase Storage 限制:");
console.log("   Free plan: 1 GB 總計");
console.log("   Pro plan: $0.021/GB/月 ($25 free credit)");
console.log(`   你目前用 ${fmt(totalBytes)} = ${(totalBytes / 1024 / 1024 / 1024).toFixed(3)} GB`);
console.log(`   ${totalBytes < 1024 * 1024 * 1024 ? "✅ 在 Free plan 1GB 內" : "⚠️ 超過 Free plan 1GB"}`);