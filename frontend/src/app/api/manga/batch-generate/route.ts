/**
 * POST /api/manga/batch-generate
 *
 * Body: { sources: Array<{sourceType, sourceId, sourceName, region?}> }
 *
 * Triggers generate for each in sequence. Each one is fast (~25s/panel × 4 = 100s),
 * so a batch of 10 ≈ 17 min. For 82 sources, run in chunks of 5 over time
 * (use the management UI to track progress).
 *
 * Returns immediately with the list of queued mangaIds.
 * The actual generation happens in the background after the response.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const maxDuration = 60;  // 立即回，背景跑

interface BatchItem {
  sourceType: "attraction" | "food";
  sourceId: string;
  sourceName: string;
  region?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { sources, concurrency = 2 } = (await req.json()) as {
    sources: BatchItem[];
    concurrency?: number;
  };

  if (!Array.isArray(sources) || sources.length === 0) {
    return NextResponse.json({ error: "sources array required" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 觸發每個 source（用 fire-and-forget fetch）
  const results: Array<{ sourceId: string; status: "queued" | "failed"; error?: string }> = [];

  for (const src of sources) {
    try {
      // 標記為 queued（如果還沒有 manga row）
      const { data: existing } = await supabase
        .from("travel_mangas")
        .select("id, status")
        .eq("source_type", src.sourceType)
        .eq("source_id", src.sourceId)
        .maybeSingle();

      if (existing && existing.status === "ready") {
        results.push({ sourceId: src.sourceId, status: "queued" });
        continue;
      }

      // 用 fetch 背景觸發（不 await 完整回應）
      fetch(`${baseUrl}/api/manga/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(src),
      }).catch((e) => console.error("[batch] generate trigger failed:", e));

      results.push({ sourceId: src.sourceId, status: "queued" });
    } catch (e: any) {
      results.push({ sourceId: src.sourceId, status: "failed", error: e.message?.slice(0, 100) });
    }
  }

  return NextResponse.json({
    queued: results.filter((r) => r.status === "queued").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
