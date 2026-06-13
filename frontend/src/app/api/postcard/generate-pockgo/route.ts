/**
 * POST /api/postcard/generate-pockgo
 * Body: { prompt: string, model?: string }
 *
 * Server-side proxy for pockgo image generation (keeps API key off client).
 * Parallel to /api/postcard/generate (which uses MiniMax) — UI lets user pick.
 *
 * 2026-06-11 added: pockgo via AI_IMAGE_API_KEY + AI_IMAGE_API_URL env vars.
 * 2026-06-14 聖上拍板: model 不再從 env 讀, 完全 client-side 控制 (聖上原話:
 *   「避免寫在 netlify 環境變數, 而要一直改來改去」). Client 從 25 個 model 庫選.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/pockgo";

// 2026-06-12: gemini-3.1-flash-image-preview-4k 出圖 ~12-40s, 設 60s 留 buffer (4K 偶爾撞 30s)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = (await req.json()) as { prompt: string; model?: string };
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const images = await generateImage({ prompt, model });
    return NextResponse.json({ image: images[0]?.base64 ?? null, model: model || "fallback" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "pockgo generate failed" }, { status: 500 });
  }
}
