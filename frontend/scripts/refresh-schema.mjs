#!/usr/bin/env node
/**
 * 🅒 8-9 聖上跑完 schema.sql, 但 PostgREST schema cache 還沒刷新
 *   → 試試觸發 reload
 *   方法 1: PostgREST /reload_schema (要 service_role)
 *   方法 2: 跑 SELECT * 觸發 cache reload
 *
 * 如果方法 1+2 都不行, 聖上要去 Dashboard 按 "Refresh schema cache" 按鈕
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

const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

console.log("=== 嘗試 1: POST /rest/v1/rpc/reload_schema ===");
const r1 = await fetch(`${URL}/rest/v1/rpc/reload_schema`, { method: "POST", headers: HEADERS, body: "{}" });
console.log(`  status: ${r1.status}`);
if (r1.ok) {
  const t = await r1.text();
  console.log(`  body: ${t.slice(0, 200)}`);
}

console.log("\n=== 嘗試 2: GET /rest/v1/?schema=music_songs (PostgREST introspect) ===");
const r2 = await fetch(`${URL}/rest/v1/?schema=music_songs`, { headers: HEADERS });
console.log(`  status: ${r2.status}`);

console.log("\n=== 嘗試 3: HEAD /rest/v1/music_songs ===");
const r3 = await fetch(`${URL}/rest/v1/music_songs`, { method: "HEAD", headers: HEADERS });
console.log(`  status: ${r3.status}`);

console.log("\n=== 驗證表存在 (用 direct Postgres function 不可行, 我們只能用 PostgREST) ===");
const r4 = await fetch(`${URL}/rest/v1/music_songs?select=id&limit=1`, { headers: HEADERS });
const t4 = await r4.text();
console.log(`  GET /rest/v1/music_songs status: ${r4.status}`);
console.log(`  body: ${t4.slice(0, 200)}`);

console.log("\n=== 結論:");
if (r4.status === 200) {
  console.log("  ✅ Schema 已 reload, 可以跑 seed script");
} else if (r4.status === 404 && t4.includes("PGRST205")) {
  console.log("  ❌ Schema cache 還沒刷新, 請聖上去 Supabase Dashboard:");
  console.log("     1. Project Settings > API > 點 'Reload schema cache' 按鈕");
  console.log("     2. 或等 1-2 分鐘自動 refresh");
  console.log("     3. 然後再跑此 script 驗證");
} else {
  console.log("  ⚠️ 其他錯誤, 看 status / body 判斷");
}