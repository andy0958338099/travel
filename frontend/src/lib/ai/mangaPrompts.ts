/**
 * Manga prompt templates — 4-panel comic generation.
 *
 * Each source (attraction/food) gets 4 panels in fixed order:
 *   1. 歡迎 (welcome)
 *   2. 歷史 / 由來 (history)
 *   3. 美食 / 特色 (food / feature)
 *   4. 打卡 + 旅遊 tips (photo + tips)
 *
 * The character prompt is appended to every panel so the i2i
 * subject_reference stays consistent.
 */

export type PanelIndex = 1 | 2 | 3 | 4;

export const PANEL_META: Record<
  PanelIndex,
  { title: string; icon: string; description: string }
> = {
  1: { title: "歡迎光臨", icon: "👋", description: "導遊在景點入口迎接" },
  2: { title: "歷史文化", icon: "📜", description: "景點的歷史背景與文化特色" },
  3: { title: "必吃美食", icon: "🍜", description: "周邊推薦美食或景點特色" },
  4: { title: "打卡 tips", icon: "📸", description: "最佳拍照點 + 實用旅遊建議" },
};

/**
 * Build a panel-specific prompt.
 * @param baseCharacter 角色描述 (e.g. "a friendly chubby Asian man tour guide with sunglasses and baseball cap")
 * @param scene         場景 (e.g. "West Lake in Hangzhou" or "Haidilao Hot Pot restaurant")
 * @param panel         1-4
 * @param extraCaption  介紹文（會放進 panel caption）
 */
export function buildPanelPrompt(
  baseCharacter: string,
  scene: string,
  panel: PanelIndex,
  extraCaption: string
): string {
  const captions: Record<PanelIndex, string> = {
    1: `${baseCharacter} standing at the entrance of ${scene}, waving with both hands, big warm smile, speech bubble says "歡迎來到 ${scene}！"`,
    2: `${baseCharacter} explaining the history of ${scene}, sepia-toned flashback showing the historical context in the background, "${extraCaption}"`,
    3: `${baseCharacter} tasting/enjoying the famous food at ${scene}, close-up of the food, "${extraCaption}"`,
    4: `${baseCharacter} doing a selfie pose at the best photo spot of ${scene}, golden hour lighting, "打卡 tips：${extraCaption}"`,
  };
  return `${captions[panel]}, manga style, vibrant colors, 4:5 aspect ratio, comic panel composition, clean lineart`;
}

/**
 * Build the description-generation prompt (for chat).
 * 3 lengths × 6 styles.
 */
export function buildDescriptionPrompt(opts: {
  sourceName: string;
  sourceType: "attraction" | "food";
  region?: string;
  style: "humor" | "family" | "pro_guide" | "influencer" | "comic_narration" | "abugi";
}): { system: string; user: string } {
  const styleGuides: Record<typeof opts.style, string> = {
    humor: "幽默風趣、穿插冷笑話",
    family: "溫馨、親子導向、簡單易懂",
    pro_guide: "專業導遊、歷史文化深度",
    influencer: "網紅開箱、IG 風、活潑用語",
    comic_narration: "漫畫旁白、有畫面感、動作描寫",
    abugi: "阿布吉台式導遊風格、講冷笑話但實用、台味十足",
  };

  const system = `你是一位專業旅遊作家。請為一個${opts.sourceType === "attraction" ? "景點" : "美食"}用${styleGuides[opts.style]}的風格，輸出 3 段介紹文：
- short_100: 100 字以內的極簡版（IG 貼文用）
- medium_300: 300 字左右的精簡版（卡片介紹用）
- long_800: 800 字左右的深度版（攻略文章用）

只回傳 JSON，格式：{"short_100":"...","medium_300":"...","long_800":"..."}。不要加任何其他文字。`;

  const user = `景點/美食名稱：${opts.sourceName}
${opts.region ? `地區：${opts.region}` : ""}

請為這個${opts.sourceType === "attraction" ? "景點" : "美食"}生成 3 段介紹文。`;

  return { system, user };
}
