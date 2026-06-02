/**
 * GET /api/manga/feed
 * Query: ?sourceType=attraction|food&day=1&characterId=...
 *
 * Returns ready/partial travel_mangas, newest first, with optional filters.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const sourceType = searchParams.get("sourceType");
  const characterId = searchParams.get("characterId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

  let q = supabase
    .from("travel_mangas")
    .select("*")
    .in("status", ["ready", "partial"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (sourceType) q = q.eq("source_type", sourceType);
  if (characterId) q = q.eq("character_id", characterId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ mangas: data || [], count: data?.length || 0 });
}
