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

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ mangas: data || [], count: data?.length || 0 });
}
