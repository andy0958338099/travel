"use client";
/**
 * ShareButtons — 共用 LINE / Facebook / 複製 分享按鈕
 *
 * Props:
 *   title: 分享標題（給 aria-label 用、也備用）
 *   url: 分享 URL（不傳就用 window.location.href）
 *   text: 分享內文（給 LINE 用、FB 不顯示）
 *   variant: 'icon' (只有 emoji) | 'full' (icon + label) | 'compact' (icon + 較小)
 *   className: 包在外的 className
 */
import { useEffect, useState } from "react";

export interface ShareButtonsProps {
  title: string;
  url?: string;
  text?: string;
  variant?: "icon" | "compact" | "full";
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
