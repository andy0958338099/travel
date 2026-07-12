"use client";

/**
 * /vlog/[scriptId] — 單一劇本閱讀頁
 *
 * 結構：
 *   頂部：劇本名稱 + 標語 + 角色表（13 人 + 角色 + 家別 chip）
 *   中段：8 日行程時間線（7/17~7/24），每天一個區塊：
 *           主要場景 / 主要角色 / 主對白方向 / 鏡頭建議
 *   底部：← 回到 4 劇本比較
 *
 * 內容由聖上在 data.ts 維護；本檔只負責渲染殼子。
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import PerImageShare from "@/components/PerImageShare";
import DayPdfExport from "./DayPdfExport";
import ScriptZipDownload from "./ScriptZipDownload";
import {
  SCRIPTS,
  CHARACTERS_13,
  COLOR_BG_CLASS,
  COLOR_TEXT_CLASS,
  COLOR_BORDER_CLASS,
  COLOR_VAR,
  type ScriptColorKey,
  type Character,
} from "../data";

// 角色家別 chip 配色（聖上 2026-07-11 拍板家別：喜家 / 吳家 / 同事）
//   喜家 = 阿喜核心家（朱紅系，最顯眼）
//   吳家 = 吳董家（金色系，第二家庭）
//   同事 = 阿喜工作同事（青花系，第三組）
const FAMILY_CHIP_BG: Record<Character["family"], string> = {
  喜家: "bg-[var(--jn-vermilion)]/10 text-[var(--jn-vermilion)] border-[var(--jn-vermilion)]/30",
  吳家: "bg-[var(--jn-gold)]/15 text-[var(--jn-vermilion-deep)] border-[var(--jn-gold)]/40",
  同事: "bg-[var(--jn-blue)]/10 text-[var(--jn-blue)] border-[var(--jn-blue)]/30",
};

export default function VlogScriptClientPage({
  scriptId,
}: {
  scriptId: string;
}) {
  const script = SCRIPTS[scriptId];
  if (!script) {
    notFound();
  }

  const accentRaw = COLOR_VAR[script.color];
  const accentBg = COLOR_BG_CLASS[script.color];
  const accentText = COLOR_TEXT_CLASS[script.color];
  const accentBorder = COLOR_BORDER_CLASS[script.color];

  return (
    <main
      className="min-h-screen text-[var(--jn-ink)]"
      style={{
        background:
          "linear-gradient(180deg, var(--jn-paper) 0%, var(--jn-paper-warm) 100%)",
      }}
    >
      {/* ───────── 頂部 Hero (劇本封面區塊 · 2026-07-12 聖上拍板加強) ───────── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: "var(--jn-gradient-1)",
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 30%, var(--jn-paper) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--jn-paper) 0%, transparent 50%)",
             }} />
        {/* 印章 chip · 朱紅底白字, 浮在左上 */}
        <div className="absolute top-6 right-6 sm:top-10 sm:right-10 z-10 hidden sm:block">
          <div
            className="px-3 py-2 rounded-md text-[10px] font-bold tracking-widest text-center leading-tight shadow-lg"
            style={{
              background: "var(--jn-vermilion)",
              color: "var(--jn-paper)",
              fontFamily: "var(--font-noto-serif-tc), serif",
              border: "2px solid var(--jn-paper)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            劇本
            <br />
            <span className="text-2xl">{script.id}</span>
          </div>
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-[var(--jn-paper)]">
          <Link
            href="/vlog"
            className="inline-block text-sm text-[var(--jn-paper)]/85 hover:text-[var(--jn-paper)] mb-6"
          >
            ← 回到 4 劇本比較
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase sm:hidden"
              style={{
                background: "var(--jn-vermilion)",
                color: "var(--jn-paper)",
                fontFamily: "var(--font-noto-serif-tc), serif",
              }}
            >
              劇本 {script.id} · 4 選 1
            </span>
            <span
              className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase"
              style={{
                background: "rgba(250,250,249,0.2)",
                color: "var(--jn-paper)",
                border: "1px solid rgba(250,250,249,0.5)",
                fontFamily: "var(--font-noto-serif-tc), serif",
              }}
            >
              4 選 1 · 江南 8 日 vlog 劇本
            </span>
          </div>
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-black mb-4 leading-[1.1] tracking-wide"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {script.name}
          </h1>
          <p
            className="text-lg sm:text-xl text-[var(--jn-paper)]/95 max-w-3xl leading-relaxed"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {script.tagline}
          </p>
          {script.storyArc && !script.storyArc.startsWith("（待填") && (
            <p
              className="mt-5 text-sm sm:text-base text-[var(--jn-paper)]/85 italic border-l-4 border-[var(--jn-paper)]/40 pl-3 max-w-3xl"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              {script.storyArc}
            </p>
          )}
          {/* 🆕 整劇本 ZIP 下載按鈕 — 聖上去杭州前一鍵備齊 8 PDF */}
          <div className="mt-6 flex flex-wrap gap-3">
            <ScriptZipDownload scriptId={script.id} scriptName={script.name} />
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300" />
      </header>

      {/* ───────── 角色表 (13 人) ───────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              color: accentRaw,
            }}
          >
            角色表 · 13 人
          </h2>
          <span
            className="text-xs text-[var(--jn-ink)]/60 tracking-wider"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            CAST
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CHARACTERS_13.map((c, idx) => (
            <div
              key={`${c.name}-${idx}`}
              className="rounded-xl bg-[var(--jn-paper)] border border-[var(--jn-ink)]/10 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  className="text-base sm:text-lg font-bold text-[var(--jn-ink)]"
                  style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                >
                  {c.name}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
                    FAMILY_CHIP_BG[c.family]
                  }`}
                  style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                >
                  {c.family}
                </span>
              </div>
              <p
                className="text-sm text-[var(--jn-ink)]/70"
                style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
              >
                {c.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 8 日行程時間線 ───────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              color: accentRaw,
            }}
          >
            8 日行程時間線 · 7/17 ~ 7/24
          </h2>
          <span
            className="text-xs text-[var(--jn-ink)]/60 tracking-wider"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            TIMELINE
          </span>
        </div>

        <ol className="relative">
          {/* 中軸線 */}
          <div
            className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: accentRaw, opacity: 0.25 }}
            aria-hidden
          />
          {script.dayBlocks.map((d, idx) => (
            <li key={d.date} className="relative pl-12 sm:pl-16 pb-6 last:pb-0">
              {/* 時間軸節點 */}
              <div
                className={`absolute left-1.5 sm:left-3 top-2 w-5 h-5 rounded-full ${accentBg} ring-4 ring-[var(--jn-paper)] shadow`}
                style={{ backgroundColor: accentRaw }}
                aria-hidden
              />
              <div
                className={`rounded-xl bg-[var(--jn-paper)] border-2 ${accentBorder} p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow`}
                style={{ borderColor: accentRaw + "55" }}
              >
                {/* 日期 + 主題 + 下載按鈕 */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3
                    className={`text-lg sm:text-xl font-bold ${accentText}`}
                    style={{
                      fontFamily: "var(--font-noto-serif-tc), serif",
                      color: accentRaw,
                    }}
                  >
                    {d.label}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs text-[var(--jn-ink)]/55 font-mono"
                      style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                    >
                      {d.date}
                    </span>
                    {/* 📄 每天下載 PDF 按鈕 (聖上 7-11 拍板) */}
                    <DayPdfExport
                      dayBlock={d}
                      scriptId={scriptId}
                      scriptName={script.name}
                      dayIdx={idx + 1}
                      date={d.date}
                      accentColor={accentRaw}
                      accentText={accentText}
                    />
                  </div>
                </div>
                {d.theme && !d.theme.startsWith("（待填") && (
                  <p
                    className="text-sm italic text-[var(--jn-ink)]/70 mb-3 border-l-2 pl-2"
                    style={{
                      borderColor: accentRaw,
                      fontFamily: "var(--font-noto-serif-tc), serif",
                    }}
                  >
                    主軸：{d.theme}
                  </p>
                )}

                {/* 4 個欄位 */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <BlockRow label="主要場景" value={d.scenes} />
                  <BlockRow label="主要角色" value={d.mainCharacters} />
                  <DialogueWithScenes dialogue={d.dialogue} shotsText={d.shots} />
                </dl>

                {/* 鏡頭腳本 + AI 生圖清單（混合欄位） */}
                <ShotsWithAiImages
                  shotsText={d.shots}
                  accentText={accentText}
                  accentBorder={accentBorder}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── 底部返回 ───────── */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-xl bg-[var(--jn-paper)] border border-[var(--jn-ink)]/10 p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className="text-sm text-[var(--jn-ink)]/60 mb-1"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              看完了嗎？
            </p>
            <p
              className="text-base font-bold text-[var(--jn-ink)]"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              回去看看另外兩個劇本
            </p>
          </div>
          <Link
            href="/vlog"
            className="inline-block px-5 py-2.5 rounded-full text-sm font-medium text-[var(--jn-paper)] shadow-md hover:shadow-lg transition-shadow"
            style={{
              backgroundColor: accentRaw,
              fontFamily: "var(--font-noto-serif-tc), serif",
            }}
          >
            ← 回到 4 劇本比較
          </Link>
        </div>
      </footer>
    </main>
  );
}

function BlockRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="text-xs uppercase tracking-wider text-[var(--jn-vermilion)]/80 font-semibold mb-1"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        {label}
      </dt>
      <dd
        className="text-sm text-[var(--jn-ink)]/90 whitespace-pre-line leading-relaxed"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        {value}
      </dd>
    </div>
  );
}

// 鏡頭腳本（純文字版）
// 注意：AI 生圖清單已搬到對白下方（DialogueWithScenes 配對渲染）
// 這裡只保留鏡頭腳本文字，圖不再列兩次
function ShotsWithAiImages({
  shotsText,
  accentText,
  accentBorder,
}: {
  shotsText: string;
  accentText: string;
  accentBorder: string;
}) {
  if (!shotsText || shotsText.startsWith("（待填")) {
    return (
      <BlockRow label="鏡頭建議 / AI 生圖" value={shotsText} />
    );
  }

  const lines = shotsText.split("\n").filter((l) => l.trim());
  const cameraShots: { time: string; desc: string }[] = [];
  const aiImageCount = { value: 0 };

  for (const line of lines) {
    // 跳過 AI 生圖行（這些圖已在對白下方配對渲染）
    if (/🖼/.test(line)) {
      aiImageCount.value++;
      continue;
    }
    // 一般鏡頭行
    const camMatch = line.match(/^(\S+)\s+(.+)$/);
    if (camMatch) {
      cameraShots.push({ time: camMatch[1], desc: camMatch[2] });
    } else {
      cameraShots.push({ time: "", desc: line });
    }
  }

  return (
    <div className="mt-4">
      <h3
        className="text-xs uppercase tracking-wider font-semibold mb-2"
        style={{
          color: "var(--jn-vermilion)",
          fontFamily: "var(--font-noto-serif-tc), serif",
        }}
      >
        🎥 鏡頭腳本（{cameraShots.length} 個 shot · {aiImageCount.value} 張 AI 生圖已搬到對白下方）
      </h3>

      <div className="space-y-1">
        {cameraShots.map((s, i) => (
          <div
            key={i}
            className="text-xs text-[var(--jn-ink)]/85 flex gap-2 leading-relaxed"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {s.time && (
              <span className="font-mono text-[var(--jn-vermilion)]/80 flex-shrink-0 font-bold">
                {s.time}
              </span>
            )}
            <span>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 把對白按「場景」切區塊（每個場景以（xxx）開頭），每個場景內對白
// + 把 AI 生圖清單 (從 shotsText 解析) 按 timecode 配對到場景
// 配對邏輯:
//   1. 解析 dialogue → sceneBlocks (按 (xxx) 切)
//   2. 解析 shotsText → aiImages (按 🖼 行切，含 time/model/aspect/src/prompt)
//   3. 按對白順序，每個場景配對「時間範圍內」的 AI 圖
//      場景 N 的時間 = 場景 N 標題的下一行起，到場景 N+1 標題之前
//   4. 渲染時場景下方顯示對應的 AI 圖 (場景 + 對白 + 圖)
function DialogueWithScenes({ dialogue, shotsText }: { dialogue: string; shotsText?: string }) {
  if (!dialogue || dialogue.startsWith("（待填")) {
    return <BlockRow label="主對白方向" value={dialogue} />;
  }

  // 1. 切場景
  const rawBlocks = dialogue
    .split(/\n(?=（[^）]+）)/)
    .filter((b) => b.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      const title = lines[0];
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    });

  // 2. 解析 AI 圖
  const aiImages: { time: string; model: string; aspect: string; src: string | null; prompt: string }[] = [];
  if (shotsText && !shotsText.startsWith("（待填")) {
    for (const line of shotsText.split("\n")) {
      const m = line.match(/^(\S+)\s+🖼\s+(\S+)\s+(\S+)(?:\s+src=([^\s—]+))?\s+—\s+"?(.+?)"?$/);
      if (m) {
        aiImages.push({
          time: m[1],
          model: m[2],
          aspect: m[3],
          src: m[4] || null,
          prompt: m[5],
        });
      }
    }
  }

  // 3. 配對 AI 圖到場景 — 「順序分組」
  //
  // 為什麼不用時間碼配對（原本 sceneTimeMap）：
  //   - 原本 hard-code D1 的 8 個場景關鍵字，D2~D8 場景都不命中
  //   - 維護成本高：每加一天就要補關鍵字
  //
  // 改用「順序分組」：
  //   - dialogue 場景按時間軸順序寫（D1~D8 全劇本統一時間軸）
  //   - shots 內嵌 AI 生圖按時間軸順序排（D1~D8 統一規則）
  //   - 場景 i 配對第 [i * M/N .. (i+1) * M/N) 張圖（M=總圖數, N=場景數）
  //   - 即使不完全 1:1，順序本身已對齊時間軸，視覺連貫
  //
  // 例：D2 有 5 場戲，8 張圖 → 第 1 場拿前 2 張、第 2 場拿接下來 2 張 ... 等

  const nonEmptyScenes = rawBlocks.filter((s) => s.body.length > 0);
  const sceneCount = nonEmptyScenes.length;
  const imageCount = aiImages.length;

  const sceneBlocks = nonEmptyScenes.map((scene, i) => {
    // 第 i 場配對區間 [start, end)
    const start = Math.floor((i * imageCount) / sceneCount);
    const end = Math.floor(((i + 1) * imageCount) / sceneCount);
    const matched = aiImages.slice(start, end);

    return { ...scene, images: matched };
  });

  return (
    <div className="sm:col-span-2">
      <h3
        className="text-xs uppercase tracking-wider text-[var(--jn-vermilion)]/80 font-semibold mb-3"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        🎬 場景對白（{sceneBlocks.length} 場 · 含 {aiImages.length} 張 AI 生圖）
      </h3>
      <div className="space-y-4">
        {sceneBlocks.map((scene, i) => {
          const cleanTitle = scene.title
            .replace(/^（/, "")
            .replace(/）$/, "")
            .trim();
          return (
            <div
              key={i}
              className="rounded-lg border-l-4 pl-4 py-3"
              style={{
                borderColor: "var(--jn-vermilion)",
                background: "var(--jn-paper)",
                fontFamily: "var(--font-noto-serif-tc), serif",
              }}
            >
              <div className="text-sm font-bold text-[var(--jn-vermilion)] mb-2 flex items-center gap-2">
                <span className="text-[var(--jn-gold)]">▸</span>
                <span>{cleanTitle}</span>
              </div>
              <div className="text-sm text-[var(--jn-ink)]/90 whitespace-pre-line leading-relaxed">
                {scene.body}
              </div>

              {/* 此場景對應的 AI 生圖（圖片內嵌在場景對白下方） */}
              {scene.images && scene.images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {scene.images.map((img, j) => (
                    <div
                      key={j}
                      className="rounded-lg border-2 p-2 bg-[var(--jn-blue)]/5"
                      style={{ borderColor: "var(--jn-blue)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                        <span className="font-mono text-[var(--jn-blue)] font-bold">🖼 {img.time}</span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-[var(--jn-blue)] text-[var(--jn-paper)]">
                          {img.model}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono bg-[var(--jn-gold)]/20 text-[var(--jn-vermilion-deep)] border border-[var(--jn-gold)]/40">
                          {img.aspect}
                        </span>
                      </div>
                      {img.src && (
                        <PerImageShare
                          src={img.src}
                          alt={img.prompt}
                          filename={`vlog-${img.src.split("/").pop() || "image.jpg"}`}
                        >
                          <img
                            src={img.src}
                            alt={img.prompt}
                            className="w-full max-w-md h-auto rounded shadow-sm border border-[var(--jn-ink)]/10"
                            style={{ aspectRatio: "1/1", objectFit: "cover" }}
                            loading="lazy"
                          />
                        </PerImageShare>
                      )}
                      <details className="text-[10px] mt-1">
                        <summary className="cursor-pointer text-[var(--jn-blue)] font-semibold select-none hover:underline">
                          📝 prompt
                        </summary>
                        <p className="italic text-[var(--jn-ink)]/70 leading-relaxed font-mono mt-1">
                          {img.prompt}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}