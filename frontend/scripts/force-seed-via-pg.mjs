#!/usr/bin/env node
/**
 * 🅒 8-9 最後的 fallback: 用 Supabase 提供的 SQL RPC 直接執行 INSERT
 *   繞過 PostgREST schema cache 卡住的問題
 *
 *   方法: 用 service_role key 透過 supabase-js RPC call 一個 "exec_sql" helper function
 *   但這 function 之前沒建, 所以也不可行
 *
 *   真正可行的路:
 *   - 聖上抓 DATABASE_URL → 臣裝 pg 套件 → 直接 INSERT
 *
 *   本 script 只是 placeholder, 真正能做的是再檢查 1 次 schema cache
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
const supabase = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

console.log("=== 再次驗證 schema 是否 refresh ===");
const r = await supabase.from("music_songs").select("id").limit(1);
console.log(`  status: ${JSON.stringify(r.data)} | error: ${r.error?.code}`);

if (!r.data && r.error?.code === "PGRST205") {
  console.log("\n❌ Schema cache 卡住, 臣所有方法都試過了");
  console.log("\n=== 唯一保證有效的 2 條路 ===");
  console.log("");
  console.log("[A] 聖上去 Dashboard > Settings > API > 找 PostgREST 區塊 > 點 'Restart' 按鈕");
  console.log("    這個按鈕會真的 restart PostgREST container, 強制 reload schema");
  console.log("    (不是 cache refresh, 是 process restart)");
  console.log("");
  console.log("[B] 聖上給臣 DATABASE_URL connection string");
  console.log("    1. 進 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/settings/database");
  console.log("    2. Connection string > URI 區塊 > 複製 postgres://postgres:...");
  console.log("    3. 貼到 .env.local: DATABASE_URL=postgres://...");
  console.log("    4. 跟臣說, 臣裝 pg 套件 + 用 connection string 直接跑 seed");
  console.log("");
  console.log("=== 風險評估 ===");
  console.log("如果走 [B],臣可以:");
  console.log("  - 直接 INSERT 19 首歌到 music_songs (繞過 PostgREST)");
  console.log("  - 然後 SQL Editor 跑 NOTIFY pgrst, 'reload schema' 讓 PostgREST 認到");
  console.log("  - 之後 frontend 也能正常讀 music_songs");
}