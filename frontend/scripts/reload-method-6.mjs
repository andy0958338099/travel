#!/usr/bin/env node
/**
 * 🅒 8-9: 6 種方法強制 reload Supabase PostgREST schema cache
 *   聖上已跑了 NOTIFY pgrst 但還是 404, 臣換更多方法試
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

console.log("=== 方法 1: 直接查 music_songs (看現狀) ===");
const r1 = await supabase.from("music_songs").select("id").limit(1);
console.log(`  data: ${JSON.stringify(r1.data)}`);
console.log(`  error code: ${r1.error?.code}`);

console.log("\n=== 方法 2: 設定 db_schema GUC 強迫 reload ===");
const r2 = await supabase.rpc("set_config", { key: "pgrst.db_schema", value: "public" });
console.log(`  ${JSON.stringify(r2)}`);

console.log("\n=== 方法 3: Supabase Management API (project admin) - 用真 token ===");
const r3 = await fetch("https://api.supabase.com/v1/projects/bphhksbzedadaoscjctz/postgrest/reload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    apikey: env.SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ restart_webhooks: false }),
});
console.log(`  status: ${r3.status}`);
console.log(`  body: ${(await r3.text()).slice(0, 300)}`);

console.log("\n=== 方法 4: 等 60 秒後再查 (PostgREST cache 偶爾需要時間) ===");
await new Promise(r => setTimeout(r, 60000));
const r4 = await supabase.from("music_songs").select("id").limit(1);
console.log(`  data: ${JSON.stringify(r4.data)}`);
console.log(`  error: ${JSON.stringify(r4.error)}`);

console.log("\n=== 結論:");
if (r4.data && !r4.error) {
  console.log("  ✅ Schema cache 已 reload!");
  console.log("  → 跑: node scripts/seed-music-songs.mjs");
} else {
  console.log("  ❌ Schema cache 仍未 reload");
  console.log("");
  console.log("  聖上 5 選 1:");
  console.log("  [A] 進 Dashboard > SQL Editor > 跑 pg_notify('pgrst', 'reload config')");
  console.log("       (注意: NOTIFY pgrst 不同, 必須用 pg_notify)");
  console.log("");
  console.log("  [B] 進 Dashboard > Settings > API > 找 'Reload schema' 按鈕");
  console.log("");
  console.log("  [C] 跑 'Disable + Re-enable PostgREST' toggle (強制 reload)");
  console.log("");
  console.log("  [D] 給臣 DATABASE_URL 讓臣用 pg 套件直連");
  console.log("");
  console.log("  [E] 略過 schema cache, 臣直接用 fetch + service_role 寫 INSERT");
  console.log("       (不依賴 PostgREST, 直接 SQL via Supabase pg endpoint)");
}