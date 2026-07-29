import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/photo-proxy?url=<encoded>
 *
 * 🆕 7-29 聖上實證: Google 相簿圖片 server 不送 CORS header, client fetch 失敗
 * 解法: Next.js server proxy. 從 client 端 POST {url}, server 端用 fetch (server-to-server 不受 CORS 限制),
 *        然後把圖片 bytes 回傳 client.
 *
 * 限制: 僅 GET, 限定 URL 開頭是 https://lh3.googleusercontent.com 或 https://photo.google.com
 *       (避免被當 open proxy 給外部攻擊用)
 *
 * 部署注意: Netlify edge functions 有 request body 限制 4MB 上傳, 我們只 GET bytes,
 *           所以下游 fetch 結果若太大 (>4MB) 也會 fail — 但實際 HEIC/JPG 通常 2-5MB OK.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string | undefined = body?.url;
    if (!url) {
      return NextResponse.json({ error: "missing url param" }, { status: 400 });
    }

    // Whitelist: 僅允許 Google Photos domains 通過 proxy
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
    const allowed = ["lh3.googleusercontent.com", "lh4.googleusercontent.com", "lh5.googleusercontent.com", "lh6.googleusercontent.com", "photo.google.com", "photos.google.com", "googleusercontent.com"];
    if (parsed.protocol !== "https:" || !allowed.some((d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`))) {
      return NextResponse.json({ error: `domain not allowed: ${parsed.hostname}` }, { status: 403 });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; travel-photo-proxy/1.0)" },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: `upstream ${upstream.status}` }, { status: 502 });
    }
    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("Content-Type") || "image/jpeg";

    // 直接把 bytes 回傳, Content-Type 透傳
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
