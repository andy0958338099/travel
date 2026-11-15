import { ALL_ATTRACTIONS, type Attraction } from '../data';

/**
 * Planner 活動 ↔ 景點資料對照（僅供前端顯示，不寫回雲端）。
 *
 * 背景：planner 的 activities 從 Supabase 同步，只有 title / cost / costType，
 * 而 travel/data.ts 的 ATTRACTIONS 才有票價、營業時間、特色描述、座標與圖片。
 * 這裡做「名稱 → 景點」的本地查表，讓活動卡可以直接顯示這些細節。
 */

const byName = new Map<string, Attraction>();
for (const a of ALL_ATTRACTIONS) {
  // 先註冊正規名，後續的別名不會覆蓋它
  if (!byName.has(a.name)) byName.set(a.name, a);
}

// 行程活動名稱 → 景點正式名稱的別名表。
// 左邊是 planner activities 出現的寫法，右邊是 data.ts 的 name。
const ALIASES: Record<string, string> = {
  // 雲端資料沿用舊名稱，程式碼已改為正式名
  '馬驚興餐廳': '馬鴻興川小館',
  '馬鴻興': '馬鴻興川小館',
  '西湖': '西湖（主湖區）',
  '西湖主湖區': '西湖（主湖區）',
  '京杭大運河': '京杭大運河遊船',
  '大運河遊船': '京杭大運河遊船',
  '搖櫓船': '搖櫓船',
  '宋城千古情': '宋城千古情',
  '椒鹽醄醄火鍋': '椒鹽醄醄火鍋',
};

/** 依活動標題查出對應景點；查不到回 null。 */
export function lookupAttraction(title: string): Attraction | null {
  const t = (title ?? '').trim();
  if (!t) return null;

  const direct = byName.get(t);
  if (direct) return direct;

  const alias = ALIASES[t];
  if (alias) {
    const hit = byName.get(alias);
    if (hit) return hit;
  }

  // 去掉括號/空白後再比一次（例如「西湖（主湖區）」→「西湖」）
  const loose = t.replace(/[（(].*?[)）]/g, '').trim();
  if (loose && loose !== t) {
    const hit = byName.get(loose);
    if (hit) return hit;
  }

  // 包含比對（取最長匹配，避免「西湖」蓋掉「西湖天地」）
  let best: Attraction | null = null;
  for (const a of ALL_ATTRACTIONS) {
    if (t.includes(a.name) && (!best || a.name.length > best.name.length)) best = a;
  }
  return best;
}

/** 活動的「顯示用細節」：有對應景點時帶票價/營業時間/特色/圖片。 */
export interface ActivityDetail {
  ticket: string;
  hours: string;
  highlight: string;
  image?: string;
  attractionName: string;
}

/**
 * 組出活動細節。
 * 優先使用 activity.notes（使用者自己寫的），其次才是景點資料庫的 highlight。
 */
export function buildActivityDetail(activity: {
  title: string;
  notes?: string;
}): ActivityDetail | null {
  const spot = lookupAttraction(activity.title);
  if (!spot) return null;
  return {
    attractionName: spot.name,
    ticket: spot.ticket,
    hours: spot.hours,
    highlight: activity.notes?.trim() || spot.highlight,
    image: spot.images?.[0],
  };
}
