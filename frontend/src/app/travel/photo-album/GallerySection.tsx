"use client";

/**
 * GallerySection — 點地圖 marker 後, 下方顯示 8 張較大縮圖 (2 列 × 4 欄)
 * + 翻頁機制 (每頁 8 張) + 點縮圖 → Lightbox 全螢幕看大圖
 *
 * 2026-07-26 聖上拍板:
 *   - 8 張/2 列 (sm 以上) / 4 張/1 列 (手機)
 *   - 翻頁: 上一頁 / 下一頁 / 頁碼 X / Y
 *   - 點大縮圖 → Lightbox 全螢幕 (ESC/箭頭/點背景關閉)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { TravelPhoto } from "@/utils/travelPhotos";

const PAGE_SIZE = 12;  // 🆕 2026-07-27 聖上拍板: 16 → 12 (3 列 4 欄)

/**
 * 🆕 2026-07-27 修 30 頁爆版 bug: 省略中間分頁演算法
 *
 * 規則:
 * - 總頁 ≤ 7 顆 → 全部顯示
 * - 總頁 > 7 顆 → 始終顯示首頁 + 末頁 + 當前 ± 2 顆,中間用 "..." 省略
 *
 * 範例 (currentPage 0-indexed):
 * - 30 頁, page=0  → [0] 1 2 ... 29         (前段)
 * - 30 頁, page=5  → 0 ... 4 5 6 7 ... 29   (中段)
 * - 30 頁, page=29 → 0 ... 27 28 29         (後段)
 * - 30 頁, page=2  → 0 1 2 3 4 ... 29       (前段, 不需要左 ... 因為 0,1,2,3,4 都連續)
 *
 * @returns (number | "...")[] 給 React map 渲染
 */
function buildPageList(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  // 7 顆 = 首 1 + 末 1 + 當前 ± 2 + 2 個 "..."  = 7 個物件
  // 但若當前在頭 4 顆 (page 0-3) → 不需要左 "..."
  // 若當前在末 4 顆 (page totalPages-4 ~ totalPages-1) → 不需要右 "..."
  const result: (number | "...")[] = [];
  const showLeftEllipsis = currentPage > 3;
  const showRightEllipsis = currentPage < totalPages - 4;
  // 中段: 當前 ± 2 (先算 midStart/midEnd 給左右段用)
  const midStart = Math.max(1, currentPage - 2);
  const midEnd = Math.min(totalPages - 2, currentPage + 2);
  // 左半: 首頁
  result.push(0);
  if (showLeftEllipsis) {
    result.push("...");
  } else {
    // 頭 4 顆全部顯示: 0 1 2 3 (首頁已加) — 左段「填補 1..3 跟 midStart 之間的空檔」
    for (let i = 1; i < 4; i++) {
      if (i < midStart) result.push(i);  // 在中段前
    }
  }
  // 中段
  for (let i = midStart; i <= midEnd; i++) {
    if (!result.includes(i) && i !== 0 && i !== totalPages - 1) result.push(i);
  }
  // 右半: 末頁
  if (showRightEllipsis) {
    result.push("...");
  } else {
    // 末 4 顆 (末頁已加) — 填補 midEnd+1..totalPages-2 之間
    for (let i = totalPages - 4; i < totalPages - 1; i++) {
      if (i > midEnd) result.push(i);
    }
  }
  result.push(totalPages - 1);
  return result;
}

interface GallerySectionProps {
  photos: TravelPhoto[] | null;
  locationLabel?: string;
  /** 🆕 2026-07-26 沒照片時, 給具體的建議訊息 */
  emptyMessage?: string;
  /** 🆕 2026-07-27 拖曳到 day chip 改 day — 把 photoId 傳出去給父層 */
  onPhotoDragStart?: (photoId: string) => void;
  /** 🆕 2026-07-27 filterKey 變時才 reset page (預設 selectedDay) */
  filterKey?: string;
}

export default function GallerySection({
  photos,
  locationLabel,
  emptyMessage,
  onPhotoDragStart,
  filterKey,
}: GallerySectionProps) {
  // 🆕 2026-07-27 filterKey fallback: 預設從 photos 算 (但 photos 變化會誤判)
  const effectiveFilterKey = filterKey ?? "auto";
  const [page, setPage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // 🆕 2026-07-27 修「拖曳後跳回第一頁」bug
  //   - 之前: useEffect([photos]) → 樂觀更新任何 photo 都 setPage(0)
  //   - 現在: useRef 記住「上一個 filterKey」, 只在 filterKey 真的換時 reset
  //   - filterKey = selectedDay (1-8 or "all"), 樂觀更新不改 filterKey 所以不 reset
  const prevFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterKey.current !== null && prevFilterKey.current !== effectiveFilterKey) {
      setPage(0);
      setLightboxIndex(null);
    }
    prevFilterKey.current = effectiveFilterKey;
  }, [effectiveFilterKey]);

  if (!photos || photos.length === 0) {
    return (
      <section className="mt-3 bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl p-6 sm:p-8 text-center">
        <div className="text-4xl sm:text-5xl mb-2">📷</div>
        <div className="text-sm text-stone-600">
          {emptyMessage || "點地圖上的任一 marker,這裡會顯示該位置的 8 張照片"}
        </div>
        <div className="text-xs text-stone-400 mt-2">
          換個 Day / 時段 / 團員篩選條件試試
        </div>
      </section>
    );
  }

  const totalPages = Math.ceil(photos.length / PAGE_SIZE);
  const startIdx = page * PAGE_SIZE;
  const visiblePhotos = photos.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <section className="mt-3 bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-[var(--jn-vermilion)]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <span className="text-xl">🖼️</span>
            <span>
              {locationLabel || "這個位置"}的相片集
            </span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            共 <strong className="text-stone-700">{photos.length}</strong> 張
            {totalPages > 1 && (
              <>
                {" "}· 第{" "}
                <strong className="text-stone-700">
                  {page + 1} / {totalPages}
                </strong>{" "}
                頁
              </>
            )}
          </p>
        </div>
        {/* Pagination controls (top) */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← 上一頁
            </button>
            <span className="text-xs text-stone-500 px-1.5">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: "var(--jn-vermilion)", color: "white", borderColor: "var(--jn-vermilion)" }}
            >
              下一頁 →
            </button>
          </div>
        )}
      </div>

      {/* Photo grid: 3 列 × 4 欄 (12 張/頁, 聖上 7-27 拍板) */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {visiblePhotos.map((photo, idx) => {
            const globalIdx = startIdx + idx;
            return (
              <button
                key={photo.id}
                draggable={!!onPhotoDragStart}
                onDragStart={(e) => {
                  if (!onPhotoDragStart) return;
                  e.dataTransfer.setData("text/plain", photo.id);
                  e.dataTransfer.effectAllowed = "move";
                  onPhotoDragStart(photo.id);
                }}
                onClick={() => setLightboxIndex(globalIdx)}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-stone-200 hover:border-[var(--jn-vermilion)] transition-all cursor-grab active:cursor-grabbing bg-stone-100"
                title="拖到上方日期 chip 可改分類"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.google_photos_thumb_url || ""}
                  alt={photo.filename}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Hover overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <div className="text-white text-xs font-medium truncate">
                    {photo.filename}
                  </div>
                  <div className="text-white/80 text-xs">
                    📅 D{photo.day} ·{" "}
                    {new Date(photo.datetime_original).toLocaleTimeString(
                      "zh-TW",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                    {photo.uploader_name && ` · 👤 ${photo.uploader_name}`}
                  </div>
                </div>
                {/* Day badge (always visible) */}
                <div
                  className="absolute top-1.5 left-1.5 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: "var(--jn-vermilion)" }}
                >
                  D{photo.day}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom pagination — 🆕 2026-07-27 省略中間分頁 (Google 搜尋風) 修 30 頁爆版 bug
            算法: 始終顯示首頁 + 末頁 + 當前 ± 2 顆,中間用 ... 省略
            視窗寬度無限,30+ 頁不會擠爆 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="第一頁"
            >
              ⏮
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="上一頁"
            >
              ←
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {buildPageList(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-stone-400 text-sm"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-[var(--jn-vermilion)] text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                    aria-label={`第 ${p + 1} 頁`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p + 1}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="下一頁"
            >
              →
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="最後頁"
            >
              ⏭
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

// ── Lightbox 全螢幕看大圖 ──────────────────────────────────────────────────
function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: TravelPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const photo = photos[idx];

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  // ESC 關 / ← 上一張 / → 下一張
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    // 鎖 body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
        aria-label="關閉"
      >
        ×
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
        {idx + 1} / {photos.length}
      </div>

      {/* Prev button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute left-2 sm:left-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl sm:text-2xl flex items-center justify-center transition-colors"
        aria-label="上一張"
      >
        ‹
      </button>

      {/* Next button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute right-2 sm:right-4 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl sm:text-2xl flex items-center justify-center transition-colors"
        aria-label="下一張"
      >
        ›
      </button>

      {/* Image + info */}
      <div
        className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.google_photos_thumb_url || ""}
          alt={photo.filename}
          className="max-w-full max-h-[80vh] object-contain"
        />
        <div className="mt-3 text-white/90 text-sm text-center max-w-3xl">
          <div className="font-bold">{photo.filename}</div>
          <div className="text-xs text-white/60 mt-1">
            📅 D{photo.day} ·{" "}
            {new Date(photo.datetime_original).toLocaleString("zh-TW", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {photo.uploader_name && ` · 👤 ${photo.uploader_name}`}
            {photo.location_name && ` · 📍 ${photo.location_name}`}
          </div>
        </div>
      </div>
    </div>
  );
}