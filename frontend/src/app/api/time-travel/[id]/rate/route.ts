/**
 * POST /api/time-travel/[id]/rate
 *
 * 古風寫真評價 (按讚 / 倒讚 / 留言), 同一 fingerprint 對同一張圖只能有一筆 rating。
 *
 * Body: { userFingerprint: string, isLike: boolean | null, comment: string | null }
 *
 * 流程:
 *   1. UPSERT user_attraction_ratings ON CONFLICT (photo_id, user_fingerprint)
 *      - isLike=null 表示「不評價 (中性)」, 通常用於只留 comment 的場景
 *      - isLike=true → like, false → dislike
 *   2. 重算 like_count / dislike_count / comment_count (GROUP BY 全表掃過該 photo_id)
 *   3. UPDATE user_attraction_photos 同步 count
 *
 * Response 200: { like_count, dislike_count, comment_count }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface RateBody {
  userFingerprint: string;
  isLike: boolean | null;
  comment: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: photoId } = await params;
  const body = (await req.json()) as RateBody;
  const { userFingerprint, isLike, comment } = body;

  if (!photoId || !userFingerprint) {
    return NextResponse.json(
      { error: "photoId (path) + userFingerprint required" },
      { status: 400 }
    );
  }
  if (isLike === undefined && comment === undefined) {
    return NextResponse.json(
      { error: "isLike or comment required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // ── 1) 確認 photo 存在 ──
  const { data: photo } = await supabase
    .from("user_attraction_photos")
    .select("id")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }

  // ── 2) UPSERT rating (unique(photo_id, user_fingerprint) 防重複) ──
  const { error: upsertErr } = await supabase
    .from("user_attraction_ratings")
    .upsert(
      {
        photo_id: photoId,
        user_fingerprint: userFingerprint,
        is_like: isLike,
        comment: comment || null,
      },
      { onConflict: "photo_id,user_fingerprint" }
    );
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // ── 3) 重算 count — 撈全部 ratings 對這張 photo, 用 JS 計數 (RSC 友善, 避免 RPC) ──
  const { data: ratings, error: countErr } = await supabase
    .from("user_attraction_ratings")
    .select("is_like, comment")
    .eq("photo_id", photoId);
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  let likeCount = 0;
  let dislikeCount = 0;
  let commentCount = 0;
  for (const r of ratings || []) {
    if (r.is_like === true) likeCount++;
    else if (r.is_like === false) dislikeCount++;
    if (r.comment && r.comment.trim().length > 0) commentCount++;
  }

  // ── 4) UPDATE parent photo 同步 count ──
  await supabase
    .from("user_attraction_photos")
    .update({
      like_count: likeCount,
      dislike_count: dislikeCount,
      comment_count: commentCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", photoId);

  return NextResponse.json({
    like_count: likeCount,
    dislike_count: dislikeCount,
    comment_count: commentCount,
  });
}
