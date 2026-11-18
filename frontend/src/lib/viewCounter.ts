/**
 * 🆕 2026-11-17 讀取客製書瀏覽次數（Next.js route 側）
 *
 * 背景：Supabase 專案被 spend cap 限制（402 exceed_cached_egress_quota），
 *   原本的 `increment_book_view_count` RPC 每個預覽請求都會噴錯。
 *   現在計數改由 Netlify Blobs 負責（見 viewCounterCore.ts + background function）。
 *
 * 這支只負責「讀」：
 *   寫入交給 standalone background function `story-view-count`，
 *   因為同步做 compare-and-swap 會拖慢預覽（Blob 讀寫各約 500ms）
 *   且併發時重試可能撞 function 時間上限。
 *
 * ⚠️ 讀取必須走 REST API + node:https（不可用 SDK 的 store.get()）：
 *    Next.js 會 patch global fetch，SDK 走 patched fetch 會卡住不返回
 *    （實測約 180 秒 → 正式站 502）。blobPdf.ts 的 getBlobText 已處理這件事。
 */

import { getBlobText } from "@/lib/blobPdf";
import {
  readViewCountWithEtag,
  viewCountKey,
  VIEW_COUNT_STORE,
} from "@/lib/viewCounterCore";

/**
 * 讀某本書目前的瀏覽次數。
 * 回傳 null 表示「讀不到」（沒有計數檔或讀取失敗）。
 */
export async function readViewCount(slug: string): Promise<number | null> {
  try {
    const raw = await getBlobText(viewCountKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { count?: number };
    return typeof parsed.count === "number" ? parsed.count : null;
  } catch (e) {
    console.error("[viewCounter] 讀取失敗:", (e as Error).message);
    return null;
  }
}

/**
 * 讀某本書的計數（含 ETag）—— 給需要 CAS 寫入的呼叫端用。
 * ⚠️ 這個會用 SDK 的 getWithMetadata，在 Next.js runtime 可能卡住，
 *    只有 standalone function（無 fetch patch）才適合用。
 */
export async function readViewCountForWrite(slug: string) {
  const { getStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  const store =
    siteID && token
      ? getStore({ name: VIEW_COUNT_STORE, siteID, token })
      : getStore(VIEW_COUNT_STORE);
  return readViewCountWithEtag(store as never, slug);
}
