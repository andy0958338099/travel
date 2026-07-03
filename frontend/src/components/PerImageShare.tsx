"use client";
/**
 * PerImageShare — 單張圖的下載 + 分享元件
 *
 * 2026-07-03 🅒 聖上拍板: 右鍵下載 + 簡易分享
 * 包在 <img> 周圍, hover 顯示「下載」「複製圖 URL」「分享 LINE」「分享 FB」按鈕
 *
 * Props:
 *   src: 圖片 URL (必需)
 *   alt: 圖片 alt 文字
 *   filename: 下載檔名 (預設從 src 抓最後一段)
 *   className: 包在外的 className
 *   children: 真正的 <img> 元素 (讓 caller 完全控制渲染)
 *   showCaption: 顯示 alt 標題 (預設 false)
 */
import { useEffect, useRef, useState } from "react";

export interface PerImageShareProps {
  src: string;
  alt?: string;
  filename?: string;
  className?: string;
  children: React.ReactNode;
  showCaption?: boolean;
}

function extractFilename(src: string, fallback = "image.jpg"): string {
  try {
    // 絕對 URL 取 pathname, 相對路徑直接 split
    if (src.startsWith("http")) {
      const u = new URL(src);
      const last = u.pathname.split("/").pop() || fallback;
      // 移除 query string 如果有
      return decodeURIComponent(last.split("?")[0]);
    }
    const last = src.split("/").pop() || fallback;
    return decodeURIComponent(last.split("?")[0]);
  } catch {
    return fallback;
  }
}

export default function PerImageShare({
  src,
  alt,
  filename,
  className = "",
  children,
  showCaption = false,
}: PerImageShareProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalFilename = filename || extractFilename(src);

  // 組絕對 URL (分享用)
  const [absoluteUrl, setAbsoluteUrl] = useState(src);
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (src.startsWith("http")) {
        setAbsoluteUrl(src);
      } else {
        // 相對路徑 → 絕對 (Netlify production domain)
        const origin = window.location.origin;
        setAbsoluteUrl(`${origin}${src.startsWith("/") ? "" : "/"}${src}`);
      }
    }
  }, [src]);

  // 3 秒後自動關 toast
  function flashToast(setter: (v: boolean) => void) {
    setter(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setter(false), 1800);
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      // 同網域: <a download> 直接 work; 跨網域: fetch → blob
      const sameOrigin = absoluteUrl.startsWith(window.location.origin);
      if (sameOrigin) {
        const a = document.createElement("a");
        a.href = src;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // 跨網域 (Supabase CDN 等) — fetch → blob → save
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
    } catch (e) {
      // Fallback: 開新分頁讓 user 右鍵另存
      window.open(absoluteUrl, "_blank", "noopener,noreferrer");
      alert("無法直接下載, 已開新分頁, 請在那頁按右鍵「另存圖片」");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyUrl() {
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

  // 分享 LINE / FB — 帶「圖片網址 + 頁面標題」
  const pageUrl = typeof window !== "undefined" ? window.location.href : absoluteUrl;
  const shareText = alt ? `${alt}\n${absoluteUrl}` : absoluteUrl;
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + "\n" + pageUrl)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      {/* 浮層按鈕列 - 右上角 */}
      <div
        className={`absolute top-2 right-2 flex items-center gap-1.5 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 下載 */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          title={`下載 ${finalFilename}`}
          aria-label={`下載 ${finalFilename}`}
          className="w-9 h-9 inline-flex items-center justify-center bg-white/95 hover:bg-white text-stone-700 rounded-full shadow-md border border-stone-200 transition-all hover:scale-105 disabled:opacity-50"
        >
          <span className="text-base leading-none">{downloading ? "⏳" : "⬇️"}</span>
        </button>

        {/* 複製圖 URL */}
        <button
          type="button"
          onClick={handleCopyUrl}
          title="複製圖片網址"
          aria-label="複製圖片網址"
          className="w-9 h-9 inline-flex items-center justify-center bg-white/95 hover:bg-white text-stone-700 rounded-full shadow-md border border-stone-200 transition-all hover:scale-105"
        >
          <span className="text-base leading-none">{copied ? "✓" : "🔗"}</span>
        </button>

        {/* 分享 LINE */}
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="分享圖片到 LINE"
          aria-label="分享圖片到 LINE"
          className="w-9 h-9 inline-flex items-center justify-center bg-[#00C300]/95 hover:bg-[#00C300] text-white rounded-full shadow-md border border-[#00A300] transition-all hover:scale-105"
        >
          <span className="text-base leading-none">💬</span>
        </a>

        {/* 分享 Facebook */}
        <a
          href={fbUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="分享圖片到 Facebook"
          aria-label="分享圖片到 Facebook"
          className="w-9 h-9 inline-flex items-center justify-center bg-[#1877F2]/95 hover:bg-[#1877F2] text-white rounded-full shadow-md border border-[#0E5FC2] transition-all hover:scale-105"
        >
          <span className="text-base leading-none">📘</span>
        </a>
      </div>

      {/* 浮層標題列 - 底部 (可選) */}
      {showCaption && alt && (
        <div className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {alt}
        </div>
      )}
    </div>
  );
}