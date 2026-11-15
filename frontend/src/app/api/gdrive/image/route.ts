/**
 * GET /api/gdrive/image?fileId=<driveFileId>&w=<width>
 *
 * Google Drive 的私人檔案不能直接用 lh3.googleusercontent.com/d/<id> 取（那是公開檔案用的）。
 * 這支 route 用我們的 refresh token 換 access token，再代理 Drive 的檔案內容，
 * 讓部落格的 <img src> 指向它就能顯示私人照片。
 *
 * 設計：
 *   - 只接受 image/* 的 MIME type，避免被當成任意檔案下載管道
 *   - access token 由 googleDrive.ts 統一快取與續期
 *   - 轉發 Range header，讓瀏覽器可以分段載入大圖
 *   - w 參數：伺服器端縮圖。Drive 原圖常是 3000x4000 / 1.5MB+，
 *     直接給瀏覽器會讓頁面很慢，所以改抓 Drive 的 thumbnailLink（Google 端已縮好的圖）
 *     再用 sharp 微調，最後落地磁碟快取。
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getAccessToken, getDriveFile, isImageMime } from "@/lib/googleDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 縮圖快取目錄（放進 .gitignore，不進版控） */
const CACHE_DIR = path.join(process.cwd(), ".cache", "gdrive-images");

function cachePath(fileId: string, width: number) {
  const safe = fileId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}@${width}.jpg`);
}

/**
 * 取 Drive 圖片的 bytes。
 * 優先用 Drive 的 thumbnailLink（Google 端已縮圖，流量小），
 * 拿不到才退回 alt=media 原檔。
 */
async function fetchImageBytes(
  fileId: string,
  token: string,
  thumbnailLink: string | undefined,
  width: number
): Promise<Buffer | null> {
  // 1) thumbnailLink：把尾端的 =sNNN 換成想要的尺寸
  if (thumbnailLink) {
    try {
      const sized = thumbnailLink.replace(/=s\d+$/, `=s${Math.min(width, 1600)}`);
      const res = await fetch(sized, { cache: "no-store" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 0) return buf;
      }
    } catch {
      // 忽略，改走原檔
    }
  }

  // 2) 退回原檔
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  // w 參數：要求伺服器端縮圖，避免瀏覽器下載 3000x4000 原檔（單張可達 1.5MB+）
  const widthParam = Number(req.nextUrl.searchParams.get("w") || "");
  const wantResize = Number.isFinite(widthParam) && widthParam > 0 && widthParam <= 2400;
  const clientRange = req.headers.get("range");

  const headers = new Headers();
  headers.set("Cache-Control", "private, max-age=86400");
  headers.set("Content-Disposition", "inline");

  // ── 縮圖路徑（含磁碟快取）────────────────────────────
  if (wantResize && !clientRange) {
    const targetWidth = Math.round(widthParam);
    const cacheFile = cachePath(fileId, targetWidth);

    // 先查磁碟快取（命中就不用打任何 Drive API，最快）
    try {
      const cached = await fs.readFile(cacheFile);
      headers.set("Content-Type", "image/jpeg");
      headers.set("Content-Length", String(cached.byteLength));
      headers.set("X-Cache", "HIT");
      return new NextResponse(new Uint8Array(cached), { status: 200, headers });
    } catch {
      // 沒快取，往下走
    }
  }

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Google Drive 憑證未就緒（缺 refresh token 或 client）" },
      { status: 503 }
    );
  }

  // 先查 metadata，確認這是圖片（避免變成任意檔案代理）
  const meta = await getDriveFile(fileId);
  if (!meta) {
    return NextResponse.json({ error: "找不到檔案或無權存取" }, { status: 404 });
  }
  if (!isImageMime(meta.mimeType)) {
    return NextResponse.json(
      { error: `只允許圖片，該檔案類型為 ${meta.mimeType}` },
      { status: 415 }
    );
  }

  if (wantResize && !clientRange) {
    const targetWidth = Math.round(widthParam);
    const cacheFile = cachePath(fileId, targetWidth);

    const raw = await fetchImageBytes(fileId, token, meta.thumbnailLink, targetWidth);
    if (!raw) {
      return NextResponse.json({ error: "無法讀取 Drive 檔案內容" }, { status: 502 });
    }

    let out = raw;
    let ctype = meta.mimeType;
    try {
      const sharp = (await import("sharp")).default;
      out = await sharp(raw)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      ctype = "image/jpeg";
    } catch {
      // sharp 失敗就回原圖
    }

    // 寫入磁碟快取（失敗不影響回應）
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${cacheFile}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(tmp, out);
      await fs.rename(tmp, cacheFile);
    } catch {
      // 略過
    }

    headers.set("Content-Type", ctype);
    headers.set("Content-Length", String(out.byteLength));
    headers.set("X-Cache", "MISS");
    return new NextResponse(new Uint8Array(out), { status: 200, headers });
  }

  // ── 原檔路徑（支援 Range）──────────────────────────────
  const upstream = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(clientRange ? { Range: clientRange } : {}),
      },
      cache: "no-store",
    }
  );

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `Drive 回 ${upstream.status}` },
      { status: upstream.status }
    );
  }

  headers.set("Content-Type", meta.mimeType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
