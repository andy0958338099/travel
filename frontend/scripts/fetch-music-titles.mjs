#!/usr/bin/env node
/**
 * 🆕 2026-08-14 聖上拍板 🅐: 用 YouTube oEmbed API 抓 20 首古鎮歌曲的真實標題
 *
 * 用法: node scripts/fetch-music-titles.mjs
 *
 * 輸出: 在 stdout 印出可直接貼進 BackgroundMusicPlayer.tsx PLAYLIST 的 20 行
 *   { title: "真實歌名", videoId: "..." }
 *
 * oEmbed 免費、免 API key、rate limit 寬鬆
 * 失敗 fallback: 用 "古鎮歌曲 N" placeholder
 */
const VIDEO_IDS = [
  "3aDL-3jZ1zU", "VLYIWMB6QIE", "YC7u_M_QUzI", "N235Ch_QOBc", "-C8xoHLlxfM",
  "SC0qqsKQt1E", "-gJzlOJ0Zoo", "9Twp6hoBYcc", "G97_rOdHcnY", "Gpc-Q5pYT_I",
  "FaxoKtCUhOg", "JieOI1WGe6A", "wJaML735dxE", "Z8Mqw0b9ADs", "fRJ9HIiat1k",
  "5b5B_Gf8iLI", "1fgmcZ3VLMc", "FcYm2qBZJEc", "FtoiYX_OR60", "gQLP6T-y1a4",
];

async function fetchTitle(id) {
  const url = `https://www.youtube.com/oembed?url=https://youtu.be/${id}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; title-fetcher/1.0)" },
    });
    if (!res.ok) return { id, title: `古鎮歌曲 (oembed ${res.status})` };
    const data = await res.json();
    return { id, title: data.title || `古鎮歌曲 (no title)` };
  } catch (e) {
    return { id, title: `古鎮歌曲 (fetch error)` };
  }
}

(async () => {
  console.error("抓 20 首 YouTube 標題 (oEmbed)...\n");
  // 並行 fetch (避免 20 個 await 串連太慢)
  const results = await Promise.all(VIDEO_IDS.map(fetchTitle));

  console.error("✅ 完成. 複製下面 20 行到 BackgroundMusicPlayer.tsx PLAYLIST:\n");
  console.error("// ─────── 從 scripts/fetch-music-titles.mjs 跑出來的真實標題 ───────");
  for (const { id, title } of results) {
    // 用 JSON.stringify 確保 escape 正確
    console.log(`{ title: ${JSON.stringify(title)}, videoId: "${id}" },`);
  }
})();
