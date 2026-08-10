#!/usr/bin/env node
/**
 * 🅒 8-9 聖上拍板: 把 19 首 YouTube 古鎮歌曲 seed 到 Supabase music_songs
 *
 * 前提: 已跑過 src/utils/supabase/schema.sql (在 Supabase Dashboard SQL Editor)
 *
 * 用法: node scripts/seed-music-songs.mjs
 *   - 自動讀 .env.local 的 SUPABASE_SERVICE_KEY
 *   - DELETE 舊的 seed (idempotent)
 *   - INSERT 19 首 + 預設 category='古鎮' votes=0 mp3_url=null
 *   - 輸出結果統計
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
if (!KEY || !URL) {
  console.error("❌ SUPABASE_SERVICE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 未設定");
  process.exit(1);
}

// 🅒 8-9 聖上 paste 的 19 首古鎮歌曲 YouTube URL
//   來源: paste_5_090040.txt
//   標題暫時用 "古鎮歌曲 1-19" (聖上之後可手動更新 title / category)
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

const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

// Step 1: DELETE 舊的 seed (idempotent)
//   用 youtube_url IN (...) 刪掉這 19 首 — 其他聖上手動新增的歌曲不會被影響
console.log("Step 1: DELETE 舊的 seed (19 首)...");
const delRes = await fetch(
  `${URL}/rest/v1/music_songs?youtube_url=in.(${SONGS.map((u) => `"${u}"`).join(",")})`,
  { method: "DELETE", headers: HEADERS }
);
console.log("  DELETE status:", delRes.status);
const delText = await delRes.text();
if (!delRes.ok) {
  console.error("  DELETE failed:", delText);
  process.exit(1);
}
console.log("  DELETE body:", delText || "(empty, no rows affected)");

// Step 2: INSERT 19 首
console.log("\nStep 2: INSERT 19 首...");
const rows = SONGS.map((url, i) => ({
  title: `古鎮歌曲 ${i + 1}`,
  youtube_url: url,
  category: "古鎮",
  votes: 0,
  play_count: 0,
}));

const insRes = await fetch(`${URL}/rest/v1/music_songs`, {
  method: "POST",
  headers: { ...HEADERS, Prefer: "return=representation" },
  body: JSON.stringify(rows),
});
console.log("  INSERT status:", insRes.status);
const insText = await insRes.text();
if (!insRes.ok) {
  console.error("  INSERT failed:", insText);
  process.exit(1);
}
const inserted = JSON.parse(insText);
console.log(`  ✅ INSERT 成功: ${inserted.length} 首歌`);

// Step 3: 列出剛插入的歌曲
console.log("\nStep 3: 列出 music_songs (前 5 條):");
const listRes = await fetch(
  `${URL}/rest/v1/music_songs?select=id,title,youtube_url,votes&order=created_at.desc&limit=5`,
  { headers: HEADERS }
);
const list = await listRes.json();
for (const song of list) {
  console.log(`  ${song.title} | votes=${song.votes} | ${song.youtube_url.slice(0, 50)}...`);
}

console.log("\n==================================================");
console.log("🎉 Seed 完成!");
console.log("==================================================");
console.log("📊 統計:");
console.log(`  歌曲數: ${inserted.length}`);
console.log(`  分類: 古鎮`);
console.log(`  投票: 0 (沒人投過)`);
console.log("");
console.log("📋 下一步:");
console.log("  1. 進 Supabase Dashboard 確認 music_songs 表有 19 條");
console.log("  2. (可選) 手動更新 title (現是「古鎮歌曲 1-19」placeholder)");
console.log("  3. (可選) 上傳 MP3 文件到 music-mp3/ bucket, 然後更新 mp3_url");
console.log("  4. 開發 /travel/music 頁面 + MusicPlayer 全站播放器");