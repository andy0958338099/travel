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
 * 🆕 2026-11-15:核心產生邏輯已抽到 `@/lib/story-pdf`
 *   (與公開下載端點 `/api/story-books/pdf` 共用,避免兩份實作分歧)
 *
 * 作者: Brian + Hermes on 2026-10-19 22:50
 */

import { NextRequest, NextResponse } from "next/server";
import { parseRange } from "@/lib/story-pdf-range";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 分鐘 — Puppeteer PDF 374 頁可能要 3-7 分鐘

/**
 * API 主入口
 *
 * 🆕 10-20 聖上指示:
 *   - ?slug=xxx → 拍 /story-blog-custom/preview/[slug](個人化客製書)
 *   - 沒 slug → 拍 /story-blog-print(原本的全本)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { filename } = parseRange(searchParams.get("range"));
  const slug = searchParams.get("slug");

  try {
    // lazy import:puppeteer 只在真的生成時才載入
    const { renderBookPdf } = await import("@/lib/story-pdf");
    const pdfBuffer = await renderBookPdf({
      origin: req.nextUrl.origin,
      slug: slug ?? "",
      range: searchParams.get("range"),
    });

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
    const msg = (e as Error).message ?? String(e);
    console.error(`[pdf-gen] FAIL: ${msg}`);

    // 常見錯誤訊息 (給使用者看得懂的版)
    let userMsg = msg;
    let code: string | undefined;
    if (/Could not find Chrome|chrome.*not found|ENOENT.*chrome/i.test(msg)) {
      // ⚠️ 2026-11-16: Netlify serverless 沒有 Chromium,
      //    不要再把 "Could not find Chrome ..." 丟給使用者。
      code = "PDF_NOT_PREBUILT";
      userMsg =
        "線上伺服器沒有排版引擎,無法即時產生 PDF。完整版的 PDF 已事先產生並放在公開下載連結。";
    } else if (msg.includes("ECONNREFUSED")) {
      userMsg = "找不到 dev server。請先在本機執行 `npm run dev`,再開新分頁到 /story-blog-print 點下載。";
    } else if (msg.includes("Navigation timeout") || msg.includes("timeout")) {
      userMsg = "PDF 生成逾時。請檢查網路或 dev server 是否還在跑。";
    }

    return NextResponse.json(
      {
        error: userMsg,
        code,
        hint:
          "完整版請改用「下載 A5 列印版 PDF」,或用「列印 → 另存為 PDF」(版面完全相同)。",
      },
      { status: 503 },
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
