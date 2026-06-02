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
const API_KEY = process.env.MINIMAX_API_KEY;

if (!API_KEY) {
  // Don't throw at import time in dev — log so the dev server still boots.
  // The actual fetch will throw a clearer error.
  // eslint-disable-next-line no-console
  console.warn("[minimax] MINIMAX_API_KEY not set in env");
}

export interface SubjectReference {
  type: "character";
  image_file: string;   // public URL or data: URL
}

export interface GenerateImageOpts {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "3:4" | "9:16" | "21:9" | "4:5";
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
  if (!API_KEY) throw new Error("MINIMAX_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: "image-01",
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio ?? "4:5",
    n: opts.n ?? 1,
    response_format: "base64",
    prompt_optimizer: opts.promptOptimizer ?? true,
  };
  if (opts.seed !== undefined) body.seed = opts.seed;
  if (opts.subjectReference && opts.subjectReference.length > 0) {
    body.subject_reference = opts.subjectReference;
  }

  const res = await fetch(`${API_BASE}/image_generation`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiniMax generateImage ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
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
 * MiniMax chat completion (Anthropic-compatible endpoint).
 * Used for: 1) vision (analyzing photos), 2) text descriptions.
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
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
  if (!API_KEY) throw new Error("MINIMAX_API_KEY not configured");

  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? "MiniMax-M2.7",  // any anthropic model name works
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MiniMax chat ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  // Anthropic-compatible response: content[0].text
  return data.content?.[0]?.text ?? "";
}
