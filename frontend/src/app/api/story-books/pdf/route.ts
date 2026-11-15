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
import { createHash } from "crypto";
import { mkdir, readFile, writeFile, stat } from "fs/promises";
import path from "path";
import { getBlobPdf, normalizeIso } from "@/lib/blobPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

// 快取目錄:專案 data/pdf-cache(不在 frontend/public → 不會被打包進 build)
const CACHE_DIR = path.join(process.cwd(), "..", "data", "pdf-cache");

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
      "Cache-Control": "public, max-age=300",
      // ⚠️ 2026-11-15: Netlify CDN 的 cache key 不含 query（Next.js plugin
      //    把 netlify-vary 固定成只認 _rsc）。不加這行的話，不同 slug
      //    會共用同一份 PDF 快取 → 訪客下載到別人的書。
      //    詳見 app/api/local-image/route.ts 的說明。
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

  // ── 快取 key:書的 updated_at + mode + 篇數 + range ──
  //    作者改選篇/改 mode → updated_at 變 → key 變 → 自動失效
  const sig = createHash("sha1")
    .update(
      [
        book.book_id,
        book.layout_mode,
        normalizeIso(book.updated_at),
        ids.length,
        ids.join(","),
        range,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  const cachePath = path.join(CACHE_DIR, `${slug}-${sig}.pdf`);
  const blobKey = `pdf/${slug}-${sig}.pdf`;

  // ── 來源 1:Netlify Blobs 預生成 PDF(線上正式路徑)──
  let cached: Buffer | null = null;
  let source = "blob";
  if (range === "full") {
    try {
      cached = await getBlobPdf(blobKey);
      if (cached) {
        console.log(`[story-books/pdf] blob HIT ${blobKey} (${cached.length} bytes)`);
      }
    } catch (e) {
      console.error("[story-books/pdf] Blob 讀取失敗:", (e as Error).message);
    }
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
      return NextResponse.json(
        {
          error: `PDF 生成失敗: ${msg}`,
          hint:
            "Production 環境 (Netlify) 沒有 Chromium,無法即時生成 PDF。請執行 scripts/upload-pdfs-to-blobs.mjs 預先上傳到 Netlify Blobs。",
        },
        { status: 503 },
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
