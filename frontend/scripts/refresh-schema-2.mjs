#!/usr/bin/env node
/**
 * 🅒 8-9 PostgREST schema cache reload — 4 種方式
 *   1. 查現有表 (確定 SQL 真的有跑成功)
 *   2. 直接查 information_schema.tables
 *   3. 跑 NOTIFY pgrst, 'reload schema' (PostgREST 1.x 標準)
 *   4. 用 Supabase Management API (project admin)
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

console.log("=== 方式 1: 直接 GET music_songs (看 PostgREST 是否承認) ===");
const r1 = await fetch(`${URL}/rest/v1/music_songs?select=id&limit=1`, { headers: HEADERS });
const t1 = await r1.text();
console.log(`  status: ${r1.status}`);
console.log(`  body: ${t1.slice(0, 300)}`);

console.log("\n=== 方式 2: 用 RPC 跑 SELECT information_schema.tables (確認 SQL 真的有建表) ===");
const r2 = await fetch(`${URL}/rest/v1/rpc/get_tables_list`, {
  method: "POST",
  headers: HEADERS,
  body: "{}",
});
console.log(`  status: ${r2.status}`);
if (!r2.ok) {
  console.log("  沒有 get_tables_list 這個 RPC function, 跳過");
}

console.log("\n=== 方式 3: NOTIFY pgrst, 'reload schema' (PostgREST 1.x 標準方式) ===");
//   這是 PostgREST 內建的 reload trigger
//   但需要直接 SQL connection, PostgREST API 不支援 NOTIFY
//   跳過此方法 (臣沒有 pg client)
console.log("  跳過 — 需 DATABASE_URL + pg 套件");

console.log("\n=== 方式 4: Supabase Management API (project admin) ===");
const r4 = await fetch(`https://api.supabase.com/v1/projects/bphhksbzedadaoscjctz/postgrest/reload`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
console.log(`  status: ${r4.status}`);
const t4 = await r4.text();
console.log(`  body: ${t4.slice(0, 300)}`);

console.log("\n=== 結論:");
if (r1.status === 200) {
  console.log("  ✅ Schema cache 已 reload");
} else if (r4.status === 200 || r4.status === 204) {
  console.log("  ✅ 用 Management API reload 了, 等 5-10 秒後再跑 seed");
} else {
  console.log("  ❌ Schema cache 還沒刷新");
  console.log("  🛑 請聖上:");
  console.log("     1. 進 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/settings/api");
  console.log("     2. 找 'Schema' section");
  console.log("     3. 點 'Reload schema' 或重啟 PostgREST");
  console.log("     4. 然後再跑此 script 驗證");
}