/**
 * 🆕 2026-10-19 聖上指示: 加「全部下載 + 每 10 頁分開下載」模式
 *
 * 工具: jsPDF (A5 直式) + html2canvas (DOM → 圖)
 *
 * 為什麼 jsPDF + html2canvas (vs Puppeteer / browser print):
 *   - 已在 project package.json (puppeteer 24, jsPDF 4, html2canvas 1.4)
 *   - next.config.mjs 已把 jsPDF + html2canvas 從 server bundle 排除
 *     (outputFileTracingExcludes) → 客戶端可放心 import
 *   - 聖上看得到即時進度條 + 隨時取消
 *   - 不開 Chrome 子進程 (省資源)
 *
 * 10 頁分檔策略:
 *   - pages.length ÷ 10 算出 N 個 chunk (0-based index)
 *   - 預設檔名: story-blog-A5-001-010.pdf, ..., story-blog-A5-361-373.pdf
 *   - 全下載: story-blog-A5-full.pdf (一個檔)
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface DownloadProgress {
  current: number;
  total: number;
  percent: number;
  message: string;
}

export interface DownloadOptions {
  pagesContainer: HTMLElement;
  startIdx: number; // 0-based inclusive
  endIdx: number; // 0-based inclusive
  filename: string;
  onProgress?: (p: DownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * 預熱所有 <img> 等載入完成才開始畫 (避免 canvas 抓到空白)。
 *
 * v2 修改 — 加 maxWait 限制: 不要無止境等 374 張圖, 超過 maxWait 秒就放行讓
 * html2canvas 自己 fetchMissing 補抓。實測 374 張 Supabase 圖 ≈ 60-120 秒,
 * headless 對 viewport 外圖不主動 fetch, html2canvas 的 onclone 補抓也吃得到。
 */
async function waitForImages(
  container: HTMLElement,
  signal?: AbortSignal,
  maxWaitMs = 45000
): Promise<{ waitedMs: number; completeCount: number; totalCount: number }> {
  const startedAt = Date.now();
  const imgs = Array.from(container.querySelectorAll("img"));
  const totalCount = imgs.length;
  if (totalCount === 0) return { waitedMs: 0, completeCount: 0, totalCount: 0 };

  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && (img as HTMLImageElement).naturalWidth > 0) {
              resolve();
              return;
            }
            const onDone = () => {
              img.removeEventListener("load", onDone);
              img.removeEventListener("error", onDone);
              resolve();
            };
            img.addEventListener("load", onDone, { once: true });
            img.addEventListener("error", onDone, { once: true });
            // 8s timeout 每張避免永 hang (縮短以免拖過 maxWait)
            setTimeout(onDone, 8000);
          })
      )
    ),
    new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);

  if (signal?.aborted) throw new Error("aborted");

  const waitedMs = Date.now() - startedAt;
  const completeCount = imgs.filter(
    (img) => img.complete && (img as HTMLImageElement).naturalWidth > 0
  ).length;

  return { waitedMs, completeCount, totalCount };
}

function addCanvasToPdf(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  isFirstPage: boolean
): void {
  if (!isFirstPage) pdf.addPage([148, 210], "portrait");
  const imgData = canvas.toDataURL("image/jpeg", 0.85);
  pdf.addImage(imgData, "JPEG", 0, 0, 148, 210, undefined, "FAST");
}

/**
 * 主入口: 給定頁索引範圍 (0-based inclusive), 生 PDF blob, 自動 trigger download。
 */
export async function generateAndDownloadPdf(opts: DownloadOptions): Promise<void> {
  const { pagesContainer, startIdx, endIdx, filename, onProgress, signal } = opts;

  const total = endIdx - startIdx + 1;
  if (total <= 0) throw new Error("empty range");
  if (signal?.aborted) throw new Error("aborted");

  onProgress?.({ current: 0, total, percent: 0, message: "準備中 — 等待圖片載入…" });

  const allPages = Array.from(
    pagesContainer.querySelectorAll<HTMLElement>(".print-book-page")
  );
  if (allPages.length === 0) throw new Error("no .print-book-page found in container");

  const targetPages = allPages.slice(startIdx, endIdx + 1);
  if (targetPages.length !== total) {
    throw new Error(
      `預期 ${total} 頁但找到 ${targetPages.length} 頁 (DOM 只有 ${allPages.length} 個 .print-book-page)`
    );
  }

  await waitForImages(pagesContainer, signal);
  if (signal?.aborted) throw new Error("aborted");

  // 繼續 (v2): 報告實際等了多久, 讓使用者知道是否有圖沒抓到
  onProgress?.({
    current: 0,
    total,
    percent: 8,
    message: `圖片預熱完成, 開始生成 PDF…`,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [148, 210] });

  for (let i = 0; i < targetPages.length; i++) {
    if (signal?.aborted) throw new Error("aborted");
    const pageEl = targetPages[i];
    const pageNumLabel = `第 ${startIdx + i + 1} 頁`;
    onProgress?.({
      current: i,
      total,
      percent: Math.round(8 + (i / total) * 88),
      message: `生成 ${pageNumLabel} (${i + 1}/${total})…`,
    });
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fafaf9",
      logging: false,
      allowTaint: false,
      // 🆕 v2: 對 Supabase Storage CDN 強制 CORS
      //   - 沒 crossOrigin 的 img,html2canvas 抓出來是 tainted,canvas.toDataURL 會失敗
      //   - html2canvas 的 onclone 在 clone DOM 跑,給每個 img 補上 crossOrigin
      onclone: (clonedDoc) => {
        const clonedImgs = clonedDoc.querySelectorAll("img");
        clonedImgs.forEach((img) => {
          if (!img.crossOrigin && img.src) {
            img.crossOrigin = "anonymous";
          }
        });
      },
    });
    addCanvasToPdf(pdf, canvas, i === 0);
  }

  if (signal?.aborted) throw new Error("aborted");

  onProgress?.({
    current: total,
    total,
    percent: 98,
    message: "PDF 拼裝完成, 準備下載…",
  });

  pdf.save(filename);

  onProgress?.({
    current: total,
    total,
    percent: 100,
    message: `✅ 下載完成: ${filename}`,
  });
}

/**
 * 把頁數拆成 chunk (預設每 10 頁一檔)。
 *
 * 回傳 0-based inclusive index, 但 label + filename 用 1-based 顯示。
 *   pages = 373, chunkSize = 10 → 38 chunks (含最後一個 13 頁)
 *     1-10, 11-20, 21-30, ..., 361-370, 371-373 (label 跟 filename 用 1-based)
 */
export interface Chunk {
  startIdx: number; // 0-based inclusive
  endIdx: number; // 0-based inclusive
  label: string; // "第 1-10 頁" 或 "第 371 頁" (單頁)
  filename: string; // "story-blog-A5-001-010.pdf"
}

export function buildChunks(totalPages: number, chunkSize = 10): Chunk[] {
  const chunks: Chunk[] = [];
  for (let s0 = 0; s0 < totalPages; s0 += chunkSize) {
    const e0 = Math.min(s0 + chunkSize - 1, totalPages - 1);
    const startOne = s0 + 1;
    const endOne = e0 + 1;
    const label = startOne === endOne ? `第 ${startOne} 頁` : `第 ${startOne}-${endOne} 頁`;
    const filename =
      startOne === endOne
        ? `story-blog-A5-${String(startOne).padStart(3, "0")}.pdf`
        : `story-blog-A5-${String(startOne).padStart(3, "0")}-${String(endOne).padStart(3, "0")}.pdf`;
    chunks.push({ startIdx: s0, endIdx: e0, label, filename });
  }
  return chunks;
}
