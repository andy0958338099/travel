/**
 * POST /api/time-travel/generate
 *
 * 古風寫真 (Gufeng Zhenren) — 觸發一張時空穿越寫真生成。
 *
 * Body: {
 *   userFingerprint: string,
 *   sourceAttractionId?: string,
 *   sourceAttractionName?: string,
 *   sourceAttractionCategory?: string,
 *   originalPhotoUrl: string,           // 使用者上傳的原圖 (URL or data URI)
 *   costumeStyle: string,               // e.g. "Tang dynasty scholar robes"
 *   costumeStyleKey: string,            // e.g. "tang_scholar"
 * }
 *
 * Fire-and-forget 架構 (跟 manga/generate 一致):
 *   1. Netlify function = 輕 orchestrator。 maxDuration=10s。
 *      - 驗證 inputs
 *      - INSERT user_attraction_photos row, status=generating
 *      - 組 prompt (costumeStyle + 景點)
 *      - Forward 到 Cloudflare Worker `image/i2i` endpoint
 *   2. Cloudflare Worker = 背景 pipeline (event.waitUntil, 沒 Netlify 30s 上限)
 *      - 調 MiniMax i2i (~10-15s)
 *      - Upload 到 Supabase Storage user-attraction-photos bucket
 *      - UPDATE row, status=ready (with generated_photo_url) or failed
 *   3. Frontend = 開 modal 立即看 spinner, 訂閱 Supabase Realtime 拿 ready 圖。
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_WORKER_URL = "https://jiangnan-trip.andy0958338099.workers.dev";

export const maxDuration = 10; // fire-and-forget: orchestrator only, ~1-2s

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

  if (!userFingerprint || !originalPhotoUrl || !costumeStyle || !costumeStyleKey) {
    return NextResponse.json(
      {
        error:
          "userFingerprint, originalPhotoUrl, costumeStyle, costumeStyleKey required",
      },
      { status: 400 }
    );
  }

  // ── 1) INSERT user_attraction_photos row, status=generating ──
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

  const { error: insertErr } = await supabase
    .from("user_attraction_photos")
    .insert(insertData);
  if (insertErr) {
    return NextResponse.json(
      { error: `insert failed: ${insertErr.message}` },
      { status: 500 }
    );
  }

  // ── 2) Fire-and-forget: 呼叫 Worker, Worker 立即回 202 + 背景跑 i2i + upload + update ──
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL;
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "image/i2i",
        payload: {
          photoId,
          userFingerprint,
          imageUrl: originalPhotoUrl,
          prompt,
          // 提示 Worker 寫回的 bucket / 行 / 狀態欄位
          table: "user_attraction_photos",
          storageBucket: "user-attraction-photos",
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Worker ${res.status}`);

    // 立即回 user — 不等 background 完成
    return NextResponse.json(
      {
        photoId,
        status: "generating",
        acceptedAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (e: any) {
    // Worker 沒接受 → 標記 failed, user 可看錯誤
    await supabase
      .from("user_attraction_photos")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", photoId);
    return NextResponse.json(
      { error: e.message || "worker dispatch failed", photoId },
      { status: 502 }
    );
  }
}
