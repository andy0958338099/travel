/**
 * POST /api/story-blog/upload-photo
 *
 * 🅒 8-8 聖上拍板: 從 Google Photos lh3 URL 加照片進候選池 — 上傳到 Supabase Storage
 *
 * Body: { path: string, contentType: string, base64: string }
 * Response: { publicUrl: string }
 *
 * 用 service_role key 寫 (RLS bypass), 確保 anon key 上傳限制被繞過
 * 路徑限制: 必須是 day1/, day2/, ... day8/ 開頭 (避免任意路徑攻擊)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

interface UploadRequest {
  path: string;
  contentType: string;
  base64: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json();

    if (!body.path || !body.base64 || !body.contentType) {
      return NextResponse.json(
        { error: "missing required fields (path, contentType, base64)" },
        { status: 400 }
      );
    }

    // 路徑白名單: day1/ ~ day8/ 開頭
    const allowedPrefix = /^day[1-8]\/[a-zA-Z0-9._-]+$/;
    if (!allowedPrefix.test(body.path)) {
      return NextResponse.json(
        { error: `path 必須是 day1/ ~ day8/ 開頭 (例如 day1/lh3-12345.jpg)` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_KEY 或 SUPABASE_URL 未設定" },
        { status: 500 }
      );
    }

    // 用 service_role key 建立 admin client (RLS bypass)
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // base64 → Uint8Array
    const bytes = Uint8Array.from(atob(body.base64), (c) => c.charCodeAt(0));

    const { data, error } = await supabase.storage
      .from("travel-photos")
      .upload(body.path, bytes, {
        contentType: body.contentType,
        upsert: true, // 同名覆蓋
      });

    if (error) {
      // 409 conflict (檔案已存在) 視為成功 — upsert 模式理論上不會有,但保險
      if (error.message?.includes("already exists") || error.message?.includes("Duplicate")) {
        // continue to getPublicUrl
      } else {
        return NextResponse.json(
          { error: `storage upload failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const { data: urlData } = supabase.storage
      .from("travel-photos")
      .getPublicUrl(body.path);

    return NextResponse.json({
      publicUrl: urlData.publicUrl,
      path: body.path,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
