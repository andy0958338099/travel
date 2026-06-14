/**
 * POST /api/postcard/generate-google
 * Body: { prompt, model?, aspectRatio?, apiKey? }
 *
 * 2026-06-14 聖上拍板: minimax 以外的 provider 直接 call (繞過 pockgo distributor)
 * 聖上 6-12 拍板「API key 改來改去要 client-side」一致:
 *   - apiKey 透過 request body 傳入 (不寫 Netlify env)
 *   - USER 在 ClientPage UI 填 Google API key 存 localStorage
 *
 * 用法:
 *   fetch("/api/postcard/generate-google", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ prompt, model: "imagen-3.0-generate-002", apiKey: userKey })
 *   })
 */
import { NextRequest, NextResponse } from "next/server";
import { generateImageGoogle } from "@/lib/ai/google-ai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, aspectRatio, apiKey } = (await req.json()) as {
      prompt?: string;
      model?: string;
      aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
      apiKey?: string;
    };
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "apiKey required (USER 必須在 UI 填 Google API key)" }, { status: 400 });

    const result = await generateImageGoogle({ prompt, model, aspectRatio, apiKey });
    return NextResponse.json({
      image: result.base64,         // base64 PNG
      model: result.model,
      latencyMs: result.latencyMs,
      provider: "google",            // 跟 pockgo / minimax 區分
    });
  } catch (e: any) {
    const msg = String(e?.message || "unknown");
    return NextResponse.json({ error: msg.slice(0, 500) }, { status: 500 });
  }
}
