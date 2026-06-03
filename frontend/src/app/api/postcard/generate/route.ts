/**
 * POST /api/postcard/generate
 * Body: { prompt: string }
 * Server-side proxy for MiniMax image generation (keeps API key off the client).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/minimax";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt: string };
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const images = await generateImage({
      prompt,
      aspectRatio: "9:16",
      n: 1,
      // 9:16 postcard — no subject_reference (postcard uses t2i)
    });

    return NextResponse.json({ image: images[0]?.base64 ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "generate failed" }, { status: 500 });
  }
}
