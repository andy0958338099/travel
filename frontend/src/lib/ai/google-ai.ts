/**
 * Google Generative AI 直接 call (2026-06-14 聖上拍板)
 *
 * 背景: USER distributor (pockgo) 客觀只 1 個 model (gemini-2.5-flash-image) 有 channel,
 * 其他 24 個 model distributor 沒 channel → 503 no-channel.
 *
 * 聖上 6-14 拍板: 加 minimax 以外的 provider 直接 call, USER 提供 API key 透過 client-side localStorage.
 * (USER 6-12 拍板「API key 改來改去要 client-side」一致)
 *
 * 用法 (client 端):
 *   import { generateImageGoogle } from "@/lib/ai/google-ai";
 *   const result = await generateImageGoogle({
 *     prompt, model: "imagen-3.0-generate-002", apiKey: userKey, base64: true
 *   });
 */

export interface GoogleGenOpts {
  prompt: string;
  model?: string;            // 預設 "imagen-3.0-generate-002"
  apiKey: string;            // USER 透過 client-side localStorage 傳入
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  base64?: boolean;          // true = 回 base64 string, false = 回 URL
}

export interface GoogleGenResult {
  base64: string;            // data URL 或純 base64
  model: string;
  latencyMs: number;
}

/**
 * 直接 call Google Generative AI API (imagen-3 / gemini-2.0-flash-preview-image-generation)
 * 不透過 pockgo distributor
 *
 * 走 2 種 endpoint:
 *   1. imagen-3.0:    https://generativelanguage.googleapis.com/v1beta/models/{model}:predict
 *   2. gemini-2-image: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export async function generateImageGoogle(opts: GoogleGenOpts): Promise<GoogleGenResult> {
  const t0 = Date.now();
  const model = opts.model || "imagen-3.0-generate-002";
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("google api key required (USER 必須在 UI 填 API key)");

  const isImagen = model.startsWith("imagen");
  const endpoint = isImagen
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let body: any;
  if (isImagen) {
    body = {
      instances: [{ prompt: opts.prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: opts.aspectRatio || "16:9",
        personGeneration: "dont_allow",
        safetyFilterLevel: "block_few",
      },
    };
  } else {
    // gemini-2.0-flash-preview-image-generation 等
    body = {
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(55_000),
  });

  const latencyMs = Date.now() - t0;
  const txt = await res.text();
  if (!res.ok) {
    // 解析 Google API 錯誤
    let msg = txt.slice(0, 300);
    try { msg = JSON.parse(txt)?.error?.message || msg; } catch { /* not JSON */ }
    throw new Error(`google ${model} ${res.status}: ${msg}`);
  }
  const data = JSON.parse(txt);
  // 解析: imagen 回 predictions[0].bytesBase64Encoded, gemini 回 candidates[0].content.parts[i].inlineData.data
  let b64: string | undefined;
  if (isImagen) {
    b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  } else {
    for (const part of data?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
    }
  }
  if (!b64) {
    throw new Error(`google ${model} 200 但無圖: ${txt.slice(0, 200)}`);
  }
  return { base64: b64, model, latencyMs };
}
