/**
 * POST /api/manga/regenerate-panel
 * Body: { mangaId: string, panel: 1|2|3|4 }
 *
 * Fire-and-forget architecture (v2, 2026-06-04):
 *   1. Netlify function = thin orchestrator. ~2s. maxDuration=10s.
 *      - Fetch manga + character from Supabase
 *      - Resolve local ref image (read /public, base64 encode)
 *      - Build prompt (no captions per v3.0 NO-TEXT rule)
 *      - Forward to Cloudflare Worker `manga/panel` endpoint
 *   2. Cloudflare Worker = background pipeline. event.waitUntil, no Netlify cap.
 *      - MiniMax image_generation (~25s)
 *      - Supabase storage upload (~5s)
 *      - Update travel_mangas row with new panel_N_url
 *   3. Frontend = Supabase Realtime subscriber.
 *      - Subscribes to travel_mangas UPDATE where id=mangaId
 *      - Auto-refreshes panel_N_url in UI when row changes
 *
 * Netlify function 30s cap 撞到 (MiniMax 25s + upload 5s = 30s) — that's why
 * we offload the slow work to Worker (free tier 30s wall time, but response
 * is 202 + waitUntil, so wall time only counts the orchestrator round-trip).
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@/utils/supabase/server";
import { buildPanelPrompt, PanelIndex } from "@/lib/ai/mangaPrompts";

// Hardcode as fallback — see minimax.ts getWorkerUrl() for the same rationale.
// Netlify v2 projects UI env doesn't reliably inject into v1 function runtime.
const DEFAULT_WORKER_URL = "https://jiangnan-trip.andy0958338099.workers.dev";

export const maxDuration = 10; // fire-and-forget: orchestrator only, ~2s

function resolveRefImage(refUrl: string): string {
  if (refUrl.startsWith("data:") || refUrl.startsWith("http")) return refUrl;
  const localPath = join(process.cwd(), "public", refUrl);
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    const ext = localPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${ext};base64,${buf.toString("base64")}`;
  }
  return refUrl;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { mangaId, panel } = (await req.json()) as {
    mangaId: string;
    panel: PanelIndex;
  };

  if (!mangaId || ![1, 2, 3, 4].includes(panel)) {
    return NextResponse.json(
      { error: "mangaId + panel(1-4) required" },
      { status: 400 }
    );
  }

  // ── 1) 撈 manga + character (orchestrator prep, ~0.6s) ──
  const { data: manga } = await supabase
    .from("travel_mangas")
    .select("*")
    .eq("id", mangaId)
    .single();
  if (!manga) {
    return NextResponse.json({ error: "manga not found" }, { status: 404 });
  }

  const { data: char } = await supabase
    .from("ai_characters")
    .select("*")
    .eq("id", manga.character_id)
    .single();
  if (!char?.reference_image_url) {
    return NextResponse.json({ error: "character ref missing" }, { status: 500 });
  }

  // ── 2) 組 prompt + ref image (~0.5s) ──
  const refImageUrl = resolveRefImage(char.reference_image_url);
  // v3.0 NO-TEXT rule: no caption in prompt; text overlaid in HTML layer
  const prompt = buildPanelPrompt(char.style_prompt, manga.source_name, panel);

  // ── 3) Fire-and-forget: 呼叫 Worker, Worker 立即回 202 + 背景跑 pipeline ──
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL;
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "manga/panel",
        payload: {
          mangaId,
          panel,
          prompt,
          refImageUrl,
          aspectRatio: "3:4",
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Worker ${res.status}`);
    }

    // 立即回 user — 不等 background 完成
    // Frontend 用 Supabase Realtime 訂閱 row 變化自動 reload
    return NextResponse.json({
      status: "regenerating",
      mangaId,
      panel,
      acceptedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
