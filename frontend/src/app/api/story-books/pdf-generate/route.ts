/**
 * 🆕 2026-11-16 觸發「線上即時生成」客製書 A5 PDF
 *
 * POST /api/story-books/pdf-generate?slug=<share_slug>
 *
 * 為什麼需要這支:
 *   原本流程是「本機生成 → 上傳 Netlify Blobs → 線上讀 Blob」。
 *   使用者新建的書必須回到本機跑 script 才能有線上 PDF。
 *   現在改成:作者按一下 → 背景 function 用 Chromium 現拍 → 存 Blob → 訪客秒下載。
 *
 * 為什麼 sig（Blob key）在這裡算、而不是在背景 function 裡算:
 *   下載端點 `/api/story-books/pdf` 讀 Blob 時用自己那份 loadBookMeta 算 key。
 *   如果背景 function 用另一套資料來源算（例如 pooler vs 快照），
 *   updated_at 可能不同 → key 不同 → 寫進去的 PDF 下載端點找不到。
 *   所以「算 key」和「讀 key」必須是同一份程式碼 → 放在這裡算，传給背景 function。
 *
 * 回應: { started: true, key }（背景 function 立即 202 就算成功受理）
 * 進度: GET /api/story-books/pdf-status?slug=<share_slug>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeIso, pdfBlobKey } from "@/lib/pdfKey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 背景 function 的名稱（Netlify standalone function，背景模式）。
 *
 * ⚠️ 2026-11-17: 舊名是 "story-pdf-generate-background"。
 *    那個檔案已刪除，統一成單一 "story-pdf-generate"（背景模式由
 *    function 檔內的 `export const config = { background: true }` 宣告）。
 *    檔名不可帶 "-background" 後綴又同時用 config.background —— 兩者語意重疊,
 *    容易觸發 Netlify 的命名慣例判斷而改變實際部署路徑。
 */
const BACKGROUND_FN = "story-pdf-generate";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** 讀書(只需要 mode + 篇數 + updated_at) — 與 pdf/route.ts 的 loadBookMeta 完全相同 */
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
    console.error("[pdf-generate] 快照讀取失敗:", (e as Error).message);
  }

  // 2) Supabase REST(可能被 quota 擋,失敗就跳過)
  try {
    const supabase = getSupabase();
    const res = await supabase
      .from("custom_story_books")
      .select(
        "book_id, title, author_name, layout_mode, selected_post_ids, updated_at, is_public",
      )
      .eq("share_slug", slug)
      .maybeSingle();
    if (res.data) return res.data as any;
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
    console.error("[pdf-generate] pooler 讀取失敗:", (e as Error).message);
  }
  return null;
}

export async function POST(req: NextRequest) {
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
  if (book.is_public === false) {
    return NextResponse.json({ error: "Book is not public" }, { status: 403 });
  }

  const ids: string[] = book.selected_post_ids || [];
  const key = pdfBlobKey(slug, {
    bookId: book.book_id,
    layoutMode: book.layout_mode,
    updatedAt: book.updated_at,
    postIds: ids,
    range,
  });

  // ── 已經有了就不必重拍 ──
  try {
    const { getBlobPdf } = await import("@/lib/blobPdf");
    const existing = await getBlobPdf(key);
    if (existing) {
      return NextResponse.json({
        started: false,
        alreadyExists: true,
        key,
        bytes: existing.length,
      });
    }
  } catch (e) {
    console.error("[pdf-generate] Blob 檢查失敗(繼續觸發):", (e as Error).message);
  }

  // ── 觸發背景 function ──
  // ⚠️ 背景 function 是獨立部署的 standalone function,
  //    網址為 /.netlify/functions/<name>。
  //    觸發後它會立刻回 202,實際工作在後台跑(最多 15 分鐘)。
  const origin =
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    req.nextUrl.origin.replace(/\/$/, "");
  const fnUrl = `${origin}/.netlify/functions/${BACKGROUND_FN}?slug=${encodeURIComponent(
    slug,
  )}&range=${encodeURIComponent(range)}&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(fnUrl, { method: "POST" });
    if (!res.ok && res.status !== 202) {
      const body = await res.text().catch(() => "");
      console.error("[pdf-generate] 觸發失敗:", res.status, body.slice(0, 200));
      return NextResponse.json(
        { error: `觸發線上生成失敗 (HTTP ${res.status})`, detail: body.slice(0, 300) },
        { status: 502 },
      );
    }
    console.log(`[pdf-generate] 已觸發背景生成 slug=${slug} key=${key}`);
    return NextResponse.json({ started: true, key, slug, range });
  } catch (e) {
    console.error("[pdf-generate] 觸發例外:", (e as Error).message);
    return NextResponse.json(
      { error: `無法連到線上生成服務: ${(e as Error).message}` },
      { status: 502 },
    );
  }
}
