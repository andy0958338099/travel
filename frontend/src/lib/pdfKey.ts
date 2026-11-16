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
 */

import { createHash } from "crypto";

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
  const sig = createHash("sha1")
    .update(
      [
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
  return `pdf/${slug}-${sig}.pdf`;
}
