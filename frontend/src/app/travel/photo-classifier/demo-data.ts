// 2026-07-30 聖上拍板: 3000 張假資料 seed (13 位成員 + inbox 收件匣)
// 來源: picsum.photos (CDN 不需 key, 穩定)
// 真實上線時: 改成 fetch Supabase travel_photo_meta 即可

import {
  type Album,
  type Photo,
  DEFAULT_UPLOADER,
  INBOX_ALBUM_ID,
} from "./types";

/** 13 位成員 (由 聖上 7-29 提供名單, 跟 TravelFooter / travel-stats 共用) */
export const UPLOADERS = [
  "黃佳分", "梁宸瑋", "李春美", "梁恩齊", "梁勝評", "梁勝喜",
  "吳家昇", "廖宇橋", "王義伸", "胡雅茹", "吳宇淞", "黃倩", "吳宇儒",
];

/** 預設 album — Inbox + D1-D5 (依真實 Takeout 拍攝日) */
export const DEFAULT_ALBUMS: Album[] = [
  { id: INBOX_ALBUM_ID, name: "Inbox 未分類", emoji: "📥", createdAt: Date.now() },
  { id: "day-1", name: "D1 — 7/17 啟程", emoji: "🛫", createdAt: Date.now() },
  { id: "day-3", name: "D3 — 7/19 西塘", emoji: "🏮", createdAt: Date.now() },
  { id: "day-4", name: "D4 — 7/20 烏鎮", emoji: "🌉", createdAt: Date.now() },
  { id: "day-5", name: "D5 — 7/21 回杭州", emoji: "🏯", createdAt: Date.now() },
];

/** 生成 3000 張 demo photo (id 前 100 全塞未知 uploader — 模擬聖上剛拉進來的「無 EXIF 不歸屬」狀態) */
export function generateDemoPhotos(count: number = 3000): Photo[] {
  // picsum 提供 1084 個 ID seed (0..1083) — 用 modulo 循環避免 missing
  const picsumIds = Array.from({ length: count }, (_, i) => i % 1084);

  return picsumIds.map((picsumId, i) => {
    // 前 200 張放在 inbox, 其他已分到 demo album (假設有 demo, 全部先放 inbox)
    // 13 位成員輪流: 聖上現實 13 人, 每 13 張分一個 uploader (但前 100 張全 Unknown)
    let uploader = DEFAULT_UPLOADER;
    if (i >= 100) {
      uploader = UPLOADERS[(i - 100) % UPLOADERS.length];
    }
    // 30% 帶常見 tag (讓「按 tag 篩選」有東西看)
    const allTags = ["夜景", "美食", "景點", "合照", "街景", "建築", "古鎮", "運河"];
    const tagCount = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
    const tags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const candidate = allTags[Math.floor(Math.random() * allTags.length)];
      if (!tags.includes(candidate)) tags.push(candidate);
    }

    return {
      id: `photo-${i.toString().padStart(4, "0")}`,
      src: `https://picsum.photos/id/${picsumId}/300/300`,
      uploader,
      albumId: INBOX_ALBUM_ID,
      order: i,
      tags,
      notes: "",
    };
  });
}
