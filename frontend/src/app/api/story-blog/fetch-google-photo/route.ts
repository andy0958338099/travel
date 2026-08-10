import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // 用 Node.js runtime, 需要 Buffer / @supabase/supabase-js

/**
 * 🆕 2026-08-10 聖上拍板: 公開 Google 相簿 short URL → 自動下載到 Supabase Storage
 *
 * 流程:
 *   1. 接收 photos.app.goo.gl/xxx 或 lh3.googleusercontent.com/pw/...
 *   2. server-side fetch (支援 short URL redirect)
 *   3. short URL 自動跟 redirect → 拿到 lh3.googleusercontent.com 真實 URL
 *   4. 抓 bytes
 *   5. 上傳到 travel-photos bucket (story-uploads/ 子目錄)
 *   6. 回 public URL
 *
 * 邊界:
 *   - 僅支援「公開相簿」(任何人能看的 photos.app.goo.gl/...)
 *   - 不支援私人相簿 (要 OAuth login)
 *   - maxSize 10MB (超過拒絕, 防 memory)
 *   - Content-Type 必須 image/*
 *
 * Body: { url: string, fileName?: string }
 * Response: { publicUrl: string, path: string, width?, height? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url: string = body?.url;
    if (!url) {
      return NextResponse.json({ error: "missing url param" }, { status: 400 });
    }

    // 1. Whitelist: 只允許 Google Photos domain
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
    const allowed = [
      "photos.app.goo.gl",         // short URL (會 redirect 到 lh3 或 photos.google.com)
      "lh3.googleusercontent.com",  // 公開相簿單張直連
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "lh6.googleusercontent.com",
      "googleusercontent.com",
    ];
    if (parsed.protocol !== "https:" || !allowed.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
      return NextResponse.json({ error: `domain not allowed: ${parsed.hostname}` }, { status: 403 });
    }

    // 2. Server-side fetch (支援 redirect)
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; travel-photo-fetch/1.0)" },
      redirect: "follow", // 預設就是 follow, 但明確寫
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status} ${upstream.statusText}` }, { status: 502 });
    }

    // 3. Content-Type check (拒絕 HTML / JSON 等)
    const contentType = upstream.headers.get("Content-Type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: `not an image: ${contentType}` }, { status: 415 });
    }

    // 4. Size limit 10MB
    const contentLength = Number(upstream.headers.get("Content-Length") || 0);
    if (contentLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: `image too large: ${contentLength} bytes (max 10MB)` }, { status: 413 });
    }
    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: `image too large after fetch: ${arrayBuffer.byteLength} bytes` }, { status: 413 });
    }
    const bytes = new Uint8Array(arrayBuffer);

    // 5. 推到 Supabase Storage (service_role 寫入, 跨 origin 不受 CORS 限制)
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_KEY not configured" }, { status: 500 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // 副檔名推導
    const ext =
      contentType.includes("jpeg") ? "jpg" :
      contentType.includes("png") ? "png" :
      contentType.includes("webp") ? "webp" :
      contentType.includes("heic") ? "heic" :
      "jpg"; // 預設
    const fileName = body?.fileName || `google-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `story-uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("travel-photos")
      .upload(path, bytes, { upsert: false, contentType });
    if (uploadError) {
      return NextResponse.json({ error: `storage upload: ${uploadError.message}` }, { status: 500 });
    }

    // 6. 拿 public URL
    const { data: pub } = supabase.storage.from("travel-photos").getPublicUrl(path);

    return NextResponse.json({
      publicUrl: pub.publicUrl,
      path,
      contentType,
      size: arrayBuffer.byteLength,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
