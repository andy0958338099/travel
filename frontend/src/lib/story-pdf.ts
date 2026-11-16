/**
 * 🆕 2026-11-15 抽出共用:客製書 A5 PDF 產生
 *
 * 為什麼抽出來:
 *   - `/api/story-blog/print-pdf` (作者自己按「輸出 PDF」)
 *   - `/api/story-books/pdf`     (公開頁「下載 A5 PDF」,給其他訪客)
 *   - `netlify/functions/story-pdf-generate` (線上即時生成,standalone function)
 *   三邊都需要同一套逐頁拍攝邏輯,不要複製兩份。
 *
 * 🆕 2026-11-16: 頁面渲染核心搬到 `story-pdf-render.ts`
 *   原因:standalone Netlify function 用 esbuild 打包,不吃 tsconfig 的 `@/` alias,
 *   所以共用邏輯必須放在「相對 import + 無 alias」的 module 裡。
 *   這裡只保留「本機用系統 Chrome 啟動瀏覽器」的部分。
 *
 * 核心限制:
 *   本機走系統 Chrome;線上正式站走 standalone function + @sparticuz/chromium。
 */

import { existsSync } from "fs";
import { parseRange } from "@/lib/story-pdf-range";
import {
  forceLoadAllImages,
  generatePdfPerPage,
  waitForBookReady,
} from "@/lib/story-pdf-render";

/**
 * 找系統安裝的 Chrome/Chromium。
 * Puppeteer 下載的 Chrome for Testing 在部分環境解壓不完整(缺 Frameworks → dlopen 失敗),
 * 因此優先使用系統 Chrome,找不到才讓 Puppeteer 用自己的下載版。
 */
export function findSystemChrome(): string | undefined {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

/**
 * 產生一本客製書的完整 A5 PDF。
 *
 * @param origin  目標頁的 origin(例: http://localhost:3000)
 * @param slug    客製書 share_slug
 * @param range   "full" 或 "1-30" 之類
 */
export async function renderBookPdf({
  origin,
  slug,
  range,
}: {
  origin: string;
  slug: string | null;
  range: string | null;
}): Promise<Buffer> {
  const { pageRanges } = parseRange(range);
  // slug 有 → 拍個人化客製書預覽頁;沒有 → 拍原本的整本印刷模式
  const targetUrl = slug
    ? `${origin}/story-blog-custom/preview/${encodeURIComponent(
        slug,
      )}?book_slug=${encodeURIComponent(slug)}&print=1`
    : `${origin}/story-blog-print`;

  // ⚠️ 2026-11-15: puppeteer 是 devDependency，線上 serverless 沒有安裝。
  //   若在 module 頂層 import，整個 route 會在載入時就爆 → HTTP 500 空 body。
  //   改成 lazy dynamic import：只有真的要生成 PDF 時才載入，
  //   載入失敗會被下面的 try/catch 接住 → 回 503 + 明確訊息。
  let browser: any;
  try {
    const { default: puppeteer } = await import("puppeteer");
    browser = await puppeteer.launch({
      headless: true,
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || findSystemChrome(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    // ⚠️ deviceScaleFactor 用 1(不是 2):螢幕端 dsf=2 會讓 render process
    //    記憶體用量翻倍,加速 printToPDF OOM。
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1 });

    page.on("console", (msg: any) => {
      const t = msg.type();
      if (t === "error" || t === "warning") {
        console.log(`[pdf-gen][${t}] ${msg.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (err: Error) => {
      console.log(`[pdf-gen][pageerror] ${err.message.slice(0, 200)}`);
    });

    console.log(`[pdf-gen] goto ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector(".print-book-page", { timeout: 60000 });
    const pagesFound = await page.$$eval(".print-book-page", (els: any) => els.length);
    console.log(`[pdf-gen] found ${pagesFound} .print-book-page`);

    const { loaded, total, waitedMs } = await forceLoadAllImages(page, 0.8);
    console.log(`[pdf-gen] images: ${loaded}/${total} loaded after ${waitedMs}ms`);

    await waitForBookReady(page);

    await new Promise((r) => setTimeout(r, 2000));

    console.log(
      `[pdf-gen] generating PDF${pageRanges ? ` pageRanges=${pageRanges}` : " full"}`,
    );

    const pdfBuffer = await generatePdfPerPage(page, pageRanges);
    console.log(`[pdf-gen] done: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
