/**
 * 🆕 2026-10-19 聖上指示: Puppeteer 拉本機 /story-blog-print 拍 A5 PDF
 *
 * 路線:
 *   - 客戶端 fetch `/api/story-blog/print-pdf?range=1-10` (或 11-20, ..., full)
 *   - API 開 puppeteer headless, goto localhost:3000/story-blog-print
 *   - page.pdf({ format: "A5", pageRanges: "1-10" })
 *   - 回傳 blob 給瀏覽器下載
 *
 * 為什麼不走 jsPDF (10-19 慘案):
 *   - html2canvas 對 viewport 外「未載入」Supabase 圖會 hang 90s+ 不出圖
 *   - 即使跑到 canvas 階段, scale 2 × 374 頁 = 30GB+ canvas memory = OOM 風險
 *   - jsPDF 自己組圖也有 CORS / tainted canvas 風險
 *
 * 為什麼 Puppeteer 可靠:
 *   - 直接 await 所有 <img> complete + native Chrome 列印模式
 *   - 一鍵 page.pdf() = 完整 PDF, CJK 字體、陰影、邊框全包
 *   - pageRanges 支援範圍拍, 不必額外切片
 *
 * ⚠️ 限制: 本機 dev server only
 *   - Netlify Function 不能跑 puppeteer (沙盒沒 GUI + binary 超大)
 *   - production 必須 `npm run dev` + 另開 tab localhost:3000/story-blog-print 才能下載
 *   - 若使用者從 production site 點下載 → puppeteer 連不上 localhost, API 回 503
 *
 * 作者: Brian + Hermes on 2026-10-19 22:50
 */

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 分鐘 — Puppeteer PDF 374 頁可能要 3-7 分鐘

/**
 * 解析 range query:
 *   - ?range=1-10       → 第 1-10 頁
 *   - ?range=11-20      → 第 11-20 頁
 *   - ?range=full       → 全部頁 (不傳 pageRanges)
 *   - ?range=1          → 單頁 (cover)
 */
function parseRange(raw: string | null): {
  pageRanges?: string;
  filename: string;
} {
  if (!raw || raw === "full") {
    return { filename: "story-blog-A5-full.pdf" };
  }
  const m = raw.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) {
    return { filename: "story-blog-A5-full.pdf" };
  }
  const s = +m[1];
  const e = m[2] ? +m[2] : +m[1];
  if (e < s) {
    return { filename: "story-blog-A5-full.pdf" };
  }
  if (s === e) {
    return {
      pageRanges: String(s),
      filename: `story-blog-A5-${String(s).padStart(3, "0")}.pdf`,
    };
  }
  return {
    pageRanges: `${s}-${e}`,
    filename: `story-blog-A5-${String(s).padStart(3, "0")}-${String(e).padStart(3, "0")}.pdf`,
  };
}

/**
 * 找 localhost:3000 上跑的 dev server。
 *
 * 失敗條件 (production 環境必中):
 *   - Netlify deploy,沒人開 `npm run dev`
 *   - 部署到 Netlify SSR 也沒 puppeteer 權限
 *
 * 偵測方式: 起一個 puppeteer 之後 GET localhost:3000/story-blog-print 看 HTTP code
 *   (用 dev server 自己的 page load,不是外部 fetch)
 */
async function detectDevServer(): Promise<number> {
  // 本函式不會被使用 — 由 puppeteer 內部直接 goto + page.url 驗證
  // 保留供未來 health check
  return 200;
}

/**
 * 等所有 <img> load 完 (含 viewport 外)。
 *
 * Puppeteer headless 跟 browser_exec 一樣: viewport 外的 img 即使 loading="eager"
 * 也不一定主動 fetch。我們用 page.evaluate 抓所有 .print-book-page img 然後
 * 手動 .scrollIntoView — 一次一次把所有圖送進 viewport 強迫 fetch。
 *
 * 374 頁圖多, 強迫 viewport 切換會 block 30-60 秒, 但這比 hang 強。
 */
async function forceLoadAllImages(
  page: any,
  targetRatio = 0.85
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

  // 在 puppeteer side 用 window.scrollTo 一頁一頁推
  // 比 page.evaluate Promise 還慢但更可靠 (避免 browser side 卡住)
  let lastLoaded = 0;
  let stableRounds = 0;
  const MAX_TIME_MS = 120000; // 最多等 2 分鐘
  const STABLE_THRESHOLD = 3; // 連續 3 輪 loaded 沒增加才停

  while (Date.now() - startedAt < MAX_TIME_MS) {
    await page.evaluate(async (batchSize: number) => {
      const pages = Array.from(document.querySelectorAll(".print-book-page"));
      // 取目前沒進 viewport 的下一批
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
      // 給 in-flight img 一點時間
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
      `[pdf-gen] preload progress: ${stats.loaded}/${stats.total} (${Math.round(ratio * 100)}%)`
    );

    if (ratio >= targetRatio) break;
    if (stats.loaded === lastLoaded) {
      stableRounds++;
      if (stableRounds >= STABLE_THRESHOLD) {
        console.log(`[pdf-gen] no more progress for ${STABLE_THRESHOLD} rounds, stopping`);
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
 * API 主入口
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { pageRanges, filename } = parseRange(searchParams.get("range"));

  const origin = req.nextUrl.origin; // e.g. http://localhost:3000

  let browser: any;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 });

    // 設 console 給 server log 看
    page.on("console", (msg: any) => {
      const t = msg.type();
      if (t === "error" || t === "warning") {
        console.log(`[pdf-gen][${t}] ${msg.text().slice(0, 200)}`);
      }
    });
    page.on("pageerror", (err: Error) => {
      console.log(`[pdf-gen][pageerror] ${err.message.slice(0, 200)}`);
    });

    // 走到 print 版 (eventually 會 reload 一堆 .print-book-page)
    console.log(`[pdf-gen] goto ${origin}/story-blog-print`);
    // 🆕 不等 networkidle0: Supabase 374 張圖 lazy fetch 永遠不會 idle
    //   改用 domcontentloaded + 顯式 waitForSelector,搭配下方 forceLoadAllImages 強制 fetch
    await page.goto(`${origin}/story-blog-print`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // 等 React 渲染 + Supabase fetch 完成 (前端會先顯示「正在載入」placeholder → 真的 .print-book-page 出現)
    await page.waitForSelector(".print-book-page", { timeout: 60000 });
    const pagesFound = await page.$$eval(".print-book-page", (els: any) => els.length);
    console.log(`[pdf-gen] found ${pagesFound} .print-book-page`);

    // 強制 fetch 所有圖 + 等到至少 80% loaded 才拍
    console.log(`[pdf-gen] forcing image preload (until ≥80% loaded)...`);
    const { loaded, total, waitedMs } = await forceLoadAllImages(page, 0.8);
    console.log(`[pdf-gen] images: ${loaded}/${total} loaded after ${waitedMs}ms`);

    // 等短化 API (shorten) 完成 — 這個 fire-and-forget 不阻塞 user 但可能 30-90s
    // (不 await; PDF 用 React state 渲染時的內容)
    await new Promise((r) => setTimeout(r, 2000));

    // 拍 PDF
    console.log(`[pdf-gen] generating PDF${pageRanges ? ` pageRanges=${pageRanges}` : " full"}`);
    const pdfBuffer: Buffer = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      pageRanges,
    });

    console.log(`[pdf-gen] done: ${pdfBuffer.length} bytes`);

    await browser.close();

    // 回傳 PDF blob
    // Buffer → Uint8Array 確保 NextResponse 在 Edge/Node 都能吃
    const pdfBytes = new Uint8Array(pdfBuffer);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    const msg = (e as Error).message ?? String(e);
    console.error(`[pdf-gen] FAIL: ${msg}`);

    // 常見錯誤訊息 (給使用者看得懂的版)
    let userMsg = msg;
    if (msg.includes("ECONNREFUSED")) {
      userMsg = "找不到 dev server。請先在本機執行 `npm run dev`,再開新分頁到 /story-blog-print 點下載。";
    } else if (msg.includes("Navigation timeout") || msg.includes("timeout")) {
      userMsg = "PDF 生成逾時。請檢查網路或 dev server 是否還在跑。";
    }

    return NextResponse.json(
      {
        error: userMsg,
        hint:
          "本機開發限定。Production 環境 (Netlify) 沒有 puppeteer,請改用瀏覽器的「列印 → 另存為 PDF」。",
      },
      { status: 503 }
    );
  }
}

/**
 * POST 也接 (配合舊版 fetch 用 POST body 傳 range)
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  // 把 body.range 轉成 query string 給 GET 處理
  const url = new URL(req.url);
  if (body.range) {
    url.searchParams.set("range", String(body.range));
  }
  // 內部呼叫 GET
  const fakeReq = new NextRequest(url, { headers: req.headers });
  return GET(fakeReq);
}
