/**
 /** * Navigation Order Service
  *
  * Stores and retrieves the travel page navigation item ordering.
  * Backed by the shared `user_state` cloud table (key = 'travel-nav-order'),
  * which is the single source of truth for personal per-device state.
  *
  * Each user gets their own ordering; default = DEFAULT_NAV_ITEMS.
  *
  * Realtime: writes are picked up by other tabs/devices via
  * useCloudState's subscription on the same key. This service is the
  * imperative write path used by the SortMode UI; read-time uses
  * useCloudState in the consumer.
  */

 'use client';

 import { createClient } from '@/utils/supabase/client';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'planner',     label: '🗓️ 行程規劃器',  href: '/travel/planner'     },
  { key: 'sim-guide',   label: '📶 陸旅通訊',     href: '/travel/sim-guide'   },
  { key: 'journal',     label: '📖 旅程日誌',     href: '/travel/journal'     },
  { key: 'stories',     label: '📚 地理歷史',     href: '/travel/stories'     },
  { key: 'manga',          label: '🎨 Q版漫畫編輯器',  href: '/travel/manga'          },
  { key: 'guidebook',      label: '📖 Q版漫畫圖鑑',     href: '/travel/guidebook'      },
  { key: 'gufeng-zhenren', label: '🎎 古風寫真',    href: '/travel/gufeng-zhenren' },
  { key: 'room-tour',      label: '🏨 Room Tour',    href: '/travel/room-tour'      },
  { key: 'videos',      label: '🎬 影片分享牆',   href: '/travel/videos'      },
  { key: 'dining',      label: '🍜 餐食評論',     href: '/travel/dining'      },
  { key: 'foodie-stops', label: '🧋 網紅名店',     href: '/travel/foodie-stops' },
  { key: 'payment-guide', label: '💴 換匯/支付',  href: '/travel/payment-guide' },
  { key: 'toilet-tour', label: '🚻 Toilet Tour',  href: '/travel/toilet-tour' },
  { key: 'toys-tour',   label: '🧸 Toys Tour',    href: '/travel/toys-tour'   },
];

export const NAV_ORDER_KEY = 'travel-nav-order';

export function applyOrder(keys: string[]): NavItem[] {
  const ordered = keys
    .map((k) => DEFAULT_NAV_ITEMS.find((item) => item.key === k))
    .filter(Boolean) as NavItem[];
  // Append any new items not in the saved order.
  const known = new Set(keys);
  for (const item of DEFAULT_NAV_ITEMS) {
    if (!known.has(item.key)) ordered.push(item);
  }
  return ordered;
}

export async function loadNavOrder(): Promise<NavItem[]> {
  try {
    const { data, error } = await createClient()
      .from('user_state')
      .select('value')
      .eq('key', NAV_ORDER_KEY)
      .maybeSingle();
    if (error || !data) return DEFAULT_NAV_ITEMS;
    const raw = data.value as unknown;
    const keys: string[] = Array.isArray(raw)
      ? (raw as string[])
      : typeof raw === 'string'
        ? raw.split(',')
        : [];
    return applyOrder(keys);
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

export async function saveNavOrder(items: NavItem[]): Promise<void> {
  const keys = items.map((i) => i.key);
  const { error } = await createClient()
    .from('user_state')
    .upsert({
      key: NAV_ORDER_KEY,
      value: keys as unknown as object,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.warn('[NavOrderService] Save failed:', error.message);
  }
  // localStorage fallback for offline reads (mirrors user_state bootstrap).
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(keys));
    } catch {
      // ignore quota errors
    }
  }
}
