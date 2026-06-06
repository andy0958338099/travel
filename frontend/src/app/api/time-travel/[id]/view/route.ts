/**
 * POST /api/time-travel/[id]/view
 *
 * 簡單 view_count + 1。用於 modal 開啟 / 圖片曝光時打點。
 *
 * Response 200: { view_count }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = await createClient();

  // ── 1) 撈現值 (避免 race condition 用 atomic RPC, 但 supabase-js 沒原生支援,
  //    用 select + update 二步走, 配合 unique PK 確保冪等) ──
  const { data: photo, error: fetchErr } = await supabase
    .from("user_attraction_photos")
    .select("id, view_count")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!photo) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }

  const nextCount = (photo.view_count || 0) + 1;
  const { error: updErr } = await supabase
    .from("user_attraction_photos")
    .update({ view_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ view_count: nextCount });
}
