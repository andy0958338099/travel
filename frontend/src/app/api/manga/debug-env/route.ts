/**
 * GET /api/manga/debug-env
 * 診斷 API：顯示 server 端 process.env 狀態
 */
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.MINIMAX_API_KEY;
  return NextResponse.json({
    has_key: !!key,
    key_length: key?.length || 0,
    key_preview: key ? `${key.slice(0, 8)}...${key.slice(-4)}` : null,
    env_keys: Object.keys(process.env).filter(k => k.includes("MINIMAX") || k.includes("SUPABASE")),
  });
}
