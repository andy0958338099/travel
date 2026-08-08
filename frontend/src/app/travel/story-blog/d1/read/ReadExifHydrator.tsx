// 🅒 2026-08-06 聖上拍板: read page 重構為 Server Component + Client EXIF Hydrator
//   - 原本 page.tsx 是 "use client" + useEffect fetch Supabase → SSR 永遠顯示「載入中...」
//   - 重構後:
//     • page.tsx (Server Component): Supabase fetch + render Vogue HTML 直接 SSR
//     • ReadExifHydrator.tsx (Client Component): 純 hydrate EXIF chip 到 <figure>
//
// 🅒 2026-08-05 聖上拍板: D1 完稿閱讀頁 — 從 Supabase 讀 polished_text + Vogue 渲染
//   給「不編輯，只想讀」的成員看 — 直接看完整 Vogue 風完稿
//   8-5 加 EXIF 數位相框: client fetch D1 photos → 用 data-photo-url 對照 → inject EXIF
// 🅒 2026-08-06 聖上拍板: append 累積 — sendPolishedToLocked 把新送出段 append 到 polished_text
//   所以 read page 應該顯示「所有送出段累積」(不只最新一次)

"use client";

import { useEffect } from "react";
import { fetchAllPhotos, type TravelPhoto } from "@/utils/travelPhotos";

// 格式化 EXIF chip HTML (聖上要數位相框樣式)
function renderExifChip(photo: TravelPhoto): string {
  // 🅒 8-8 UTC 污染修法: 必須帶 timeZone: "Asia/Taipei" (datetime_original 是 iPhone 原 UTC, 預設會用瀏覽器時區錯位)
  const time = photo.datetime_original
    ? new Date(photo.datetime_original).toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Taipei",
      }) + " TPE"
    : "時間不詳";
  const uploader = photo.uploader_name ?? "未標";
  const loc = photo.location_name ?? "未標地點";
  return `<div class="vd-exif-bar">
    <span class="vd-exif-time">📅 ${time}</span>
    <span class="vd-exif-uploader">👤 ${uploader}</span>
    <span class="vd-exif-loc">📍 ${loc}</span>
  </div>`;
}

export default function ReadExifHydrator() {
  // 🅒 8-6: 純 client-side EXIF hydrate — SSR 已有 Vogue HTML, 我只負責補 EXIF chip
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllPhotos();
        const d1Photos = all.filter((p) => p.day === 1);
        if (cancelled) return;
        // url → photo 對照表
        const urlMap = new Map<string, TravelPhoto>();
        for (const p of d1Photos) {
          if (p.google_photos_thumb_url) urlMap.set(p.google_photos_thumb_url, p);
        }
        // 找出所有 figure[data-photo-url] inject EXIF
        const figures = document.querySelectorAll<HTMLElement>(".vd-rendered figure[data-photo-url]");
        figures.forEach((fig) => {
          const url = fig.dataset.photoUrl;
          if (!url) return;
          const slot = fig.querySelector<HTMLElement>(".vd-exif-slot");
          if (!slot) return;
          const photo = urlMap.get(url);
          if (photo) {
            slot.innerHTML = renderExifChip(photo);
          } else {
            slot.innerHTML = '<span class="vd-exif-empty">無 EXIF 資料 (picsum/外部 URL)</span>';
          }
          slot.removeAttribute("data-pending");
        });
      } catch (e) {
        console.error("[EXIF hydrate] error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}