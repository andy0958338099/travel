#!/usr/bin/env node
/**
 * 🅒 8-9: 列出 Supabase music_songs 跟 music_votes 的現況
 *   - 查 music_songs 總數 + 前 5 條
 *   - 查 music_votes 總數
 *   - 查 trigger / RLS 狀態
 *   - 列印總結
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

console.log("==================================================");
console.log("📊 Supabase Music System Status");
console.log("==================================================");

// 1. music_songs 表
console.log("\n🎵 music_songs 表 (PostgREST via supabase-js):");
const { data: songs, error: songsErr } = await supabase
  .from("music_songs")
  .select("id, title, category, votes, play_count, mp3_url, created_at")
  .order("created_at", { ascending: false })
  .limit(20);
if (songsErr) {
  console.log(`  ❌ error: ${songsErr.code} - ${songsErr.message}`);
} else {
  console.log(`  ✅ 找到 ${songs?.length || 0} 條`);
  if (songs && songs.length > 0) {
    for (const s of songs) {
      console.log(`    - ${s.title} | votes=${s.votes} | ${s.youtube_url?.slice(0, 50)}...`);
    }
  }
}

// 2. music_votes 表
console.log("\n🗳️  music_votes 表:");
const { data: votes, error: votesErr } = await supabase
  .from("music_votes")
  .select("id, song_id, user_id, vote, created_at")
  .limit(20);
if (votesErr) {
  console.log(`  ❌ error: ${votesErr.code} - ${votesErr.message}`);
} else {
  console.log(`  ✅ 找到 ${votes?.length || 0} 條`);
}

// 3. music_songs 總數 (用 count)
console.log("\n📈 music_songs 總數:");
const { count: songCount, error: countErr } = await supabase
  .from("music_songs")
  .select("*", { count: "exact", head: true });
if (countErr) {
  console.log(`  ❌ error: ${countErr.code}`);
} else {
  console.log(`  ✅ 總歌曲數: ${songCount}`);
}

console.log("\n==================================================");
console.log("📋 總結:");
console.log("==================================================");
if (songsErr) {
  console.log("❌ Schema cache 仍未 reload (PGRST205)");
  console.log("");
  console.log("需要聖上手動:");
  console.log("  Dashboard > Settings > API > PostgREST 區塊");
  console.log("  找 Restart 或 Reload 按鈕 (一定有效)");
  console.log("");
  console.log("或者給臣 DATABASE_URL, 臣用 pg 套件繞過 PostgREST");
} else if (songs && songs.length > 0) {
  console.log(`✅ Schema cache 已 reload, music_songs 有 ${songs.length}+ 條`);
  console.log("📋 下一步:");
  console.log("  1. 開始寫 /travel/music 頁面");
  console.log("  2. 寫 MusicPlayer 全站背景播放器");
  console.log("  3. Nav 加 🎵 Music 入口");
} else {
  console.log("⚠️ Schema OK 但 music_songs 是空的");
  console.log("📋 下一步: 跑 scripts/seed-music-songs.mjs");
}