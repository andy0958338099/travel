/**
 * 客製書 A5 PDF 的「頁面渲染」核心邏輯（不含瀏覽器啟動）
 *
 * 為什麼獨立成 module:
 *   同一套逐頁拍攝邏輯有三個執行環境要用:
 *     1. 本機 dev server（src/lib/story-pdf.ts,系統 Chrome）
 *     2. Netlify standalone function（線上即時生成,@sparticuz/chromium）
 *     3. 舊的 legacy print-pdf route
 *   放在這裡 → 三邊共用一份,不會各自漂移。
 *
 * ⚠️ 這個 module 刻意「不 import puppeteer」,也不 import 任何 `@/` alias:
 *   - 不 import puppeteer → 沒有 puppeteer 的環境也能 import(不會整包炸)
 *   - 不用 `@/` alias → Netlify standalone function 用 esbuild 打包時
 *     不依賴 tsconfig paths 解析,避免打包失敗。
 */

import { PDFDocument } from "pdf-lib";

/** 單頁 PDF 拍攝參數（A5、零邊距） */
const PDF_OPTS = {
  format: "A5" as const,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,
  timeout: 120_000,
};

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
export async function generatePdfPerPage(
  page: any,
  pageRanges: string | undefined,
): Promise<Buffer> {
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
        chunkBuf = Buffer.from(await page.pdf(PDF_OPTS));
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
export async function forceLoadAllImages(
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
 * 等版面「定稿」再開拍。
 *
 * 兩個訊號:
 *   1. data-layout-ready="1" → mode B「一頁 2 則」的動態格高已定稿
 *      (這是瀏覽器實測後決定的,沒定稿就開拍會拿到舊版面)
 *   2. 每個 .print-book-post-text 的 fontSize 都已是 pt 值
 *      (自適應字級算完)
 */
export async function waitForBookReady(
  page: any,
  { layoutTimeout = 30000, fontTimeout = 15000 } = {},
): Promise<{ layoutReady: boolean; fontReady: boolean }> {
  let layoutReady = false;
  let fontReady = false;
  try {
    await page.waitForFunction(
      () => {
        const root = document.querySelector<HTMLElement>(".print-book-screen");
        if (!root) return false;
        if (!root.querySelector(".print-book-mode-b-pair-page")) return true;
        return root.getAttribute("data-layout-ready") === "1";
      },
      { timeout: layoutTimeout, polling: 200 },
    );
    layoutReady = true;
    console.log(`[pdf-gen] pair layout ready ✓`);
  } catch (e) {
    console.warn(`[pdf-gen] pair layout not ready, capture anyway`);
  }

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
      { timeout: fontTimeout, polling: 100 },
    );
    fontReady = true;
    console.log(`[pdf-gen] fontSize settled ✓`);
  } catch (e) {
    console.warn("[pdf-gen] fontSize settle timeout, capture anyway");
  }

  // ⚠️ 🆕 2026-11-18 等 webfont 真的載入完成（修「PDF 標題變豆腐字」）
  //
  // 為什麼必須等：
  //   列印版面用兩份自帶的 woff2 子集當字型來源：
  //     PrintSerifTC（Noto Serif TC）→ 內文
  //     PrintSansTC （Noto Sans TC） → 標題
  //   兩份檔案各約 1~2 MB。線上 background function 是冷啟動，
  //   第一次請求時字型還在下載 → `font-display: block` 會先畫出
  //   invisible（3 秒 block 期），量測到的文字寬度會是 fallback 字型的寬度，
  //   甚至直接拍到 .notdef 方框。
  //
  //   `document.fonts.ready` 只會在「所有正在載入的字型都完成」後才 resolve，
  //   但不會保證沒用到的字型已載入 → 所以先明確 `document.fonts.load()`。
  try {
    const fontLoaded = await page.evaluate(async () => {
      const fonts = (document as any).fonts;
      if (!fonts) return { ok: true, note: "no document.fonts" };
      // 明確載入列印版面會用到的所有字型（含各種 weight）
      // 🆕 2026-11-18: 加上補丁字型（emoji / 簡體 / 數學花體 / 符號）
      //   這些字型只含少數字，沒有明確 load 的話瀏覽器可能等到排版後才載入 → 拍到方框。
      const families = [
        "400 16px PrintSerifTC",
        "700 16px PrintSerifTC",
        "400 16px PrintSansTC",
        "700 16px PrintSansTC",
        "400 16px PrintEmoji",
        "400 16px PrintSansSC",
        "400 16px PrintSansMath",
        "400 16px PrintSansSymbols2",
      ];
      // 每個 family 對應的測試字串（要含該 family 實際涵蓋的字元）
      const probes: Record<string, string> = {
        PrintSerifTC: "測試中文",
        PrintSansTC: "測試中文",
        PrintEmoji: "✈️⏱✅🎬📍",
        PrintSansSC: "刚围应栅标缝阖静",
        PrintSansMath: "𝓓𝓪𝔂",
        PrintSansSymbols2: "➔➕❗❤",
      };
      const results: Record<string, string> = {};
      for (const f of families) {
        try {
          // 每個 family 至少載入一個含中文字的測試字串
          const fam = f.split(" ").slice(2).join(" ");
          await fonts.load(f, probes[fam] || "測試中文");
          results[f] = "ok";
        } catch (e) {
          results[f] = `fail: ${(e as Error).message}`;
        }
      }
      // 再等所有 pending 的字型完成
      await fonts.ready;
      // 檢查是否真的可渲染中文
      const canRender =
        fonts.check('400 16px "PrintSansTC"', "測試中文") &&
        fonts.check('700 16px "PrintSansTC"', "測試中文") &&
        fonts.check('400 16px "PrintSerifTC"', "測試中文");
      return { ok: canRender, results, size: fonts.size, status: fonts.status };
    });
    console.log(
      `[pdf-gen] webfonts loaded: ${JSON.stringify(fontLoaded.results)} ok=${fontLoaded.ok}`,
    );
    if (!fontLoaded.ok) {
      console.warn(
        "[pdf-gen] ⚠️ webfont 未完全就緒（PDF 可能出現豆腐字）— " +
          `status=${(fontLoaded as any).status}`,
      );
    }
  } catch (e) {
    console.warn("[pdf-gen] 等 webfont 失敗:", (e as Error).message);
  }

  return { layoutReady, fontReady };
}
