/**
 * GET /api/manga/feed
 * Query: ?sourceType=attraction|food&day=1&characterId=...&status=ready|generating|all
 *
 * Returns travel_mangas (ready/partial/generating/failed), newest first, with
 * optional filters. Generating is included so the UI can show progress instead
 * of silently hiding in-flight cards after a page refresh.
 *
 * Default status filter: ready + partial + generating (excluding failed).
 * Pass ?status=ready to show only finished cards, or ?status=all to include failed.
 *
 * 2026-07-02 聖上拍板: 自動過濾 manga_hidden (雲端共享隱藏清單),
 * 跨裝置同步: Brian/B Mana 不需要的卡片, 任何一人按 × 後所有人都看不到。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get("sourceType");
  const characterId = searchParams.get("characterId");
  const statusParam = searchParams.get("status") || "active"; // active | ready | all
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

  // 🆕 2026-07-02 先讀雲端隱藏清單, not-in 過濾
  const hiddenQ = supabase.from("manga_hidden").select("source_id");
  const hiddenRes = sourceType
    ? await hiddenQ.eq("source_type", sourceType)
    : await hiddenQ;
  const hiddenIds = (hiddenRes.data || []).map((r) => r.source_id);

  let q = supabase
    .from("travel_mangas")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  // status filter:
  //   "ready"    → only finished
  //   "active"   → ready + partial + generating (default — for normal feed)
  //   "all"      → include failed too
  if (statusParam === "ready") {
    q = q.in("status", ["ready", "partial"]);
  } else if (statusParam === "active") {
    q = q.in("status", ["ready", "partial", "generating"]);
  } else if (statusParam === "all") {
    // no filter
  }

  if (sourceType) q = q.eq("source_type", sourceType);
  if (characterId) q = q.eq("character_id", characterId);

  // 套用雲端隱藏過濾 (not-in 排除 hiddenIds)
  if (hiddenIds.length > 0) {
    // PostgREST filter: source_id=in.(id1,id2,id3) 等價 SQL: source_id IN (...). 用 in.(...) 而不是 in(...) 避免空值。
    const csv = `(${hiddenIds.join(",")})`;
    q = q.not("source_id", "in", csv);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    mangas: data || [],
    count: data?.length || 0,
    hiddenCount: hiddenIds.length, // 給 UI 顯示「已隱藏 N 個」
  });
}
