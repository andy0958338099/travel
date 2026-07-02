/**
 * POST /api/manga/unhide
 * Body: { sourceId: string }
 *
 * 2026-07-02 聖上拍板配套 API — 解除隱藏, 雲端 feed 又會送下來。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { sourceId } = (await req.json()) as { sourceId: string };

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("manga_hidden")
    .delete()
    .eq("source_id", sourceId);

  if (error) {
    console.error("[manga/unhide] delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sourceId });
}
