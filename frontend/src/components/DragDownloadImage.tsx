"use client";

/**
 * DragDownloadImage — 拖拉下載圖片共用元件
 *
 * 2026-07-15 🅒 聖上拍板: 劇本/相冊圖拖拉即可下載/複製/分享
 *
 * 功能 (整合進單一 <img> wrapper):
 * 1. 拖拉到桌面/Finder → 瀏覽器原生下載 (HTML5 DownloadURL dataTransfer)
 * 2. 拖拉到 app (LINE, Slack, Mail) → 帶完整 URL (text/uri-list + text/plain)
 * 3. hover 浮層 → 4 按鈕 (下載/複製URL/分享LINE/分享FB)
 * 4. 點擊 → 觸發 onClick callback (e.g. 開 lightbox)
 *
 * 用法:
 *   <DragDownloadImage
 *     src="https://...jpg"
 *     alt="Day 1 桃園機場"
 *     filename="day1-t1-airport.jpg"
 *     onClick={() => openLightbox(idx)}
 *     className="aspect-square"
 *   />
 *
 * Supabase CDN 跨網域下載: 用 fetch+blob fallback (跟 PerImageShare 一致)
 */

import { useEffect, useRef, useState } from "react";

export interface DragDownloadImageProps {
  src: string;
  alt?: string;
  filename?: string;
  className?: string;
  imgClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
  /** 拖拉時顯示的副標 (預設 "鬆手下載 {filename}") */
  dragHint?: string;
}

function extractFilename(src: string, fallback = "image.jpg"): string {
  try {
    if (src.startsWith("http")) {
      const u = new URL(src);
      const last = u.pathname.split("/").pop() || fallback;
      return decodeURIComponent(last.split("?")[0]);
    }
    const last = src.split("/").pop() || fallback;
    return decodeURIComponent(last.split("?")[0]);
  } catch {
    return fallback;
  }
}

export default function DragDownloadImage({
  src,
  alt,
  filename,
  className = "",
  imgClassName = "",
  onClick,
  dragHint,
}: DragDownloadImageProps) {
  const finalFilename = filename || extractFilename(src);
  const [isDragging, setIsDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ext = finalFilename.split(".").pop()?.toLowerCase() || "jpg";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "gif"
          ? "image/gif"
          : "image/jpeg";

  const [absoluteUrl, setAbsoluteUrl] = useState(src);
  useEffect(() => {
    if (typeof window !== "undefined" && src.startsWith("http")) {
      setAbsoluteUrl(src);
    }
  }, [src]);

  function flashToast(setter: (v: boolean) => void) {
    setter(true);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setter(false), 1800);
  }

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    try {
      e.dataTransfer.setData("DownloadURL", `${mime}:${finalFilename}:${src}`);
    } catch {}
    try {
      e.dataTransfer.setData("text/uri-list", src);
    } catch {}
    try {
      e.dataTransfer.setData("text/plain", src);
    } catch {}
    if (e.currentTarget instanceof HTMLElement) {
      const imgEl = e.currentTarget.querySelector("img");
      if (imgEl) {
        e.dataTransfer.setDragImage(
          imgEl,
          imgEl.clientWidth / 2,
          imgEl.clientHeight / 2
        );
      }
    }
    e.dataTransfer.effectAllowed = "copy";
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      const sameOrigin = absoluteUrl.startsWith(window.location.origin);
      if (sameOrigin) {
        const a = document.createElement("a");
        a.href = src;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // 跨網域 (Supabase CDN) — fetch → blob → save
        const res = await fetch(absoluteUrl, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch {
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
      alert("無法直接下載, 已開新分頁, 請在那頁按右鍵「另存圖片」");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyUrl(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(absoluteUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = absoluteUrl;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        alert("複製失敗, 請手動複製:\n" + absoluteUrl);
      }
      document.body.removeChild(ta);
    }
    flashToast(setCopied);
  }

  const pageUrl =
    typeof window !== "undefined" ? window.location.href : absoluteUrl;
  const shareText = alt ? `${alt}\n${absoluteUrl}` : absoluteUrl;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + "\n" + pageUrl)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  function handleClick(e: React.MouseEvent) {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  }

  return (
    <div
      className={`w-full h-full group cursor-grab active:cursor-grabbing select-none relative ${
        isDragging ? "opacity-70" : ""
      } ${className}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      title="拖到桌面下載 · 點擊看大圖"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || finalFilename}
        loading="lazy"
        draggable={false}
        className={`w-full h-full object-cover ${imgClassName}`}
      />

      {/* 拖拉時顯示提示浮層 */}
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-[var(--jn-vermilion)]/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-[var(--jn-paper)] pointer-events-none">
          <div className="text-3xl mb-1">⬇</div>
          <div
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {dragHint || `鬆手下載 ${finalFilename}`}
          </div>
        </div>
      )}

      {/* hover 浮層 4 按鈕 — 用 group-hover 顯示 */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1.5 transition-opacity z-10 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto`}
      >
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          title={`下載 ${finalFilename}`}
          aria-label={`下載 ${finalFilename}`}
          className="w-9 h-9 inline-flex items-center justify-center bg-white/95 hover:bg-white text-stone-700 rounded-full shadow-md border border-stone-200 transition-all hover:scale-105 disabled:opacity-50"
        >
          <span className="text-base leading-none">
            {downloading ? "⏳" : "⬇️"}
          </span>
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          title="複製圖片網址"
          aria-label="複製圖片網址"
          className="w-9 h-9 inline-flex items-center justify-center bg-white/95 hover:bg-white text-stone-700 rounded-full shadow-md border border-stone-200 transition-all hover:scale-105"
        >
          <span className="text-base leading-none">{copied ? "✓" : "🔗"}</span>
        </button>
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="分享圖片到 LINE"
          aria-label="分享圖片到 LINE"
          onClick={(e) => e.stopPropagation()}
          className="w-9 h-9 inline-flex items-center justify-center bg-[#00C300]/95 hover:bg-[#00C300] text-white rounded-full shadow-md border border-[#00A300] transition-all hover:scale-105"
        >
          <span className="text-base leading-none">💬</span>
        </a>
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="分享圖片到 Facebook"
          aria-label="分享圖片到 Facebook"
          onClick={(e) => e.stopPropagation()}
          className="w-9 h-9 inline-flex items-center justify-center bg-[#1877F2]/95 hover:bg-[#1877F2] text-white rounded-full shadow-md border border-[#0E5FC2] transition-all hover:scale-105"
        >
          <span className="text-base leading-none">📘</span>
        </a>
      </div>

      {/* 「拖」小圖標 (hover 顯示) */}
      {!isDragging && (
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/85 backdrop-blur shadow-md text-[10px] sm:text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
          <span>✋</span>
          <span style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}>
            拖我下載
          </span>
        </div>
      )}
    </div>
  );
}