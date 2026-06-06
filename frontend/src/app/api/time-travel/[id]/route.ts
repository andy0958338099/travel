/**
 * DELETE /api/time-travel/[id]
 *
 * 刪除一張古風寫真。限本人刪 — header `x-user-fingerprint` 必須匹配 row 的 user_fingerprint。
 *
 * 流程:
 *   1. 取 row (id from path)
 *   2. 比對 fingerprint header vs row.user_fingerprint → 403 if not match
 *   3. 嘗試刪 storage 內的 generated_photo_url (best-effort, 失敗不擋)
 *   4. DELETE row (CASCADE 刪 ratings)
 *
 * Response: 204 No Content
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fingerprint = req.headers.get("x-user-fingerprint");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!fingerprint) {
    return NextResponse.json(
      { error: "x-user-fingerprint header required" },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  // ── 1) 撈 row 確認 owner ──
  const { data: photo, error: fetchErr } = await supabase
    .from("user_attraction_photos")
    .select("id, user_fingerprint, generated_photo_url")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!photo) {
    return NextResponse.json({ error: "photo not found" }, { status: 404 });
  }
  if (photo.user_fingerprint !== fingerprint) {
    return NextResponse.json(
      { error: "forbidden: not the owner" },
      { status: 403 }
    );
  }

  // ── 2) Best-effort 刪 storage object (忽略錯誤) ──
  if (photo.generated_photo_url) {
    try {
      // 從 public URL 抽 storage path:
      //   <SUPABASE_URL>/storage/v1/object/public/user-attraction-photos/<path>
      const marker = "/storage/v1/object/public/user-attraction-photos/";
      const idx = photo.generated_photo_url.indexOf(marker);
      if (idx >= 0) {
        const storagePath = photo.generated_photo_url.slice(idx + marker.length);
        await supabase.storage
          .from("user-attraction-photos")
          .remove([storagePath]);
      }
    } catch {
      // storage 刪失敗不擋 row 刪除
    }
  }

  // ── 3) DELETE row (CASCADE 刪 ratings) ──
  const { error: delErr } = await supabase
    .from("user_attraction_photos")
    .delete()
    .eq("id", id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
