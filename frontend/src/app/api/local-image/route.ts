/**
 * GET /api/local-image?postId=<uuid>&w=1200
 *
 * 🆕 2026-11-15: 部落格圖片代理（線上 Blobs / 本機磁碟 雙來源）
 *
 * 背景：Supabase Storage 被 spend cap 限制（402 `exceed_cached_egress_quota`），
 * 線上站圖片全破。本地開發靠 `frontend/data/archive/` 的本機存檔救回圖片，
 * 但 Netlify serverless 沒有本機磁碟。
 *
 * 解法：
 *   - 線上（serverless）：讀 Netlify Blobs store `blog-images`
 *   - 本地（dev）：讀 `frontend/data/archive/.../images/` 磁碟
 *
 * 兩邊檔名規則一致：`<post_id 前 8 碼>-<原始檔名>`，
 * 由 `content/site-content.json` 的 imageIndex 提供 postId → key 對照。
 *
 * 只讀，不做任何寫入。
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { localImageDirExists } from "@/lib/localFallback";
import { getSiteContent } from "@/lib/siteContent";
import { getBlobImage } from "@/lib/blogImageSource";

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

/** 依 post id 在本機磁碟找檔 */
function findLocalFile(postId: string, name: string): string | null {
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

  return file;
}

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId") || "";
  const name = req.nextUrl.searchParams.get("name") || "";
  const wParam = Number(req.nextUrl.searchParams.get("w") || "");

  // ── 來源 1: 本機磁碟（本地開發優先，快） ──
  if (localImageDirExists()) {
    const file = findLocalFile(postId, name);
    if (file) {
      try {
        const buf = fs.readFileSync(file);
        return respondWithImage(buf, path.extname(file).toLowerCase(), wParam);
      } catch {
        return NextResponse.json({ error: "讀取圖片失敗" }, { status: 500 });
      }
    }
  }

  // ── 來源 2: Netlify Blobs（線上正式路徑） ──
  if (postId.length >= 8) {
    try {
      const content = await getSiteContent();
      const key =
        content?.imageIndex?.[postId] ||
        // fallback: 直接用前綴推導（多數情況檔名就是 postId 前綴開頭）
        null;

      if (key) {
        const buf = await getBlobImage(key);
        if (buf) {
          const ext = path.extname(key).toLowerCase();
          return respondWithImage(buf, ext, wParam);
        }
      }
    } catch (e) {
      console.error("[local-image] Blobs 取圖失敗:", (e as Error).message);
    }
  }

  return NextResponse.json({ error: "找不到圖片" }, { status: 404 });
}

/** 統一回應（含選用縮圖） */
async function respondWithImage(
  buf: Buffer,
  ext: string,
  wParam: number
): Promise<NextResponse> {
  // 支援縮圖（?w=800）—— 原圖常是 3000x4000 / 3MB+，直接給瀏覽器太重
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
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
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
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
    },
  });
}
