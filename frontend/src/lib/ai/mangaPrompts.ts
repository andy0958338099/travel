/**
 * Manga prompt templates — 4-panel comic generation.
 *
 * ⚠️ HARD RULE (2026-06-03 user v3.0): 圖片模型禁止生成任何文字。
 *    - 中文 / 英文 / 數字 / Logo / 標誌 / 海報文案 / 招牌 都不行
 *    - 圖片只負責：景點、人物、美食、建築、氛圍
 *    - 所有文字由程式第二階段疊加（HTML/CSS overlay）
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

// ── 全域 NO-TEXT 規則（每個 prompt 都強制加） ──
const NO_TEXT_RULES = [
  "DO NOT INCLUDE ANY TEXT.",
  "DO NOT INCLUDE ANY WORDS.",
  "DO NOT INCLUDE ANY LETTERS.",
  "DO NOT INCLUDE ANY TYPOGRAPHY.",
  "DO NOT INCLUDE ANY CAPTIONS.",
  "DO NOT INCLUDE ANY LOGOS.",
  "DO NOT INCLUDE ANY SIGNAGE.",
  "DO NOT INCLUDE ANY WRITING.",
  "Leave empty areas for future text overlay.",
  "No speech bubbles. No banners. No posters. No subtitles.",
].join(" ");

export type PanelIndex = 1 | 2 | 3 | 4;

// 固定 4 個標題（user v3.0 規定）—— 程式疊加，不放 prompt
export const PANEL_META: Record<
  PanelIndex,
  { title: string; subtitle: string; icon: string; sceneHint: string }
> = {
  1: { title: "歡迎光臨",  subtitle: "", icon: "👋", sceneHint: "景點入口迎賓場景" },
  2: { title: "歷史文化",  subtitle: "", icon: "📜", sceneHint: "景點歷史氛圍場景（古風建築／時間流逝）" },
  3: { title: "必吃美食",  subtitle: "", icon: "🍜", sceneHint: "周邊美食或景點特色小吃特寫" },
  4: { title: "打卡攻略",  subtitle: "", icon: "📸", sceneHint: "最佳拍照場景（金色時刻／光影氛圍）" },
};

/**
 * Build a panel-specific prompt.
 * 注意：prompt 只描述場景，不放任何文字。
 *       標題/副標題/說明由程式第二階段疊加。
 *
 * @param baseCharacter 角色描述 (e.g. "a friendly chubby Asian man tour guide with sunglasses and baseball cap")
 * @param scene         場景 (e.g. "West Lake in Hangzhou" or "Haidilao Hot Pot restaurant")
 * @param panel         1-4
 */
export function buildPanelPrompt(
  baseCharacter: string,
  scene: string,
  panel: PanelIndex
): string {
  // 每個 panel 只描述視覺場景，不放任何文字
  const scenePrompts: Record<PanelIndex, string> = {
    1: `${baseCharacter} standing at the entrance of ${scene}, waving with both hands, big warm smile, vibrant background, clean composition with empty space at the top for text overlay`,
    2: `${baseCharacter} walking through the historic ${scene}, sepia-toned atmosphere, ancient architecture and cultural artifacts in the background, dramatic lighting, no text in the scene`,
    3: `${baseCharacter} enjoying the famous local food near ${scene}, close-up of delicious dishes, appetizing food photography style, warm lighting, clean composition`,
    4: `${baseCharacter} posing at the most photogenic spot of ${scene}, golden hour lighting, beautiful scenery in the background, empty sky area for text overlay`,
  };
  return `${scenePrompts[panel]}. ${NO_TEXT_RULES}. manga style, vibrant colors, 3:4 vertical aspect ratio, comic panel composition, clean lineart, beautiful atmospheric illustration.`;
}

/**
 * Build the description-generation prompt (for chat).
 * 3 lengths × 6 styles.
 *
 * 注意：這段文字是給 chat 模型的，會被程式存到 panel_X_caption / short_desc 等欄位，
 *       然後第二階段用 HTML/CSS 疊加到圖片上。完全不會進圖片模型。
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

/**
 * 為每個 panel 生成獨立 caption（程式疊加用，不進圖片）
 * 回傳 4 段 ≤30 字的中文說明，匹配 PANEL_META 的 4 種語境
 */
export function buildPanelCaptionPrompt(opts: {
  sourceName: string;
  sourceType: "attraction" | "food";
  shortDesc: string;     // 從 chat 拿到的 100 字介紹
}): { system: string; user: string } {
  const system = `你是 4 格漫畫的文案助手。根據景點/美食名稱和它的 100 字介紹，為 4 個 panel 各寫一段簡短說明（每段 ≤ 30 字、繁體中文、有畫面感）。

只回傳 JSON，格式：
{
  "panel_1": "歡迎光臨的氛圍（≤30字）",
  "panel_2": "歷史文化重點（≤30字）",
  "panel_3": "必吃/特色（≤30字）",
  "panel_4": "打卡建議（≤30字）"
}

不要加任何其他文字。`;

  const user = `景點/美食：${opts.sourceName}
類型：${opts.sourceType === "attraction" ? "景點" : "美食"}
100字介紹：${opts.shortDesc}

請為 4 個 panel 各寫一段簡短說明。`;

  return { system, user };
}
