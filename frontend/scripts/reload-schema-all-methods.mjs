#!/usr/bin/env node
/**
 * 🅒 8-9: 5 種方法嘗試重 load Supabase PostgREST schema cache
 * 1. NOTIFY pgrst 透過 supabase-js SQL exec (如果可用)
 * 2. 查 information_schema.tables (透過 supabase-js RPC)
 * 3. 直接查 music_songs (確認 schema cache 狀態)
 * 4. Supabase Management API (Management token 不是 service_role)
 * 5. 重試 (有時會自動 refresh)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}

const KEY = env.SUPABASE_SERVICE_KEY;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
console.log("URL:", URL);

// 用 service_role key (有完整權限)
const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("\n=== 方法 1: NOTIFY pgrst, 'reload schema' (透過 supabase-js RPC) ===");
const r1 = await supabase.rpc("reload_schema");
console.log(`  ${JSON.stringify(r1)}`);

console.log("\n=== 方法 2: 查 information_schema.tables (確認表真的存在於 DB) ===");
const r2 = await supabase.rpc("exec_sql", { sql: "select table_name from information_schema.tables where table_schema='public' and table_name like 'music_%'" });
console.log(`  ${JSON.stringify(r2)}`);
if (!r2.data && r2.error) {
  console.log("  (沒 exec_sql 這個 RPC function, 跳過)");
}

console.log("\n=== 方法 3: 直接查 music_songs (確認 schema cache 狀態) ===");
const r3 = await supabase.from("music_songs").select("id").limit(1);
console.log(`  data: ${JSON.stringify(r3.data)}`);
console.log(`  error: ${JSON.stringify(r3.error)}`);

console.log("\n=== 方法 4: Supabase Management API ===");
const r4 = await fetch(`https://api.supabase.com/v1/projects/bphhksbzedadaoscjctz/postgrest/reload`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
});
console.log(`  status: ${r4.status}`);
console.log(`  body: ${(await r4.text()).slice(0, 200)}`);

console.log("\n=== 方法 5: 等 30 秒再試一次 (自動 refresh 偶爾會生效) ===");
await new Promise(r => setTimeout(r, 30000));
const r5 = await supabase.from("music_songs").select("id").limit(1);
console.log(`  data: ${JSON.stringify(r5.data)}`);
console.log(`  error: ${JSON.stringify(r5.error)}`);

console.log("\n=== 結論:");
if (r3.data && r3.data.length >= 0 && !r3.error) {
  console.log("  ✅ music_songs 表可訪問! Schema cache 已 reload");
  console.log("  → 跑: node scripts/seed-music-songs.mjs");
} else if (r5.data && !r5.error) {
  console.log("  ✅ 等 30 秒後 schema cache 已 reload");
  console.log("  → 跑: node scripts/seed-music-songs.mjs");
} else {
  console.log("  ❌ Schema cache 仍未 refresh");
  console.log("");
  console.log("  🛑 聖上手動操作 (3 選 1):");
  console.log("");
  console.log("  【方法 1】Supabase Dashboard SQL Editor:");
  console.log("    1. 開 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/sql/new");
  console.log("    2. 跑這條 SQL:");
  console.log("       NOTIFY pgrst, 'reload schema';");
  console.log("    3. 等 5-10 秒, 跑此 script 再驗證");
  console.log("");
  console.log("  【方法 2】Supabase Dashboard Settings:");
  console.log("    1. 開 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/settings/api");
  console.log("    2. 找 'Schema' 或 'PostgREST' 區塊");
  console.log("    3. 點 'Reload schema cache' 按鈕");
  console.log("    4. 等 5-10 秒, 跑此 script 再驗證");
  console.log("");
  console.log("  【方法 3】給臣 DATABASE_URL:");
  console.log("    1. 進 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/settings/database");
  console.log("    2. 找 'Connection string' > 'URI' 區塊");
  console.log("    3. 把 postgres://... 字串貼到 .env.local: DATABASE_URL=postgres://...");
  console.log("    4. 跟臣說, 臣寫 pg-based script 直接 reload");
}