/**
 * Pockgo API client — server-side only.
 *
 * Wraps pockgo.com's OpenAI-compatible `/v1/chat/completions` endpoint for
 * text-to-image generation via Gemini models.
 *
 * Flow:
 *   1. POST chat/completions with prompt → response contains Markdown image
 *      `![image](https://cloudflarer2.nananobanana.com/png/...)` in message.content
 *   2. Server fetches the cloudflarer2 URL → converts to base64
 *   3. Returns GeneratedImage[] matching minimax.ts interface
 *
 * ⚠️ pockgo 圖床 URL 24h 過期 — 必須 server 端立刻下載轉 base64
 * ⚠️ API_IMAGE_URL 環境變數已含 `/v1/` 結尾，code 只 append `chat/completions`
 */

import type { GeneratedImage } from "./minimax";

function getApiKey(): string {
  const key = process.env.AI_IMAGE_API_KEY;
  if (!key) throw new Error("AI_IMAGE_API_KEY not configured (check .env.local)");
  return key;
}

function getApiBaseUrl(): string {
  const raw = process.env.AI_IMAGE_API_URL || "https://newapi.pockgo.com/v1/";
  // 統一 strip 結尾斜線，然後保證有 /v1/
  const trimmed = raw.replace(/\/+$/, "");
  if (/\/v1$/.test(trimmed)) return trimmed + "/";
  // 沒 /v1 就補上
  return trimmed + "/v1/";
}

function getModel(): string {
  return process.env.AI_MODEL_3 || "gemini-2.5-flash-image";
}

const DEFAULT_TIMEOUT = 30_000; // 30s（gemini 已知 ~10s，留 buffer）
const DOWNLOAD_TIMEOUT = 15_000;

/**
 * 從 content 字串抽出第一張圖 URL。
 * pockgo 回傳 `![image](https://...)` Markdown 格式。
 * 退路：找任何 https URL（含 .png/.jpg/.jpeg/.webp 結尾）。
 */
function extractImageUrl(content: string): string {
  const md = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (md) return md[1];
  const ext = content.match(/(https?:\/\/[^\s\)\]"\']+\.(?:png|jpg|jpeg|webp|gif))/i);
  if (ext) return ext[1];
  const any = content.match(/(https?:\/\/[^\s\)\]"\']+)/);
  if (any) return any[1];
  throw new Error("pockgo response missing image URL");
}

/**
 * Server 端下載 pockgo 圖床 URL，轉 base64。
 * 因為 cloudflarer2 URL 24h 過期，前端不能直接持有 URL。
 */
async function downloadToBase64(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
  if (!res.ok) throw new Error(`image download ${res.status}: ${url.slice(0, 80)}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // 用 chunk 避免 stack overflow on 大圖
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return Buffer.from(binary, "binary").toString("base64");
}

export interface GenerateImageOpts {
  prompt: string;
}

/**
 * 走 pockgo chat completions 生成單張圖，回傳 base64 字串。
 *
 * 不像 minimax 支援 i2i 跟多 n — pockgo Gemini 走 chat content array 可加 image_url，
 * 但這次只做 t2i 跟 minimax 對照測試。
 */
export async function generatePockgoImage(opts: GenerateImageOpts): Promise<string> {
  const apiKey = getApiKey();
  const base = getApiBaseUrl();
  const model = getModel();
  const endpoint = `${base}chat/completions`;

  const t0 = Date.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "user", content: opts.prompt },
      ],
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`pockgo ${model} ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error(`pockgo response missing content: ${JSON.stringify(data).slice(0, 300)}`);
  }

  const imageUrl = extractImageUrl(content);
  const base64 = await downloadToBase64(imageUrl);
  const t1 = Date.now();
  console.log(`[pockgo] ${model} 圖生成 OK  gen=${t1 - t0}ms  url=${imageUrl.slice(0, 60)}...  base64=${Math.round(base64.length / 1024)}KB`);
  return base64;
}

/**
 * 對外 main entry — 回傳 GeneratedImage[] 形狀跟 minimax.generateImage 一致，
 * 方便 route 跟 client 不用 switch type。
 */
export async function generateImage(opts: GenerateImageOpts): Promise<GeneratedImage[]> {
  const base64 = await generatePockgoImage(opts);
  return [{ base64, success: true }];
}
