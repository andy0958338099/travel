import { NextRequest, NextResponse } from "next/server";
import {
  hasDriveCredentials,
  listDriveFolder,
  getAccessToken,
  driveImageUrl,
  isImageMime,
  type DriveFile,
} from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/gdrive/files?folderId=<id>
 *
 * 🆕 2026-11-14: 列出 Google Drive 資料夾底下的圖片，供「照片改存 Drive」功能使用。
 *
 * 查詢參數：
 *   folderId  — Drive 資料夾 ID（省略則用 env 的 GOOGLE_DRIVE_FOLDER_ID）
 *   mimeType  — 只取此 MIME type 前綴（預設 image/）
 *   limit     — 最多回傳幾筆（預設 200，上限 1000）
 *
 * 回應：
 *   { ok, folderId, count, files: [{ id, name, mimeType, size, url, thumbnailUrl }] }
 *
 * 權限檢查：需要 .env.local 有
 *   GOOGLE_PHOTOS_CLIENT_ID / GOOGLE_PHOTOS_CLIENT_SECRET / GOOGLE_DRIVE_REFRESH_TOKEN
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderId =
    searchParams.get("folderId") || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
  const mimeType = searchParams.get("mimeType") ?? "image/";
  const limit = Math.min(
    Number(searchParams.get("limit") || 200) || 200,
    1000
  );

  if (!hasDriveCredentials()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Drive 憑證未設定。需要 GOOGLE_PHOTOS_CLIENT_ID / GOOGLE_PHOTOS_CLIENT_SECRET / GOOGLE_DRIVE_REFRESH_TOKEN",
        hint: "執行 scripts/google-drive-oauth.mjs 取得 refresh_token",
      },
      { status: 503 }
    );
  }

  if (!folderId) {
    return NextResponse.json(
      {
        ok: false,
        error: "缺少 folderId 查詢參數，且未設定 GOOGLE_DRIVE_FOLDER_ID",
      },
      { status: 400 }
    );
  }

  const files = await listDriveFolder(folderId, { mimeType, pageSize: limit });
  const images = files.filter((f) => isImageMime(f.mimeType));

  return NextResponse.json({
    ok: true,
    folderId,
    count: images.length,
    files: images.map((f: DriveFile) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      // 直接可放進 <img src> 的網址（Google CDN）
      url: driveImageUrl(f.id),
      thumbnailUrl: f.thumbnailLink || driveImageUrl(f.id, 400),
      // 存進 posts.image_url 的 token
      token: `gdrive:${f.id}`,
    })),
  });
}

/**
 * POST /api/gdrive/files
 *
 * 🆕 2026-11-14: 把 Drive 檔案綁到某則部落格文章（不動其他欄位）。
 *
 * Body: { postId: string, fileId: string }
 *
 * 行為：
 *   1. 驗證 Drive 檔案存在（呼叫 Drive API）
 *   2. 只更新 posts.image_url 為 `gdrive:<fileId>`
 *   3. 回傳更新後的 post
 *
 * 注意：這是唯一會寫入 gdrive token 的路徑，其餘欄位完全不動。
 */
export async function POST(req: NextRequest) {
  let body: { postId?: string; fileId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const { postId, fileId } = body;
  if (!postId || !fileId) {
    return NextResponse.json(
      { ok: false, error: "postId 與 fileId 皆為必填" },
      { status: 400 }
    );
  }

  if (!hasDriveCredentials()) {
    return NextResponse.json(
      { ok: false, error: "Google Drive 憑證未設定" },
      { status: 503 }
    );
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "無法取得 Google access token" },
      { status: 502 }
    );
  }

  // 驗證檔案存在
  const checkUrl = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`
  );
  checkUrl.searchParams.set("fields", "id,name,mimeType");
  checkUrl.searchParams.set("supportsAllDrives", "true");
  const checkRes = await fetch(checkUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!checkRes.ok) {
    return NextResponse.json(
      { ok: false, error: `Drive 檔案不存在或無權存取 (${checkRes.status})` },
      { status: 400 }
    );
  }
  const fileInfo = await checkRes.json();

  // 只更新 image_url
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  const { data, error } = await supabase
    .from("posts")
    .update({ image_url: `gdrive:${fileId}` })
    .eq("id", postId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    post: { ...data, image_url: driveImageUrl(fileId) },
    driveFile: fileInfo,
  });
}
