import type { Activity } from './types';

// Re-export shared itinerary constants from the single source of truth.
// Keeps existing imports `from './constants'` working without changes.
export { DAYS, DAY_TITLES } from '@/lib/itinerary';

// ── Colors ──────────────────────────────────────────────────────────────────
// Activity block palette (lighter, suitable for grid blocks)
export const COLORS = [
  { name: '紅', bg: 'bg-red-400', border: 'border-red-500', text: 'text-red-900' },
  { name: '橘', bg: 'bg-orange-400', border: 'border-orange-500', text: 'text-orange-900' },
  { name: '黃', bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-yellow-900' },
  { name: '綠', bg: 'bg-green-400', border: 'border-green-500', text: 'text-green-900' },
  { name: '青', bg: 'bg-cyan-400', border: 'border-cyan-500', text: 'text-cyan-900' },
  { name: '藍', bg: 'bg-blue-400', border: 'border-blue-500', text: 'text-blue-900' },
  { name: '紫', bg: 'bg-purple-400', border: 'border-purple-500', text: 'text-purple-900' },
  { name: '粉', bg: 'bg-pink-400', border: 'border-pink-500', text: 'text-pink-900' },
];

// Member avatar palette (MemberManager only — different from COLORS above)
export const MEMBER_COLORS = [
  'bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
];

export const HOURS = Array.from({ length: 20 }, (_, i) => i + 5); // 5:00 ~ 24:00

// DAYS is now imported from @/lib/itinerary (see top of file)
// Kept comment for searchability

export const COST_CATEGORIES = [
  { label: '🎫 門票',    costType: 'ticket',        bg: 'bg-blue-200' },
  { label: '🍜 餐飲',    costType: 'food',          bg: 'bg-orange-200' },
  { label: '🚗 交通',    costType: 'transport',     bg: 'bg-cyan-200' },
  { label: '🏨 住宿',    costType: 'accommodation', bg: 'bg-purple-200' },
  { label: '✈️ 機票',    costType: 'flight',        bg: 'bg-green-200' },
] as const;

export const COST_TYPE_OPTIONS = [
  { value: 'ticket',        label: '🎫 門票' },
  { value: 'food',          label: '🍜 餐飲' },
  { value: 'transport',     label: '🚗 交通' },
  { value: 'accommodation', label: '🏨 住宿' },
  { value: 'flight',        label: '✈️ 機票' },
] as const;

export const _PRESET_PLANNER_ACTIVITIES: Activity[] = [
  { id: 'act-1',  title: '外灘夜景',       day: 1, startHour: 17, duration: 3, color: 'bg-blue-400',   cost: 0 },
  { id: 'act-2',  title: '南京東路步行街',  day: 1, startHour: 20, duration: 2, color: 'bg-orange-400',  cost: 0 },
  { id: 'act-3',  title: '海底撈火鍋',     day: 1, startHour: 22, duration: 2, color: 'bg-red-400',    cost: 500 },
  { id: 'act-4',  title: '小楊生煎',        day: 2, startHour: 8,  duration: 1, color: 'bg-yellow-400',  cost: 100 },
  { id: 'act-5',  title: '豫園',           day: 2, startHour: 9,  duration: 2, color: 'bg-green-400',   cost: 80 },
  { id: 'act-6',  title: '城隍廟',         day: 2, startHour: 12, duration: 2, color: 'bg-green-400',   cost: 0 },
  { id: 'act-7',  title: '南翔饅頭',        day: 2, startHour: 14, duration: 1, color: 'bg-orange-400',  cost: 120 },
  { id: 'act-8',  title: '西塘古鎮',        day: 2, startHour: 16, duration: 3, color: 'bg-cyan-400',   cost: 190 },
  { id: 'act-9',  title: '江南戲曲服飾',    day: 3, startHour: 8,  duration: 3, color: 'bg-purple-400', cost: 150 },
  { id: 'act-10', title: '水宴餐廳',       day: 3, startHour: 19, duration: 2, color: 'bg-orange-400',  cost: 300 },
  { id: 'act-11', title: '烏鎮東柵',        day: 3, startHour: 15, duration: 4, color: 'bg-cyan-400',   cost: 110 },
  { id: 'act-12', title: '烏鎮西柵',        day: 4, startHour: 8,  duration: 5, color: 'bg-green-400',  cost: 150 },
  { id: 'act-13', title: '白蓮塔',          day: 4, startHour: 14, duration: 2, color: 'bg-red-400',    cost: 0 },
  { id: 'act-14', title: '木心美術館',      day: 4, startHour: 16, duration: 2, color: 'bg-purple-400', cost: 20 },
  { id: 'act-15', title: '搖櫓船',          day: 4, startHour: 18, duration: 1, color: 'bg-cyan-400',  cost: 150 },
  { id: 'act-16', title: '西湖（主湖區）',  day: 5, startHour: 8,  duration: 3, color: 'bg-green-400',   cost: 0 },
  { id: 'act-17', title: '斷橋殘雪',        day: 5, startHour: 11, duration: 1, color: 'bg-blue-400',   cost: 0 },
  { id: 'act-18', title: '蘇堤',            day: 5, startHour: 13, duration: 2, color: 'bg-green-400',  cost: 0 },
  { id: 'act-19', title: '武林夜市',        day: 5, startHour: 18, duration: 3, color: 'bg-orange-400',  cost: 200 },
  { id: 'act-20', title: '河坊街',          day: 5, startHour: 21, duration: 1, color: 'bg-orange-400', cost: 300 },
  { id: 'act-21', title: '游埠豆漿',        day: 6, startHour: 6,  duration: 1, color: 'bg-yellow-400',  cost: 60 },
  { id: 'act-22', title: '宋城千古情',      day: 6, startHour: 10, duration: 5, color: 'bg-purple-400', cost: 1600 },
  { id: 'act-23', title: '馬鴻興川小館',    day: 6, startHour: 17, duration: 2, color: 'bg-orange-400', cost: 200 },
  { id: 'act-24', title: '大馬弄',          day: 7, startHour: 6,  duration: 2, color: 'bg-yellow-400',  cost: 80 },
  { id: 'act-25', title: '京杭大運河遊船',  day: 7, startHour: 10, duration: 3, color: 'bg-cyan-400',   cost: 267 },
  { id: 'act-26', title: '宮宴',            day: 7, startHour: 18, duration: 3, color: 'bg-red-400',    cost: 2500 },
  { id: 'act-27', title: '西湖（主湖區）',  day: 8, startHour: 8,  duration: 2, color: 'bg-green-400',   cost: 0 },
  { id: 'act-28', title: '龍井茶園',        day: 8, startHour: 11, duration: 2, color: 'bg-green-400',   cost: 300 },
  { id: 'act-29', title: '椒鹽醄醄火鍋',    day: 2, startHour: 18, duration: 2, color: 'bg-red-400',    cost: 150 },
];

export const STORAGE_KEY = 'hangzhou-trip-planner';
export const COST_STORAGE_KEY = 'hangzhou-trip-costs';
export const MEMBER_STORAGE_KEY = 'hangzhou-trip-members';
export const TICKET_STORAGE_KEY = 'hangzhou-trip-tickets';

// Day number → display title for sync
// DAY_TITLES is now imported from @/lib/itinerary (see top of file)
// Kept comment for searchability

// Helpers
export function fmt(n: number) {
  return n.toLocaleString('zh-TW');
}