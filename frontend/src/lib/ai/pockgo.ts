/**
 * Pockgo API client — server-side only.
 *
 * 2026-06-12 rewrite per rentry.org/tangguoapi spec (USER 提供).
 *
 * Wraps pockgo.com's OpenAI-compatible `/v1/chat/completions` endpoint for
 * text-to-image generation via Gemini models (default: gemini-3.1-flash-image-preview-4k).
 *
 * Flow:
 *   1. POST chat/completions with prompt → response contains Markdown image
 *      `![image](https://cloudflarer2.nananobanana.com/png/...)` in message.content
 *   2. Server fetches the cloudflarer2 URL → converts to base64
 *   3. Returns GeneratedImage[] matching minimax.ts interface
 *
 * ⚠️ pockgo 圖床 URL 24h 過期 — 必須 server 端立刻下載轉 base64
 * ⚠️ AI_IMAGE_API_URL 環境變數只放 base (e.g. https://newapi.pockgo.com/v1/),
 *    code 自動補 chat/completions. 若 env 含完整 path 也會自動 strip.
 * ⚠️ 4K model 出圖 ~30-50s, Netlify free 30s cap 會撞牆, 需 Pro $19/mo
 */

import type { GeneratedImage } from "./minimax";

function getApiKey(): string {
  const key = process.env.AI_IMAGE_API_KEY;
  if (!key) throw new Error("AI_IMAGE_API_KEY not configured (check .env.local)");
  return key;
}

/**
 * AI_IMAGE_API_URL 兼容 3 種輸入:
 *   1. https://newapi.pockgo.com           → 加 /v1/
 *   2. https://newapi.pockgo.com/v1        → 加 /
 *   3. https://newapi.pockgo.com/v1/       → 原樣
 *   4. https://newapi.pockgo.com/v1/chat/completions  → strip 最後段
 * 統一回 https://newapi.pockgo.com/v1/
 */
function getApiBaseUrl(): string {
  const raw = process.env.AI_IMAGE_API_URL || "https://newapi.pockgo.com/v1/";
  let u = raw.replace(/\/+$/, "");              // 去尾斜線
  // 砍掉 /v1/chat/completions 之類的尾段
  u = u.replace(/\/(v1|chat|completions)(\/(v1|chat|completions))*$/i, "/v1");
  // 沒 /v1 結尾就補
  if (!/\/v1$/i.test(u)) u = u + "/v1";
  return u + "/";
}

function getModel(): string {
  return process.env.AI_MODEL_3 || "gemini-3.1-flash-image-preview-4k";
}

const DEFAULT_TIMEOUT = 55_000;  // 4K gemini-3.1 出圖 ~30-50s, 留 5s buffer
const DOWNLOAD_TIMEOUT = 30_000; // 4K 圖大, 下載可能 15-25s
const ASPECT_RATIO = "9:16";     // postcard 固定直式

/**
 * 從 content 字串抽出第一張圖 URL。
 * pockgo 回傳 `![image](https://...)` Markdown 格式。
 * 退路：找任何 https URL（含 .png/.jpg/.jpeg/.webp 結尾）。
 */
function extractImageUrl(content: string): string {
  const md = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
  if (md) return md[1];
  const ext = content.match(/(https?:\/\/[^\s\)\]\"\'\']+\.(?:png|jpg|jpeg|webp|gif))/i);
  if (ext) return ext[1];
  const any = content.match(/(https?:\/\/[^\s\)\]\"\'\']+)/);
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
 * Per rentry 規格:
 * - content 是 array of {type: text/image_url, ...} (multi-part)
 * - 9:16 比例: extra_body.imageConfig.aspectRatio + 開頭 system message
 * - max_tokens: 150 (文件建議)
 * - temperature: 0.7
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
      // 9:16 比例控制 — 透過 extra_body + 開頭 system message (rentry 規格)
      extra_body: {
        imageConfig: {
          aspectRatio: ASPECT_RATIO,
        },
      },
      messages: [
        {
          role: "system",
          content: JSON.stringify({ imageConfig: { aspectRatio: ASPECT_RATIO } }),
        },
        {
          role: "user",
          // content 是 array, 跟 OpenAI multi-part 一樣 (rentry 規格)
          content: [
            { type: "text", text: opts.prompt },
          ],
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
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
  const sizeKB = Math.round(base64.length / 1024);
  console.log(`[pockgo] ${model} 圖生成 OK  gen=${t1 - t0}ms  url=${imageUrl.slice(0, 60)}...  base64=${sizeKB}KB`);
  if (sizeKB > 1500) {
    console.warn(`[pockgo] WARN: 4K image ${sizeKB}KB > 1.5MB, browser memory risk`);
  }
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
