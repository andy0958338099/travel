/**
 * 🆕 2026-11-16 查詢背景 PDF 生成進度
 *
 * 前端流程:
 *   1. 按「線上生成 A5 PDF」→ POST /story-pdf/generate?slug=X（背景 function，立即 202）
 *   2. 輪詢 GET /story-pdf/status?slug=X → 這支
 *      - state: running / done / error
 *      - ready: PDF 已經在 Blobs（可直接下載）
 *   3. ready=true → 直接下載 /api/story-books/pdf?slug=X（那支會從 Blob 讀）
 *
 * ⚠️ 這支刻意「不打包 Chromium」（只 import @netlify/blobs）→
 *    bundle 只有幾 MB，讀進度很快。
 */

import type { Config } from "@netlify/functions";

const BLOB_STORE = "blog-images";
const API_BASE = "https://api.netlify.com";
const STATUS_PREFIX = "pdf-status/";

async function getStore(): Promise<any> {
  const { getStore: getNetlifyStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getNetlifyStore({
      name: BLOB_STORE,
      siteID,
      token,
      apiURL: API_BASE,
    });
  }
  return getNetlifyStore(BLOB_STORE);
}

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "Provide slug" }, { status: 400 });
  }

  try {
    const store = await getStore();

    // 1) 狀態紀錄
    let status: Record<string, unknown> | null = null;
    try {
      // ⚠️ SDK v11 只有 setJSON，沒有 getJSON → 用 get + JSON.parse
      const raw = await store.get(`${STATUS_PREFIX}${slug}.json`, { type: "text" });
      if (raw) {
        status = JSON.parse(typeof raw === "string" ? raw : String(raw)) as any;
      }
    } catch {
      status = null;
    }

    // 2) PDF 是否已經在 Blob（成功時這就是最可靠的訊號）
    //    ⚠️ key 優先用查詢參數帶入的那個（跟呼叫端算的是同一份），
    //    沒有才用狀態紀錄裡的。
    const keyParam = url.searchParams.get("key");
    const checkKey =
      keyParam && /^pdf\/[A-Za-z0-9_-]+-[0-9a-f]{16}\.pdf$/.test(keyParam)
        ? keyParam
        : (status?.key as string | undefined);
    let ready = false;
    if (checkKey) {
      try {
        const res = await store.get(checkKey, { type: "arrayBuffer" });
        ready = !!res && (res as ArrayBuffer).byteLength > 0;
      } catch {
        ready = false;
      }
    }

    return Response.json({
      slug,
      state: ready ? "done" : (status?.state ?? "idle"),
      ready,
      key: checkKey ?? null,
      bytes: status?.bytes ?? null,
      pages: status?.pages ?? null,
      error: status?.error ?? null,
      started_at: status?.started_at ?? null,
      updated_at: status?.updated_at ?? null,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/story-pdf/status",
};
