/**
 * POST /api/manga/like
 * Body: { mangaId: string, fingerprint: string, action: "like" | "unlike" }
 *
 * Pure-anon like: identifies "me" via localStorage UUID (fingerprint).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { mangaId, fingerprint, action } = (await req.json()) as {
    mangaId: string;
    fingerprint: string;
    action: "like" | "unlike";
  };

  if (!mangaId || !fingerprint) {
    return NextResponse.json({ error: "mangaId + fingerprint required" }, { status: 400 });
  }

  if (action === "unlike") {
    await supabase
      .from("manga_likes")
      .delete()
      .eq("manga_id", mangaId)
      .eq("user_fingerprint", fingerprint);
  } else {
    await supabase
      .from("manga_likes")
      .upsert(
        { manga_id: mangaId, user_fingerprint: fingerprint },
        { onConflict: "manga_id,user_fingerprint" }
      );
  }

  // Recount
  const { count } = await supabase
    .from("manga_likes")
    .select("*", { count: "exact", head: true })
    .eq("manga_id", mangaId);

  await supabase
    .from("travel_mangas")
    .update({ like_count: count || 0 })
    .eq("id", mangaId);

  return NextResponse.json({ liked: action === "like", likeCount: count || 0 });
}
