"use client";

/**
 * /vlog — Vlog 劇本 3 選 1 首頁
 *
 * 列出 3 張江楠 5 色卡片（A / B / C），每張卡顯示劇本名稱 + 一句話核心賣點，
 * 點進去到 /vlog/[scriptId] 看詳情。
 *
 * 卡片色塊來自 data.ts 的 ScriptColorKey，底層對應 globals.css 的 --jn-* CSS 變數。
 * 標題用 Noto Serif TC（h1/h2/h3 預設已掛在 globals.css）。
 */

import Link from "next/link";
import {
  SCRIPTS,
  SCRIPT_ORDER,
  COLOR_BG_CLASS,
  COLOR_TEXT_CLASS,
  COLOR_BORDER_CLASS,
  COLOR_VAR,
  type ScriptColorKey,
} from "./data";

export default function VlogIndexClientPage() {
  return (
    <main
      className="min-h-screen text-[var(--jn-ink)]"
      style={{
        background:
          "linear-gradient(180deg, var(--jn-paper) 0%, var(--jn-paper-warm) 100%)",
      }}
    >
      {/* 頂部小導覽 */}
      <header className="bg-[var(--jn-vermilion)] text-[var(--jn-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link
            href="/travel"
            className="text-[var(--jn-paper)]/90 hover:text-[var(--jn-paper)] text-sm flex items-center gap-1"
          >
            <span>←</span>
            <span>回到 /travel</span>
          </Link>
          <div
            className="text-sm tracking-widest opacity-90"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            🎬 Vlog 劇本
          </div>
        </div>
        {/* 金色雲紋橫條 */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
      </header>

      {/* 主標題區 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <p
          className="text-sm tracking-[0.3em] text-[var(--jn-vermilion)] mb-3"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          江南水鄉八日之旅 · VLOG
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          <span
            style={{
              background: "var(--jn-gradient-1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Vlog 劇本 4 選 1
          </span>
        </h1>
        <p
          className="text-base sm:text-lg text-[var(--jn-ink)]/80 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          13 位角色、8 日行程、四種敘事視角。
          <br className="hidden sm:block" />
          挑一個最對味的版本，點進去看完整分鏡。
        </p>
      </section>

      {/* 4 張卡片 — 2×2 方塊 */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {SCRIPT_ORDER.map((id) => {
            const s = SCRIPTS[id];
            const accentBg = COLOR_BG_CLASS[s.color];
            const accentText = COLOR_TEXT_CLASS[s.color];
            const accentBorder = COLOR_BORDER_CLASS[s.color];
            const accentRaw = COLOR_VAR[s.color];
            return (
              <Link
                key={s.id}
                href={`/vlog/${s.id}`}
                className={`group block rounded-2xl overflow-hidden bg-[var(--jn-paper)] shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:${accentBorder}`}
                style={{ borderColor: "transparent" }}
              >
                {/* 頂部色塊（劇本主打色） */}
                <div
                  className={`${accentBg} h-32 sm:h-40 flex items-end p-5 relative`}
                  style={{ backgroundColor: accentRaw }}
                >
                  {/* 大字 ID */}
                  <div
                    className="text-7xl sm:text-8xl font-black leading-none absolute top-2 right-4 opacity-20 select-none"
                    style={{
                      fontFamily: "var(--font-noto-serif-tc), serif",
                      color: "var(--jn-paper)",
                    }}
                  >
                    {s.id}
                  </div>
                  {/* 主色名 chip */}
                  <div
                    className="relative z-10 inline-block px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.85)",
                      color: accentRaw,
                      fontFamily: "var(--font-noto-serif-tc), serif",
                    }}
                  >
                    劇本 {s.id}
                  </div>
                </div>

                {/* 卡片內容 */}
                <div className="p-5 sm:p-6">
                  <h2
                    className={`text-xl sm:text-2xl font-bold mb-2 ${accentText}`}
                    style={{
                      fontFamily: "var(--font-noto-serif-tc), serif",
                      color: accentRaw,
                    }}
                  >
                    {s.name}
                  </h2>
                  <p
                    className="text-[var(--jn-ink)]/80 text-sm sm:text-base leading-relaxed mb-4 min-h-[3.5rem]"
                    style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                  >
                    {s.tagline}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs uppercase tracking-wider ${accentText} opacity-70`}
                      style={{ color: accentRaw }}
                    >
                      story arc
                    </span>
                    <span
                      className="text-sm font-medium flex items-center gap-1 transition-transform group-hover:translate-x-1"
                      style={{
                        color: accentRaw,
                        fontFamily: "var(--font-noto-serif-tc), serif",
                      }}
                    >
                      看詳情 →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 底部小提示 */}
        <p
          className="text-center text-xs text-[var(--jn-ink)]/50 mt-10"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          ※ 目前為劇本殼子，詳細分鏡由聖上後續填入 data.ts
        </p>
      </section>
    </main>
  );
}