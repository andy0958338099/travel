import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * POST /api/import-photo-from-path
 *
 * 🆕 2026-07-27 聖上拍板: 給本機檔案路徑, server 直接讀 + 抽 EXIF + 上傳 Supabase
 *   - 只在 localhost dev server 跑得通 (server 讀聖上 Mac 檔案系統)
 *   - 部署到 Netlify 後失效 (serverless 讀不到 Mac 本機)
 *
 * 流程 (每個 path):
 *   1. fs.readFile 讀檔
 *   2. exiftool 抽 DateTimeOriginal + GPS
 *   3. 算 day (1-8) + hour
 *   4. 上傳到 Supabase Storage (service_role, bypass RLS)
 *   5. 寫 travel_photo_meta (service_role, bypass RLS)
 *
 * Input:  { paths: string[] }
 * Output: { results: [{ path, ok, day?, hour?, error? }] }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paths: string[] = Array.isArray(body.paths) ? body.paths : [];
    if (paths.length === 0) {
      return NextResponse.json({ error: "paths 是空 array" }, { status: 400 });
    }
    if (paths.length > 50) {
      return NextResponse.json({ error: "一次最多 50 個檔案, 請分批" }, { status: 400 });
    }

    // Service role 寫 Supabase (bypass RLS, server-side 用)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    if (!supabaseServiceKey) {
      return NextResponse.json({
        error: "SUPABASE_SERVICE_KEY 沒設在 .env.local, server 寫不了",
      }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const DAY_MAP: Record<string, number> = {
      "2026-07-17": 1, "2026-07-18": 2, "2026-07-19": 3, "2026-07-20": 4,
      "2026-07-21": 5, "2026-07-22": 6, "2026-07-23": 7, "2026-07-24": 8,
    };

    const results: any[] = [];
    for (const filePath of paths) {
      try {
        // 1. 讀檔 + 驗證存在
        let buf: Buffer;
        try {
          await stat(filePath);
          buf = await readFile(filePath);
        } catch (e: any) {
          results.push({ path: filePath, ok: false, error: `讀檔失敗: ${e.message}` });
          continue;
        }

        // 2. 跑 exiftool 抽 EXIF
        let exif: any = {};
        try {
          const out = execSync(
            `exiftool -s -j -DateTimeOriginal -OffsetTime -CreateDate -GPSLatitude -GPSLatitudeRef -GPSLongitude -GPSLongitudeRef -Make -Model "${filePath}"`,
            { encoding: "utf-8", timeout: 5000 }
          );
          exif = JSON.parse(out)[0] || {};
        } catch (e: any) {
          results.push({ path: filePath, ok: false, error: `exiftool 失敗: ${e.message?.slice(0, 200)}` });
          continue;
        }

        // 3. 算 day + hour
        const dto: string = exif.DateTimeOriginal || exif.CreateDate;
        if (!dto) {
          results.push({ path: filePath, ok: false, error: "EXIF 沒有 DateTimeOriginal" });
          continue;
        }
        // EXIF 格式: "2026:07:17 07:27:22" 或 "2026:07:17 07:27:22+08:00"
        const m = dto.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (!m) {
          results.push({ path: filePath, ok: false, error: `EXIF 日期格式不對: ${dto}` });
          continue;
        }
        const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
        const day = DAY_MAP[dateStr];
        if (!day) {
          results.push({ path: filePath, ok: false, error: `拍攝日 ${dateStr} 不在 8 天行程` });
          continue;
        }
        const hour = parseInt(m[4]);
        const hh = String(hour).padStart(2, "0");
        const mm = String(parseInt(m[5])).padStart(2, "0");
        const ss = String(parseInt(m[6])).padStart(2, "0");
        const datetime_original = `${dateStr}T${hh}:${mm}:${ss}+00:00`;

        // 4. 上傳到 Supabase Storage
        const filename = basename(filePath);
        const stem = filename.replace(/\.[^.]+$/, "");
        const ext = extname(filename).slice(1) || "jpg";
        const storagePath = `${dateStr}/${randomUUID()}_${stem}.${ext}`;
        const contentType = ext.toLowerCase() === "heic" ? "image/heic" : "image/jpeg";
        const { error: uploadErr } = await supabase.storage
          .from("travel-photos")
          .upload(storagePath, buf, { contentType, upsert: true });
        if (uploadErr) {
          results.push({ path: filePath, ok: false, error: `Storage 上傳: ${uploadErr.message}` });
          continue;
        }
        const { data: publicUrl } = supabase.storage
          .from("travel-photos")
          .getPublicUrl(storagePath);

        // 5. 寫 DB
        // GPS 轉 decimal
        const toDec = (dms: string, ref: string) => {
          if (!dms) return null;
          const m = dms.match(/(\d+)\s*deg\s*(\d+)'\s*([\d.]+)"/);
          if (!m) return null;
          let v = parseInt(m[1]) + parseInt(m[2]) / 60 + parseFloat(m[3]) / 3600;
          if (ref === "S" || ref === "W") v = -v;
          return v;
        };
        const lat = toDec(exif.GPSLatitude, exif.GPSLatitudeRef);
        const lng = toDec(exif.GPSLongitude, exif.GPSLongitudeRef);

        const { data: inserted, error: insertErr } = await supabase
          .from("travel_photo_meta")
          .insert({
            filename,
            day,
            hour,
            datetime_original,
            lat,
            lng,
            location_name: null,
            google_photos_thumb_url: publicUrl.publicUrl,
          })
          .select("id")
          .single();
        if (insertErr) {
          results.push({ path: filePath, ok: false, error: `DB 寫入: ${insertErr.message}` });
          continue;
        }
        results.push({
          path: filePath,
          ok: true,
          photoId: inserted?.id,
          filename,
          day,
          hour,
          publicUrl: publicUrl.publicUrl,
        });
      } catch (e: any) {
        results.push({ path: filePath, ok: false, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
