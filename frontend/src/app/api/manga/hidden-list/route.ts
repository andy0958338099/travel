/**
 * GET /api/manga/hidden-list
 * Query: ?sourceType=attraction|food (optional)
 *
 * 2026-07-02 聖上拍板配套 API — 給 client 啟動時讀「雲端已隱藏 sourceIds 列表」
 * 用於 MangaStudio 啟動時跟 feed 交叉過濾, 不要被 feed 過濾後又因 localStorage 失準
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get("sourceType");

  let q = supabase.from("manga_hidden").select("source_id, source_type, hidden_at");
  if (sourceType) q = q.eq("source_type", sourceType);

  const { data, error } = await q;
  if (error) {
    console.error("[manga/hidden-list] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    hiddenIds: (data || []).map((r) => r.source_id),
    count: data?.length || 0,
  });
}
