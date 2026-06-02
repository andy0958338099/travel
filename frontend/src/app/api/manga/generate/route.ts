/**
 * POST /api/manga/generate
 *
 * Trigger 4-panel comic generation for one source (attraction or food).
 *
 * Body: { sourceType: "attraction" | "food", sourceId: string, characterId?: string }
 *
 * Behavior:
 *   1. If a travel_mangas row already exists for (sourceType, sourceId), return it.
 *   2. Pick a character (default = Q版 / qstyle, or by region match).
 *   3. Generate 4 panels serially using i2i (subject_reference = character's ref image).
 *   4. Upload each panel base64 → Supabase Storage (travel-manga bucket).
 *   5. Generate descriptions (chat: short/medium/long).
 *   6. Upsert travel_mangas row with status=ready (or partial).
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@/utils/supabase/server";
import { generateImage, chat } from "@/lib/ai/minimax";
import { buildPanelPrompt, buildDescriptionPrompt, PanelIndex } from "@/lib/ai/mangaPrompts";

const BUCKET = "travel-manga";

/** Convert local public/ path to data: URL (MiniMax subject_reference
 *  needs an externally accessible URL, so we inline as base64). */
function resolveRefImage(refUrl: string): string {
  if (refUrl.startsWith("data:") || refUrl.startsWith("http")) {
    return refUrl;
  }
  const localPath = join(process.cwd(), "public", refUrl);
  if (existsSync(localPath)) {
    const buf = readFileSync(localPath);
    const ext = localPath.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${ext};base64,${buf.toString("base64")}`;
  }
  return refUrl;
}

export const maxDuration = 300;  // 5 min (Netlify Pro / Next default)

interface GenerateRequest {
  sourceType: "attraction" | "food";
  sourceId: string;        // data.ts 裡的 name OR dining id
  sourceName: string;      // for prompt context
  characterId?: string;    // optional — auto-pick if not given
  region?: string;         // optional — hint for character picking
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = (await req.json()) as GenerateRequest;
  const { sourceType, sourceId, sourceName, characterId, region } = body;

  if (!sourceType || !sourceId || !sourceName) {
    return NextResponse.json({ error: "sourceType, sourceId, sourceName required" }, { status: 400 });
  }

  // ── 1) 既有就返回（idempotent） ──
  const { data: existing } = await supabase
    .from("travel_mangas")
    .select("*")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (existing && existing.status === "ready") {
    return NextResponse.json({ manga: existing, cached: true });
  }

  // ── 2) 選角色 ──
  let character: { id: string; name: string; reference_image_url: string | null; style_prompt: string };
  if (characterId) {
    const { data } = await supabase.from("ai_characters").select("*").eq("id", characterId).single();
    if (!data) return NextResponse.json({ error: "character not found" }, { status: 404 });
    character = data;
  } else {
    // 自動選：依 region 配對
    const { data: chars } = await supabase.from("ai_characters").select("*").eq("is_active", true);
    if (!chars || chars.length === 0) {
      return NextResponse.json({ error: "no characters configured" }, { status: 500 });
    }
    // region 配對優先
    const r = (region || "").toLowerCase();
    const match =
      chars.find((c) => c.region === r) ||
      chars.find((c) => c.region === "qstyle") ||  // 預設 Q版
      chars[0];
    character = match;
  }

  const refUrl = character.reference_image_url;
  if (!refUrl) {
    return NextResponse.json({ error: `character ${character.name} has no reference image` }, { status: 500 });
  }

  // 若是本地路徑（/characters/abugi.png），轉 data URL
  // 因為 subject_reference.image_file 需要可訪問的 URL
  const refImageUrl = resolveRefImage(refUrl);

  // ── 3) 建立 manga row（status=generating） ──
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

  // ── 4) 4 個 panel 串行生成 + 上傳 ──
  const panelCaptions: Record<PanelIndex, string> = {
    1: `歡迎光臨 ${sourceName}！`,
    2: `${sourceName} 的歷史故事`,
    3: `${sourceName} 必吃必拍`,
    4: `${sourceName} 打卡攻略`,
  };

  const panelResults: Record<PanelIndex, { url: string | null; error?: string }> = {
    1: { url: null }, 2: { url: null }, 3: { url: null }, 4: { url: null },
  };

  for (const panel of [1, 2, 3, 4] as PanelIndex[]) {
    const prompt = buildPanelPrompt(
      character.style_prompt,
      sourceName,
      panel,
      panelCaptions[panel]
    );

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const images = await generateImage({
          prompt,
          aspectRatio: "4:5",
          n: 1,
          subjectReference: [{ type: "character", image_file: refImageUrl }],
        });

        const base64 = images[0].base64;
        const bytes = Buffer.from(base64, "base64");
        const path = `${mangaId}/panel_${panel}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadErr) {
          lastError = `upload: ${uploadErr.message}`;
          continue;
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        panelResults[panel] = { url: pub.publicUrl };
        break;
      } catch (e: any) {
        lastError = e.message?.slice(0, 200);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (!panelResults[panel].url) {
      panelResults[panel] = { url: null, error: lastError || "unknown" };
    }
  }

  // ── 5) 介紹文（1 次 chat call） ──
  let shortDesc = "", mediumDesc = "", longDesc = "";
  try {
    const { system, user } = buildDescriptionPrompt({
      sourceName,
      sourceType,
      region,
      style: "abugi",
    });
    const text = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens: 2048, temperature: 0.8 }
    );
    // Parse JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      shortDesc = parsed.short_100 || "";
      mediumDesc = parsed.medium_300 || "";
      longDesc = parsed.long_800 || "";
    }
  } catch (e: any) {
    console.error("[manga] description failed:", e.message);
  }

  // ── 6) 寫入 travel_mangas ──
  const successCount = [1, 2, 3, 4].filter((p) => panelResults[p as PanelIndex].url).length;
  const finalStatus = successCount === 4 ? "ready" : successCount > 0 ? "partial" : "failed";

  const updateData = {
    panel_1_url: panelResults[1].url,
    panel_1_title: "歡迎光臨",
    panel_1_caption: panelCaptions[1],
    panel_2_url: panelResults[2].url,
    panel_2_title: "歷史文化",
    panel_2_caption: panelCaptions[2],
    panel_3_url: panelResults[3].url,
    panel_3_title: "必吃美食",
    panel_3_caption: panelCaptions[3],
    panel_4_url: panelResults[4].url,
    panel_4_title: "打卡 tips",
    panel_4_caption: panelCaptions[4],
    short_desc: shortDesc,
    medium_desc: mediumDesc,
    long_desc: longDesc,
    status: finalStatus,
    updated_at: new Date().toISOString(),
  };

  const { data: finalManga, error: updateErr } = await supabase
    .from("travel_mangas")
    .update(updateData)
    .eq("id", mangaId)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: `update failed: ${updateErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    manga: finalManga,
    successCount,
    totalPanels: 4,
    status: finalStatus,
  });
}
