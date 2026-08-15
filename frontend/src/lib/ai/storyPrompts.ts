/**
 * 🆕 2026-08-10 聖上拍板: 故事部落格 LLM 靈感 helper
 *
 * 🆕 8-10 聖上拍板: 靈感真的根據「小標題」發想, 不是空泛模板
 *   - 聖上輸入「桃園機場的報到櫃台」→ 3 條靈感全部圍繞「報到櫃台」展開
 *   - 沒小標題 → fallback 通用 prompt
 *
 * 🆕 8-16 聖上拍板: 統一語言鎖繁體中文 (台灣用詞)
 *   - 寫作靈感 prompt 雖然目前是 template 直接給聖上看, 但 helper 內每條 prompt 已經用繁體
 *   - 未來若改用 LLM 生成靈感 (async fetch /api/story-prompt), 必須用 TRADITIONAL_CHINESE_SYSTEM_RULES 包
 *   - 寫作靈感 prompt 是問題形式, 聖上自己接寫 → 給繁體用詞範例, 鼓勵聖上接繁體
 *
 * 3 條 prompt 設計 (每條都聚焦小標題):
 *   1. ✏️ 場景切入: 「小標題」這個畫面裡, 第一眼看到什麼?
 *   2. 🌅 時間地點: 小標題描述的場景, 那天 / 那時 / 在哪裡?
 *   3. 💭 人物互動: 小標題這一刻, 13 人裡誰最在場? 誰在說話?
 *
 * 風格鎖定:
 *   - prompt 都是「問題 + 起點」, 讓聖上用自己的話接
 *   - 不加 LLM 慣用副詞 (「靜謐」「悄然」「彷彿」)
 *   - 不虛構事實 (8-9 聖上 USER 偏好)
 */

/**
 * 🆕 2026-08-16 聖上拍板: 統一語言鎖繁體中文 (台灣用詞)
 * 給未來 LLM 端點 (/api/story-prompt) 用的 system prompt 前綴
 * 任何 LLM 生成靈感 / 潤飾內容都要先疊這段
 *
 * 詳細禁用簡體字對照 + 台灣用詞清單
 */
export const TRADITIONAL_CHINESE_SYSTEM_RULES = `# 🆕 2026-08-16 聖上拍板: 輸出語言統一繁體中文 (台灣用詞)
- 全文必須用「繁體中文」, 不准出現簡體字
- 禁用簡體字對照: ❌ 时→時、个→個、们→們、说→說、这→這、里→裡、吗→嗎、间→間、动→動、听→聽、见→見、应→應、对→對、际→際、议→議、响→響、团→團、园→園、环→環、丽→麗、术→術、确→確、记→記、号→號、顾→顧、财→財、车→車、长→長、阵→陣、银→銀 → 必須用繁體
- 用詞遵「台灣習慣」: 軟體 (不用「軟件」)、網路 (不用「網絡」)、影片 (不用「視頻」)、相機 (不用「照相機」)、計程車 (不用「出租車」)、品質 (不用「質量」)、資訊 (不用「信息」)、資料 (不用「數據」)、伺服器 (不用「服務器」)、介面 (不用「界面」)
- 標點符號用全形繁體標點: ，。、；：「」『』（）—…, 不用半形`;

export interface StoryInspiration {
  /** 短標籤: '✏️ 場景' | '🌅 時間' | '💭 人物' */
  label: string;
  /** 一行 prompt, 給聖上看 + 直接當 textarea placeholder */
  prompt: string;
}

/**
 * 根據「小標題 + 選擇的天數 + 選的 layout_type」產出 3 條寫作靈感 prompt
 * 每條都圍繞小標題展開, 讓聖上有方向但用自己的話寫
 */
export function buildStoryInspirations(input: {
  title: string;          // 🆕 聖上必填的小標題 — 所有 prompt 圍繞它
  dayNumber: number;
  layoutType: "left-image" | "right-image" | "top-image";
}): StoryInspiration[] {
  const { title, dayNumber, layoutType } = input;
  const trimmedTitle = title.trim();
  const dayLabel =
    dayNumber === 0
      ? "出發前的前言"
      : dayNumber === 9
        ? "回來之後的後記"
        : `第 ${dayNumber} 天`;

  // 沒小標題 → fallback 通用 prompt
  if (!trimmedTitle) {
    return [
      { label: "✏️ 起點", prompt: "把照片打開, 第一眼看到的是什麼? 顏色? 光線? 還是人?" },
      { label: "🌅 場景", prompt: `那天的 ${dayLabel} — 天氣如何? 是白天還是夜晚? 你站在哪裡? 旁邊是誰在說話或拍照?` },
      { label: "💭 感受", prompt: "寫一段「現在回想那一刻, 你會記得什麼」 — 不要形容照片, 寫你當下的動作或對話。" },
    ];
  }

  // 🆕 圍繞小標題「${title}」展開 3 條
  return [
    {
      label: "✏️ 場景",
      prompt: `「${trimmedTitle}」這個畫面裡, 第一眼看到的是什麼? 是顏色、光線、還是某個人正在做的動作?`,
    },
    {
      label: "🌅 時間",
      prompt: `描述「${trimmedTitle}」的那一刻, 是什麼時段? 天氣如何? 你在現場的哪個位置?`,
    },
    {
      label: "💭 人物",
      prompt: `「${trimmedTitle}」這一刻, 13 人裡誰最在現場? 誰在說話或拍照? 誰可能在想什麼?`,
    },
  ];
}

/**
 * 計算「在兩筆之間插入」的 sort_order
 * 半自動機制 (8-10 聖上拍板 3A):
 *   - 插到最前 → (min - 1000)  // 例如 0 + 1 之間
 *   - 插到中間 → (prev + next) / 2
 *   - 插到最後 → (max + 1000)
 *   - 沒指定位置 → 預設 append 到最後
 *
 * 🆕 2026-08-16 聖上拍板: 新增「smart」模式 — 0/1 筆自動 pick, ≥2 筆擠中間
 *   - 解決 user 報「新增故事永遠被卡在最尾段, 不能調整上下」bug
 *   - 0 筆 → sort_order=1000 (第一個直接建)
 *   - 1 筆 → sort_order=max+1000 (只能 append, 沒中間選)
 *   - ≥2 筆 → (prev + next) / 2 自動擠進中間一段 — 留 1000 空間給前後插入
 *   - modal 預設 position 從 "append" 改成 "smart", 聖上不用每次想
 *
 * ⚠️ 重複插太多次後, sort_order 會擠在一起
 *    detect 差距 < 0.0001 時呼叫 rebalance RPC
 */
export function computeInsertOrder(
  existing: { sort_order: number }[],
  position: "first" | "middle" | "last" | "append" | "smart"
): { sortOrder: number; needsRebalance: boolean } {
  if (existing.length === 0) {
    return { sortOrder: 1000, needsRebalance: false };
  }

  const sorted = [...existing].map(p => p.sort_order).sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (position === "first") {
    return { sortOrder: min - 1000, needsRebalance: false };
  }
  if (position === "last") {
    return { sortOrder: max + 1000, needsRebalance: false };
  }
  if (position === "append") {
    return { sortOrder: max + 1000, needsRebalance: false };
  }
  // 🆕 smart: 1 筆走 append, ≥2 筆走 middle
  if (position === "smart") {
    if (sorted.length === 1) {
      return { sortOrder: max + 1000, needsRebalance: false };
    }
    const mid = Math.floor(sorted.length / 2);
    const prev = sorted[mid - 1];
    const next = sorted[mid];
    const newOrder = (prev + next) / 2;
    const needsRebalance = Math.abs(next - prev) < 0.001;
    return { sortOrder: newOrder, needsRebalance };
  }
  // middle: 取中間兩筆的平均
  if (sorted.length === 1) {
    return { sortOrder: min + 1000, needsRebalance: false };
  }
  const mid = Math.floor(sorted.length / 2);
  const prev = sorted[mid - 1];
  const next = sorted[mid];
  const newOrder = (prev + next) / 2;
  const needsRebalance = Math.abs(next - prev) < 0.001;
  return { sortOrder: newOrder, needsRebalance };
}
