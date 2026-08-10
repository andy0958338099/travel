#!/usr/bin/env node
/**
 * 🅒 8-9: 終極 fallback — 用 pg 套件直接連 PostgreSQL
 *   - 繞過 PostgREST schema cache
 *   - 直接 INSERT 19 首到 music_songs
 *   - 順便 NOTIFY pgrst 'reload schema' 讓 PostgREST 也認到
 *
 * 前提:
 *   1. 聖上抓 DATABASE_URL connection string 給臣
 *      Dashboard > Project Settings > Database > Connection string > URI
 *   2. 臣 npm install pg (Node PostgreSQL client)
 *   3. 臣跑此 script
 *
 * 此 script 已寫好, 等 DATABASE_URL 到 .env.local 即可跑
 */
import fs from "node:fs";
import path from "node:path";

// 讀 .env.local (等 DATABASE_URL)
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}

if (!env.DATABASE_URL) {
  console.error("❌ DATABASE_URL 未設定在 .env.local");
  console.error("");
  console.error("請聖上去:");
  console.error("  1. 開 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/settings/database");
  console.error("  2. 找 'Connection string' > 'URI' 區塊");
  console.error("  3. 點 'Copy' 複製字串 (格式 postgres://postgres:[PASSWORD]@db.bphhksbzedadaoscjctz.supabase.co:5432/postgres)");
  console.error("  4. 貼到 .env.local:  DATABASE_URL=postgres://...");
  console.error("  5. 跟臣說, 臣裝 pg 套件 + 跑此 script");
  process.exit(1);
}

// 動態 import pg (沒裝會提示)
let pg;
try {
  pg = await import("pg");
} catch (e) {
  console.error("❌ pg 套件未裝: npm install pg");
  console.error("  之後再跑此 script");
  process.exit(1);
}

const { Client } = pg.default;

// 🅒 8-9 聖上 DNS 無法解析 db.bphhksbzedadaoscjctz.supabase.co
//   → Supabase DB host 必須用 pooler (aws-0-ap-southeast-1.pooler.supabase.com:6543)
//   聖上去 Dashboard > Settings > Database > Connection string
//   看 'Transaction mode' pooler URL (session mode=transaction)
//   完整格式: postgres://postgres.bphhksbzedadaoscjctz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
//
// 如果聖上 .env.local 已設 DATABASE_URL=db.*.supabase.co 連線失敗,
// 1. 改 .env.local: DATABASE_URL=postgres://postgres:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
// 2. 再跑此 script

const client = new Client({
  connectionString: env.DATABASE_URL,
  // pooler 強制 SSL
  ssl: env.DATABASE_URL.includes("pooler.supabase.com") ? { rejectUnauthorized: false } : false,
});

try {
  await client.connect();
  console.log("✅ 連線到 PostgreSQL 成功");
} catch (e) {
  console.error("❌ 連線失敗:", e.message);
  process.exit(1);
}

// 19 首 YouTube URL (跟 seed-music-songs.mjs 一樣)
const SONGS = [
  "https://youtu.be/3aDL-3jZ1zU?si=9ejg091lAG9J2621",
  "https://youtu.be/VLYIWMB6QIE?si=kjU-02JmJmD8Cpjr",
  "https://youtu.be/YC7u_M_QUzI?si=UvTCCrd2srg-tFhI",
  "https://youtu.be/N235Ch_QOBc?si=yEhi0SDWgU_xWLjX",
  "https://youtu.be/-C8xoHLlxfM?si=G2PyH0NkzMgsHdEy",
  "https://youtu.be/SC0qqsKQt1E?si=BGTwAOMTskPh50J9",
  "https://youtu.be/-gJzlOJ0Zoo?si=jqDoUtMH54K0B91i",
  "https://youtu.be/9Twp6hoBYcc?si=zbAX-f1wCG1_f8Et",
  "https://youtu.be/G97_rOdHcnY?si=vMN2rGXQvARESzZJ",
  "https://youtu.be/Gpc-Q5pYT_I?si=k9FFl9_e_nvk2hBE",
  "https://youtu.be/FaxoKtCUhOg?si=ch8MKDOS4YUzXCu3",
  "https://youtu.be/JieOI1WGe6A?si=COoK7pdjVSaAQ7RR",
  "https://youtu.be/wJaML735dxE?si=w8KJ89Y63SdgV7XR",
  "https://youtu.be/Z8Mqw0b9ADs?si=NY9bcuxCzjwrY4H7",
  "https://youtu.be/fRJ9HIiat1k?si=k7JSxMjULGRto0_6",
  "https://youtu.be/5b5B_Gf8iLI?si=Wv1e1FKm1n9ctSp2",
  "https://youtu.be/1fgmcZ3VLMc?si=l6IjOQL7KVcubLJk",
  "https://youtu.be/FcYm2qBZJEc?si=DtZGc9Vah3l6XuIT",
  "https://youtu.be/FtoiYX_OR60?si=Ghe-bJ9-kcruTnV2",
];

// Step 1: 列出 music_songs 總數
const count1 = await client.query("select count(*) from public.music_songs");
console.log(`\n📊 music_songs 總數 (PostgreSQL 直查): ${count1.rows[0].count}`);

// Step 2: 列出前 5 首
const sample = await client.query(
  "select id, title, category, votes, mp3_url, created_at from public.music_songs order by created_at desc limit 5"
);
console.log(`\n📋 最新 5 首歌:`);
for (const row of sample.rows) {
  console.log(`  - ${row.title} | votes=${row.votes} | category=${row.category} | mp3=${row.mp3_url || "(none)"}`);
}

// Step 3: 列出 music_votes 總數
const count2 = await client.query("select count(*) from public.music_votes");
console.log(`\n🗳️  music_votes 總數: ${count2.rows[0].count}`);

// Step 4: 如果 music_songs 是空的, INSERT 19 首
if (count1.rows[0].count == 0) {
  console.log(`\n📥 music_songs 是空的, INSERT 19 首...`);
  for (let i = 0; i < SONGS.length; i++) {
    await client.query(
      `insert into public.music_songs (title, youtube_url, category, votes, play_count)
       values ($1, $2, $3, 0, 0)`,
      [`古鎮歌曲 ${i + 1}`, SONGS[i], "古鎮"]
    );
  }
  console.log(`  ✅ INSERT 完成`);

  // 驗證
  const after = await client.query("select count(*) from public.music_songs");
  console.log(`  驗證: music_songs 總數 = ${after.rows[0].count}`);
} else {
  console.log(`\n⏭️  music_songs 已有 ${count1.rows[0].count} 條, 跳過 INSERT`);
  console.log(`  (要重新 seed 的話, 請先手動 DELETE)`);
}

// Step 5: 發 NOTIFY 讓 PostgREST reload
console.log(`\n🔔 發 NOTIFY 讓 PostgREST reload schema cache...`);
await client.query(`NOTIFY pgrst, 'reload schema'`);
await client.query(`NOTIFY pgrst, 'reload config'`);
await client.query(`select pg_notify('pgrst', 'reload schema')`);
console.log(`  ✅ NOTIFY 已發送`);

await client.end();
console.log(`\n✅ 完成`);
console.log(`\n📋 下一步:`);
console.log(`  1. 等 30 秒讓 PostgREST reload`);
console.log(`  2. 跑: node scripts/list-music-status.mjs 驗證 PostgREST 也能讀到`);
console.log(`  3. 開始寫 /travel/music 頁面 + MusicPlayer 全站播放器`);