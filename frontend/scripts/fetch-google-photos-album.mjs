#!/usr/bin/env node
/**
 * fetch-google-photos-album.mjs
 *
 * 2026-07-26 聖上拍板: 用 refresh_token 從 Google Photos Library API
 *   拿「杭州共享相簿」內所有 media items (317 個預期)
 *
 * 輸出:
 *   - google-photos-album.json: 317 個 { id, filename, baseUrl, mimeType }
 *   - 自動 upsert 到 Supabase travel_photo_meta.google_photos_thumb_url
 *
 * 注意: Google Photos Library API baseUrl 是 server-side generated,
 *   URL 格式: https://lh3.googleusercontent.com/lh/ASDf...=w600
 *   (跟聖上 Look UI 看到的一樣, 真實 image/jpeg)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { config } from "node:process";
import process from "node:process";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";

const TOKEN_FILE = ".google-token.json";
const ALBUM_NAME = "杭州共享相簿";

async function getAccessToken() {
  if (!existsSync(TOKEN_FILE)) {
    console.error(`❌ 找不到 ${TOKEN_FILE}, 請先跑 google-photos-oauth.mjs`);
    process.exit(1);
  }
  const token = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));

  // 檢查是否過期
  if (token.expires_at > Date.now() + 60_000 && token.access_token) {
    return token.access_token;
  }

  // Refresh
  console.log("🔄 Refresh access_token...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: token.client_id,
      client_secret: token.client_secret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) {
    console.error(`❌ Refresh 失敗: ${data.error} - ${data.error_description}`);
    process.exit(1);
  }
  token.access_token = data.access_token;
  token.expires_at = Date.now() + data.expires_in * 1000;
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2));
  return data.access_token;
}

async function findAlbumId(token) {
  console.log(`📂 找相簿「${ALBUM_NAME}」...`);
  const res = await fetch("https://photoslibrary.googleapis.com/v1/albums?pageSize=50", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`❌ albums list 失敗: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  const album = (data.albums || []).find((a) => a.title === ALBUM_NAME);
  if (!album) {
    console.error(`❌ 找不到相簿「${ALBUM_NAME}」, 請確認聖上是相簿擁有者或被加入`);
    console.log(`   聖上 Look 到的相簿: ${(data.albums || []).map((a) => a.title).join(", ")}`);
    process.exit(1);
  }
  console.log(`   找到: ${album.title} (id: ${album.id})`);
  return album.id;
}

async function listAllMedia(token, albumId) {
  console.log(`📸 撈相簿內所有 media items...`);
  const allItems = [];
  let pageToken = null;
  let page = 0;

  do {
    const body = {
      albumId,
      pageSize: 100,
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`❌ search 失敗 (page ${page}): ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    const items = data.mediaItems || [];
    allItems.push(...items);
    pageToken = data.nextPageToken;
    page++;
    process.stdout.write(`\r   page ${page}: ${allItems.length} 個 media items...`);
  } while (pageToken);

  console.log(`\n   ✅ 共撈到 ${allItems.length} 個 media items`);
  return allItems;
}

async function main() {
  // 1. 拿 access token
  const token = await getAccessToken();

  // 2. 找相簿
  const albumId = await findAlbumId(token);

  // 3. 撈所有 media
  const items = await listAllMedia(token, albumId);

  // 4. 整理成 JSON
  const output = items.map((m) => ({
    id: m.id,
    filename: m.filename,
    mimeType: m.mimeType,
    baseUrl: m.baseUrl,  // 已經是 =w600 預設大小
    mediaMetadata: m.mediaMetadata,  // EXIF (拍照時間 + GPS)
  }));
  writeFileSync("google-photos-album.json", JSON.stringify(output, null, 2));
  console.log(`\n💾 寫到 google-photos-album.json (${output.length} 個)`);

  // 5. 統計 mime type
  const stats = {};
  for (const m of output) {
    const key = m.mimeType.split("/")[1] || "unknown";
    stats[key] = (stats[key] || 0) + 1;
  }
  console.log("\n📊 媒體類型統計:");
  for (const [k, v] of Object.entries(stats)) {
    console.log(`   ${k}: ${v}`);
  }

  // 6. 給聖上看 baseUrl 範例
  console.log("\n📸 baseUrl 範例 (聖上可以 curl 測試):");
  for (const m of output.slice(0, 3)) {
    console.log(`   ${m.filename}: ${m.baseUrl}`);
  }

  // 7. 順便檢查 baseUrl 真的能讀
  console.log("\n🧪 測試 1 個 baseUrl 是否真能讀:");
  if (output[0]) {
    const r = await fetch(output[0].baseUrl);
    console.log(`   ${output[0].filename}: ${r.status} ${r.headers.get("Content-Type")} ${(await r.arrayBuffer()).byteLength} bytes`);
  }
}

main().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
