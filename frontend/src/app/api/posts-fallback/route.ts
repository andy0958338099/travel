/**
 * GET /api/posts-fallback?trip_id=<uuid>
 *
 * 🆕 2026-11-14: Supabase REST 不可用時的部落格資料來源
 * 🆕 2026-11-15: 改為「Blobs 快照優先」—— 完全脫離 Supabase
 *
 * Supabase 專案被 spend cap 限制時（402 exceed_cached_egress_quota），
 * 前端 createClient() 拿不到 posts，部落格顯示「0 個故事」。
 *
 * 讀取順序：
 *   1. Netlify Blobs 快照 `content/site-content.json`（線上主路徑，不碰 Supabase）
 *   2. repo 內靜態快照（離線 / Blobs 故障保底）
 *   3. Supabase pooler（快照不存在時的最後手段，仍是 Supabase）
 *
 * image_url 改寫成圖片代理網址，圖片來源見 /api/local-image。
 *
 * 只讀。回傳格式與 `supabase.from('posts').select('*')` 一致。
 */

import { NextRequest, NextResponse } from "next/server";
import { getSiteContent, type SitePost } from "@/lib/siteContent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PostRow {
  id: string;
  trip_id: string;
  day_number: number;
  sort_order: number;
  title: string;
  content: string;
  image_url: string | null;
  layout_type: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
  frame_style: string | null;
}

/** 把 image_url 改寫成圖片代理網址 */
function rewriteImageUrl(p: SitePost) {
  return {
    ...p,
    image_url: p.image_url
      ? `/api/local-image?postId=${encodeURIComponent(p.id)}&w=1200`
      : null,
    // 保留原始 Storage 網址，方便之後恢復時比對
    original_image_url: p.image_url,
  };
}

export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("trip_id");
  const table = req.nextUrl.searchParams.get("table") || "posts";

  // 只開放白名單表，避免變成任意 SQL 查詢入口
  if (!["posts", "trips"].includes(table)) {
    return NextResponse.json({ error: "不支援的表" }, { status: 400 });
  }

  // ── 1) Blobs / 靜態快照（主路徑） ──
  const content = await getSiteContent();
  if (content) {
    if (table === "trips") {
      const rows = tripId
        ? content.trips.filter((t) => t.id === tripId)
        : content.trips.slice(0, 5);
      return NextResponse.json({
        ok: true,
        source: "site-snapshot",
        count: rows.length,
        rows,
      });
    }

    const rows = (
      tripId
        ? content.posts.filter((p) => p.trip_id === tripId)
        : content.posts
    )
      .slice()
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map(rewriteImageUrl);

    return NextResponse.json({
      ok: true,
      source: "site-snapshot",
      count: rows.length,
      rows,
    });
  }

  // ── 2) 快照不存在 → 退回 Supabase pooler（仍是 Supabase，但至少不會壪掉） ──
  try {
    const { localQuery } = await import("@/lib/localFallback");

    if (table === "trips") {
      const rows = await localQuery<Record<string, unknown>>(
        tripId
          ? "select * from trips where id = $1 limit 1"
          : "select * from trips limit 5",
        tripId ? [tripId] : []
      );
      return NextResponse.json({ ok: true, source: "local-pooler", rows });
    }

    const rows = await localQuery<PostRow>(
      tripId
        ? `select * from posts where trip_id = $1 order by sort_order asc`
        : `select * from posts order by sort_order asc`,
      tripId ? [tripId] : []
    );

    const withLocalImages = rows.map((p) => ({
      ...p,
      image_url: p.image_url
        ? `/api/local-image?postId=${encodeURIComponent(p.id)}&w=1200`
        : null,
      original_image_url: p.image_url,
    }));

    return NextResponse.json({
      ok: true,
      source: "local-pooler",
      count: withLocalImages.length,
      rows: withLocalImages,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `內容快照與 pooler 都無法取得資料: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
