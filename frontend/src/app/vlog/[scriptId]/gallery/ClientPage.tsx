"use client";

/**
 * /vlog/[scriptId]/gallery — 單劇本 AI 相冊集
 *
 * 顯示該劇本 8 天所有 AI 生圖（從 data.ts shots 文字抽出）：
 * - masonry grid (手機 2 欄 / tablet 3 欄 / desktop 4-5 欄)
 * - 每張圖 hover 顯示 day + filename chip
 * - 點圖開 lightbox（上一張/下一張/ESC/點背景關閉）
 * - 劇本 A 顯示「🚧 內容待寫」placeholder
 *
 * 江楠 5+1 色殼子 + Noto Serif TC 標題 + 印章 chip pattern
 */

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { SCRIPTS, COLOR_VAR } from "@/app/vlog/data";
import {
  parseImagesForScript,
  type GalleryImage,
} from "@/app/vlog/gallery/parse-images";

export default function ScriptGalleryClientPage({
  scriptId,
}: {
  scriptId: string;
}) {
  const script = SCRIPTS[scriptId];
  const images = useMemo(() => parseImagesForScript(scriptId), [scriptId]);
  const accentRaw = COLOR_VAR[script.color];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const prev = useCallback(
    () =>
      setOpenIdx((i) =>
        i === null ? null : (i - 1 + images.length) % images.length
      ),
    [images.length]
  );
  const next = useCallback(
    () =>
      setOpenIdx((i) =>
        i === null ? null : (i + 1) % images.length
      ),
    [images.length]
  );

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while lightbox is open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIdx, close, prev, next]);

  const currentImg = openIdx !== null ? images[openIdx] : null;

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm">
            <Link href="/vlog" className="text-[var(--jn-paper)]/90 hover:text-[var(--jn-paper)]">
              ← 5 劇本
            </Link>
            <span className="text-[var(--jn-paper)]/40">·</span>
            <Link
              href={`/vlog/${script.id}`}
              className="text-[var(--jn-paper)]/90 hover:text-[var(--jn-paper)]"
            >
              劇本 {script.id}
            </Link>
          </div>
          <div
            className="text-sm tracking-widest opacity-90"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            🖼 AI 相冊集
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
      </header>

      {/* ───────── Hero ───────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <p
          className="text-sm tracking-[0.3em] mb-3"
          style={{
            fontFamily: "var(--font-noto-serif-tc), serif",
            color: accentRaw,
          }}
        >
          VLOG 劇本 · {script.id}
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black mb-4"
          style={{
            fontFamily: "var(--font-noto-serif-tc), serif",
            color: accentRaw,
          }}
        >
          <span className="inline-block px-3 py-1 rounded-md text-sm bg-[var(--jn-vermilion)] text-[var(--jn-paper)] align-middle mr-2 shadow">
            🖼
          </span>
          {script.name} · AI 相冊集
        </h1>
        <p
          className="text-base sm:text-lg text-[var(--jn-ink)]/80 max-w-2xl mx-auto"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          {images.length > 0
            ? `8 天行程、${images.length} 張 AI 生圖。點任一張看大圖與上下張切換。`
            : "此劇本 AI 相冊集尚未生成（內容待寫）。"}
        </p>
      </section>

      {/* ───────── Gallery ───────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {images.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚧</div>
            <p
              className="text-lg text-[var(--jn-ink)]/70"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              劇本 {script.id} 內容待寫，AI 相冊集稍後補上。
            </p>
            <Link
              href={`/vlog/${script.id}`}
              className="inline-block mt-6 px-5 py-2 rounded-full bg-[var(--jn-vermilion)] text-[var(--jn-paper)] text-sm"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              先看劇本詳情 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {images.map((img, idx) => (
              <GalleryThumb
                key={img.url}
                img={img}
                index={idx}
                onClick={() => setOpenIdx(idx)}
                accentRaw={accentRaw}
              />
            ))}
          </div>
        )}
      </section>

      {/* ───────── Lightbox ───────── */}
      {currentImg && (
        <Lightbox
          images={images}
          currentIdx={openIdx!}
          onClose={close}
          onPrev={prev}
          onNext={next}
          accentRaw={accentRaw}
          scriptId={script.id}
        />
      )}
    </main>
  );
}

function GalleryThumb({
  img,
  index,
  onClick,
  accentRaw,
}: {
  img: GalleryImage;
  index: number;
  onClick: () => void;
  accentRaw: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative block w-full aspect-square overflow-hidden rounded-xl bg-[var(--jn-paper)] shadow-sm hover:shadow-lg transition-all"
      aria-label={`Day ${img.day} ${img.filename}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={`Day ${img.day} - ${img.filename}`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {/* Hover overlay with day + filename */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="text-[10px] sm:text-xs text-white/90 font-bold tracking-wider"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          Day {img.day} · {img.filename}
        </div>
      </div>
      {/* Day chip (always visible top-left) */}
      <div
        className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shadow"
        style={{
          background: accentRaw,
          color: "var(--jn-paper)",
          fontFamily: "var(--font-noto-serif-tc), serif",
        }}
      >
        D{img.day}
      </div>
    </button>
  );
}

function Lightbox({
  images,
  currentIdx,
  onClose,
  onPrev,
  onNext,
  accentRaw,
  scriptId,
}: {
  images: GalleryImage[];
  currentIdx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  accentRaw: string;
  scriptId: string;
}) {
  const img = images[currentIdx];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-5 flex items-center justify-between text-white z-10">
        <div
          className="text-xs sm:text-sm tracking-wider"
          style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
        >
          <span style={{ color: accentRaw }}>劇本 {scriptId}</span>
          <span className="opacity-50 mx-2">·</span>
          <span>Day {img.day}</span>
          <span className="opacity-50 mx-2">·</span>
          <span className="opacity-75">{img.filename}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-white/80 hover:text-white text-2xl sm:text-3xl leading-none"
          aria-label="關閉"
        >
          ×
        </button>
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl sm:text-2xl flex items-center justify-center backdrop-blur"
          aria-label="上一張"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[95vw] max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={`Day ${img.day} - ${img.filename}`}
          className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl sm:text-2xl flex items-center justify-center backdrop-blur"
          aria-label="下一張"
        >
          ›
        </button>
      )}

      {/* Counter */}
      <div
        className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs sm:text-sm backdrop-blur"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        {currentIdx + 1} / {images.length}
      </div>
    </div>
  );
}