/**
 * GET /api/local-image?postId=<uuid>
 *
 * 🆕 2026-11-14: 本地圖片代理（Supabase Storage 被限流時的替代來源）
 *
 * 當 Supabase Storage 回 402（專案被 spend cap 限制）時，部落格的圖片會全部破圖。
 * 這支 route 從本地存檔（frontend/data/archive/2026-10-06-story-blog/images/）
 * 直接提供部落格的照片，檔名規則是 `<post_id 前 8 碼>-<原檔名>`。
 *
 * 只讀本地檔案，不做任何寫入。
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { localImageDirExists } from "@/lib/localFallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_IMAGE_DIR = path.join(
  process.cwd(),
  "data",
  "archive",
  "2026-10-06-story-blog",
  "images"
);

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(req: NextRequest) {
  if (!localImageDirExists()) {
    return NextResponse.json(
      { error: "本地圖片存檔不存在" },
      { status: 404 }
    );
  }

  const postId = req.nextUrl.searchParams.get("postId") || "";
  const name = req.nextUrl.searchParams.get("name") || "";

  let file: string | null = null;

  // 1) 以 post id 前綴比對（最可靠）
  if (postId.length >= 8) {
    const prefix = postId.slice(0, 8);
    try {
      const candidates = fs
        .readdirSync(LOCAL_IMAGE_DIR)
        .filter((f) => f.startsWith(prefix));
      if (candidates.length === 1) {
        file = path.join(LOCAL_IMAGE_DIR, candidates[0]);
      }
    } catch {
      // ignore
    }
  }

  // 2) 以檔名直接比對
  if (!file && name) {
    const safe = path.basename(name);
    const direct = path.join(LOCAL_IMAGE_DIR, safe);
    if (fs.existsSync(direct)) file = direct;
  }

  if (!file) {
    return NextResponse.json({ error: "找不到本地圖片" }, { status: 404 });
  }

  try {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).toLowerCase();

    // 支援縮圖（?w=800）—— 原圖常是 3000x4000 / 3MB+，直接給瀏覽器太重
    const wParam = Number(req.nextUrl.searchParams.get("w") || "");
    if (Number.isFinite(wParam) && wParam > 0 && wParam <= 2400) {
      try {
        const sharp = (await import("sharp")).default;
        const resized = await sharp(buf)
          .resize({ width: Math.round(wParam), withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer();
        return new NextResponse(new Uint8Array(resized), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(resized.byteLength),
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        // sharp 失敗就回原圖
      }
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "讀取圖片失敗" }, { status: 500 });
  }
}
