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

import { FALLBACK_MODEL } from "@/lib/pockgo-image-models";

// 2026-06-18 6bacbba 砍 minimax lib 後, GeneratedImage type 內聯
// 原本用於對齊 minimax.generateImage interface, 但我們只用 generateImageWithFallback
export interface GeneratedImage {
  base64: string;
  success: boolean;
}

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

// 2026-06-14 聖上拍板: model 完全 client-side 控制, 不再讀 Netlify env
// 從 request body 拿 model name, fallback 到 FALLBACK_MODEL (gemini-3.1-flash-image-preview-4k 6-12 4K verify 成功)
// 聖上原話: 「避免寫在 netlify 環境變數, 而要一直改來改去」
export function getModel(clientModel?: string): string {
  return clientModel || FALLBACK_MODEL;
}

// 2026-06-13 聖上換 qwen-image-2512 發現不生圖:
// pockgo /api/pricing 顯示 qwen-image-2512 endpoint=["openai"] (沒 gemini),
// 中堂之前 hard-code 的 extra_body.imageConfig + system message imageConfig 是
// Gemini API 專屬格式, OpenAI 端 model 收到不認的欄位 → 400 error → 無生成.
// 修法: 用 model name 前綴判斷, 走對應的 body schema.
function isGeminiModel(model: string): boolean {
  return /^gemini-/i.test(model);
}

// 2026-06-18 聖上拍板 B 案: env-driven, localhost + deploy 雙顧
//   - dev: 120s 給 gpt-image-2-2k 47s avg + Next.js HMR/compile buffer + retry safety
//   - prod: 55s 維持原值 (Netlify 30s 會先 kill function, 55s 永遠到不了, 但保守寫著備用)
const DEFAULT_TIMEOUT = process.env.NODE_ENV === "development" ? 120_000 : 55_000;
const DOWNLOAD_TIMEOUT = 30_000; // 4K 圖大, 下載 10-25s
const ASPECT_RATIO = "16:9";     // 2026-06-12: 聖上拍板橫式寬卡 (中國風 scroll painting)

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
  /** 2026-06-14: client 傳的 model name, 不再 env 預設 */
  model?: string;
}

/**
 * 2026-06-14 聖上拍板: 帶 fallback 的生圖選項
 *
 * 貼圖大亨 (sticker-tycoonV.801) AI_MODEL_3 + AI_MODEL 雙模型 fallback
 * 機制驗證有效, 旅遊明信片跟進。
 *
 * - 第 1 試: client 選的 model (clientModel)
 * - 第 2 試 (僅當第 1 試是「distributor 無 channel」): FALLBACK_MODEL
 * - 第 3 試失敗: throw
 *
 * USER distributor `newapi.pockgo.com` 客觀只有 1 個 model 有 channel
 * (`gemini-2.5-flash-image`), 其他 24 個 → 503 `No available channel for model ...`
 * Fallback 不修 distributor 政策, 但避免單一點擊直接 503 報錯。
 */
export interface GenerateImageWithFallbackOpts extends GenerateImageOpts {
  /** 預設 true. false 時跳過 fallback, 第 1 試失敗直接 throw */
  autoFallback?: boolean;
}

export interface GenerateImageWithFallbackResult {
  base64: string;
  /** 實際出圖成功的 model (可能 != client 選的) */
  modelUsed: string;
  /** 是否走了 fallback */
  isFallback: boolean;
  /** 走 fallback 的原因 (user-facing) */
  fallbackReason?: string;
}

/**
 * 識別「distributor 沒 channel」錯誤。pockgo 對沒 channel 的 model 會回 503 + 訊息含 "No available channel"。
 *
 * 兩種錯誤結構都要支援 (修法: USER 報「server 無詳細錯誤」, 根因是中堂原版只認 axios
 * .response 風格, 沒認 fetch 風格 Error("pockgo {model} {status}: {text}")):
 *   1. axios 風格: err.response.status === 503 && err.response.data.error.message 含 no-channel
 *   2. fetch 風格 (generatePockgoImage 用): err.message = "pockgo {model} {status}: {text}"
 */
function isNoChannelError(err: any): boolean {
  // axios 風格
  if (err?.response?.status === 503) {
    const msg = err?.response?.data?.error?.message || "";
    if (/No available channel/i.test(String(msg))) return true;
  }
  // fetch 風格: "pockgo {model} {status}: {text}"
  const msg = String(err?.message || "");
  const m = msg.match(/pockgo\s+\S+\s+(\d{3}):\s*([\s\S]+)/);
  if (m) {
    const status = parseInt(m[1], 10);
    const text = m[2];
    if (status === 503 && /No available channel/i.test(text)) return true;
  }
  return false;
}

/**
 * 提取 pockgo (或 fetch) 錯誤的結構化資訊, 給 client 端顯示。
 * - status: HTTP 狀態碼 (network 錯誤可能 null)
 * - message: distributor 錯誤訊息 (截 500 chars 避免 base64 爆炸)
 *
 * 兩種錯誤結構都要支援 (修法同上 isNoChannelError):
 *   1. axios 風格: err.response.status + err.response.data.error.message
 *   2. fetch 風格: err.message = "pockgo {model} {status}: {text}"
 */
function extractErrInfo(err: any, model: string): { model: string; status: number | null; message: string } {
  // axios 風格
  if (err?.response) {
    return {
      model,
      status: err.response.status ?? null,
      message: String(err.response.data?.error?.message || err.message || "unknown").slice(0, 500),
    };
  }
  // fetch 風格: "pockgo {model} {status}: {text}"
  const msg = String(err?.message || "");
  const m = msg.match(/pockgo\s+\S+\s+(\d{3}):\s*([\s\S]+)/);
  if (m) {
    return {
      model,
      status: parseInt(m[1], 10),
      message: m[2].slice(0, 500),
    };
  }
  // 完全沒結構 (network 錯誤 / TypeError), 用 message 兜底
  return {
    model,
    status: null,
    message: msg.slice(0, 500) || "unknown",
  };
}

/**
 * 2026-06-14 聖上怒修法 B: 結構化錯誤, 帶 .details 給 route 端回傳 client。
 *
 * 場景: 第 1 選失敗 (no-channel) → 跑 fallback → fallback 也失敗
 * USER 報「主+備都失敗」, 但 client 端只看到「❌ qwen-image-2512 出圖失敗」
 * 看不到 gemini 備失敗的具體原因 (timeout / 4xx / 5xx / 還是 distributor 政策)
 *
 * 修法: throw 自訂 Error class, 帶 .details 結構化欄位
 * route 端 catch e 看到 .details → response 帶給 client
 * client 端 toast/badge 顯示「主: X | 備: Y」具體錯誤
 */
export class PockgoFallbackError extends Error {
  details: {
    requested: string;
    mainError: { model: string; status: number | null; message: string };
    fallbackError: { model: string; status: number | null; message: string };
    autoFallback: boolean;
  };
  constructor(message: string, details: PockgoFallbackError["details"]) {
    super(message);
    this.name = "PockgoFallbackError";
    this.details = details;
  }
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
  const model = getModel(opts.model);
  const endpoint = `${base}chat/completions`;

  const t0 = Date.now();
  // 2026-06-13: 條件 body schema — gemini 用 imageConfig, 其他 (qwen/gpt-image/flux/dall-e/grok/seedream/hunyuan/nano-banana/z-image) 走 OpenAI 標準
  const gemini = isGeminiModel(model);
  const body: Record<string, unknown> = {
    model,
    messages: [
      ...(gemini
        ? [{
            role: "system" as const,
            // Gemini 用 JSON system message 帶 imageConfig (rentry 規格)
            content: JSON.stringify({ imageConfig: { aspectRatio: ASPECT_RATIO, imageSize: "4K" } }),
          }]
        : [{
            role: "system" as const,
            // OpenAI 端: 純文字 system 引導 16:9 寬卡 + 中國風, 不帶 imageConfig (model 不認)
            content: "You are a professional travel illustration generator. Always produce a single image in 16:9 ultra wide landscape aspect ratio. Follow the user's prompt exactly. Do not include any text, watermarks, or extra commentary in your reply other than the generated image.",
          }]),
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: opts.prompt },
        ],
      },
    ],
    max_tokens: 150,
    temperature: 0.7,
  };
  if (gemini) {
    // Gemini 專屬: extra_body.imageConfig + imageSize 4K (rentry 規格)
    body.extra_body = {
      imageConfig: {
        aspectRatio: ASPECT_RATIO,
        imageSize: "4K",
      },
    };
  }
  // OpenAI 端: 不傳 extra_body, 靠 prompt 文字引導 16:9 寬卡

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
 * 2026-06-18 6bacbba 砍 minimax 後改 inline type, 仍 export 兼容舊 client
 */
export async function generateImage(opts: GenerateImageOpts): Promise<GeneratedImage[]> {
  const base64 = await generatePockgoImage(opts);
  return [{ base64, success: true }];
}

/**
 * 2026-06-14 聖上拍板: 帶 fallback 的生圖 (主+備模型)。
 *
 * 流程:
 *   1. 用 client 選的 model 跑
 *   2. 失敗時, 如果 autoFallback !== false 且是「no channel」錯誤
 *      → 用 FALLBACK_MODEL 重試
 *   3. 仍失敗 → throw (route 端會回 500)
 *
 * 注意:
 *   - autoFallback=false 時, 第 1 試失敗直接 throw (USER 明確要「不要 fallback」)
 *   - 第 1 選 == FALLBACK_MODEL 時, fallback 跳過避免無限循環
 *   - 只對 no-channel 錯誤 fallback, 其他錯誤 (timeout / 400 / 5xx 等) 直接報
 *     避免掩蓋真問題
 */
export async function generateImageWithFallback(
  opts: GenerateImageWithFallbackOpts
): Promise<GenerateImageWithFallbackResult> {
  const requested = getModel(opts.model);
  const wantFallback = opts.autoFallback !== false;  // 預設 true
  const fallback = FALLBACK_MODEL;

  // 第 1 試: client 選的 model
  try {
    const base64 = await generatePockgoImage({ prompt: opts.prompt, model: requested });
    return { base64, modelUsed: requested, isFallback: false };
  } catch (err: any) {
    // USER 明確關掉 fallback → 直接報
    if (!wantFallback) {
      throw err;
    }
    // 不是 no-channel 錯誤 (timeout/400/5xx 等) → 直接報, 不掩蓋
    if (!isNoChannelError(err)) {
      throw err;
    }
    // 第 1 選 == fallback → 別循環, 直接報
    if (requested === fallback) {
      throw err;
    }

    // 第 2 試: fallback model
    const reason = `${requested} distributor 無 channel`;
    console.warn(`[pockgo] ⚠️ ${reason}, fallback 到 ${fallback}`);
    try {
      const base64 = await generatePockgoImage({ prompt: opts.prompt, model: fallback });
      console.log(`[pockgo] ✅ fallback ${fallback} 出圖 OK`);
      return { base64, modelUsed: fallback, isFallback: true, fallbackReason: reason };
    } catch (fallbackErr: any) {
      // 第 3 試也失敗: 結構化錯誤, 帶 .details 給 route 端回傳 client
      // 2026-06-14 聖上怒修法 B: USER 看不到備失敗原因, 改成顯示主+備各自 status + message
      const mainErr = extractErrInfo(err, requested);
      const fbErr = extractErrInfo(fallbackErr, fallback);
      throw new PockgoFallbackError(
        `主+備模型都失敗: 主(${requested}) [${mainErr.status ?? "?"}] ${mainErr.message}; 備(${fallback}) [${fbErr.status ?? "?"}] ${fbErr.message}`,
        { requested, mainError: mainErr, fallbackError: fbErr, autoFallback: true }
      );
    }
  }
}
