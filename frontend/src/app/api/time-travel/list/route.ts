/**
 * GET /api/time-travel/list
 *
 * Query:
 *   status          = "ready" (default) | "generating" | "failed" | "all"
 *   limit           = default 50, max 200
 *   userFingerprint = optional; if set, only return this user's photos
 *
 * Returns newest-first user_attraction_photos, with optional status / owner filter.
 * (跟 manga/feed 一致結構, 但 table 換 user_attraction_photos, status enum 不同)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") || "ready").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const userFingerprint = searchParams.get("userFingerprint");

  let q = supabase
    .from("user_attraction_photos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // status filter:
  //   "ready"      → only finished (default)
  //   "generating" → still in flight
  //   "failed"     → errored
  //   "all"        → no filter
  if (statusParam !== "all") {
    q = q.eq("status", statusParam);
  }

  if (userFingerprint) {
    q = q.eq("user_fingerprint", userFingerprint);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    photos: data || [],
    count: data?.length || 0,
  });
}
