import { JIANGNAN_ITINERARY } from '@/data/jiangnan-itinerary';

/**
 * 把 JIANGNAN_ITINERARY（原始 8 天行程表文字）解析成結構化的每日時間軸。
 *
 * 行程表格式：
 *   === 07/17 (D1, 桃園 → 上海) ===
 *   08:30~09:00  桃園機場第一航廈集合 T1
 *   11:15        飛機起飛
 *
 * 解析結果供 planner 的「當日詳細行程」面板使用 — 純前端顯示。
 */

export interface TimelineEntry {
  /** 顯示用時間，例如 "08:30~09:00" 或 "11:15" */
  time: string;
  /** 行程內容 */
  text: string;
  /** 起始小時（0-23），用於排序；無法解析時為 null */
  startHour: number | null;
}

export interface DayTimeline {
  /** 1-8 */
  day: number;
  /** 該天的日期標題，例如 "07/17 (D1, 桃園 → 上海)" */
  heading: string;
  entries: TimelineEntry[];
}

function parseTimeRange(raw: string): { time: string; startHour: number | null } {
  const time = raw.trim();
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { time, startHour: null };
  const h = Number(m[1]);
  if (Number.isNaN(h) || h < 0 || h > 23) return { time, startHour: null };
  return { time, startHour: h };
}

/** 解析整份行程表為 8 天的時間軸。 */
export function parseItineraryTimeline(raw: string = JIANGNAN_ITINERARY): DayTimeline[] {
  const days: DayTimeline[] = [];
  let current: DayTimeline | null = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // === 07/17 (D1, 桃園 → 上海) ===
    const head = trimmed.match(/^===\s*(\d{2})\/(\d{2})\s*\((D(\d)[^)]*)\)\s*===$/);
    if (head) {
      const day = Number(head[4]);
      current = { day, heading: trimmed.replace(/^===\s*|\s*===$/g, ''), entries: [] };
      days.push(current);
      continue;
    }

    if (!current) continue;

    // 跳過標題行本身
    if (trimmed.startsWith('【')) continue;

    // "08:30~09:00  內容" 或 "11:15        內容"
    const m = trimmed.match(/^(\d{1,2}:\d{2}(?:\s*[~～]\s*\d{1,2}:\d{2})?)\s{2,}(.+)$/);
    if (!m) continue;

    const { time, startHour } = parseTimeRange(m[1]);
    current.entries.push({ time, text: m[2].trim(), startHour });
  }

  return days;
}

/** 依天數取時間軸；找不到回 null。 */
export function getDayTimeline(day: number): DayTimeline | null {
  return parseItineraryTimeline().find(d => d.day === day) ?? null;
}
