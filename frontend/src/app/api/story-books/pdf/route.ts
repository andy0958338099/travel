/**
 * 🆕 2026-11-15 公開下載端點: GET /api/story-books/pdf?slug=<share_slug>
 *
 * 目的:讓「儲存並公開」的客製書,任何訪客(非作者)都能下載 A5 列印版 PDF。
 *
 * 設計:
 *   - 只用 share_slug,不需要 author_token → 訪客可下載
 *   - 不含 token:回傳給訪客的檔名與 URL 都不洩漏 author_token
 *
 * 資料來源(不依賴 Supabase REST):
 *   1. Netlify Blobs 快照 content/site-content.json
 *   2. repo 內編進 bundle 的公開快照 src/data/site-content.public.json
 *   3. Supabase pooler(最後後備)
 *
 * PDF 來源順序:
 *   1. Netlify Blobs 的預生成 PDF(pdf/<slug>-<sig>.pdf)  ← 線上正式路徑
 *   2. 本機磁碟快取 data/pdf-cache/                      ← 本機 dev
 *   3. 即時生成(Puppeteer,只有本機有 Chromium 才能跑)
 *
 * ⚠️ Netlify serverless 沒有 Chromium,無法即時生成 PDF;
 *    所以線上必須由 scripts/upload-pdfs-to-blobs.mjs 預先上傳。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mkdir, readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getBlobPdf } from "@/lib/blobPdf";
import { pdfSig } from "@/lib/pdfKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

// 快取目錄:專案 data/pdf-cache(不在 frontend/public → 不會被打包進 build)
const CACHE_DIR = path.join(process.cwd(), "..", "data", "pdf-cache");

/**
 * 判斷「這個 runtime 有沒有本機 Chromium 可用」。
 *
 * ⚠️ 2026-11-17: 不能用 process.env.NETLIFY 判斷 —— Netlify 的 Next.js
 *    runtime 不保證會設這個變數(正式站實測為 falsy)。用 env 判斷會把
 *    正式站誤認為「本機」,於是掉進 Puppeteer 的錯誤分支,回出
 *    「線上伺服器沒有排版引擎無法即時生成」這種誤導訊息 ——
 *    但實際上線上是有排版引擎的(Netlify background function 用
 *    @sparticuz/chromium)。
 *
 * 改成問實際的問題:「這台機器上找得到 Chromium 嗎?」
 *  - PUPPETEER_EXECUTABLE_PATH / CHROME_PATH 有設定 → 有
 *  - 常見安裝路徑存在 → 有
 *  - 都不是 → 沒有(雲端 serverless 的典型情況)
 */
function hasLocalChrome(): boolean {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (fromEnv) return true;
  try {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome-stable",
    ];
    return candidates.some((p) => existsSync(p));
  } catch {
    return false;
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 讀書(只需要 mode + 篇數 + updated_at,不需要 token) */
async function loadBookMeta(slug: string) {
  // 1) Blobs / repo 快照(線上主路徑,不碰 Supabase REST)
  try {
    const { getSiteContent } = await import("@/lib/siteContent");
    const content = await getSiteContent();
    const hit = content?.books?.find((b) => b.share_slug === slug);
    if (hit) {
      return {
        book_id: hit.book_id,
        title: hit.title,
        author_name: hit.author_name,
        layout_mode: hit.layout_mode,
        selected_post_ids: hit.selected_post_ids || [],
        updated_at: hit.updated_at,
        is_public: hit.is_public,
      };
    }
  } catch (e) {
    console.error("[story-books/pdf] 快照讀取失敗:", (e as Error).message);
  }

  // 2) Supabase REST(可能被 quota 擋,失敗就跳過)
  try {
    const supabase = getSupabase();
    const res = await supabase
      .from("custom_story_books")
      .select("book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public")
      .eq("share_slug", slug)
      .maybeSingle();
    if (res.data) return res.data;
  } catch {
    // 402 exceed_cached_egress_quota → 忽略,往下走 pooler
  }

  // 3) Supabase pooler(最後後備)
  try {
    const { localQuery } = await import("@/lib/localFallback");
    const rows = await localQuery<Record<string, unknown>>(
      "select book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public from custom_story_books where share_slug = $1 limit 1",
      [slug],
    );
    if (rows.length > 0) return rows[0] as any;
  } catch (e) {
    console.error("[story-books/pdf] pooler 讀取失敗:", (e as Error).message);
  }
  return null;
}

/**
 * 組出 PDF 回應。
 *
 * 檔名規則:
 *   - ASCII fallback 給不支援 RFC 5987 的 client
 *   - filename*=UTF-8''... 給瀏覽器顯示中文檔名
 *   ⚠️ 中文直接放進 filename= 會讓 Response 拋 TypeError → 500。
 */
function pdfResponse(
  body: Buffer,
  book: { title?: string | null; layout_mode?: string | null },
  ids: string[],
  download: boolean,
  source: string,
): NextResponse {
  const perPage = book.layout_mode === "A" ? "1則" : "2則";
  const safeTitle = (book.title || "custom").replace(/[^\w一-龥]/g, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}-${perPage}-${stamp}.pdf`;
  const asciiBase =
    (book.title || "").replace(/[^\x20-\x7e]/g, "").trim() || "custom-story-book";
  const asciiFallback = `${asciiBase}-${perPage === "1則" ? "1" : "2"}per-${stamp}.pdf`;
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(body.length),
      // ⚠️ 2026-11-17: 改成 no-store（原本是 public, max-age=300）。
      //
      // 為什麼:Netlify CDN 對同一個 path 只認「Netlify-Vary」指定的維度,
      // 而實際觀測到正式入口會把別本書的 PDF 回給訪客:
      //   ?slug=843ta5hr&range=1-1 → 回 113 頁(屬於 8zd9x39j)
      //   ?slug=843ta5hr&range=2-2 → 回 10 頁(屬於 si7jekg8)
      // 也就是說「訪客下載 A 書卻拿到 B 書」—— 這是不可接受的正確性問題。
      //
      // 判斷:根因在共用快取層,不在 route 邏輯(origin 實測 range 處理正確)。
      // 與其跟 CDN 的 cache-key 規則搏鬥,不如讓這支 route 的回應「不進共用快取」。
      // PDF 不是熱門路徑(每位訪客下載一次),origin 直接讀 Blob 就好。
      //
      // 同時保留 Netlify-Vary:query 作為額外防禦,避免將來有人改快取策略時又踩雷。
      "Cache-Control": "no-store",
      "Netlify-Vary": "query",
      "X-Pdf-Source": source,
      "X-Pdf-Pages": String(ids.length),
    },
  });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug");
  const range = sp.get("range") || "full";
  const download = sp.get("download") !== "0";

  if (!slug) {
    return NextResponse.json({ error: "Provide slug" }, { status: 400 });
  }

  const book = await loadBookMeta(slug);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  // 未公開的書不給下載
  if (book.is_public === false) {
    return NextResponse.json({ error: "Book is not public" }, { status: 403 });
  }

  const ids: string[] = book.selected_post_ids || [];
  const perPage = book.layout_mode === "A" ? "1則" : "2則";

  // ── 快取 key ──
  //    來源單一化:統一用 pdfKey.ts 的 pdfSig(),不要再自己重算 sha1。
  //    ⚠️ 2026-11-17: sig 內含 PDF_LAYOUT_VERSION,
  //       版面組裝規則一改,線上那份「舊版排錯的 PDF」自動失效。
  //    作者改選篇/改 mode → updated_at 變 → key 變 → 自動失效
  const sig = pdfSig({
    bookId: book.book_id,
    layoutMode: book.layout_mode,
    updatedAt: book.updated_at,
    postIds: ids,
    range,
  });

  const cachePath = path.join(CACHE_DIR, `${slug}-${sig}.pdf`);
  const blobKey = `pdf/${slug}-${sig}.pdf`;

  // ── 來源 1:Netlify Blobs 預生成 PDF(線上正式路徑)──
  // ⚠️ 2026-11-17: 這裡原本有 `if (range === "full")` 的限制。
  //    那是當時排查「CDN 跨書污染」時加的臨時手段(range 只讀 full 的 blob,
  //    避免 range 參數命中別的 key)。現在污染根因已用 Cache-Control: no-store
  //    解決,而且線上背景生成會把 range 版的 PDF 也寫進 Blob
  //    (key 含 range → range=1-1 是獨立的一個 blob),
  //    保留那個限制會讓「只印某幾頁」的 PDF 永遠讀不到。
  let cached: Buffer | null = null;
  let source = "blob";
  try {
    cached = await getBlobPdf(blobKey);
    if (cached) {
      console.log(`[story-books/pdf] blob HIT ${blobKey} (${cached.length} bytes)`);
    }
  } catch (e) {
    console.error("[story-books/pdf] Blob 讀取失敗:", (e as Error).message);
  }

  // ── 來源 2:本機磁碟快取 ──
  if (!cached) {
    source = "cache";
    try {
      const st = await stat(cachePath);
      if (st.size > 0) {
        cached = await readFile(cachePath);
        console.log(`[story-books/pdf] cache HIT ${slug} (${cached.length} bytes)`);
      }
    } catch {
      cached = null;
    }
  }

  // ── 來源 3:即時生成(只有本機有 Chromium 才能跑)──
  // ⚠️ 2026-11-17: 正式站(Netlify serverless)沒有本機 Chromium,
  //    這條路徑一定會失敗。與其 import puppeteer 再吃一個錯誤,
  //    不如直接回 503 PDF_NOT_PREBUILT —— 前端 preview 頁看到這個 code
  //    就會去觸發背景生成 function(線上用 @sparticuz/chromium 現拍)。
  //    這樣「線上生成」的流程才會被真正啟動,而不是在這裡卡住。
  //
  // ⚠️ 偵測方式:不能用 process.env.NETLIFY —— Netlify 的 Next.js runtime
  //    不保證會設這個變數(實測為 falsy,會誤判成「本機」而掉進 Puppeteer
  //    的錯誤分支,回出「線上伺服器沒有排版引擎」這種誤導訊息)。
  //    改用「有沒有本機 Chromium」這個實際能力來判斷。
  const isServerless = !hasLocalChrome();
  if (!cached && isServerless) {
    console.log(
      `[story-books/pdf] blob MISS ${slug} → 線上無本機 Chromium,回 PDF_NOT_PREBUILT`,
    );
    return NextResponse.json(
      {
        error: "這本書的 A5 PDF 尚未產生，線上將自動重新生成。",
        code: "PDF_NOT_PREBUILT",
        hint: "線上背景生成會自動啟動，約需 1-2 分鐘後即可下載。",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!cached) {
    source = "generated";
    console.log(`[story-books/pdf] cache MISS ${slug} → 生成中...`);
    let buf: Buffer;
    try {
      // ⚠️ lazy import：story-pdf 會 import puppeteer（線上沒有），
      //   頂層 import 會讓整個 route 載入即崩（HTTP 500 空 body）。
      const { renderBookPdf } = await import("@/lib/story-pdf");
      buf = await renderBookPdf({
        origin: req.nextUrl.origin,
        slug,
        range,
      });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      console.error("[story-books/pdf] 生成失敗:", msg);
      // ⚠️ 2026-11-16: 線上缺 PDF 時不要再丟 Puppeteer 的原始錯誤
      //    （"Could not find Chrome ..."），那對使用者毫無意義。
      //    改成清楚說明「這本書還沒有預生成 PDF」+ 下一步做法。
      const isChromeMissing = /Could not find Chrome|chrome.*not found|ENOENT.*chrome/i.test(
        msg
      );
      // ⚠️ 2026-11-17: 訊息要對應「線上現在真的可以生成」的事實。
      //    舊文案說「線上伺服器沒有排版引擎」+「請在本機執行 script 上傳」——
      //    那是沒有背景生成 function 的舊架構。現在線上有 background function,
      //    前端拿到 PDF_NOT_PREBUILT 會自動觸發線上生成,所以只要說清楚
      //    「正在線上生成,稍等一下再試」。
      return NextResponse.json(
        {
          error: isChromeMissing
            ? "這本書的 A5 PDF 尚未產生，線上將自動重新生成。"
            : `PDF 生成失敗: ${msg}`,
          code: isChromeMissing ? "PDF_NOT_PREBUILT" : "PDF_GENERATION_FAILED",
          hint: isChromeMissing
            ? "線上背景生成會自動啟動，約需 1-2 分鐘後即可下載。"
            : "請查看 Netlify function 記錄。",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    cached = buf;
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cachePath, cached);
      console.log(`[story-books/pdf] cached → ${cachePath}`);
    } catch (e) {
      console.error("[story-books/pdf] 寫入快取失敗(不影響下載):", e);
    }
  }

  return pdfResponse(cached, book, ids, download, source);
}
