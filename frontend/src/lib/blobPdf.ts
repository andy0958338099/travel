/**
 * 從 Netlify Blobs 讀取預生成的客製書 PDF
 *
 * 背景：Netlify serverless 沒有 Chromium / GUI，無法即時用 Puppeteer 生成 PDF。
 *   所以 PDF 在本機（dev server 有系統 Chrome）生成好後，上傳到
 *   Netlify Blobs store `blog-images`，key 格式：
 *
 *     pdf/<share_slug>-<sig>.pdf
 *
 *   sig 與 api/story-books/pdf/route.ts 的快取 key 演算法一致：
 *     sha1(book_id | layout_mode | updated_at | 篇數 | 篇序 | range) 前 16 碼
 *
 * 讀取策略：
 *   1. Netlify Blobs REST API（需要 NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN）
 *      先向 /api/v1/blobs/... 換 signed URL，再用 node:https 抓內容。
 *      為什麼不用 SDK：Next.js 會 patch global fetch，本機 dev 下載數 MB 的
 *      blob 會卡住不返回；node:https 不受 patch 影響。
 *   2. @netlify/blobs SDK（Netlify runtime 有自動注入的 Blobs context，
 *      不需要 token；正式站在沒有 token 時走這條）
 *
 * 讀不到時回 null，由呼叫端退回本機磁碟快取或回 503。
 */

import https from "https";
import { getStore as getNetlifyStore } from "@netlify/blobs";
import { nodeFetch } from "@/lib/netlifyFetch";

const BLOB_STORE = "blog-images";
const API_BASE = "https://api.netlify.com";
/**
 * REST API 的 store 名稱要帶 `site:` 前綴。
 * 沒有前綴 → API 會回 200 給一個指向不存在 key 的 signed URL（實際抓取才 404）。
 * 這是 Netlify Blobs 的已知行為，SDK 內部會自動加。
 */
const REST_STORE = `site:${BLOB_STORE}`;
const SIGNED_URL_ACCEPT = "application/json;type=signed-url";

/**
 * 讀 Blob 的最長等待時間。
 *
 * ⚠️ 為什麼需要:Next.js 會 patch global fetch,
 *    @netlify/blobs SDK 在某些情況下會「卡住不返回」。
 *    沒有 timeout 的話 /api/story-books/pdf-status 會 hang 住,
 *    正式站 (serverless 有硬性執行時間上限) 直接變 502。
 */
const BLOB_READ_TIMEOUT_MS = 8000;

/** 把可能卡住的 promise 包在 timeout 裡 */
async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 取得 Blob store（runtime context 優先，其次明確 siteID/token） */
function getStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getNetlifyStore({
      name: BLOB_STORE,
      siteID,
      token,
      // ⚠️ apiURL 只能到 host，不能帶 /api/v1：
      //   SDK 會自己接 /api/v1/blobs，帶了會變成 /api/v1/api/v1/blobs → 404。
      apiURL: API_BASE,
      // 用 node:https 實作的 fetch，避免 Next.js patch global fetch 造成卡住
      fetch: nodeFetch as unknown as typeof fetch,
    });
  }
  // Netlify runtime：Blobs context 自動注入，SDK 會走 edge URL
  return getNetlifyStore(BLOB_STORE, {
    fetch: nodeFetch as unknown as typeof fetch,
  } as any);
}

// ⚠️ sig 演算法與 key 格式搬到 pdfKey.ts（無 alias 版）。
//   原因:Netlify standalone function 用 esbuild 打包,不吃 tsconfig 的 `@/` alias,
//   那邊也要算出完全一樣的 key → 兩邊共用同一份純函式。
export { normalizeIso, pdfBlobKey } from "@/lib/pdfKey";

/** node:https GET → Buffer（不受 Next.js fetch patch 影響） */
function httpsGetBuffer(
  url: string,
  headers: Record<string, string> = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        headers,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          httpsGetBuffer(res.headers.location, headers).then(resolve, reject);
          return;
        }
        if (status !== 200) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error("request timeout"));
    });
    req.end();
  });
}

/** 走 Netlify Blobs REST API：先換 signed URL，再抓內容 */
async function getViaRestApi(key: string): Promise<Buffer | null> {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) return null;

  const metaUrl = `${API_BASE}/api/v1/blobs/${siteID}/${REST_STORE}/${key}`;
  const meta = await httpsGetBuffer(metaUrl, {
    authorization: `Bearer ${token}`,
    accept: SIGNED_URL_ACCEPT,
  });
  const parsed = JSON.parse(meta.toString("utf-8")) as { url?: string };
  if (!parsed.url) return null;
  return await httpsGetBuffer(parsed.url);
}

/**
 * 讀取 Blob 的文字內容（例如 pdf-status/<slug>.json）。
 * 回傳 null 表示找不到（不是錯誤）。
 *
 * ⚠️ 為什麼不用 SDK 的 store.get()：
 *    在 Next.js route 裡 SDK 走的是被 patch 過的 global fetch，
 *    讀 Blob 會卡住不返回（本機實測約 180 秒 → 正式站 502）。
 *    這裡沿用 getBlobPdf 的 REST API + node:https 路徑，不受 fetch patch 影響。
 */
export async function getBlobText(key: string): Promise<string | null> {
  return withTimeout(
    (async () => {
      if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
        try {
          const siteID = process.env.NETLIFY_SITE_ID;
          const token = process.env.NETLIFY_AUTH_TOKEN;
          const metaUrl = `${API_BASE}/api/v1/blobs/${siteID}/${REST_STORE}/${key}`;
          const meta = await httpsGetBuffer(metaUrl, {
            authorization: `Bearer ${token}`,
            accept: SIGNED_URL_ACCEPT,
          });
          const parsed = JSON.parse(meta.toString("utf-8")) as { url?: string };
          if (!parsed.url) return null;
          const buf = await httpsGetBuffer(parsed.url);
          return buf.toString("utf-8");
        } catch (e) {
          console.error("[blobPdf] REST 文字讀取失敗:", (e as Error).message);
        }
      }

      try {
        const store = getStore();
        const res = await store.get(key, { type: "text" });
        if (res) return typeof res === "string" ? res : String(res);
      } catch (e) {
        console.error("[blobPdf] SDK 文字讀取失敗:", (e as Error).message);
      }

      return null;
    })(),
    BLOB_READ_TIMEOUT_MS,
    `讀取 Blob 文字逾時(${BLOB_READ_TIMEOUT_MS}ms): ${key}`,
  );
}

/**
 * 讀取 PDF。
 * 回傳 null 表示找不到（不是錯誤）。
 *
 * ⚠️ timeout:整段包在 Promise.race 裡。
 *    Next.js 會 patch global fetch,某些路徑會「卡住不返回」。
 *    就算卡住也要在 timeout 內放棄 → route 至少能回應 503,
 *    不會讓整個 status 輪詢 hang 住。
 */
export async function getBlobPdf(key: string): Promise<Buffer | null> {
  return withTimeout(
    (async () => {
      // 1) REST API（有 token 時最可靠，且不受 Next.js fetch patch 影響）
      if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
        try {
          const buf = await getViaRestApi(key);
          if (buf) return buf;
        } catch (e) {
          console.error("[blobPdf] REST 讀取失敗:", (e as Error).message);
        }
      }

      // 2) SDK（Netlify runtime 走這條）
      try {
        const store = getStore();
        const res = await store.get(key, { type: "arrayBuffer" });
        if (res) return Buffer.from(res as ArrayBuffer);
      } catch (e) {
        console.error("[blobPdf] SDK 讀取失敗:", (e as Error).message);
      }

      return null;
    })(),
    BLOB_READ_TIMEOUT_MS,
    `讀取 Blob 逾時(${BLOB_READ_TIMEOUT_MS}ms): ${key}`,
  );
}
