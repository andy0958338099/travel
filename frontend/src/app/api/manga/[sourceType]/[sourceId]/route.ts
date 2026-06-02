/**
 * GET /api/manga/[sourceType]/[sourceId]
 * Returns one travel_mangas row.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceType: string; sourceId: string }> }
) {
  const { sourceType, sourceId } = await params;
  const supabase = await createClient();
  const decoded = decodeURIComponent(sourceId);

  const { data, error } = await supabase
    .from("travel_mangas")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", decoded)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ manga: data });
}
