/**
 * 🆕 2026-11-15 公開下載端點: GET /api/story-books/pdf?slug=<share_slug>
 *
 * 目的:讓「儲存並公開」的客製書,任何訪客(非作者)都能下載 A5 列印版 PDF。
 *
 * 設計:
 *   - 只用 share_slug,不需要 author_token → 訪客可下載
 *   - 磁碟快取:第一次生成後存檔,之後訪客秒下載
 *     (Puppeteer 逐頁拍一本文要 25-60 秒,沒有快取的話每個訪客都要重跑一次)
 *   - 快取 key 含 book 的 updated_at + layout_mode + 篇數
 *     → 作者改了書(改選篇/改 mode)→ key 變 → 自動重新生成,不會拿到舊版
 *   - 不含 token:回傳給訪客的檔名與 URL 都不洩漏 author_token
 *
 * ⚠️ 環境限制(既有架構):
 *   Netlify serverless 沒有 puppeteer binary → 線上站點首次下載會 503。
 *   本機 dev server (npm run dev) 正常。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile, stat } from "fs/promises";
import path from "path";
import { renderBookPdf } from "@/lib/story-pdf";

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
  const supabase = getSupabase();
  let book: any = null;
  try {
    const res = await supabase
      .from("custom_story_books")
      .select("book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public")
      .eq("share_slug", slug)
      .maybeSingle();
    book = res.data;
  } catch {
    book = null;
  }
  if (!book) {
    try {
      const { localQuery } = await import("@/lib/localFallback");
      const rows = await localQuery<Record<string, unknown>>(
        "select book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public from custom_story_books where share_slug = $1 limit 1",
        [slug],
      );
      if (rows.length > 0) book = rows[0];
    } catch (e) {
      console.error("[story-books/pdf] pooler 讀取失敗:", e);
    }
  }
  return book;
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
        book.updated_at ?? "",
        ids.length,
        ids.join(","),
        range,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);

  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${slug}-${sig}.pdf`);

  // ── 快取命中 → 直接回檔 ──
  let cached: Buffer | null = null;
  let fromCache = false;
  try {
    const st = await stat(cachePath);
    if (st.size > 0) {
      cached = await readFile(cachePath);
      fromCache = true;
      console.log(`[story-books/pdf] cache HIT ${slug} (${cached.length} bytes)`);
    }
  } catch {
    cached = null;
  }

  if (!cached) {
    console.log(`[story-books/pdf] cache MISS ${slug} → 生成中...`);
    let buf: Buffer;
    try {
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
            "本機開發限定。Production 環境 (Netlify) 沒有 puppeteer,請改用瀏覽器的「列印 → 另存為 PDF」。",
        },
        { status: 503 },
      );
    }
    cached = buf;
    try {
      await writeFile(cachePath, cached);
      console.log(`[story-books/pdf] cached → ${cachePath}`);
    } catch (e) {
      console.error("[story-books/pdf] 寫入快取失敗(不影響下載):", e);
    }
  }

  const safeTitle = (book.title || "custom").replace(/[^\w一-龥]/g, "_");
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeTitle}-${perPage}-${stamp}.pdf`;
  // ⚠️ HTTP header 只能是 ByteString(ASCII)→ 中文檔名必須:
  //   filename="..." 給 ASCII fallback,filename*=UTF-8''... 給瀏覽器真檔名。
  //   直接把中文塞進 filename= 會讓整個 Response 拋 TypeError → 500。
  const asciiBase =
    (book.title || "").replace(/[^\x20-\x7e]/g, "").trim() || "custom-story-book";
  const asciiFallback = `${asciiBase}-${perPage === "1則" ? "1" : "2"}per-${stamp}.pdf`;
  return new NextResponse(new Uint8Array(cached), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(cached.length),
      "Cache-Control": "public, max-age=300",
      "X-Pdf-Source": fromCache ? "cache" : "generated",
    },
  });
}
