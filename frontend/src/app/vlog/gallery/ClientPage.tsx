"use client";

/**
 * /vlog/gallery — 5 劇本 AI 相冊集總覽入口
 *
 * 顯示 5 張劇本小卡 + 「看 N 張 AI 相冊」CTA，點進各劇本相冊。
 */

import Link from "next/link";
import { SCRIPTS, SCRIPT_ORDER, COLOR_VAR } from "../data";
import {
  parseImagesForScript,
} from "./parse-images";

export default function GalleryIndexClientPage() {
  return (
    <main
      className="min-h-screen text-[var(--jn-ink)]"
      style={{
        background:
          "linear-gradient(180deg, var(--jn-paper) 0%, var(--jn-paper-warm) 100%)",
      }}
    >
      {/* ───────── 頂部 nav ───────── */}
      <header className="bg-[var(--jn-vermilion)] text-[var(--jn-paper)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link
            href="/vlog"
            className="text-[var(--jn-paper)]/90 hover:text-[var(--jn-paper)] text-sm flex items-center gap-1"
          >
            <span>←</span>
            <span>回到 /vlog</span>
          </Link>
          <div
            className="text-sm tracking-widest opacity-90"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            🖼 AI 相冊總覽
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
      </header>

      {/* ───────── Hero ───────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <p
          className="text-sm tracking-[0.3em] text-[var(--jn-vermilion)] mb-3"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          VLOG · 5 劇本 · 224 張 AI 生圖
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black mb-4"
          style={{
            fontFamily: "var(--font-noto-serif-tc), serif",
            background: "var(--jn-gradient-1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          AI 相冊總覽
        </h1>
        <p
          className="text-base sm:text-lg text-[var(--jn-ink)]/80 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          5 劇本 · 224 張 AI 生圖 · 一頁看完整趟旅程的視覺可能。
        </p>
      </section>

      {/* ───────── 5 劇本卡片 + 預覽前 4 張 ───────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCRIPT_ORDER.map((id) => {
            const s = SCRIPTS[id];
            const images = parseImagesForScript(s.id);
            const accentRaw = COLOR_VAR[s.color];
            const previewImages = images.slice(0, 4);
            return (
              <Link
                key={s.id}
                href={`/vlog/${s.id}/gallery`}
                className="group block rounded-2xl overflow-hidden bg-[var(--jn-paper)] shadow-md hover:shadow-xl transition-all"
              >
                {/* 2x2 預覽 grid */}
                <div className="grid grid-cols-2 gap-0.5 bg-[var(--jn-ink)]/10 aspect-[2/1]">
                  {previewImages.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center bg-[var(--jn-paper-warm)] text-[var(--jn-ink)]/40 text-3xl">
                      🚧
                    </div>
                  ) : (
                    <>
                      {previewImages.map((img, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={img.url}
                          src={img.url}
                          alt={`${s.name} 預覽 ${idx + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ))}
                      {/* 若只有 4 張以內, 補空白 */}
                      {previewImages.length < 4 &&
                        Array.from({ length: 4 - previewImages.length }).map(
                          (_, i) => (
                            <div
                              key={`empty-${i}`}
                              className="bg-[var(--jn-paper-warm)]"
                            />
                          )
                        )}
                    </>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-3xl sm:text-4xl font-black"
                      style={{
                        fontFamily: "var(--font-noto-serif-tc), serif",
                        color: accentRaw,
                      }}
                    >
                      {s.id}
                    </span>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-bold"
                      style={{
                        backgroundColor: accentRaw,
                        color: "var(--jn-paper)",
                        fontFamily: "var(--font-noto-serif-tc), serif",
                      }}
                    >
                      {images.length > 0
                        ? `${images.length} 張`
                        : "待寫"}
                    </span>
                  </div>
                  <h3
                    className="text-base sm:text-lg font-bold mb-1"
                    style={{
                      fontFamily: "var(--font-noto-serif-tc), serif",
                      color: accentRaw,
                    }}
                  >
                    {s.name}
                  </h3>
                  <p
                    className="text-xs text-[var(--jn-ink)]/60 mb-3"
                    style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                  >
                    {s.tagline.split("·")[0].trim()}
                  </p>
                  <span
                    className="text-sm font-medium flex items-center gap-1"
                    style={{
                      color: accentRaw,
                      fontFamily: "var(--font-noto-serif-tc), serif",
                    }}
                  >
                    看 {images.length > 0 ? images.length : "待寫"} 張 AI 相冊
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}