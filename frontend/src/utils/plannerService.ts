/**
 * Planner Supabase Service
 *
 * Strategy:
 *  - Try to load from Supabase first (once tables exist)
 *  - Fall back to PRESET_* constants if Supabase is unavailable
 *  - If Supabase returns data BUT localStorage has a newer / larger set,
 *    merge by id preferring localStorage (防止 sync race 丟失編輯)
 *
 * All operations go through the anon key + RLS (no service role needed in browser).
 */

import { createClient } from '@/utils/supabase/client';

export const STORAGE_KEY = 'hangzhou-trip-planner';

export interface Activity {
  id: string;
  title: string;
  day: number;
  startHour: number;
  duration: number;
  color: string;
  cost?: number;
  costType?: 'ticket' | 'food' | 'transport' | 'accommodation' | 'flight' | 'spot' | 'shopping';
  notes?: string;
  tickets?: TicketType[];
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  purchasedBy: string[];
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

// ── Preset data (fallback when Supabase unavailable) ───────────────────────────

export const PRESET_ACTIVITIES: Activity[] = [
  { id: 'act-1',  title: '外灘夜景',        day: 1, startHour: 17, duration: 3, color: 'bg-blue-400',   cost: 0,   costType: 'spot' },
  { id: 'act-2',  title: '南京東路步行街',   day: 1, startHour: 20, duration: 2, color: 'bg-orange-400',  cost: 0,   costType: 'spot' },
  { id: 'act-3',  title: '海底撈火鍋',        day: 1, startHour: 22, duration: 2, color: 'bg-red-400',    cost: 500, costType: 'food' },
  { id: 'act-4',  title: '小楊生煎',         day: 2, startHour: 8,  duration: 1, color: 'bg-yellow-400',  cost: 100, costType: 'food' },
  { id: 'act-5',  title: '豫園',            day: 2, startHour: 9,  duration: 2, color: 'bg-green-400',   cost: 80,  costType: 'ticket' },
  { id: 'act-6',  title: '城隍廟',          day: 2, startHour: 12, duration: 2, color: 'bg-green-400',   cost: 0,   costType: 'spot' },
  { id: 'act-7',  title: '南翔饅頭',         day: 2, startHour: 14, duration: 1, color: 'bg-orange-400',  cost: 120, costType: 'food' },
  { id: 'act-8',  title: '西塘古鎮',         day: 2, startHour: 16, duration: 3, color: 'bg-cyan-400',   cost: 190, costType: 'ticket' },
  { id: 'act-9',  title: '江南戲曲服飾',     day: 3, startHour: 8,  duration: 3, color: 'bg-purple-400', cost: 150, costType: 'ticket' },
  { id: 'act-10', title: '水宴餐廳',         day: 3, startHour: 12, duration: 2, color: 'bg-orange-400',  cost: 200, costType: 'food' },
  { id: 'act-11', title: '烏鎮東柵',         day: 3, startHour: 15, duration: 4, color: 'bg-cyan-400',   cost: 110, costType: 'ticket' },
  { id: 'act-12', title: '烏鎮西柵',         day: 4, startHour: 8,  duration: 5, color: 'bg-green-400',   cost: 150, costType: 'ticket' },
  { id: 'act-13', title: '白蓮塔',           day: 4, startHour: 14, duration: 2, color: 'bg-red-400',    cost: 0,   costType: 'spot' },
  { id: 'act-14', title: '木心美術館',       day: 4, startHour: 16, duration: 2, color: 'bg-purple-400', cost: 20, costType: 'ticket' },
  { id: 'act-15', title: '搖櫓船',           day: 4, startHour: 18, duration: 1, color: 'bg-cyan-400',  cost: 150, costType: 'ticket' },
  { id: 'act-16', title: '西湖（主湖區）',   day: 5, startHour: 8,  duration: 3, color: 'bg-green-400',  cost: 0,   costType: 'spot' },
  { id: 'act-17', title: '斷橋殘雪',         day: 5, startHour: 11, duration: 1, color: 'bg-blue-400',  cost: 0,   costType: 'spot' },
  { id: 'act-18', title: '蘇堤',             day: 5, startHour: 13, duration: 2, color: 'bg-green-400', cost: 0,   costType: 'spot' },
  { id: 'act-19', title: '武林夜市',         day: 5, startHour: 18, duration: 3, color: 'bg-orange-400', cost: 200, costType: 'food' },
  { id: 'act-20', title: '河坊街',           day: 5, startHour: 21, duration: 1, color: 'bg-orange-400', cost: 300, costType: 'shopping' },
  { id: 'act-21', title: '游埠豆漿',         day: 6, startHour: 6,  duration: 1, color: 'bg-yellow-400', cost: 60, costType: 'food' },
  { id: 'act-22', title: '宋城千古情',       day: 6, startHour: 10, duration: 5, color: 'bg-purple-400', cost: 1600, costType: 'ticket' },
  { id: 'act-23', title: '馬鴻興川小館',  day: 6, startHour: 18, duration: 2, color: 'bg-orange-400', cost: 200, costType: 'food' },
  { id: 'act-24', title: '大馬弄',           day: 7, startHour: 6,  duration: 2, color: 'bg-yellow-400', cost: 80,  costType: 'food' },
  { id: 'act-25', title: '京杭大運河遊船',   day: 7, startHour: 10, duration: 3, color: 'bg-cyan-400',  cost: 267, costType: 'ticket' },
  { id: 'act-26', title: '宮宴',             day: 7, startHour: 18, duration: 3, color: 'bg-red-400',   cost: 2500, costType: 'food' },
  { id: 'act-27', title: '西湖（主湖區）',   day: 8, startHour: 8,  duration: 2, color: 'bg-green-400', cost: 0,   costType: 'spot' },
  { id: 'act-28', title: '龍井茶園',         day: 8, startHour: 11, duration: 2, color: 'bg-green-400', cost: 300, costType: 'ticket' },
];

export const PRESET_MEMBERS: Member[] = [
  { id: 'm1', name: '阿國',   color: 'bg-blue-500'   },
  { id: 'm2', name: '小珍',   color: 'bg-pink-500'   },
  { id: 'm3', name: '大雄',   color: 'bg-green-500'  },
  { id: 'm4', name: '阿美',   color: 'bg-yellow-500' },
  { id: 'm5', name: '老王',   color: 'bg-purple-500' },
  { id: 'm6', name: '小李',   color: 'bg-red-500'    },
  { id: 'm7', name: '阿婷',   color: 'bg-teal-500'   },
];

// ── Supabase service ───────────────────────────────────────────────────────────

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

// Returns true only if the Supabase table is reachable (tables exist)
async function _isSupabaseAvailable(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('planner_activities')
      .select('id', { count: 'exact', head: true });
    // 404 means table doesn't exist; null error means it does
    return !error || error.code !== 'PGRST204';
  } catch {
    return false;
  }
}

export const MEMBER_STORAGE_KEY = 'hangzhou-trip-members';

// ── Activities ─────────────────────────────────────────────────────────────────

export async function loadActivities(): Promise<Activity[]> {
  // 從 localStorage 讀取（如果存在）— 防止 sync race 丟失本機編輯
  const lsRaw = (typeof window !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
  const lsActivities: Activity[] = lsRaw ? (() => {
    try {
      const parsed = JSON.parse(lsRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })() : [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('planner_activities')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // 雲端空或失敗 → 退回 localStorage（如果也空 → preset）
      if (lsActivities.length > 0) {
        console.info('[PlannerService] Supabase empty, using localStorage backup');
        return lsActivities;
      }
      console.info('[PlannerService] Supabase unavailable, using preset data');
      return PRESET_ACTIVITIES;
    }

    const sbActivities: Activity[] = data.map(row => ({
      id: row.id,
      title: row.title,
      day: row.day,
      startHour: row.start_hour,
      duration: row.duration,
      color: row.color,
      cost: row.cost ?? 0,
      costType: row.cost_type ?? 'ticket',
      notes: row.notes ?? undefined,
      // Supabase JSON columns return string literals; parse if string
      tickets: (() => {
        const v = row.tickets;
        if (!v) return [];
        if (typeof v === 'string') {
          try { return JSON.parse(v); } catch { return []; }
        }
        return v as TicketType[];
      })(),
    }));

    // Merge: localStorage 的 id 若不在雲端 → 保留（防止 sync 競態丟失）；
    //        雲端有的 id 用雲端版（雲端是 source of truth）
    if (lsActivities.length === 0) return sbActivities;

    const sbIds = new Set(sbActivities.map(a => a.id));
    const localOnly = lsActivities.filter(a => !sbIds.has(a.id));
    if (localOnly.length > 0) {
      console.info(
        `[PlannerService] Merge: ${sbActivities.length} from cloud + ${localOnly.length} from localStorage backup`
      );
      return [...sbActivities, ...localOnly];
    }

    return sbActivities;
  } catch {
    // 完全失敗 → localStorage 或 preset
    if (lsActivities.length > 0) {
      console.info('[PlannerService] Supabase failed, using localStorage backup');
      return lsActivities;
    }
    return PRESET_ACTIVITIES;
  }
}

export async function syncActivities(activities: Activity[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    // Upsert all activities
    const rows = activities.map((a, idx) => ({
      id: a.id,
      title: a.title,
      day: a.day,
      start_hour: a.startHour,
      duration: a.duration,
      color: a.color,
      cost: a.cost ?? 0,
      cost_type: a.costType ?? 'ticket',
      notes: a.notes ?? null,
      tickets: a.tickets ? JSON.stringify(a.tickets) : '[]',
      sort_order: idx + 1,
    }));

    // Diff：找出雲端有但本地已刪除的 IDs，刪掉它們
    // — 解決「刪除活動後按儲存，reload 又跑回來」的 bug
    let deletedIds: string[] = [];
    if (rows.length > 0) {
      const { data: cloudRows } = await supabase
        .from('planner_activities')
        .select('id');
      const localIds = new Set(rows.map(r => r.id));
      const cloudIds = (cloudRows || []).map(r => r.id);
      deletedIds = cloudIds.filter(id => !localIds.has(id));
      if (deletedIds.length > 0) {
        await supabase
          .from('planner_activities')
          .delete()
          .in('id', deletedIds);
      }
    } else {
      // 本地完全清空 → 雲端也清空
      await supabase.from('planner_activities').delete().gte('day', 0);
    }

    const { error } = await supabase
      .from('planner_activities')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('[PlannerService] Sync failed:', error.message);
      return { ok: false, error: error.message };
    }
    console.info(
      `[PlannerService] Synced ${rows.length} activities` +
      (deletedIds.length > 0 ? `, deleted ${deletedIds.length} stale: [${deletedIds.join(', ')}]` : '')
    );
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[PlannerService] Sync failed:', msg);
    return { ok: false, error: msg };
  }
}

// 將 activities 鏡像到 Supabase user_state['hangzhou-trip-itinerary']，
// 給 /travel、/travel/journal 讀取 — 跟 ClientPage 的 debounce sync 是同一個動作，
// 抽出來讓「立即儲存」按鈕 / 編輯器 handleSave / 新增 handleAddActivity 共用。
export async function mirrorItineraryToUserState(activities: Activity[]): Promise<{ ok: boolean; error?: string }> {
  if (activities.length === 0) return { ok: true };
  try {
    const supabase = getSupabase();
    const grouped = new Map<number, Activity[]>();
    for (const a of activities) {
      if (!grouped.has(a.day)) grouped.set(a.day, []);
      grouped.get(a.day)!.push(a);
    }
    const plannedDays = Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, acts]) => ({
        day: `D${day}`,
        title: `Day ${day}`,
        description: '',
        attractions: acts.map(a => a.title),
      }));
    const { error } = await supabase
      .from('user_state')
      .upsert({
        key: 'hangzhou-trip-itinerary',
        value: plannedDays as unknown as object,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.warn('[PlannerService] Mirror to user_state failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[PlannerService] Mirror to user_state failed:', msg);
    return { ok: false, error: msg };
  }
}

// ── Members ────────────────────────────────────────────────────────────────────

export async function loadMembers(): Promise<Member[]> {
  // localStorage 備援（同 loadActivities 的 merge 策略）
  const lsRaw = (typeof window !== 'undefined') ? localStorage.getItem(MEMBER_STORAGE_KEY) : null;
  const lsMembers: Member[] = lsRaw ? (() => {
    try {
      const parsed = JSON.parse(lsRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })() : [];

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('planner_members')
      .select('*');

    if (error || !data || data.length === 0) {
      if (lsMembers.length > 0) {
        console.info('[PlannerService] Supabase members empty, using localStorage');
        return lsMembers;
      }
      return PRESET_MEMBERS;
    }

    const sbMembers: Member[] = data.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }));

    // Merge: 雲端有的用雲端，localStorage 獨有的補上（防止 sync race）
    if (lsMembers.length === 0) return sbMembers;
    const sbIds = new Set(sbMembers.map(m => m.id));
    const localOnly = lsMembers.filter(m => !sbIds.has(m.id));
    return localOnly.length > 0 ? [...sbMembers, ...localOnly] : sbMembers;
  } catch {
    if (lsMembers.length > 0) return lsMembers;
    return PRESET_MEMBERS;
  }
}

export async function syncMembers(members: Member[]): Promise<void> {
  try {
    const supabase = getSupabase();
    const rows = members.map(m => ({ id: m.id, name: m.name, color: m.color }));
    await supabase.from('planner_members').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('[PlannerService] Members sync failed:', e);
  }
}

// ── Cost Target ────────────────────────────────────────────────────────────────

export async function loadCostTarget(): Promise<number> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('planner_settings')
      .select('value')
      .eq('key', 'cost_target')
      .single();
    return data ? parseInt(data.value) || 20000 : 20000;
  } catch {
    return 20000;
  }
}

export async function syncCostTarget(target: number): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('planner_settings').upsert(
      { key: 'cost_target', value: String(target) },
      { onConflict: 'key' }
    );
  } catch (e) {
    console.warn('[PlannerService] Cost target sync failed:', e);
  }
}
