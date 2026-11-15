/**
 * GET /api/posts-fallback?trip_id=<uuid>
 *
 * 🆕 2026-11-14: Supabase REST 不可用時的部落格資料來源
 *
 * Supabase 專案被 spend cap 限制時（402 exceed_cached_egress_quota），
 * 前端 createClient() 拿不到 posts，部落格顯示「0 個故事」。
 * 這支 route 改走 pooler 直連 Postgres（同一份 DB，資料不分叉），
 * 並把 image_url 改寫成本地圖片代理網址。
 *
 * 只讀。回傳格式與 `supabase.from('posts').select('*')` 一致。
 */

import { NextRequest, NextResponse } from "next/server";
import { localQuery } from "@/lib/localFallback";

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

export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get("trip_id");
  const table = req.nextUrl.searchParams.get("table") || "posts";

  // 只開放白名單表，避免變成任意 SQL 查詢入口
  if (!["posts", "trips"].includes(table)) {
    return NextResponse.json({ error: "不支援的表" }, { status: 400 });
  }

  try {
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

    // image_url 改寫成本地圖片代理（檔名規則：<post_id 前 8 碼>-<原檔名>）
    const withLocalImages = rows.map((p) => ({
      ...p,
      image_url: p.image_url
        ? `/api/local-image?postId=${encodeURIComponent(p.id)}&w=1200`
        : null,
      // 保留原始 Storage 網址，方便之後恢復時比對
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
      { error: `本地 fallback 失敗: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
