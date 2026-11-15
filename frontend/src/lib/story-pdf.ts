/**
 * 🆕 2026-11-15 抽出共用:客製書 A5 PDF 產生
 *
 * 為什麼抽出來:
 *   - `/api/story-blog/print-pdf` (作者自己按「輸出 PDF」)
 *   - `/api/story-books/pdf`     (公開頁「下載 A5 PDF」,給其他訪客)
 *   兩邊都需要同一套 Puppeteer 逐頁拍攝邏輯,不要複製兩份。
 *
 * 核心限制(既有架構,非本次改動):
 *   Netlify serverless 沒有 GUI / puppeteer binary → 線上站點無法即時生成 PDF。
 *   公開下載走「快取」策略: 第一次生成後存檔,後續訪客秒下載。
 */

import { existsSync } from "fs";
import { parseRange } from "@/lib/story-pdf-range";
import { PDFDocument } from "pdf-lib";

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
 * 產生 PDF — 逐頁拍 + pdf-lib 合併。
 *
 * ⚠️ 2026-11-14 實測根因與解法:
 *
 *   問題:Chrome 的 Page.printToPDF 一次輸出超過 ~26 頁就會回
 *         "Protocol error (Page.printToPDF): Printing failed"。
 *         實測 1-26 OK、1-28 FAIL;全新 browser 單獨拍 21-30 仍 FAIL,
 *         但 21-25 與 22-30 OK → 不是累積記憶體,也不是圖片過大
 *         (把圖全部換成 1x1 placeholder 仍然 FAIL)。
 *         用 pageRanges 分塊也無效 — Chrome 仍會排版整份文件。
 *
 *   解法:「逐頁」— 每次只讓一頁可見,其餘 display:none,
 *         並把該頁 page-break-after 設為 auto(否則會多出一張空白 sheet),
 *         單獨拍成 1 頁 PDF,最後用 pdf-lib 合併。
 *         實測 80 頁全數成功,每頁 1 張 sheet,總耗時約 25 秒。
 */
async function generatePdfPerPage(
  page: any,
  pageRanges: string | undefined,
): Promise<Buffer> {
  const pdfOpts = {
    format: "A5" as const,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
    timeout: 120_000,
  };

  const totalPages = await page.evaluate(() => {
    return document.querySelectorAll(".print-book-page").length;
  });

  // 要拍的頁碼清單(1-based)
  let targets: number[];
  if (pageRanges) {
    const [a, b] = pageRanges.split("-").map((x) => parseInt(x, 10));
    targets = [];
    for (let i = a; i <= (b || a); i++) targets.push(i);
  } else {
    targets = Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  console.log(
    `[pdf-gen] per-page mode: ${targets.length} / ${totalPages} pages`,
  );

  const merged = await PDFDocument.create();
  for (const n of targets) {
    // 只顯示第 n 頁;page-break-after 改 auto 避免尾隨空白 sheet
    await page.evaluate((n: number) => {
      document.querySelectorAll(".print-book-page").forEach((el, i) => {
        const keep = i + 1 === n;
        (el as HTMLElement).style.display = keep ? "" : "none";
        (el as HTMLElement).style.pageBreakAfter = keep ? "auto" : "";
        (el as HTMLElement).style.breakAfter = keep ? "auto" : "";
      });
    }, n);

    let chunkBuf: Buffer | null = null;
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        chunkBuf = Buffer.from(await page.pdf(pdfOpts));
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.warn(
          `[pdf-gen] page ${n} attempt ${attempt} failed: ${(e as Error).message?.slice(0, 80)}`,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!chunkBuf) {
      throw new Error(
        `PDF 第 ${n} 頁生成失敗(重試 3 次): ${(lastErr as Error)?.message ?? "unknown"}`,
      );
    }

    const src = await PDFDocument.load(chunkBuf);
    const idx = src.getPageIndices();
    if (idx.length !== 1) {
      console.warn(
        `[pdf-gen] page ${n} produced ${idx.length} sheets (expected 1)`,
      );
    }
    const copied = await merged.copyPages(src, idx);
    copied.forEach((p) => merged.addPage(p));
  }

  // 還原所有頁面顯示(避免影響後續操作)
  await page.evaluate(() => {
    document.querySelectorAll(".print-book-page").forEach((el) => {
      (el as HTMLElement).style.display = "";
      (el as HTMLElement).style.pageBreakAfter = "";
      (el as HTMLElement).style.breakAfter = "";
    });
  });

  const out = await merged.save();
  console.log(
    `[pdf-gen] merged ${merged.getPageCount()} pages -> ${out.length} bytes`,
  );
  return Buffer.from(out);
}

/**
 * 等所有 <img> load 完 (含 viewport 外)。
 *
 * Puppeteer headless 跟 browser_exec 一樣: viewport 外的 img 即使 loading="eager"
 * 也不一定主動 fetch。我們用 page.evaluate 抓所有 .print-book-page img 然後
 * 手動 .scrollIntoView — 一次一次把所有圖送進 viewport 強迫 fetch。
 */
async function forceLoadAllImages(
  page: any,
  targetRatio = 0.85,
): Promise<{ loaded: number; total: number; waitedMs: number }> {
  const startedAt = Date.now();

  // 在瀏覽器內,把所有 img 改成 eager + sync decoding,
  // 然後分批把每個 .print-book-page scrollIntoView 讓 Chrome 真去 fetch
  await page.evaluate(async () => {
    const pages = Array.from(document.querySelectorAll(".print-book-page"));
    pages.forEach((p) => {
      const imgs = p.querySelectorAll("img");
      imgs.forEach((img: HTMLImageElement) => {
        img.loading = "eager";
        img.decoding = "sync";
        img.fetchPriority = "high";
      });
    });
  });

  let lastLoaded = 0;
  let stableRounds = 0;
  const MAX_TIME_MS = 120000; // 最多等 2 分鐘
  const STABLE_THRESHOLD = 3; // 連續 3 輪 loaded 沒增加才停

  while (Date.now() - startedAt < MAX_TIME_MS) {
    await page.evaluate(async (batchSize: number) => {
      const pages = Array.from(document.querySelectorAll(".print-book-page"));
      const viewportH = window.innerHeight;
      const needsScroll = pages.filter((p) => {
        const r = (p as HTMLElement).getBoundingClientRect();
        return r.bottom < 0 || r.top > viewportH;
      });
      const batch = needsScroll.slice(0, batchSize);
      for (const p of batch) {
        (p as HTMLElement).scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 250));
      }
      await new Promise((r) => setTimeout(r, 1500));
    }, 8);

    const stats = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll(".print-book-page img"));
      let loaded = 0;
      imgs.forEach((img: any) => {
        if (img.complete && img.naturalWidth > 0) loaded++;
      });
      return { loaded, total: imgs.length };
    });

    const ratio = stats.total > 0 ? stats.loaded / stats.total : 0;
    console.log(
      `[pdf-gen] preload progress: ${stats.loaded}/${stats.total} (${Math.round(ratio * 100)}%)`,
    );

    if (ratio >= targetRatio) break;
    if (stats.loaded === lastLoaded) {
      stableRounds++;
      if (stableRounds >= STABLE_THRESHOLD) {
        console.log(
          `[pdf-gen] no more progress for ${STABLE_THRESHOLD} rounds, stopping`,
        );
        break;
      }
    } else {
      stableRounds = 0;
    }
    lastLoaded = stats.loaded;
  }

  const finalStats = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll(".print-book-page img"));
    let loaded = 0;
    imgs.forEach((img: any) => {
      if (img.complete && img.naturalWidth > 0) loaded++;
    });
    return { loaded, total: imgs.length };
  });

  return {
    loaded: finalStats.loaded,
    total: finalStats.total,
    waitedMs: Date.now() - startedAt,
  };
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

    // 🆕 2026-11-14: 等 mode B 的版面配置引擎定稿
    //   (「一頁 2 則」的動態格高是在瀏覽器實測後決定的,沒定稿就開拍會拿到舊版面)
    try {
      await page.waitForFunction(
        () => {
          const root = document.querySelector<HTMLElement>(
            ".print-book-screen",
          );
          if (!root) return false;
          if (!root.querySelector(".print-book-mode-b-pair-page")) return true;
          return root.getAttribute("data-layout-ready") === "1";
        },
        { timeout: 30000, polling: 200 },
      );
      console.log(`[pdf-gen] pair layout ready ✓`);
    } catch (e) {
      console.warn(`[pdf-gen] pair layout not ready, capture anyway`);
    }

    // 等自适应字級寫完才拍
    console.log(`[pdf-gen] waiting for adaptive fontSize settle...`);
    try {
      await page.waitForFunction(
        () => {
          const texts = Array.from(
            document.querySelectorAll(".print-book-post-text"),
          );
          if (texts.length === 0) return false;
          return (texts as HTMLElement[]).every(
            (el) => el.style.fontSize && el.style.fontSize.endsWith("pt"),
          );
        },
        { timeout: 15000, polling: 100 },
      );
      console.log(`[pdf-gen] fontSize settled ✓`);
    } catch (e) {
      console.warn(`[pdf-gen] fontSize settle timeout, capture anyway`);
    }

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
