"use client";

/**
 * DayPdfExport — 每天劇本下載 PDF 按鈕
 *
 * 2026-07-11 聖上拍板 v2: 不允許區塊被切兩半 (場景對白/圖片/鏡頭表)
 * 把 day 拆成多個邏輯區塊陣列, 每個區塊獨立 render canvas,
 * 區塊 height > 當前頁剩餘高度時 → addPage() 然後整塊放新頁
 *
 * 區塊結構:
 *   1. header (劇本頭 + 主題 + 主要場景/角色) — 必放第 1 頁
 *   2. N 個 scene (場景對白 + 配對 AI 生圖) — 場景內圖文綁在一起, 不可分割
 *   3. shots (鏡頭腳本) — 太長就分批 (每 ~5 shot 一塊)
 *   4. footer
 *
 * 圖片策略: 走 __IMG_BASE64__:day{N}/img-XX__ placeholder → preloadImages 預載 → 全部替換
 */

import { useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { DayBlock } from "../data";

export interface DayPdfExportProps {
  dayBlock: DayBlock;
  scriptId: string;
  scriptName: string;
  dayIdx: number;
  date: string;
  accentColor: string;
  accentText: string;
}

const PDF_WIDTH_PX = 794; // A4 width @ 96dpi

// 手機 / 平板偵測: 螢幕窄 + 觸控優先 → 降低 PDF 解析度節省解碼時間
// 手機 html2canvas scale:2 解碼 8 張 2K 圖會卡 30-60s, 降到 1 可降至 5-10s
function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  // userAgent 標準偵測 (涵蓋 iOS / Android)
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  // 觸控優先 + 螢幕 < 768 視為手機
  if (typeof window !== "undefined" && window.matchMedia) {
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const isNarrow = window.matchMedia("(max-width: 768px)").matches;
    if (isCoarse && isNarrow) return true;
  }
  return false;
}

// ─────────────────────────────────────────────
// 解析輔助
// ─────────────────────────────────────────────

function parseAiprompts(shotsText: string): { time: string; src: string; prompt: string }[] {
  const out: { time: string; src: string; prompt: string }[] = [];
  if (!shotsText || shotsText.startsWith("（待填")) return out;
  for (const line of shotsText.split("\n")) {
    const m = line.match(
      /^(\S+)\s+🖼\s+\S+\s+\S+(?:\s+src=(\S+))?\s+—\s+"?(.+?)"?\s*$/
    );
    if (m) {
      out.push({ time: m[1], src: m[2] || "", prompt: m[3] });
    }
  }
  return out;
}

function parseCameraShots(shotsText: string): { time: string; desc: string }[] {
  if (!shotsText || shotsText.startsWith("（待填")) return [];
  const out: { time: string; desc: string }[] = [];
  for (const line of shotsText.split("\n").filter((l) => l.trim())) {
    if (/🖼/.test(line)) continue;
    const m = line.match(/^(\S+)\s+(.+)$/);
    out.push(m ? { time: m[1], desc: m[2] } : { time: "", desc: line });
  }
  return out;
}

function parseDialogueScenes(dialogue: string): { title: string; body: string }[] {
  if (!dialogue || dialogue.startsWith("（待填")) return [];
  return dialogue
    .split(/\n(?=（[^）]+）)/)
    .filter((b) => b.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      return { title: lines[0], body: lines.slice(1).join("\n").trim() };
    });
}

// ─────────────────────────────────────────────
// Base64 預載
// ─────────────────────────────────────────────

async function preloadImages(html: string): Promise<string> {
  const matches = Array.from(html.matchAll(/__IMG_BASE64__:([^_]+)__/g));
  const replaces = await Promise.all(
    matches.map(async (m) => {
      const placeholder = m[0];
      const relPath = m[1];
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/vlog/${relPath}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`[DayPdfExport] 圖片 fetch 失敗 ${resp.status}: ${url}`);
          return { placeholder, base64: "" };
        }
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { placeholder, base64 };
      } catch (e) {
        console.warn(`[DayPdfExport] 圖片 fetch 例外:`, e);
        return { placeholder, base64: "" };
      }
    })
  );
  let result = html;
  for (const { placeholder, base64 } of replaces) {
    if (base64) result = result.replace(placeholder, base64);
  }
  const remaining = (result.match(/__IMG_BASE64__:/g) || []).length;
  console.log(
    `[DayPdfExport] preloadImages: ${matches.length - remaining}/${matches.length} 圖片 base64 預載完成`
  );
  return result;
}

// ─────────────────────────────────────────────
// 區塊 HTML 構造 (每個區塊獨立一塊, 不可分割)
// ─────────────────────────────────────────────

const FONT_STACK = `-apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif`;

function wrapBlock(inner: string): string {
  return `<div style="
    font-family: ${FONT_STACK};
    width: ${PDF_WIDTH_PX}px;
    padding: 0 36px;
    background: #ffffff;
    color: #1e293b;
    box-sizing: border-box;
  ">${inner}</div>`;
}

function buildHeaderBlock(
  dayBlock: DayBlock,
  scriptId: string,
  scriptName: string,
  dayIdx: number,
  date: string,
  accentColor: string
): string {
  return wrapBlock(`
  <div style="padding-top: 24px; border-bottom: 3px solid ${accentColor}; padding-bottom: 10px; margin-bottom: 14px;">
    <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px;">
      <span style="font-size: 32px; font-weight: 900; color: ${accentColor}; opacity: 0.9; line-height: 1;">${scriptId}</span>
      <span style="font-size: 12px; padding: 3px 12px; border-radius: 999px; background: ${accentColor}; color: #ffffff; font-weight: 700; letter-spacing: 0.1em;">劇本 ${scriptId}</span>
    </div>
    <div style="font-size: 19px; font-weight: 800; color: #1e293b; margin-bottom: 4px; line-height: 1.3;">${scriptName}</div>
    <div style="font-size: 12px; color: #666; font-weight: 500;">
      Day ${dayIdx} · ${dayBlock.label} · ${date}
    </div>
  </div>

  ${
    dayBlock.theme && !dayBlock.theme.startsWith("（待填")
      ? `<div style="font-size: 12px; color: #555; font-style: italic; margin-bottom: 12px; padding: 8px 12px; border-left: 3px solid ${accentColor}; background: #fafaf9; border-radius: 4px; line-height: 1.6;">
        <span style="color: ${accentColor}; font-weight: 700; font-style: normal;">主軸 ·</span> ${dayBlock.theme}
      </div>`
      : ""
  }

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
    <div style="background: #f5f5f4; padding: 9px 12px; border-radius: 6px; border-left: 3px solid ${accentColor};">
      <div style="font-size: 10px; font-weight: 700; color: ${accentColor}; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.1em;">主要場景</div>
      <div style="font-size: 12px; line-height: 1.6; color: #333;">${dayBlock.scenes || "（無）"}</div>
    </div>
    <div style="background: #f5f5f4; padding: 9px 12px; border-radius: 6px; border-left: 3px solid ${accentColor};">
      <div style="font-size: 10px; font-weight: 700; color: ${accentColor}; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.1em;">主要角色</div>
      <div style="font-size: 12px; line-height: 1.6; color: #333;">${dayBlock.mainCharacters || "（無）"}</div>
    </div>
  </div>

  <div style="font-size: 14px; font-weight: 800; color: ${accentColor}; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid ${accentColor};">
    🎬 場景對白
  </div>
`);
}

function buildSceneBlock(
  scene: { title: string; body: string },
  _sceneIdx: number, // 不顯示, 編號無意義
  imgs: { time: string; src: string; prompt: string }[],
  accentColor: string,
  isFirst: boolean
): string {
  const cleanTitle = scene.title.replace(/^（/, "").replace(/）$/, "");
  const imgHtml = imgs.length === 0
    ? ""
    : imgs
        .map(
          (img) => `
        <div style="margin: 10px 0 0; padding: 6px 6px 8px; border: 1px solid ${accentColor}22; border-radius: 6px; background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.05); text-align: center;">
          <div style="font-size: 9.5px; color: ${accentColor}; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.05em;">
            🖼 ${img.time}
          </div>
          ${
            img.src
              ? `<img src="${img.src}" style="width: 100%; max-width: 240px; max-height: 240px; object-fit: contain; border-radius: 4px; display: inline-block; box-shadow: 0 1px 4px rgba(0,0,0,0.08); background: #f5f5f4;" crossorigin="anonymous" />`
              : ""
          }
        </div>`
        )
        .join("");

  return wrapBlock(`
  <div style="margin: ${isFirst ? "0" : "12px"} 0 0; padding: 12px 14px; border-left: 4px solid ${accentColor}; background: #fafaf9; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
    <div style="font-size: 15px; font-weight: 800; color: ${accentColor}; margin-bottom: 8px; line-height: 1.4; display: flex; align-items: center; gap: 8px;">
      <span style="display: inline-block; padding: 2px 8px; background: ${accentColor}; color: #ffffff; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em;">場景</span>
      <span>${cleanTitle}</span>
    </div>
    <div style="font-size: 12.5px; line-height: 1.75; color: #1e293b; white-space: pre-wrap;">${scene.body}</div>
    ${imgHtml}
  </div>
`);
}

// 場景對 (兩欄並排) — 一個 block 內含左右兩個場景卡片
function buildScenePairBlock(
  leftScene: { title: string; body: string } | null,
  leftIdx: number | null,
  leftImgs: { time: string; src: string; prompt: string }[],
  rightScene: { title: string; body: string } | null,
  rightIdx: number | null,
  rightImgs: { time: string; src: string; prompt: string }[],
  accentColor: string
): string {
  const renderCard = (
    scene: { title: string; body: string },
    _idx: number | null,
    imgs: { time: string; src: string; prompt: string }[]
  ): string => {
    const cleanTitle = scene.title.replace(/^（/, "").replace(/）$/, "");
    const imgHtml = imgs.length === 0
      ? ""
      : imgs
          .map(
            (img) => `
        <div style="margin: 8px 0 0; padding: 5px 5px 6px; border: 1px solid ${accentColor}22; border-radius: 5px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.04); text-align: center;">
          <div style="font-size: 8.5px; color: ${accentColor}; font-weight: 700; margin-bottom: 3px; letter-spacing: 0.05em;">
            🖼 ${img.time}
          </div>
          ${
            img.src
              ? `<img src="${img.src}" style="width: 100%; max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 3px; display: inline-block; background: #f5f5f4;" crossorigin="anonymous" />`
              : ""
          }
        </div>`
          )
          .join("");

    return `
    <div style="width: calc(50% - 5px); padding: 10px 12px; border-left: 3px solid ${accentColor}; background: #fafaf9; border-radius: 4px; box-sizing: border-box;">
      <div style="font-size: 12.5px; font-weight: 800; color: ${accentColor}; margin-bottom: 6px; line-height: 1.4; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; padding: 2px 6px; background: ${accentColor}; color: #ffffff; border-radius: 2px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em;">場景</span>
        <span>${cleanTitle}</span>
      </div>
      <div style="font-size: 11px; line-height: 1.7; color: #1e293b; white-space: pre-wrap;">${scene.body}</div>
      ${imgHtml}
    </div>`;
  };

  return wrapBlock(`
  <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; margin: 10px 0 0;">
    ${leftScene ? renderCard(leftScene, leftIdx, leftImgs) : ""}
    ${rightScene ? renderCard(rightScene, rightIdx, rightImgs) : ""}
  </div>
`);
}

function buildShotsHeaderBlock(accentColor: string, _totalShots: number): string {
  return wrapBlock(`
  <div style="font-size: 14px; font-weight: 800; color: ${accentColor}; margin: 14px 0 8px; padding-top: 10px; padding-bottom: 5px; border-top: 2px solid ${accentColor}; border-bottom: 1px solid ${accentColor}33;">
    🎥 鏡頭腳本
  </div>
`);
}

// 鏡頭腳本分塊: 每塊 6 個 shot (避免單塊太長被切)
function buildShotsChunkBlock(
  shots: { time: string; desc: string }[],
  accentColor: string
): string {
  const shotsHtml = shots
    .map(
      (s) => `
    <div style="display: flex; gap: 8px; font-size: 11px; line-height: 1.55; margin: 3px 0; padding: 2px 0; border-bottom: 1px dotted #e5e7eb;">
      ${s.time ? `<span style="font-family: 'SF Mono', 'Menlo', monospace; color: ${accentColor}; font-weight: 700; flex-shrink: 0; min-width: 85px;">${s.time}</span>` : ""}
      <span style="color: #333; flex: 1;">${s.desc}</span>
    </div>`
    )
    .join("");

  return wrapBlock(`
  <div style="background: #fafaf9; padding: 6px 12px; border-radius: 4px; margin-bottom: 4px;">
    ${shotsHtml}
  </div>
`);
}

function buildFooterBlock(
  scriptId: string,
  scriptName: string,
  dayIdx: number,
  date: string
): string {
  return wrapBlock(`
  <div style="border-top: 1px solid #e5e7eb; padding: 8px 0 16px; margin-top: 10px; text-align: center; font-size: 9px; color: #bbb;">
    Vlog 劇本 ${scriptId} · ${scriptName} · Day ${dayIdx} (${date}) · 江南水鄉八日之旅
  </div>
`);
}

// ─────────────────────────────────────────────
// 把 day 拆成多個獨立 HTML 區塊
// ─────────────────────────────────────────────

interface Block {
  html: string;
  label: string; // debug 用
}

function buildDayBlocks(
  dayBlock: DayBlock,
  scriptId: string,
  scriptName: string,
  dayIdx: number,
  date: string,
  accentColor: string
): Block[] {
  const blocks: Block[] = [];
  const scenes = parseDialogueScenes(dayBlock.dialogue);
  const cameraShots = parseCameraShots(dayBlock.shots);
  const aiImages = parseAiprompts(dayBlock.shots);

  const nonEmptyScenes = scenes.filter((s) => s.body.length > 0);
  const K = nonEmptyScenes.length;
  const M = aiImages.length;
  const sceneImages = nonEmptyScenes.map((_, i) => {
    const start = Math.floor((i * M) / K);
    const end = Math.floor(((i + 1) * M) / K);
    return aiImages.slice(start, end);
  });

  // 1) Header (含場景對白標題, 但實際場景分開 block)
  blocks.push({
    html: buildHeaderBlock(dayBlock, scriptId, scriptName, dayIdx, date, accentColor),
    label: `Day${dayIdx}-header`,
  });

  // 2) 場景兩兩成對 (一對一個 block, 內含 flex 兩欄)
  //    若場景數奇數, 最後單獨一個 block
  for (let i = 0; i < nonEmptyScenes.length; i += 2) {
    const left = nonEmptyScenes[i];
    const right = nonEmptyScenes[i + 1];
    const leftImgs = sceneImages[i] || [];
    const rightImgs = right ? sceneImages[i + 1] || [] : [];
    blocks.push({
      html: buildScenePairBlock(
        left, i + 1, leftImgs,
        right, right ? i + 2 : null, rightImgs,
        accentColor
      ),
      label: `Day${dayIdx}-pair${Math.floor(i / 2) + 1}`,
    });
  }

  // 3) 鏡頭腳本 — header 1 塊 + 每 5 個 shot 一塊
  if (cameraShots.length > 0) {
    blocks.push({
      html: buildShotsHeaderBlock(accentColor, cameraShots.length),
      label: `Day${dayIdx}-shots-header`,
    });
    const CHUNK = 6;
    for (let i = 0; i < cameraShots.length; i += CHUNK) {
      const chunk = cameraShots.slice(i, i + CHUNK);
      blocks.push({
        html: buildShotsChunkBlock(chunk, accentColor),
        label: `Day${dayIdx}-shots-${i / CHUNK + 1}`,
      });
    }
  }

  // 4) Footer
  blocks.push({
    html: buildFooterBlock(scriptId, scriptName, dayIdx, date),
    label: `Day${dayIdx}-footer`,
  });

  return blocks;
}

// ─────────────────────────────────────────────
// Render: 對每個 block 獨立 html2canvas, 累加進 jsPDF
// 區塊若超過當前頁剩餘高度 → addPage() 然後整塊放新頁
// ─────────────────────────────────────────────

async function renderBlockToCanvas(html: string): Promise<{ canvas: HTMLCanvasElement; scale: number }> {
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-3000px;top:0;width:${PDF_WIDTH_PX}px;background:#fff;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  // 等所有 img 載入
  const imgs = container.querySelectorAll("img");
  await Promise.all(
    Array.from(imgs).map(
      (img) =>
        new Promise<void>((resolve) => {
          const el = img as HTMLImageElement;
          if (el.complete && el.naturalWidth > 0) {
            resolve();
          } else {
            el.addEventListener("load", () => resolve());
            el.addEventListener("error", () => resolve());
          }
        })
    )
  );

  // 等字體
  await new Promise((r) => setTimeout(r, 200));

  // 手機降低 scale 節省 html2canvas 解碼時間 (2K 圖 x8 解碼太慢)
  const scale = detectMobile() ? 1 : 2;
  const canvas = await html2canvas(container, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    width: PDF_WIDTH_PX,
    logging: false,
  });

  document.body.removeChild(container);
  return { canvas, scale };
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function DayPdfExport({
  dayBlock,
  scriptId,
  scriptName,
  dayIdx,
  date,
  accentColor,
  accentText: _accentText,
}: DayPdfExportProps) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    if (generating) return;
    setGenerating(true);
    try {
      // 1) 建構所有 block (img.src 已是 Supabase CDN URL, 直接 fetch 載入即可)
      const rawBlocks = buildDayBlocks(
        dayBlock,
        scriptId,
        scriptName,
        dayIdx,
        date,
        accentColor
      );

      // 2) 對每個 block 渲染 canvas (renderBlockToCanvas 內部已 await img 載入)
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PW = pdf.internal.pageSize.getWidth();
      const PH = pdf.internal.pageSize.getHeight();
      const BOTTOM_MARGIN = 6; // mm
      // 手機 jpeg 0.85, 電腦 jpeg 0.92 (品質稍降但 PDF 檔小很多)
      const isMobile = detectMobile();
      const jpegQuality = isMobile ? 0.85 : 0.92;
      // canvas scale (1 或 2) 跟 mm 換算動態處理 (renderBlockToCanvas 回傳)
      const mmPerCanvasPx = PW / (PDF_WIDTH_PX * (isMobile ? 1 : 2));

      let currentY = 0; // mm, 當前頁已用高度
      let isFirstBlock = true;

      for (let i = 0; i < rawBlocks.length; i++) {
        const { html, label } = rawBlocks[i];
        const { canvas } = await renderBlockToCanvas(html);
        const blockHeightMm = canvas.height * mmPerCanvasPx;

        // 換頁邏輯:
        //   1) 單一區塊本身就 > 頁高 → 強制 addPage 放新頁
        //   2) 一般情況: 當前頁剩餘空間 < 區塊高 → addPage 然後整塊放新頁
        // 聖上要求: 場景對白/圖片/鏡頭表不能被切兩半
        const needNewPage =
          blockHeightMm > PH - BOTTOM_MARGIN * 2 || // 區塊本身就太滿
          (!isFirstBlock && currentY + blockHeightMm > PH - BOTTOM_MARGIN);

        if (needNewPage) {
          pdf.addPage();
          currentY = 0;
        }

        const imgData = canvas.toDataURL("image/jpeg", jpegQuality);
        pdf.addImage(imgData, "JPEG", 0, currentY, PW, blockHeightMm);
        currentY += blockHeightMm;
        isFirstBlock = false;
      }

      const safeLabel = dayBlock.label.replace(/[\\/:*?"<>|]/g, "_");
      pdf.save(`Vlog_${scriptId}_Day${dayIdx}_${safeLabel}_${date}.pdf`);
    } catch (e) {
      console.error("[DayPdfExport] error:", e);
      alert(
        "PDF 生成失敗, 請重新嘗試\n" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={generating}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50`}
      style={{
        background: "var(--jn-paper)",
        color: accentColor,
        border: `2px solid ${accentColor}`,
        fontFamily: "var(--font-noto-serif-tc), serif",
      }}
      title={`下載 Day ${dayIdx} 完整劇本 PDF`}
    >
      {generating ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>生成中...</span>
        </>
      ) : (
        <>
          <span>📄</span>
          <span>下載 Day {dayIdx} 劇本</span>
        </>
      )}
    </button>
  );
}
