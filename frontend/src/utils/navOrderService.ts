/**
 * Navigation Order Service
 * 
 * Stores and retrieves the travel page navigation item ordering.
 * Uses planner_settings table in Supabase as storage.
 * Falls back to DEFAULT_ORDER if Supabase unavailable.
 */

import { createClient } from '@/utils/supabase/client';

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'planner',     label: '🗓️ 行程規劃器',  href: '/travel/planner'     },
  { key: 'journal',     label: '📖 旅程日誌',     href: '/travel/journal'     },
  { key: 'stories',     label: '📚 地理歷史',     href: '/travel/stories'     },
  { key: 'room-tour',   label: '🏨 Room Tour',    href: '/travel/room-tour'   },
  { key: 'videos',      label: '🎬 影片分享牆',   href: '/travel/videos'      },
  { key: 'dining',      label: '🍜 餐食評論',     href: '/travel/dining'      },
  { key: 'toilet-tour', label: '🚻 Toilet Tour',  href: '/travel/toilet-tour' },
  { key: 'toys-tour',   label: '🧸 Toys Tour',    href: '/travel/toys-tour'   },
];

const SETTINGS_KEY = 'nav_order_v1';

function getSupabase() {
  return createClient();
}

export async function loadNavOrder(): Promise<NavItem[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('planner_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (error || !data) {
      // Try localStorage as fallback
      const saved = localStorage.getItem('travel-nav-order');
      if (saved) {
        const keys: string[] = JSON.parse(saved);
        return DEFAULT_NAV_ITEMS.filter(item => keys.includes(item.key));
      }
      return DEFAULT_NAV_ITEMS;
    }

    const keys: string[] = data.value.split(',');
    const ordered = keys
      .map(k => DEFAULT_NAV_ITEMS.find(item => item.key === k))
      .filter(Boolean) as NavItem[];

    // Add any new items not in the saved order
    const savedKeys = new Set(keys);
    for (const item of DEFAULT_NAV_ITEMS) {
      if (!savedKeys.has(item.key)) {
        ordered.push(item);
      }
    }

    return ordered;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

export async function saveNavOrder(items: NavItem[]): Promise<void> {
  const keys = items.map(i => i.key).join(',');

  try {
    const supabase = getSupabase();
    await supabase.from('planner_settings').upsert(
      { key: SETTINGS_KEY, value: keys },
      { onConflict: 'key' }
    );
  } catch (e) {
    console.warn('[NavOrderService] Save failed:', e);
  }

  // Also save to localStorage as backup
  localStorage.setItem('travel-nav-order', JSON.stringify(keys.split(',')));
}