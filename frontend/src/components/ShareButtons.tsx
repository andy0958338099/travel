"use client";
/**
 * ShareButtons — 共用 LINE / Facebook / 複製 分享按鈕
 *
 * Props:
 *   title: 分享標題（給 aria-label 用、也備用）
 *   url: 分享 URL（不傳就用 window.location.href）
 *   text: 分享內文（給 LINE 用、FB 不顯示）
 *   variant: 'icon' (只有 emoji) | 'full' (icon + label) | 'compact' (icon + 較小) | 'banner' (醒目整條, 2026-07-03 🅒 聖上加)
 *   className: 包在外的 className
 */
import { useEffect, useState } from "react";

export interface ShareButtonsProps {
  title: string;
  url?: string;
  text?: string;
  variant?: "icon" | "compact" | "full" | "banner";
  className?: string;
}

const SITE_ORIGIN = "https://travel-china.netlify.app";

function resolveUrl(provided?: string): string {
  if (provided) return provided;
  if (typeof window !== "undefined") return window.location.href;
  return SITE_ORIGIN;
}

export default function ShareButtons({
  title,
  url,
  text,
  variant = "icon",
  className = "",
}: ShareButtonsProps) {
  const [shareUrl, setShareUrl] = useState<string>(url || SITE_ORIGIN);
  const [copied, setCopied] = useState(false);

  // SSR-safe: 在 client mount 後才組 URL（避免 hydration mismatch）
  useEffect(() => {
    if (!url) {
      setShareUrl(window.location.href);
    }
  }, [url]);

  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    (text ? text + "\n" : "") + shareUrl
  )}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: 老瀏覽器
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        alert("複製失敗，請手動複製：" + shareUrl);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const sizeClasses =
    variant === "icon"
      ? "w-9 h-9"
      : variant === "compact"
        ? "px-2.5 py-1.5 text-xs"
        : "px-3 py-2 text-sm";

  const iconOnly = variant === "icon";

  // 🆕 2026-07-03 聖上拍板 🅒: banner variant 是頁面頂部醒目分享區
  if (variant === "banner") {
    return (
      <div className={`flex flex-wrap items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-amber-200/60 rounded-2xl shadow-sm ${className}`} role="region" aria-label={`分享 ${title}`}>
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-xl">🔗</span>
          <div>
            <div className="text-sm font-bold text-stone-800">分享「{title}」</div>
            <div className="text-xs text-stone-500 hidden sm:block">把這個頁面傳給親朋好友</div>
          </div>
        </div>
        <a href={lineUrl} target="_blank" rel="noopener noreferrer" title="分享到 LINE" aria-label="分享到 LINE" className="px-4 py-2 inline-flex items-center justify-center gap-2 bg-[#00C300] hover:bg-[#00A300] text-white rounded-full transition-colors font-medium text-sm">
          <span className="text-base leading-none">💬</span>
          <span>LINE</span>
        </a>
        <a href={fbUrl} target="_blank" rel="noopener noreferrer" title="分享到 Facebook" aria-label="分享到 Facebook" className="px-4 py-2 inline-flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#0E5FC2] text-white rounded-full transition-colors font-medium text-sm">
          <span className="text-base leading-none">📘</span>
          <span>Facebook</span>
        </a>
        <button type="button" onClick={handleCopy} title="複製連結" aria-label="複製連結" className="px-4 py-2 inline-flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition-colors font-medium text-sm">
          <span className="text-base leading-none">{copied ? "✓" : "🔗"}</span>
          <span>{copied ? "已複製連結" : "複製連結"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="group" aria-label={`分享 ${title}`}>
      {/* LINE */}
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="分享到 LINE"
        aria-label="分享到 LINE"
        className={`${sizeClasses} inline-flex items-center justify-center gap-1.5 bg-[#00C300] hover:bg-[#00A300] text-white rounded-full transition-colors font-medium`}
      >
        <span className="text-base leading-none">💬</span>
        {!iconOnly && <span>LINE</span>}
      </a>

      {/* Facebook */}
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="分享到 Facebook"
        aria-label="分享到 Facebook"
        className={`${sizeClasses} inline-flex items-center justify-center gap-1.5 bg-[#1877F2] hover:bg-[#0E5FC2] text-white rounded-full transition-colors font-medium`}
      >
        <span className="text-base leading-none">📘</span>
        {!iconOnly && <span>FB</span>}
      </a>

      {/* 複製 */}
      <button
        type="button"
        onClick={handleCopy}
        title="複製連結"
        aria-label="複製連結"
        className={`${sizeClasses} inline-flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition-colors font-medium`}
      >
        <span className="text-base leading-none">{copied ? "✓" : "🔗"}</span>
        {!iconOnly && <span>{copied ? "已複製" : "複製"}</span>}
      </button>
    </div>
  );
}
