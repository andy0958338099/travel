/**
 * Manga prompt templates — 4-panel travel portrait generation.
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
 * STYLE v3.1 (2026-06-05 user 衝突感 + 驚訝感):
 *   - 場景佔 70% 版面，仕女佔 30% (不再是仕女為主)
 *   - 「宋代仕女闖入現代市集」時間旅行衝突感為核心
 *   - 仕女表情：驚訝 (wide eyes, slightly open mouth, hands raised)
 *   - 從 Q版漫畫風改為 Realistic DSLR Travel Photography
 *   - 角色預設 = a graceful ancient Song dynasty noble lady
 *   - 統一 3:4 vertical portrait + bottom 留白給文字疊加
 *
 * The character prompt (from ai_characters.style_prompt) is appended to
 * every panel so the i2i subject_reference stays consistent.
 */

// ── 全域 NO-TEXT 規則 v2（user 範本強化版） ──
const NO_TEXT_RULES = [
  "no text",
  "no words",
  "no letters",
  "no typography",
  "no captions",
  "no logos",
  "no signage",
  "no writing",
  "no speech bubbles",
  "no banners",
  "no posters",
  "no subtitles",
  "blank empty space at the bottom of the picture reserved for later text overlay",
  "vertical portrait, aspect ratio 3:4",
].join(", ");

// ── 寫實風格基底 v3.1（user 衝突感 + 驚訝感） ──
const REALISTIC_STYLE = [
  "Realistic DSLR travel photography",
  "candid street photography with strong environmental storytelling",
  "shallow depth of field on the scene",
  "the scenic location and architectural details fill 70% of the frame",
  "the Song dynasty noble lady in hanfu appears as 30% of the frame as a striking time-travel visitor",
  "the lady shows a visibly surprised and astonished expression, wide eyes, slightly open mouth, taken aback by the modern surroundings, looking around with curious wonder, hands slightly raised in astonishment",
  "juxtaposition of ancient Song dynasty and modern Chinese setting",
  "vintage realistic color grading",
  "cinematic atmosphere",
  "8K ultra high detail",
  "photorealistic",
  "hyper-detailed environment and fabric folds",
].join(", ");

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
  // v3.1 寫實風 4 格：場景為主、仕女為客 + 衝突感 + 驚訝表情
  const scenePrompts: Record<PanelIndex, string> = {
    1: `${REALISTIC_STYLE}, ${baseCharacter}, candidly arriving at the entrance of ${scene}, the entrance architecture and surrounding modern visitors dominate the frame, the Song dynasty lady in hanfu stands as a striking small figure creating a time-travel moment, ${NO_TEXT_RULES}`,
    2: `${REALISTIC_STYLE}, ${baseCharacter}, exploring the cultural setting of ${scene}, the scene's signature architecture and atmosphere fill most of the frame, the lady appears in mid-ground in her hanfu as a visitor, modern Chinese environment surrounds her, ${NO_TEXT_RULES}`,
    3: `${REALISTIC_STYLE}, ${baseCharacter}, savoring the local delicacy near ${scene}, the food atmosphere and signature dish fill the foreground, the Song dynasty lady in hanfu is shown among the bustling market or restaurant scene as a striking ancient visitor, time-travel contrast is the focal point, ${NO_TEXT_RULES}`,
    4: `${REALISTIC_STYLE}, ${baseCharacter}, taking a souvenir photo at ${scene}, the iconic landmark or scenery fills 70% of the frame as backdrop, the lady stands to the side as a striking contrast figure, candid travel photography with strong environmental storytelling, ${NO_TEXT_RULES}`,
  };
  return scenePrompts[panel];
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
