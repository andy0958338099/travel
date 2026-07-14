/**
 * parse-images.ts
 *
 * 從 data.ts 的 shots 文字抽出所有 AI 生圖 URL（Supabase CDN）。
 * 同一張圖可能出現在多個 dayBlock（例如 day1/img-01 在 day1+day2 都被引用），
 * parse 結果會用 URL 去重，但保留每張首次出現的 day 順序 + ref 字串。
 *
 * 規則（從既有 data.ts 觀察出來）：
 *   🖼 <model> <aspect> src=<URL> — "<prompt>"
 *   URL 結尾 .jpg
 *
 * Output shape:
 *   {
 *     url: string,       // Supabase public URL
 *     day: number,       // 1-8
 *     filename: string,  // e.g. "e-img-01-gopro-unbox"
 *     scriptId: string,  // A/B/C/D/E
 *     dayLabel: string,  // DayBlock.label
 *     prompt: string,    // 用於 alt text + hover
 *     model: string,     // e.g. "gpt-image-2-2k"
 *     aspect: string,    // "1:1" / "16:9"
 *   }
 */

import { SCRIPTS, type ScriptMeta } from "../data";

export interface GalleryImage {
  url: string;
  day: number;
  filename: string;
  scriptId: string;
  dayLabel: string;
  prompt: string;
  model: string;
  aspect: string;
}

const SHOT_LINE_RE =
  /🖼\s+(\S+)\s+(\S+)\s+src=(https:\/\/[^\s]+\.jpg)\s+—\s+"([^"]+)"/g;

const DAY_URL_RE = /\/vlog\/day(\d+)\//;
const FILENAME_RE = /\/([^/]+)\.jpg$/;

export function parseImagesForScript(scriptId: string): GalleryImage[] {
  const script: ScriptMeta | undefined = SCRIPTS[scriptId];
  if (!script) return [];

  const seen = new Set<string>();
  const out: GalleryImage[] = [];

  for (const dayBlock of script.dayBlocks) {
    SHOT_LINE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = SHOT_LINE_RE.exec(dayBlock.shots)) !== null) {
      const [, model, aspect, url, prompt] = m;
      if (seen.has(url)) continue;
      seen.add(url);

      const dayMatch = url.match(DAY_URL_RE);
      const fileMatch = url.match(FILENAME_RE);
      if (!dayMatch || !fileMatch) continue;

      out.push({
        url,
        day: parseInt(dayMatch[1], 10),
        filename: fileMatch[1],
        scriptId,
        dayLabel: dayBlock.label,
        prompt,
        model,
        aspect,
      });
    }
  }

  // Sort by day ASC, then filename (e-img-XX-...) ASC for stable order
  out.sort((a, b) => a.day - b.day || a.filename.localeCompare(b.filename));
  return out;
}

export interface ScriptGallerySummary {
  scriptId: string;
  name: string;
  color: ScriptMeta["color"];
  count: number;
}

export function summarizeAllScripts(): ScriptGallerySummary[] {
  return Object.keys(SCRIPTS)
    .map((id) => {
      const s = SCRIPTS[id];
      return {
        scriptId: s.id,
        name: s.name,
        color: s.color,
        count: parseImagesForScript(s.id).length,
      };
    });
}