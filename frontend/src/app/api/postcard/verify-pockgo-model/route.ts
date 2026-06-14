/**
 * POST /api/postcard/verify-pockgo-model
 * Body: { model: string }
 *
 * 2026-06-14 聖上拍板 B: distributor auto-detect 探活 endpoint
 *
 * 用超短 prompt (max_tokens 50) 跑 1 次 chat/completions,
 * 解析回傳確認 distributor 對此 model 是否真的有 channel。
 * Client 端用 24h localStorage 緩存, 避免每次刷新都打 distributor。
 *
 * ⚠️ 不用 base64 圖, 純文字 prompt, 跑 1 次 5-15s, 結果 4 種:
 *   - "verified"      : 200 + 有 content
 *   - "no-channel"    : 503 + "No available channel for model ..."
 *   - "bad-request"   : 400 / 401 / 403 / 404 (其他 4xx)
 *   - "timeout"       : 30s timeout
 *   - "error"         : 其他 5xx / network
 */
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/lib/ai/pockgo";

export const maxDuration = 30;

interface VerifyResult {
  status: "verified" | "no-channel" | "bad-request" | "timeout" | "error";
  latencyMs: number;
  errorMsg?: string;
  httpStatus?: number;
}

function getApiKey(): string {
  const key = process.env.AI_IMAGE_API_KEY;
  if (!key) throw new Error("AI_IMAGE_API_KEY not configured");
  return key;
}

function getApiBaseUrl(): string {
  const raw = process.env.AI_IMAGE_API_URL || "https://newapi.pockgo.com/v1/";
  let u = raw.replace(/\/+$/, "");
  u = u.replace(/\/(v1|chat|completions)(\/(v1|chat|completions))*$/i, "/v1");
  if (!/\/v1$/i.test(u)) u = u + "/v1";
  return u + "/";
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const { model } = (await req.json()) as { model?: string };
    if (!model) {
      return NextResponse.json({ error: "model required" }, { status: 400 });
    }
    const resolvedModel = getModel(model);
    const apiKey = getApiKey();
    const base = getApiBaseUrl();
    const endpoint = `${base}chat/completions`;

    // 純文字超短 prompt, 不傳 base64, max_tokens 50 加速失敗快速回傳
    const body = {
      model: resolvedModel,
      messages: [
        { role: "user" as const, content: "Reply with the single word: OK" },
      ],
      max_tokens: 50,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });

    const latencyMs = Date.now() - t0;
    const txt = await res.text().catch(() => "");
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { /* not JSON */ }

    const errorMsg = parsed?.error?.message || txt.slice(0, 200) || res.statusText;
    const result: VerifyResult = { status: "error", latencyMs, httpStatus: res.status, errorMsg };

    if (res.status === 200) {
      // 200 = 真的有 channel, distributor 接受了請求
      result.status = "verified";
    } else if (res.status === 503 && /No available channel/i.test(String(errorMsg))) {
      result.status = "no-channel";
    } else if (res.status >= 400 && res.status < 500) {
      result.status = "bad-request";
    } else if (res.status >= 500) {
      result.status = "error";
    }

    console.log(`[verify-pockgo] ${resolvedModel} → ${result.status} (${latencyMs}ms, HTTP ${res.status})`);
    return NextResponse.json(result);
  } catch (e: any) {
    const latencyMs = Date.now() - t0;
    const msg = String(e?.message || "unknown");
    const isTimeout = msg.includes("timeout") || msg.includes("aborted") || e?.name === "AbortError";
    const result: VerifyResult = {
      status: isTimeout ? "timeout" : "error",
      latencyMs,
      errorMsg: msg.slice(0, 200),
    };
    console.error(`[verify-pockgo] catch → ${result.status} (${latencyMs}ms): ${msg.slice(0, 100)}`);
    return NextResponse.json(result, { status: 200 });  // 不拋 500, body 帶 status 給 client 解析
  }
}
