"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 數位相框組件
 *
 * 中國風版本 (2A 拍板): 朱紅印章 + 金邊 + 暖宣紙 + 微拍立得傾斜
 * - 不走 Vogue 全紅黑 (聖上 8-10 說舊版是「災難」)
 * - 沿用全站 jn-vermilion + jn-gold + jn-paper-warm
 * - hover 微放大 + 隨機微傾斜 (拍立得感)
 *
 * Props:
 *   - src: 圖片 URL
 *   - caption: 圖說 (顯示在相框下方, 印章風 chip)
 *   - rotate: 強制旋轉角度 (number), 不傳則隨機 -2~+2 度
 *   - alt: alt text
 *   - priority: boolean (首張大圖用 priority loading)
 */
import { useState } from "react";

interface PhotoFrameProps {
  src: string;
  caption?: string;
  rotate?: number;
  alt?: string;
  priority?: boolean;
  onClick?: () => void;
}

export default function PhotoFrame({
  src,
  caption,
  rotate,
  alt = "",
  priority = false,
  onClick,
}: PhotoFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 拍立得微傾斜: 不傳 rotate 則隨機 -2 ~ +2 度 (client-side, 避免 SSR 不一致)
  // 用 lazy init 確保每次組件 mount 只算一次
  const finalRotate = rotate ?? (typeof window !== "undefined"
    ? (Math.floor(Math.random() * 5) - 2)  // -2, -1, 0, 1, 2
    : 0);

  return (
    <figure
      className="group inline-block transition-transform duration-500 ease-out hover:scale-[1.02] hover:-rotate-1"
      style={{ transform: `rotate(${finalRotate}deg)` }}
    >
      {/* 數位相框本體: 白邊 + 金邊 + 厚陰影 */}
      <div
        className="relative bg-white p-3 pb-12 shadow-2xl"
        style={{
          boxShadow:
            "0 20px 50px -10px rgba(220, 38, 38, 0.25), 0 8px 20px -5px rgba(0, 0, 0, 0.15)",
        }}
      >
        {/* 金色細內邊框 */}
        <div className="relative border-2 border-jn-gold-light/60 p-0.5 bg-jn-paper-warm">
          {!loaded && !error && (
            <div className="aspect-[4/3] w-full min-w-[280px] flex items-center justify-center bg-jn-paper-warm">
              <span className="text-jn-ink/40 text-sm">載入中…</span>
            </div>
          )}
          {error ? (
            <div className="aspect-[4/3] w-full min-w-[280px] flex flex-col items-center justify-center bg-jn-paper-warm text-jn-ink/60">
              <span className="text-2xl mb-1">📷</span>
              <span className="text-xs">圖片載入失敗</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || caption || "旅程照片"}
              loading={priority ? "eager" : "lazy"}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              onClick={onClick}
              className={`block max-w-full h-auto ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${onClick ? "cursor-pointer" : ""}`}
            />
          )}
        </div>

        {/* 拍立得下方手寫區 (caption 顯示) — 🆕 8-10 聖上拍板: 粗體 + 置中 */}
        {caption && (
          <div className="absolute bottom-2 left-3 right-3 text-center">
            <p className="text-base font-extrabold text-jn-ink text-center leading-tight tracking-wide">
              {caption}
            </p>
          </div>
        )}

        {/* 朱紅印章 chip (右上角 hover 顯示) */}
        {caption && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              className="inline-block bg-jn-vermilion text-white text-[10px] font-bold px-2 py-1 rounded-sm"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.1em" }}
            >
              印
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
