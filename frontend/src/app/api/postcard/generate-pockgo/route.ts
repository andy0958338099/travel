/**
 * POST /api/postcard/generate-pockgo
 * Body: { prompt: string, model?: string, autoFallback?: boolean }
 *
 * Server-side proxy for pockgo image generation (keeps API key off client).
 * Parallel to /api/postcard/generate (which uses MiniMax) — UI lets user pick.
 *
 * 2026-06-11 added: pockgo via AI_IMAGE_API_KEY + AI_IMAGE_API_URL env vars.
 * 2026-06-14 聖上拍板: model 不再從 env 讀, 完全 client-side 控制 (聖上原話:
 *   「避免寫在 netlify 環境變數, 而要一直改來改去」). Client 從 25 個 model 庫選.
 * 2026-06-14 聖上拍板 A: 加 fallback 機制, 第 1 選失敗且是 no-channel → fallback
 *   到 FALLBACK_MODEL. UI 透過 autoFallback flag 控制 (預設 true).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateImageWithFallback } from "@/lib/ai/pockgo";

// 2026-06-23 中堂加: gpt-image-2-2k Q版 prompt 出圖 60-90s 撞 60s 上限, dev 改 120s
// 2026-06-23 USER 拍板: 不要換 model (gpt-image-2-2k 才是 8 天 Q版全景圖的選),
//   所以 dev/prod 拆: dev=120s localhost 跑得完, prod=60s 守 Netlify Pro $19/mo 60s 上限
// Fallback 機制下: 主失敗 + 備模型重試 → 最多 2x, 60s 還是不夠但 UI 會看到「主+備都失敗」報錯
export const maxDuration = process.env.NODE_ENV === "production" ? 60 : 120;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, autoFallback } = (await req.json()) as {
      prompt: string;
      model?: string;
      autoFallback?: boolean;
    };
    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const result = await generateImageWithFallback({ prompt, model, autoFallback });
    return NextResponse.json({
      image: result.base64,
      // 2026-06-14: 新加 3 欄位讓 UI 知道實際出圖 model + 是否 fallback
      model: result.modelUsed,        // 實際出圖成功的 model (向後相容: 舊 client 讀這個)
      modelRequested: model || "fallback",  // client 選的
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason ?? null,
    });
  } catch (e: any) {
    // 2026-06-14 聖上怒修法 B: PockgoFallbackError 帶 .details 結構化錯誤
    // 聖上看得到「主: qwen no-channel | 備: gemini 4xx timeout」具體原因
    if (e?.details) {
      return NextResponse.json({
        error: e.message || "pockgo generate failed",
        details: e.details,
      }, { status: 500 });
    }
    return NextResponse.json({ error: e.message || "pockgo generate failed" }, { status: 500 });
  }
}
