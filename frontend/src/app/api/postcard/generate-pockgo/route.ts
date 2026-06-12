/**
 * POST /api/postcard/generate-pockgo
 * Body: { prompt: string }
 *
 * Server-side proxy for pockgo image generation (keeps API key off client).
 * Parallel to /api/postcard/generate (which uses MiniMax) — UI lets user pick.
 *
 * 2026-06-11 added: pockgo via AI_IMAGE_API_KEY + AI_IMAGE_API_URL + AI_MODEL_3 env vars.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/pockgo";

// 2026-06-12: 4K gemini-3.1 出圖 ~30-50s, free plan 30s cap 會撞, 設 60 給 Pro plan
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt: string };
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const images = await generateImage({ prompt });
    return NextResponse.json({ image: images[0]?.base64 ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "pockgo generate failed" }, { status: 500 });
  }
}
