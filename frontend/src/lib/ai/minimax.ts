/**
 * MiniMax API client — server-side only.
 *
 * Wraps the 3 capabilities we use:
 *   - generateImage(): text-to-image + image-to-image (subject_reference)
 *   - generateChat(): vision + text generation (for descriptions)
 *
 * Uses MiniMax image-01 model. base64 response is preferred over url
 * (urls expire in 24h).
 */

const API_BASE = "https://api.minimax.io/v1";

/**
 * 每次函式呼叫時再讀 env（不要在 module load 時 freeze）——
 * 避免 Next.js dev 模式下 module 在 .env.local 載入前就被 cache，
 * 導致「MINIMAX_API_KEY not configured」誤報。
 */
function getApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error("MINIMAX_API_KEY not configured (check .env.local)");
  }
  return key;
}

/**
 * Cloudflare Worker URL（繞過 Netlify free plan 26-30s function timeout）。
 *
 * Worker URL is a public HTTPS endpoint (not a secret) — safe to hardcode
 * as a fallback. The hardcode guarantees the Worker route works regardless
 * of Netlify env-injection quirks (e.g. v2 projects UI env not propagating
 * to v1 sites function runtime, see commit 118abf9 history).
 *
 * 優先順序:  process.env.CLOUDFLARE_WORKER_URL → hardcoded fallback → null
 * 沒任何可用值時: getWorkerUrl() 仍回 null、callUpstream() fallback 直連 MiniMax。
 */
const DEFAULT_WORKER_URL = "https://minimax-proxy.andy0958338099.workers.dev";

function getWorkerUrl(): string | null {
  return process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL;
}

/**
 * 走 Cloudflare Worker 還是直連 MiniMax？
 * Worker 走法：fetch worker URL, body = { endpoint, payload }, worker 加 Authorization header
 * 直連走法：fetch API_BASE/endpoint, 自己加 Authorization header
 */
async function callUpstream(endpoint: string, payload: Record<string, unknown>): Promise<any> {
  const workerUrl = getWorkerUrl();
  if (workerUrl) {
    // 走 Cloudflare Worker（key 存在 worker secret，不傳到這層）
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, payload }),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Worker ${res.status}: ${text.slice(0, 300)}`);
    }
    return JSON.parse(text);
  }
  // 直連 MiniMax（本機 dev fallback）
  const API_KEY = getApiKey();
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MiniMax ${endpoint} ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

export interface SubjectReference {
  type: "character";
  image_file: string;   // public URL or data: URL
}

export interface GenerateImageOpts {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "3:4" | "9:16" | "21:9";
  n?: number;           // 1-9
  seed?: number;
  subjectReference?: SubjectReference[];  // i2i
  promptOptimizer?: boolean;
}

export interface GeneratedImage {
  base64: string;       // image data
  seed?: number;
  success: boolean;
}

/**
 * Generate 1-N images. Returns array of base64 strings (decoded-ready for upload).
 * Default: n=1, response_format=base64, prompt_optimizer=true (we want better
 * quality for manga, not raw prompt fidelity).
 */
export async function generateImage(opts: GenerateImageOpts): Promise<GeneratedImage[]> {
  const body: Record<string, unknown> = {
    model: "image-01",
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio ?? "3:4",
    n: opts.n ?? 1,
    response_format: "base64",
    prompt_optimizer: opts.promptOptimizer ?? true,
  };
  if (opts.seed !== undefined) body.seed = opts.seed;
  if (opts.subjectReference && opts.subjectReference.length > 0) {
    body.subject_reference = opts.subjectReference;
  }

  const data = await callUpstream("image_generation", body);

  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax error: ${data.base_resp?.status_msg || "unknown"}`);
  }

  const images: string[] = data.data?.image_base64 || [];
  if (images.length === 0) {
    // Content safety blocked — metadata.failed_count > 0
    const failed = data.metadata?.failed_count || 0;
    throw new Error(`MiniMax returned 0 images (failed=${failed})`);
  }

  return images.map((b64) => ({ base64: b64, success: true }));
}
/**
 * MiniMax chat completion (OpenAI-compatible endpoint).
 * /v1/messages 404 → /v1/chat/completions works (verified 2026-06-03)
 * Used for: 1) vision (analyzing photos), 2) text descriptions.
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: { url: string };
      }>;
}

export interface ChatOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function chat(
  messages: ChatMessage[],
  opts: ChatOpts = {}
): Promise<string> {
  // OpenAI-compatible: translate any {type,text,image_url} blocks to strings
  // (MiniMax only supports string content; vision is enabled by image_url separately if needed)
  const normalized = messages.map((m) => {
    if (typeof m.content === "string") return m;
    const text = m.content
      .map((b) => (b.type === "text" ? b.text ?? "" : ""))
      .join("\n")
      .trim();
    return { role: m.role, content: text };
  });

  const data = await callUpstream("chat/completions", {
    model: opts.model ?? "MiniMax-M2.7",
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    messages: normalized,
  });

  // OpenAI-compatible response: choices[0].message.content
  return data.choices?.[0]?.message?.content ?? "";
}
