/**
 * 部落格圖片來源（線上 Netlify Blobs）
 *
 * 背景：Supabase Storage 與 REST 都因 `exceed_cached_egress_quota` 回 402，
 * 線上站會「0 個故事 + 全部破圖」。本地開發靠 `frontend/data/archive/` 的
 * 本機存檔救回圖片，但 Netlify serverless 沒有本機磁碟。
 *
 * 解法：圖片在建置流程外預先上傳到 Netlify Blobs（store: `blog-images`），
 * 線上 route 改讀 Blobs；本地開發仍走磁碟，速度快且不需憑證。
 *
 * key 對照表放在內容快照的 `imageIndex`（postId → blob key），
 * 由 `scripts/export-site-content.mjs` 一併產生，不需在 request 路徑 list()。
 */

import { getSiteContent } from "@/lib/siteContent";

/** Netlify Blobs 的 store 名稱 */
const BLOB_STORE = "blog-images";

/**
 * 取得 Blob store。
 *
 * 優先使用 Netlify 自動注入的 NETLIFY_BLOBS_CONTEXT（內含 siteID + token），
 * 這是官方推薦做法 —— 不需要把 token 寫進環境變數。
 * 若 context 不可用（例如用一般 Node 跑 script），退回明確的 siteID/token。
 */
export async function getBlogBlobStore() {
  const { getStore } = await import("@netlify/blobs");

  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;

  if (siteID && token) {
    return getStore({ name: BLOB_STORE, siteID, token });
  }
  // Netlify runtime 會注入 context，getStore("name") 即可
  return getStore(BLOB_STORE);
}

/**
 * 從 Blob store 取回圖片。
 * 回傳 null 表示找不到（不是錯誤）。
 */
export async function getBlobImage(key: string): Promise<Buffer | null> {
  try {
    const store = await getBlogBlobStore();
    const res = await store.get(key, { type: "arrayBuffer" });
    if (!res) return null;
    return Buffer.from(res as ArrayBuffer);
  } catch (e) {
    console.error("[blogImageSource] Blob 取圖失敗:", (e as Error).message);
    return null;
  }
}

/**
 * 依 post id 從 Blob store 找圖片。
 *
 * key 對照表來自內容快照的 imageIndex，所以不需要 list() 掃整個 store。
 * 回傳 null 表示找不到。
 */
export async function getBlobImageByPostId(
  postId: string
): Promise<Buffer | null> {
  if (!postId || postId.length < 8) return null;
  const content = await getSiteContent();
  const key = content?.imageIndex?.[postId];
  if (!key) return null;
  return getBlobImage(key);
}
