/**
 * POST /api/manga/hide
 * Body: { sourceId: string, sourceType?: "attraction" | "food" = "attraction" }
 *
 * 2026-07-02 聖上拍板: 雲端同步隱藏整張生成漫畫（hide flag，非 hard delete）。
 * - 任何裝置 hide → 雲端 manga_hidden 表新增 → /api/manga/feed 自動過濾 → 所有裝置看不到
 * - 任何裝置 unhide → 雲端刪除 → 雲端 feed 又會送下來 → 復原可逆
 * - 不刪 travel_mangas 本體 (所以原圖還在 storage，需要時可 unblock 復活)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { sourceId, sourceType } = (await req.json()) as {
    sourceId: string;
    sourceType?: string;
  };

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("manga_hidden")
    .upsert(
      {
        source_id: sourceId,
        source_type: sourceType || "attraction",
        hidden_at: new Date().toISOString(),
      },
      { onConflict: "source_id" }
    );

  if (error) {
    console.error("[manga/hide] upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sourceId });
}
