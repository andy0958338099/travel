"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 數位相框組件
 *
 * 中國風版本 (2A 拍板): 朱紅印章 + 金邊 + 暖宣紙 + 微拍立得傾斜
 * - 不走 Vogue 全紅黑 (聖上 8-10 說舊版是「災難」)
 * - 沿用全站 jn-vermilion + jn-gold + jn-paper-warm
 * - hover 微放大 + 隨機微傾斜 (拍立得感)
 *
 * 🆕 2026-08-16 聖上拍板: 4 種 frameStyle
 *   - vermilion: 朱紅金邊 (預設, 現狀)
 *   - polaroid:  純白拍立得 (白邊無金, 淡陰影, 拍立得下緣加寬)
 *   - ink:       墨黑復古 (黑框, 厚重黑色陰影, dramatic)
 *   - wash:      水墨淡邊 (灰淡細邊框, 書卷氣, 淡陰影)
 *
 * Props:
 *   - src: 圖片 URL
 *   - caption: 圖說 (顯示在相框下方, 印章風 chip)
 *   - frameStyle: 4 種風格 (預設 'vermilion')
 *   - rotate: 強制旋轉角度 (number), 不傳則隨機 -2~+2 度
 *   - alt: alt text
 *   - priority: boolean (首張大圖用 priority loading)
 */

import { useState } from "react";

export type FrameStyle = "vermilion" | "polaroid" | "ink" | "wash";

const FRAME_META: Record<
  FrameStyle,
  { label: string; emoji: string; chip: string; chipText: string }
> = {
  vermilion: { label: "朱紅金邊", emoji: "🏮", chip: "印", chipText: "印" },
  polaroid: { label: "純白拍立得", emoji: "⬜", chip: "白", chipText: "白" },
  ink: { label: "墨黑復古", emoji: "�", chip: "古", chipText: "古" },
  wash: { label: "水墨淡邊", emoji: "📜", chip: "卷", chipText: "卷" },
};

interface PhotoFrameProps {
  src: string;
  caption?: string;
  frameStyle?: FrameStyle;
  rotate?: number;
  alt?: string;
  priority?: boolean;
  onClick?: () => void;
}

export default function PhotoFrame({
  src,
  caption,
  frameStyle = "vermilion",
  rotate,
  alt = "",
  priority = false,
  onClick,
}: PhotoFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 拍立得微傾斜: 不傳 rotate 則隨機 -2 ~ +2 度 (client-side, 避免 SSR 不一致)
  // 用 lazy init 確保每次組件 mount 只算一次
  const finalRotate =
    rotate ?? (typeof window !== "undefined"
      ? Math.floor(Math.random() * 5) - 2 // -2, -1, 0, 1, 2
      : 0);

  const meta = FRAME_META[frameStyle];

  // ===== 4 種風格 =====
  if (frameStyle === "polaroid") {
    return (
      <figure
        className="group inline-block transition-transform duration-500 ease-out hover:scale-[1.02] hover:-rotate-1"
        style={{ transform: `rotate(${finalRotate}deg)` }}
      >
        {/* � 8-16 聖上反饋: polaroid 加強 — 粗白邊 + 厚白陰影 + 真實拍立得下緣 */}
        <div
          className="relative bg-white p-5 pb-20"
          style={{
            boxShadow:
              "0 15px 35px -8px rgba(0,0,0,0.25), 0 5px 15px -3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {/* 圖片外加細灰邊框, 跟卡片白底拉開層次 */}
          <div className="border border-stone-200/80 bg-white">
            {!loaded && !error && (
              <div className="aspect-[4/3] w-full min-w-[280px] flex items-center justify-center bg-stone-50">
                <span className="text-stone-400 text-sm">載入中…</span>
              </div>
            )}
            {error ? (
              <div className="aspect-[4/3] w-full min-w-[280px] flex flex-col items-center justify-center bg-stone-50 text-stone-500">
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

          {/* 真實拍立得下緣手寫區 — 圖說落最底部, 加大空間 */}
          {caption && (
            <div className="absolute bottom-4 left-5 right-5 text-center">
              <p className="text-base font-semibold text-stone-800 text-center leading-tight tracking-wide font-serif">
                {caption}
              </p>
            </div>
          )}

          {/* hover chip — 白色底, 黑色 POLAROID 字樣 */}
          {caption && (
            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-block bg-white text-stone-900 text-[10px] font-extrabold px-2.5 py-1 rounded-sm border-2 border-stone-900">
                POLAROID
              </span>
            </div>
          )}
        </div>
      </figure>
    );
  }

  if (frameStyle === "ink") {
    return (
      <figure
        className="group inline-block transition-transform duration-500 ease-out hover:scale-[1.02] hover:-rotate-1"
        style={{ transform: `rotate(${finalRotate}deg)` }}
      >
        {/* 🆕 8-16 聖上反�: ink 加強 — 黑邊 + 厚黑陰影 + 暗調照片色階 */}
        <div
          className="relative bg-black p-2 pb-12"
          style={{
            boxShadow:
              "0 30px 70px -12px rgba(0,0,0,0.65), 0 15px 30px -8px rgba(0,0,0,0.50), 0 3px 8px rgba(0,0,0,0.30)",
          }}
        >
          {/* 黑底卡片下加粗黑邊 */}
          <div className="border-4 border-black bg-stone-950">
            {!loaded && !error && (
              <div className="aspect-[4/3] w-full min-w-[280px] flex items-center justify-center bg-stone-950">
                <span className="text-stone-600 text-sm">載入中…</span>
              </div>
            )}
            {error ? (
              <div className="aspect-[4/3] w-full min-w-[280px] flex flex-col items-center justify-center bg-stone-950 text-stone-400">
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
                style={{ filter: "contrast(1.15) saturate(0.85) brightness(0.95)" }}
                className={`block max-w-full h-auto ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${onClick ? "cursor-pointer" : ""}`}
              />
            )}
          </div>

          {/* 朱紅古印章 chip (左上, 跟右下 chip 形成對角) — 戲劇感最強 */}
          <div className="absolute -top-3 -left-3">
            <span
              className="inline-block bg-red-600 text-white text-[10px] font-extrabold px-2 py-1.5 rounded-sm border-2 border-amber-200"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.15em" }}
            >
              古印
            </span>
          </div>

          {caption && (
            <div className="absolute bottom-2 left-3 right-3 text-center">
              <p className="text-base font-extrabold text-amber-100 text-center leading-tight tracking-widest font-serif">
                {caption}
              </p>
            </div>
          )}

          {caption && (
            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-block bg-stone-950 text-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-sm border-2 border-amber-200">
                INK
              </span>
            </div>
          )}
        </div>
      </figure>
    );
  }

  if (frameStyle === "wash") {
    return (
      <figure
        className="group inline-block transition-transform duration-500 ease-out hover:scale-[1.02] hover:-rotate-1"
        style={{ transform: `rotate(${finalRotate}deg)` }}
      >
        {/* 🆕 8-16 聖上反饋: wash 加強 — 米色宣紙底 + 雙層綾邊 (粗外 + 細內) + 朱紅印 chip */}
        <div
          className="relative p-3 pb-12"
          style={{
            backgroundColor: "#f5ead0",  // 宣紙米色
            boxShadow:
              "0 10px 25px -8px rgba(120,53,15,0.20), 0 4px 10px -3px rgba(120,53,15,0.12)",
          }}
        >
          {/* 雙層綾邊: 外粗米褐 + 內細金 */}
          <div className="border-2 border-amber-700/30 p-1.5 bg-amber-50/50">
            <div className="border border-amber-600/40 p-0.5 bg-white">
              {!loaded && !error && (
                <div className="aspect-[4/3] w-full min-w-[280px] flex items-center justify-center bg-stone-50">
                  <span className="text-stone-400 text-sm">載入中…</span>
                </div>
              )}
              {error ? (
                <div className="aspect-[4/3] w-full min-w-[280px] flex flex-col items-center justify-center bg-stone-50 text-stone-500">
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
          </div>

          {caption && (
            <div className="absolute bottom-2 left-3 right-3 text-center">
              <p className="text-base font-serif font-bold text-amber-900 text-center leading-tight tracking-widest">
                {caption}
              </p>
            </div>
          )}

          {/* 朱紅印 chip (左下, 永遠顯示) — 國畫裝裱標記 */}
          <div className="absolute -bottom-2 -left-2">
            <span
              className="inline-block bg-red-700 text-white text-[10px] font-extrabold px-2 py-1.5 rounded-sm border border-amber-200"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.15em" }}
            >
              印
            </span>
          </div>

          {caption && (
            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-sm border-2 border-amber-700/40">
                水墨
              </span>
            </div>
          )}
        </div>
      </figure>
    );
  }

  // 預設: vermilion 朱紅金邊 (現狀)
  return (
    <figure
      className="group inline-block transition-transform duration-500 ease-out hover:scale-[1.02] hover:-rotate-1"
      style={{ transform: `rotate(${finalRotate}deg)` }}
    >
      <div
        className="relative bg-white p-3 pb-12 shadow-2xl"
        style={{
          boxShadow:
            "0 20px 50px -10px rgba(220, 38, 38, 0.25), 0 8px 20px -5px rgba(0, 0, 0, 0.15)",
        }}
      >
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

        {caption && (
          <div className="absolute bottom-2 left-3 right-3 text-center">
            <p className="text-base font-extrabold text-jn-ink text-center leading-tight tracking-wide">
              {caption}
            </p>
          </div>
        )}

        {caption && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span
              className="inline-block bg-jn-vermilion text-white text-[10px] font-bold px-2 py-1 rounded-sm"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.1em" }}
            >
              {meta.chipText}
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
