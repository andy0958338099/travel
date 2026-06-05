/**
 * POST /api/manga/generate
 *
 * Trigger 4-panel comic generation for one source (attraction or food).
 *
 * Body: { sourceType: "attraction" | "food", sourceId: string, characterId?: string, sourceName: string, region?: string }
 *
 * Fire-and-forget architecture (v2, 2026-06-04):
 *   1. Netlify function = thin orchestrator. ~1-2s. maxDuration=10s.
 *      - Validate inputs, pick character
 *      - Resolve local ref image (read /public, base64 encode)
 *      - Upsert travel_mangas row with status=generating (idempotent)
 *      - Forward to Cloudflare Worker `manga/generate` endpoint
 *   2. Cloudflare Worker = background pipeline. event.waitUntil, no Netlify cap.
 *      - Run 4 panels sequentially via MiniMax (~120s)
 *      - Generate descriptions + captions via chat (~10s)
 *      - Final DB update: status=ready/partial/failed
 *   3. Frontend = open modal immediately, MangaViewer subscribes via Supabase Realtime.
 *
 * Why fire-and-forget: Netlify free plan 30s cap. Even single panel regenerate
 * hit the cap (MiniMax 25s + upload 5s = 30s). Full 4-panel sync would be 120s.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@/utils/supabase/server";

const DEFAULT_WORKER_URL = "https://jiangnan-trip.andy0958338099.workers.dev";

export const maxDuration = 10; // fire-and-forget: orchestrator only, ~1-2s

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

interface GenerateRequest {
  sourceType: "attraction" | "food";
  sourceId: string;
  sourceName: string;
  characterId?: string;
  region?: string;
  customPrompts?: Record<1 | 2 | 3 | 4, string>;  // user 自訂 4-panel prompt (從 Supabase 讀)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = (await req.json()) as GenerateRequest;
  const { sourceType, sourceId, sourceName, characterId, region, customPrompts } = body;

  if (!sourceType || !sourceId || !sourceName) {
    return NextResponse.json(
      { error: "sourceType, sourceId, sourceName required" },
      { status: 400 }
    );
  }

  // ── 1) Idempotent check: existing ready manga → return cached ──
  const { data: existing } = await supabase
    .from("travel_mangas")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (existing && existing.status === "ready") {
    return NextResponse.json({ manga: existing, cached: true });
  }

  // ── 2) Pick character ──
  let character: {
    id: string;
    name: string;
    reference_image_url: string | null;
    style_prompt: string;
  };
  if (characterId) {
    const { data } = await supabase
      .from("ai_characters")
      .select("*")
      .eq("id", characterId)
      .single();
    if (!data) {
      return NextResponse.json({ error: "character not found" }, { status: 404 });
    }
    character = data;
  } else {
    const { data: chars } = await supabase
      .from("ai_characters")
      .select("*")
      .eq("is_active", true);
    if (!chars || chars.length === 0) {
      return NextResponse.json(
        { error: "no characters configured" },
        { status: 500 }
      );
    }
    const r = (region || "").toLowerCase();
    const match =
      chars.find((c) => c.region === r) ||
      chars.find((c) => c.region === "qstyle") ||
      chars[0];
    character = match;
  }

  const refUrl = character.reference_image_url;
  if (!refUrl) {
    return NextResponse.json(
      { error: `character ${character.name} has no reference image` },
      { status: 500 }
    );
  }
  const refImageUrl = resolveRefImage(refUrl);

  // ── 3) Upsert manga row (idempotent) ──
  const mangaId = existing?.id || crypto.randomUUID();
  const upsertData = {
    id: mangaId,
    source_type: sourceType,
    source_id: sourceId,
    source_name: sourceName,
    character_id: character.id,
    character_name: character.name,
    status: "generating",
    updated_at: new Date().toISOString(),
  };
  await supabase.from("travel_mangas").upsert(upsertData);

  // ── 4) Fire-and-forget: 呼叫 Worker, Worker 立即回 202 + 背景跑 4 panel pipeline ──
  const workerUrl = process.env.CLOUDFLARE_WORKER_URL || DEFAULT_WORKER_URL;
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "manga/generate",
        payload: { mangaId, refImageUrl, customPrompts },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Worker ${res.status}`);

    // Fetch the upserted row to return to user (manga object for modal)
    const { data: manga } = await supabase
      .from("travel_mangas")
      .select("*")
      .eq("id", mangaId)
      .single();

    return NextResponse.json({
      manga,
      status: "regenerating",
      mangaId,
      totalPanels: 4,
      acceptedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    // Worker 沒接受 → 標記 failed
    await supabase
      .from("travel_mangas")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", mangaId);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
