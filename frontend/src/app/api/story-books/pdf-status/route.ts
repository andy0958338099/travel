/**
 * 🆕 2026-11-16 查詢「線上即時生成 A5 PDF」的進度
 *
 * GET /api/story-books/pdf-status?slug=<share_slug>&key=<blob_key>
 *
 * 背景 function（/story-pdf/generate）會把狀態寫進 Netlify Blobs:
 *   pdf-status/<slug>.json  → { state: running|done|error, key, bytes, pages }
 * 同時它會把 PDF 本身寫進:
 *   pdf/<slug>-<sig>.pdf
 *
 * 所以「PDF blob 存在」= 生成完成。
 *
 * ⚠️ 這支 route 跟觸發端點共用同一份 loadBookMeta 與 pdfBlobKey，
 *    確保「算 key」與「讀 key」永遠一致。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pdfBlobKey } from "@/lib/pdfKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_STORE = "blog-images";
const STATUS_PREFIX = "pdf-status/";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadBookMeta(slug: string) {
  try {
    const { getSiteContent } = await import("@/lib/siteContent");
    const content = await getSiteContent();
    const hit = content?.books?.find((b) => b.share_slug === slug);
    if (hit) {
      return {
        book_id: hit.book_id,
        layout_mode: hit.layout_mode,
        selected_post_ids: hit.selected_post_ids || [],
        updated_at: hit.updated_at,
      };
    }
  } catch {
    /* 往下走 */
  }
  try {
    const supabase = getSupabase();
    const res = await supabase
      .from("custom_story_books")
      .select(
        "book_id, layout_mode, selected_post_ids, updated_at",
      )
      .eq("share_slug", slug)
      .maybeSingle();
    if (res.data) return res.data as any;
  } catch {
    /* 往下走 */
  }
  try {
    const { localQuery } = await import("@/lib/localFallback");
    const rows = await localQuery<Record<string, unknown>>(
      "select book_id, layout_mode, selected_post_ids, updated_at from custom_story_books where share_slug = $1 limit 1",
      [slug],
    );
    if (rows.length > 0) return rows[0] as any;
  } catch {
    /* 沒資料 */
  }
  return null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug");
  const range = sp.get("range") || "full";
  if (!slug) {
    return NextResponse.json({ error: "Provide slug" }, { status: 400 });
  }

  const book = await loadBookMeta(slug);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const ids: string[] = book.selected_post_ids || [];
  const key = pdfBlobKey(slug, {
    bookId: book.book_id,
    layoutMode: book.layout_mode,
    updatedAt: book.updated_at,
    postIds: ids,
    range,
  });

  // 1) 讀狀態紀錄
  let status: any = null;
  try {
    const { getStore } = await import("@netlify/blobs");
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    const store =
      siteID && token
        ? getStore({ name: BLOB_STORE, siteID, token })
        : getStore(BLOB_STORE);
    // ⚠️ SDK v11 只有 setJSON，沒有 getJSON → 用 get + JSON.parse
    const raw = await store.get(`${STATUS_PREFIX}${slug}.json`, { type: "text" });
    if (raw) {
      status = JSON.parse(typeof raw === "string" ? raw : String(raw));
    }
  } catch (e) {
    console.error("[pdf-status] 狀態讀取失敗:", (e as Error).message);
  }

  // 2) PDF 是否已存在（成功訊號）
  let ready = false;
  try {
    const { getBlobPdf } = await import("@/lib/blobPdf");
    const buf = await getBlobPdf(key);
    ready = !!buf && buf.length > 0;
  } catch {
    ready = false;
  }

  return NextResponse.json({
    slug,
    key,
    ready,
    state: ready ? "done" : (status?.state ?? "idle"),
    bytes: status?.bytes ?? null,
    pages: status?.pages ?? null,
    error: status?.error ?? null,
    started_at: status?.started_at ?? null,
    updated_at: status?.updated_at ?? null,
  });
}
