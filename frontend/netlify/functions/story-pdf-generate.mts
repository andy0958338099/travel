/**
 * 🆕 2026-11-16 背景生成客製書 A5 PDF（Netlify standalone function, background）
 *
 * 為什麼是背景 function:
 *   同步 function 上限 60 秒，但完整一本書要逐頁拍
 *   （實測 113 篇的書約 25 秒、12 篇約 21 秒，線上冷啟動還要再加）。
 *   背景 function 有 15 分鐘上限 → 沒有超時風險。
 *
 * 背景 function 立即回 202，實際工作在後台跑：
 *   1. 冪等檢查：Blob key 已經存在就直接結束
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
 * ⚠️ 環境陷阱（實測踩過）:
 *   - 檔名用 .mts → Netlify 打包成 ESM（否則 CJS require ESM 會爆）
 *   - Netlify function 是 Amazon Linux 2（glibc 2.26）→ 必須用 al2.tar.br
 *   - Lambda 沒有 tar 指令 → 自製 tar 解析
 *   - 檔名**不可**以 -background 結尾又同時用 config.background（避免舊命名慣例打架）
 *     → 檔名用 story-pdf-generate.mts，背景模式由 config.background 決定
 *   - **不可**設定 config.path：設定後預設網址 /.netlify/functions/<name> 就不存在
 *     → 觸發端（Next.js route）呼叫的就是預設網址
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
import { parseRange } from "../../src/lib/story-pdf-range";

const BLOB_STORE = "blog-images";
const STATUS_PREFIX = "pdf-status/";
const SITE_FALLBACK = "https://travel-china.netlify.app";

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

  // ⚠️ 打包後的 function 檔案位置不一定固定 → 多個候選根目錄都試一次。
  const here = path.dirname(new URL(import.meta.url).pathname);
  const roots = [
    path.resolve(here, "..", ".."),
    path.resolve(here, ".."),
    process.cwd(),
    "/var/task",
  ];
  let tarPath = "";
  for (const root of roots) {
    const p = path.join(
      root,
      "node_modules",
      "@sparticuz",
      "chromium",
      "bin",
      tarName,
    );
    if (fs.existsSync(p)) {
      tarPath = p;
      break;
    }
  }
  if (!tarPath) {
    throw new Error(
      `找不到 ${tarName}（試過: ${roots.join(", ")}）— @sparticuz/chromium 未正確打包`,
    );
  }

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

/**
 * 取得 Blobs store。
 *
 * ⚠️ 正式站的 function runtime 會由 Netlify 注入 Blobs context
 *    （NETLIFY_BLOBS_CONTEXT），SDK 的 getStore(name) 會自動使用它。
 *    只有在本機執行時才需要明確帶 siteID + token。
 */
async function getStore(): Promise<any> {
  const { getStore: getNetlifyStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) {
    return getNetlifyStore({
      name: BLOB_STORE,
      siteID,
      token,
      apiURL: "https://api.netlify.com",
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
// 主流程
// ============================================================

/** 只接受「自己算出來」的 key 格式，避免被塞任意 key 寫進 Blobs */
const KEY_RE = /^pdf\/[A-Za-z0-9_-]+-[0-9a-f]{16}\.pdf$/;

export default async (req: Request): Promise<Response> => {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const range = url.searchParams.get("range") || "full";

  if (!slug) {
    return Response.json({ error: "Provide slug" }, { status: 400 });
  }

  // ⚠️ key 必須由呼叫端（Next.js route）算好傳進來：
  //    觸發端與下載端點 /api/story-books/pdf 用「同一份資料來源」算 key，
  //    否則 updated_at 來源不同就會分歧 → 寫進去的 PDF 下載端點找不到。
  const keyParam = url.searchParams.get("key");
  if (!keyParam || !KEY_RE.test(keyParam)) {
    return Response.json({ error: "Invalid or missing key" }, { status: 400 });
  }
  const key = keyParam;

  try {
    // 冪等：已經有了就不用重做
    if (await blobExists(key)) {
      await writeStatus(slug, { state: "done", key, cached: true });
      return Response.json({ ok: true, key, cached: true });
    }

    await writeStatus(slug, {
      state: "running",
      key,
      started_at: new Date().toISOString(),
    });

    const { pageRanges } = parseRange(range);
    console.log(`[pdf-gen] slug=${slug} range=${range} key=${key}`);

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
        "--single-process",
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
        process.env.DEPLOY_PRIME_URL || process.env.URL || SITE_FALLBACK;
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

      // 書不存在 / 不是公開 → print 頁不會有內容 → 不要產出垃圾 PDF
      if (!pagesFound) {
        throw new Error("print 頁沒有任何頁面（書不存在或未公開）");
      }

      const { loaded, total, waitedMs } = await forceLoadAllImages(page, 0.8);
      console.log(`[pdf-gen] images ${loaded}/${total} after ${waitedMs}ms`);

      await waitForBookReady(page);
      await new Promise((r) => setTimeout(r, 2000));

      // ⚠️ 🆕 2026-11-18 拍版前最後確認字型就緒
      //   使用者回報「輸出 PDF 的時候變成亂碼的字」——
      //   根因是標題用系統字體（macOS 才有），線上 Linux 沒有 → 豆腐字。
      //   已改為自帶 Noto Sans TC 子集（PrintSansTC）+ 明確 fonts.load()，
      //   這裡再當最後一道保險：字型還沒好就中止，寧可失敗也不要產出壞 PDF。
      const fontOk = await page.evaluate(async () => {
        const fonts = (document as any).fonts;
        if (!fonts) return true;
        await Promise.all([
          fonts.load('400 16px "PrintSerifTC"', "測試中文"),
          fonts.load('700 16px "PrintSerifTC"', "測試中文"),
          fonts.load('400 16px "PrintSansTC"', "測試中文"),
          fonts.load('700 16px "PrintSansTC"', "測試中文"),
          // 🆕 2026-11-18 補丁字型（emoji / 簡體 / 數學花體 / 符號）
          fonts.load('400 16px "PrintEmoji"', "✈️⏱✅🎬📍"),
          fonts.load('400 16px "PrintSansSC"', "刚围应栅标缝阖静"),
          fonts.load('400 16px "PrintSansMath"', "𝓓𝓪𝔂"),
          fonts.load('400 16px "PrintSansSymbols2"', "➔➕❗❤"),
        ]).catch(() => undefined);
        await fonts.ready;
        return (
          fonts.check('400 16px "PrintSerifTC"', "測試中文") &&
          fonts.check('700 16px "PrintSansTC"', "測試中文")
        );
      });
      if (!fontOk) {
        throw new Error(
          "webfont 未就緒（PrintSerifTC / PrintSansTC）— 中止以避免產出豆腐字 PDF",
        );
      }
      console.log("[pdf-gen] webfonts ready ✓");

      const pdfBuffer = await generatePdfPerPage(page, pageRanges);
      console.log(`[pdf-gen] pdf ${pdfBuffer.length} bytes`);

      const store = await getStore();
      // ⚠️ contentType 要放 metadata（跟 scripts/upload-pdfs-to-blobs.mjs 一致），
      //    set() 的 options 沒有頂層 type 欄位。
      await store.set(key, pdfBuffer as any, {
        metadata: { contentType: "application/pdf" },
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

/**
 * ⚠️ 不可設定 path：
 *   設定後 function 只在該路徑可用，/.netlify/functions/story-pdf-generate 會 404，
 *   而觸發端（Next.js route）呼叫的就是預設網址。
 * ⚠️ 不可設定 memory：站台方案不含 credit-based features，設定 memory 會被拒。
 */
export const config: Config = {
  background: true,
};
