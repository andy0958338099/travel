/**
 * POST /api/manga/regenerate-panel
 * Body: { mangaId: string, panel: 1|2|3|4 }
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@/utils/supabase/server";
import { generateImage } from "@/lib/ai/minimax";
import { buildPanelPrompt, PanelIndex } from "@/lib/ai/mangaPrompts";

const BUCKET = "travel-manga";

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
  const { mangaId, panel } = (await req.json()) as { mangaId: string; panel: PanelIndex };

  if (!mangaId || ![1, 2, 3, 4].includes(panel)) {
    return NextResponse.json({ error: "mangaId + panel(1-4) required" }, { status: 400 });
  }

  const { data: manga } = await supabase
    .from("travel_mangas")
    .select("*")
    .eq("id", mangaId)
    .single();

  if (!manga) return NextResponse.json({ error: "manga not found" }, { status: 404 });

  const { data: char } = await supabase
    .from("ai_characters")
    .select("*")
    .eq("id", manga.character_id)
    .single();

  if (!char?.reference_image_url) {
    return NextResponse.json({ error: "character ref missing" }, { status: 500 });
  }

  const refImageUrl = resolveRefImage(char.reference_image_url);
  // 注意：caption 已經從 prompt 移除（user v3.0 rule：圖片不生成文字）
  const prompt = buildPanelPrompt(char.style_prompt, manga.source_name, panel);

  try {
    const images = await generateImage({
      prompt,
      aspectRatio: "3:4",   // 直式 4 格漫畫 panel
      n: 1,
      subjectReference: [{ type: "character", image_file: refImageUrl }],
    });

    const bytes = Buffer.from(images[0].base64, "base64");
    const path = `${mangaId}/panel_${panel}.jpg`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { data: updated, error: uErr } = await supabase
      .from("travel_mangas")
      .update({ [`panel_${panel}_url`]: pub.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", mangaId)
      .select()
      .single();

    if (uErr) throw new Error(`update: ${uErr.message}`);
    return NextResponse.json({ manga: updated, panel, url: pub.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
