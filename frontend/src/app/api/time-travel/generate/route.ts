/**
 * POST /api/time-travel/generate
 *
 * 古風寫真 (Gufeng Zhenren) — 同步 pipeline (修 cold start + Worker 30s cap 撞牆問題)。
 *
 * 舊架構 (fire-and-forget via Worker): Netlify function 1s INSERT + forward → Worker 30s cap 撞 cold start
 * 新架構 (同步跑完): Netlify function 0.5s INSERT + 直接 await MiniMax + Supabase upload + DB PATCH
 *   - 總時間 3s cold + 25s MiniMax + 1s upload + 0.1s DB = 29.1s, 在 Netlify free plan 30s 內 ✅
 *   - 避免 Worker ctx.waitUntil 被 cdn 30s cap 取消 (早上 9:57 跟 10:00 失敗原因)
 *
 * Body: {
 *   userFingerprint, sourceAttractionId?, sourceAttractionName?, sourceAttractionCategory?,
 *   originalPhotoUrl, costumeStyle, costumeStyleKey
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SUPABASE_BUCKET = "user-attraction-photos";
const TABLE = "user_attraction_photos";

// Netlify free plan 上限 (skill netlify-deployment-debugging §1a)
export const maxDuration = 30;

interface GenerateRequest {
  userFingerprint: string;
  sourceAttractionId?: string;
  sourceAttractionName?: string;
  sourceAttractionCategory?: string;
  originalPhotoUrl: string;
  costumeStyle: string;
  costumeStyleKey: string;
}

function buildPrompt(args: {
  costumeStyle: string;
  attractionName?: string;
  category?: string;
}): string {
  const { costumeStyle, attractionName, category } = args;
  const scene = attractionName
    ? `${attractionName} (${category || "景點"}) as the backdrop`
    : "ancient Jiangnan town as the backdrop";
  return [
    `Photorealistic portrait of a person wearing ${costumeStyle},`,
    `standing gracefully in ${scene},`,
    `soft golden hour light, ornate traditional accessories,`,
    `gentle breeze, shallow depth of field, cinematic color grading,`,
    `high detail fabric texture, museum-quality costume, 8K.`,
  ].join(" ");
}

function getSupabasePublicUrl(bucket: string, path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

async function markRowFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  photoId: string,
  reason: string
) {
  // 2026-06-07: 寫 error_message 到 row (中堂修 5 failed 找不到原因的 bug)
  // - supabase 需要聖上先跑 ALTER TABLE user_attraction_photos ADD COLUMN error_message text
  // - 欄位不存在時 fallback 只寫 status, 不丟整個 pipeline (try/catch 包住)
  try {
    await supabase
      .from(TABLE)
      .update({
        status: "failed",
        error_message: reason.slice(0, 2000),  // 截斷避免超長
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);
  } catch (e: any) {
    console.error(`[time-travel/generate] ${photoId} markRowFailed w/ error_message failed (${e?.message}), fallback to status only`);
    await supabase
      .from(TABLE)
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);
  }
  console.error(`[time-travel/generate] ${photoId} failed: ${reason}`);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = (await req.json()) as GenerateRequest;
  const {
    userFingerprint,
    sourceAttractionId,
    sourceAttractionName,
    sourceAttractionCategory,
    originalPhotoUrl,
    costumeStyle,
    costumeStyleKey,
  } = body;

  // ── 1) 驗證 inputs ──
  if (!userFingerprint || !originalPhotoUrl || !costumeStyle || !costumeStyleKey) {
    return NextResponse.json(
      {
        error: "userFingerprint, originalPhotoUrl, costumeStyle, costumeStyleKey required",
      },
      { status: 400 }
    );
  }

  // ── 2) 驗證 env (避免早上 06-04 「MINIMAX_API_KEY not configured」) ──
  const mmKey = process.env.MINIMAX_API_KEY;
  if (!mmKey) {
    return NextResponse.json(
      { error: "MINIMAX_API_KEY not configured (Netlify function env)" },
      { status: 500 }
    );
  }

  // ── 3) INSERT user_attraction_photos row, status=generating ──
  const photoId = crypto.randomUUID();
  const prompt = buildPrompt({
    costumeStyle,
    attractionName: sourceAttractionName,
    category: sourceAttractionCategory,
  });

  const insertData = {
    id: photoId,
    user_fingerprint: userFingerprint,
    source_attraction_id: sourceAttractionId || null,
    source_attraction_name: sourceAttractionName || null,
    source_attraction_category: sourceAttractionCategory || null,
    original_photo_url: originalPhotoUrl,
    generated_photo_url: null,
    costume_style: costumeStyle,
    costume_style_key: costumeStyleKey,
    prompt,
    status: "generating",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertErr } = await supabase.from(TABLE).insert(insertData);
  if (insertErr) {
    return NextResponse.json(
      { error: `insert failed: ${insertErr.message}` },
      { status: 500 }
    );
  }

  // ── 4) 同步跑 pipeline: MiniMax (15s) + Supabase uploads (2s) + DB UPDATE (0.1s)
  //   總時間 3s cold + 1s ref upload + 15s MiniMax + 1s result upload + 0.1s DB = 20.1s, 大 buffer ✅
  // 2026-06-07 修法: dataURL → Supabase Storage → public URL, 給 MiniMax image_file
  //   - MiniMax 文件要求 image_file 是 https URL, dataURL 觸發 schema validation 拒絕
  //   - 4 個 ready 是 MiniMax 寬容, 5 個 fail 是 strict 模式
  const mmStart = Date.now();
  try {
    // 4a-prep) 解析 ref image: dataURL → 上傳 Supabase Storage → public URL
    //   - dataURL (手機上傳或 canvas.toDataURL) → 拆 base64, upload, 拿 public URL
    //   - https URL (pickedAttraction.cover) → 直接用
    //   - 空字串 → 不送 subject_reference (純 text-to-image)
    let refImageUrl: string | null = null;
    if (originalPhotoUrl) {
      if (originalPhotoUrl.startsWith("data:")) {
        const base64Part = originalPhotoUrl.split(",")[1];
        if (!base64Part) throw new Error("invalid data URL (no base64 part)");
        const refBytes = Uint8Array.from(atob(base64Part), (c) => c.charCodeAt(0));
        const refPath = `${photoId}_ref.jpg`;
        const refUploadStart = Date.now();
        const refUploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${refPath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
              "Content-Type": "image/jpeg",
              "x-upsert": "true",
            },
            body: refBytes,
          }
        );
        if (!refUploadRes.ok) {
          const errText = await refUploadRes.text();
          throw new Error(`Ref image upload ${refUploadRes.status}: ${errText.slice(0, 200)}`);
        }
        refImageUrl = getSupabasePublicUrl(SUPABASE_BUCKET, refPath);
        const refUploadElapsed = ((Date.now() - refUploadStart) / 1000).toFixed(1);
        console.log(`[time-travel/generate] ${photoId}: ref upload ok (${refUploadElapsed}s, ${(refBytes.length / 1024).toFixed(0)}KB) → ${refImageUrl}`);
      } else if (originalPhotoUrl.startsWith("http://") || originalPhotoUrl.startsWith("https://")) {
        refImageUrl = originalPhotoUrl;
      } else {
        throw new Error(`originalPhotoUrl 必須是 data: URL 或 http(s) URL, 收到: ${originalPhotoUrl.slice(0, 50)}...`);
      }
    }

    // 4a) MiniMax image_generation (i2i via subject_reference, image_file 必須 https URL)
    const mmBody: Record<string, unknown> = {
      model: "image-01",
      prompt: prompt || "A person in traditional Song dynasty costume, ancient Jiangnan backdrop, photorealistic, soft golden hour light, 8K",
      aspect_ratio: "3:4",
      n: 1,
      response_format: "base64",
      prompt_optimizer: true,
    };
    if (refImageUrl) {
      mmBody.subject_reference = [{ type: "character", image_file: refImageUrl }];
    }

    const mmRes = await fetch("https://api.minimax.io/v1/image_generation", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mmKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mmBody),
    });
    const mmData = await mmRes.json();
    const mmElapsed = ((Date.now() - mmStart) / 1000).toFixed(1);

    if (mmData.base_resp?.status_code !== 0) {
      throw new Error(
        `MiniMax error: ${mmData.base_resp?.status_msg || JSON.stringify(mmData.base_resp)}`
      );
    }
    const base64 = mmData.data?.image_base64?.[0];
    if (!base64) {
      throw new Error(
        `MiniMax returned 0 images (failed=${mmData.metadata?.failed_count || "?"})`
      );
    }
    console.log(`[time-travel/generate] ${photoId}: MiniMax ok (${mmElapsed}s, ${(base64.length / 1024).toFixed(0)}KB b64)`);

    // 4b) Supabase Storage upload
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const objectPath = `${photoId}.jpg`;
    const uploadStart = Date.now();
    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
          "Content-Type": "image/jpeg",
          "x-upsert": "true",
        },
        body: bytes,
      }
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Supabase upload ${uploadRes.status}: ${errText.slice(0, 200)}`);
    }
    const uploadElapsed = ((Date.now() - uploadStart) / 1000).toFixed(1);
    console.log(`[time-travel/generate] ${photoId}: upload ok (${uploadElapsed}s, ${(bytes.length / 1024).toFixed(0)}KB)`);

    // 4c) UPDATE row, status=ready
    const publicUrl = getSupabasePublicUrl(SUPABASE_BUCKET, objectPath);
    const { error: updateErr } = await supabase
      .from(TABLE)
      .update({
        generated_photo_url: publicUrl,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", photoId);
    if (updateErr) {
      throw new Error(`DB update failed: ${updateErr.message}`);
    }

    console.log(`[time-travel/generate] ${photoId}: row updated to status=ready`);
    return NextResponse.json(
      {
        photoId,
        status: "ready",
        generatedPhotoUrl: publicUrl,
        elapsedMs: Date.now() - mmStart,
      },
      { status: 200 }
    );
  } catch (e: any) {
    await markRowFailed(supabase, photoId, e?.message || String(e));
    return NextResponse.json(
      { error: e?.message || "pipeline failed", photoId, status: "failed" },
      { status: 500 }
    );
  }
}
