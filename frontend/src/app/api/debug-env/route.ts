import { NextResponse } from "next/server";

/**
 * GET /api/debug-env
 *
 * 診斷 Netlify function runtime env 狀態 (用 skill netlify-deployment-debugging §2c pattern)
 * 不暴露 secret 值, 只回 length + preview
 */
export async function GET() {
  const mmKey = process.env.MINIMAX_API_KEY ?? "";
  const cfWorker = process.env.CLOUDFLARE_WORKER_URL ?? "";
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  return NextResponse.json({
    minimax: {
      has_key: mmKey.length > 0,
      key_length: mmKey.length,
      key_preview: mmKey ? `${mmKey.slice(0, 8)}...${mmKey.slice(-4)}` : "",
    },
    supabase: {
      has_url: sbUrl.length > 0,
      has_key: sbKey.length > 0,
      url_length: sbUrl.length,
    },
    cloudflare_worker_url: cfWorker || "(empty → fall back to hardcoded DEFAULT_WORKER_URL)",
  });
}
