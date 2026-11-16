/**
 * 🆕 2026-11-16 背景生成客製書 A5 PDF（Netlify standalone function, background）
 *
 * 為什麼是背景 function:
 *   同步 function 上限 60 秒，但完整一本書要逐頁拍
 *   （實測 113 篇的書約 25 秒、12 篇約 21 秒，線上冷啟動還要再加）。
 *   背景 function 有 15 分鐘上限 → 沒有超時風險。
 *
 * 背景 function 立即回 202，實際工作在後台跑：
 *   1. 算 Blob key → 已存在就直接結束（冪等）
 *   2. 啟動 Chromium → 開**線上正式站**的 print=1 預覽頁
 *      → 等版面定稿 → 逐頁拍 → pdf-lib 合併
 *   3. 上傳 Netlify Blobs: pdf/<slug>-<sig>.pdf
 *   4. 寫狀態到 Blobs: pdf-status/<slug>.json
 *      （前端輪詢這個 key 知道進度；成功時「PDF blob 存在」本身就是最好的訊號）
 *
 * 為什麼渲染線上正式站而不是本機組 HTML:
 *   公開閱讀頁與 PDF 必須是同一份版面 JSX。
 *   直接抓線上 print=1 頁 → 100% 保證與訪客看到的一致。
 *
 * ⚠️ 環境陷阱（實測踩過，細節見 story-pdf-generate.mts 的說明）:
 *   - 檔名用 .mts → Netlify 打包成 ESM（否則 CJS require ESM 會爆）
 *   - Netlify function 是 Amazon Linux 2（glibc 2.26）→ 必須用 al2.tar.br
 *   - Lambda 沒有 tar 指令 → 自製 tar 解析
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Config } from "@netlify/functions";

// ⚠️ 相對 import（不是 `@/`）：standalone function 用 esbuild 打包，不吃 tsconfig alias。
import {
  generatePdfPerPage,
  forceLoadAllImages,
  waitForBookReady,
} from "../../src/lib/story-pdf-render";
import { normalizeIso, pdfBlobKey } from "../../src/lib/pdfKey";
import { parseRange } from "../../src/lib/story-pdf-range";

const BLOB_STORE = "blog-images";
const API_BASE = "https://api.netlify.com";
const STATUS_PREFIX = "pdf-status/";

// ============================================================
// 最小 tar 解壓器（Lambda 沒有 tar 指令）
// ============================================================

function extractTar(buf: Buffer, dest: string): void {
  let off = 0;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const name = header
      .subarray(0, 100)
      .toString("utf8")
      .replace(/\0.*$/, "");
    const sizeStr = header
      .subarray(124, 136)
      .toString("utf8")
      .replace(/\0.*$/, "")
      .trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);
    off += 512;
    if (typeFlag === "0" || typeFlag === "\0") {
      const outPath = path.join(dest, name);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf.subarray(off, off + size));
    }
    off += Math.ceil(size / 512) * 512;
  }
}

/**
 * 準備 Chromium 執行環境。
 *
 * 依 runtime glibc 版本選系統函式庫:
 *   glibc >= 2.33 → al2023.tar.br
 *   glibc <  2.33 → al2.tar.br（Netlify function 實測是 glibc 2.26）
 *
 * ⚠️ @sparticuz/chromium v138 起移除 al2.tar.br → 套件版本鎖 v131。
 */
async function prepareChromiumEnv(): Promise<any> {
  const chromiumMod = await import("@sparticuz/chromium");
  const chromium: any = (chromiumMod as any).default ?? chromiumMod;

  const glibcVer =
    (process.report?.getReport() as any)?.header?.glibcVersionRuntime ?? "";
  const glibcMinor = parseInt(glibcVer.split(".")[1] ?? "0", 10);
  const useAl2023 = glibcMinor >= 33;
  const tarName = useAl2023 ? "al2023.tar.br" : "al2.tar.br";
  const libRoot = useAl2023 ? "/tmp/al2023" : "/tmp/al2";
  const libDir = path.join(libRoot, "lib");
  console.log(`[pdf-gen] glibc=${glibcVer || "unknown"} → ${tarName}`);

  const here = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = path.resolve(here, "..", "..");
  const tarPath = path.join(
    projectRoot,
    "node_modules",
    "@sparticuz",
    "chromium",
    "bin",
    tarName,
  );

  if (!fs.existsSync(path.join(libDir, "libnss3.so"))) {
    fs.mkdirSync(libDir, { recursive: true });
    const tarBuf = zlib.brotliDecompressSync(fs.readFileSync(tarPath));
    extractTar(tarBuf, libRoot);
    console.log(`[pdf-gen] ${tarName} libs extracted`);
  }

  process.env.LD_LIBRARY_PATH = [libDir, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(":");
  chromium.setGraphicsMode = false;
  return chromium;
}

// ============================================================
// Blob 存取
// ============================================================

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

async function blobExists(key: string): Promise<boolean> {
  try {
    const store = await getStore();
    const res = await store.get(key, { type: "arrayBuffer" });
    return !!res && (res as ArrayBuffer).byteLength > 0;
  } catch {
    return false;
  }
}

async function writeStatus(slug: string, status: Record<string, unknown>) {
  try {
    const store = await getStore();
    await store.setJSON(`${STATUS_PREFIX}${slug}.json`, {
      ...status,
      slug,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[pdf-gen] 狀態寫入失敗:", (e as Error).message);
  }
}

// ============================================================
// 讀 book meta（與 api/story-books/pdf/route.ts 的 loadBookMeta 對應）
// ============================================================

type BookMeta = {
  book_id: string;
  title: string | null;
  author_name: string | null;
  layout_mode: string | null;
  selected_post_ids: string[];
  updated_at: string | null;
  is_public: boolean;
};

async function loadBookMeta(slug: string): Promise<BookMeta | null> {
  // 1) Netlify Blobs 快照（線上主路徑）
  try {
    const store = await getStore();
    const raw = await store.get("content/site-content.json", { type: "text" });
    if (raw) {
      const content = JSON.parse(
        typeof raw === "string" ? raw : String(raw),
      ) as { books?: any[] };
      const hit = content.books?.find((b: any) => b.share_slug === slug);
      if (hit) {
        return {
          book_id: hit.book_id,
          title: hit.title,
          author_name: hit.author_name,
          layout_mode: hit.layout_mode,
          selected_post_ids: hit.selected_post_ids || [],
          updated_at: hit.updated_at,
          is_public: hit.is_public !== false,
        };
      }
    }
  } catch (e) {
    console.error("[pdf-gen] Blobs 快照讀取失敗:", (e as Error).message);
  }

  // 2) Supabase pooler（最後後備）
  try {
    const { localQuery } = await import("../../src/lib/localFallback");
    const rows = await localQuery<Record<string, unknown>>(
      "select book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public from custom_story_books where share_slug = $1 limit 1",
      [slug],
    );
    if (rows.length > 0) {
      const r = rows[0] as any;
      return {
        book_id: r.book_id,
        title: r.title,
        author_name: r.author_name,
        layout_mode: r.layout_mode,
        selected_post_ids: r.selected_post_ids || [],
        updated_at: r.updated_at,
        is_public: r.is_public !== false,
      };
    }
  } catch (e) {
    console.error("[pdf-gen] pooler 讀取失敗:", (e as Error).message);
  }

  return null;
}

// ============================================================
// 主流程
// ============================================================

export default async (req: Request): Promise<Response> => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const range = url.searchParams.get("range") || "full";

  if (!slug) {
    return Response.json({ error: "Provide slug" }, { status: 400 });
  }

  try {
    const book = await loadBookMeta(slug);
    if (!book) {
      await writeStatus(slug, { state: "error", error: "Book not found" });
      return Response.json({ error: "Book not found" }, { status: 404 });
    }
    if (book.is_public === false) {
      await writeStatus(slug, { state: "error", error: "Book is not public" });
      return Response.json({ error: "Book is not public" }, { status: 403 });
    }

    const ids = book.selected_post_ids || [];
    const { pageRanges } = parseRange(range);

    // ⚠️ key 由呼叫端（Next.js route）算好傳進來 ——
    //    必須跟下載端點 /api/story-books/pdf 用「同一份資料來源」算出來的 key 一致，
    //    否則寫進去的 PDF 下載端點找不到（updated_at 來源不同就會分歧）。
    const keyParam = url.searchParams.get("key");
    const key =
      keyParam && /^pdf\/[A-Za-z0-9_-]+-[0-9a-f]{16}\.pdf$/.test(keyParam)
        ? keyParam
        : pdfBlobKey(slug, {
            bookId: book.book_id,
            layoutMode: book.layout_mode,
            updatedAt: book.updated_at,
            postIds: ids,
            range,
          });
    console.log(`[pdf-gen] slug=${slug} key=${key}`);

    // 冪等：已經有了就不用重做
    if (await blobExists(key)) {
      await writeStatus(slug, { state: "done", key, cached: true });
      return Response.json({ ok: true, key, cached: true });
    }

    await writeStatus(slug, { state: "running", key, started_at: new Date().toISOString() });

    // Chromium
    const chromium = await prepareChromiumEnv();
    const puppeteerMod = await import("puppeteer-core");
    const puppeteer: any = (puppeteerMod as any).default ?? puppeteerMod;

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      defaultViewport: { width: 800, height: 1200, deviceScaleFactor: 1 },
      executablePath,
      headless: true,
    });
    console.log(`[pdf-gen] browser launched (${Date.now() - startedAt}ms)`);

    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: 800,
        height: 1200,
        deviceScaleFactor: 1,
      });

      // ⚠️ 抓「線上正式站」的 print=1 頁 → 版面與訪客看到的 100% 一致
      const origin =
        process.env.URL ||
        process.env.DEPLOY_PRIME_URL ||
        "https://travel-china.netlify.app";
      const targetUrl = `${origin}/story-blog-custom/preview/${encodeURIComponent(
        slug,
      )}?book_slug=${encodeURIComponent(slug)}&print=1`;
      console.log(`[pdf-gen] goto ${targetUrl}`);

      await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector(".print-book-page", { timeout: 90000 });

      const pagesFound = await page.$$eval(
        ".print-book-page",
        (els: any) => els.length,
      );
      console.log(`[pdf-gen] found ${pagesFound} .print-book-page`);

      const { loaded, total, waitedMs } = await forceLoadAllImages(page, 0.8);
      console.log(`[pdf-gen] images ${loaded}/${total} after ${waitedMs}ms`);

      await waitForBookReady(page);
      await new Promise((r) => setTimeout(r, 2000));

      const pdfBuffer = await generatePdfPerPage(page, pageRanges);
      console.log(`[pdf-gen] pdf ${pdfBuffer.length} bytes`);

      const store = await getStore();
      await store.set(key, pdfBuffer as any, {
        type: "application/pdf",
        metadata: { generatedBy: "netlify-standalone-function" },
      });
      console.log(`[pdf-gen] uploaded → ${key}`);

      await writeStatus(slug, {
        state: "done",
        key,
        bytes: pdfBuffer.length,
        pages: pagesFound,
        ms: Date.now() - startedAt,
      });

      return Response.json({
        ok: true,
        key,
        bytes: pdfBuffer.length,
        pages: pagesFound,
        ms: Date.now() - startedAt,
      });
    } finally {
      try {
        await browser.close();
      } catch {}
    }
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[pdf-gen] 失敗:", msg);
    await writeStatus(slug, { state: "error", error: msg });
    return Response.json(
      { ok: false, error: msg, ms: Date.now() - startedAt },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/story-pdf/generate",
  background: true,
  // Chromium 需要較多記憶體（逐頁拍 + pdf-lib 合併）
  memory: "2048",
};
