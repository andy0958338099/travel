/**
 * 🆕 2026-08-10 聖上拍板: 故事部落格 LLM 靈感 helper
 *
 * 🆕 8-10 聖上拍板: 靈感真的根據「小標題」發想, 不是空泛模板
 *   - 聖上輸入「桃園機場的報到櫃台」→ 3 條靈感全部圍繞「報到櫃台」展開
 *   - 沒小標題 → fallback 通用 prompt
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
 * ⚠️ 重複插太多次後, sort_order 會擠在一起
 *    detect 差距 < 0.0001 時呼叫 rebalance RPC
 */
export function computeInsertOrder(
  existing: { sort_order: number }[],
  position: "first" | "middle" | "last" | "append"
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
