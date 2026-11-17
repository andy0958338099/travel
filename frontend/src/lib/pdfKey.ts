/**
 * 客製書 PDF 的 Blob key 計算（無 alias、無第三方依賴）
 *
 * 為什麼獨立成 module:
 *   這段演算法有兩個執行環境必須算出「完全一樣」的 key:
 *     1. Next.js route  `/api/story-books/pdf`  — 讀 Blob
 *     2. Netlify standalone function（背景生成）  — 寫 Blob
 *   standalone function 用 esbuild 打包，**不吃 tsconfig 的 `@/` alias**，
 *   所以共用邏輯必須放在相對 import 可達、且不 import `@/` 的 module。
 *
 * 演算法（不可任意修改，會讓線上已上傳的 PDF 全部失效）:
 *   sig = sha1(book_id | layout_mode | normalized_updated_at | 篇數 | 篇序 | range) 前 16 碼
 *   key = pdf/<share_slug>-<sig>.pdf
 *
 * ⚠️ 2026-11-17: 加入 PDF_LAYOUT_VERSION 到 sig。
 *    為什麼:版面組裝規則改變（例如 2026-11-17 把「所有 Day 扉頁排前面、
 *    全部文章堆最後」改成「每個 Day 扉頁緊接本章文章」）時,
 *    書的 updated_at / 篇序 / mode 都沒變 → sig 不變 →
 *    Netlify Blobs 裡那份「舊版排錯的 PDF」會繼續被下載。
 *    把版面版本放進 sig,版面一改,舊 PDF 自然失效並重新生成。
 *    ⚠️ 每改一次版面規則就把 v2 → v3 往上加。
 */

import { createHash } from "crypto";

/**
 * PDF 排版版本。
 * 任何影響「PDF 印出來的樣子」的改動都要 +1,
 * 否則線上會繼續供應舊版排版的 PDF。
 */
export const PDF_LAYOUT_VERSION = "v2-chapter-per-day";

/**
 * 把 updated_at 正規化成 ISO 字串。
 * 快照（JSON）是 ISO 字串，Postgres pooler 可能是 timestamp 字串，
 * 不統一會算出不同的 sig → 線上找不到對應的 Blob。
 */
export function normalizeIso(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

/**
 * 計算 PDF 的 sig（16 碼 hex）。
 *
 * ⚠️ 這是 key 的唯一來源。三個地方都必須算出「完全一樣」的值:
 *   - src/lib/pdfKey.ts          （Next.js route 讀 Blob / 觸發背景生成）
 *   - netlify/functions/...      （背景函式寫 Blob）
 *   - scripts/upload-pdfs-to-blobs.mjs （本機預生成後上傳）
 *   所以腳本那邊是「手動複刻」,改這裡一定要同步改腳本。
 */
export function pdfSig(parts: {
  bookId: string;
  layoutMode: string | null | undefined;
  updatedAt: string | null | undefined;
  postIds: string[];
  range: string;
}): string {
  return createHash("sha1")
    .update(
      [
        PDF_LAYOUT_VERSION,
        parts.bookId,
        parts.layoutMode ?? "",
        normalizeIso(parts.updatedAt),
        parts.postIds.length,
        parts.postIds.join(","),
        parts.range,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

/** 計算 PDF 的 Blob key。 */
export function pdfBlobKey(
  slug: string,
  parts: {
    bookId: string;
    layoutMode: string | null | undefined;
    updatedAt: string | null | undefined;
    postIds: string[];
    range: string;
  },
): string {
  return `pdf/${slug}-${pdfSig(parts)}.pdf`;
}
