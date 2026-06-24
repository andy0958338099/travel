// Single source of truth for the trip itinerary.
// Both planner/ (DAY_TITLES) and foodie-stops/ (DAY_CITY_MAP) consume from here
// to keep the "Day X 經過" badges consistent with the actual 8-day flow.

export interface ItineraryDay {
  /** 1-indexed day number */
  day: number;
  /** Cities visited on this day. Transit days list both origin + destination. */
  cities: readonly string[];
  /** Display title (e.g. "上海 ➔ 西塘") */
  title: string;
  /** Date string for compact display (e.g. "7/17") */
  date: string;
}

export const ITINERARY: readonly ItineraryDay[] = [
  { day: 1, cities: ['上海'],          title: '台北 ➔ 上海',           date: '7/17' },
  { day: 2, cities: ['上海', '西塘'],  title: '上海 ➔ 西塘',           date: '7/18' },
  { day: 3, cities: ['西塘', '烏鎮'],  title: '西塘 ➔ 烏鎮東柵',       date: '7/19' },
  { day: 4, cities: ['烏鎮'],          title: '烏鎮西柵深度一日遊',     date: '7/20' },
  { day: 5, cities: ['烏鎮', '杭州'],  title: '烏鎮 ➔ 杭州西湖',       date: '7/21' },
  { day: 6, cities: ['杭州'],          title: '杭州宋城文化體驗',       date: '7/22' },
  { day: 7, cities: ['杭州'],          title: '杭州運河與宮廷晚宴',     date: '7/23' },
  { day: 8, cities: ['杭州'],          title: '杭州 ➔ 台北',           date: '7/24' },
] as const;

/** Compact {label, date} shape used by planner grid */
export const DAYS: ReadonlyArray<{ label: string; date: string }> = ITINERARY.map(d => ({
  label: `Day ${d.day}`,
  date: d.date,
}));

/** Map of day number → display title (consumed by planner sync mirror) */
export const DAY_TITLES: Readonly<Record<number, string>> = Object.freeze(
  Object.fromEntries(ITINERARY.map(d => [d.day, d.title]))
);

/**
 * Returns all days on which the given city is part of the itinerary.
 * Transit days (e.g. Day 2 = 上海 + 西塘) count the city on both sides,
 * so a 西塘 store correctly shows "Day 2 經過" rather than "未排入行程".
 */
export function getDaysForCity(city: string): number[] {
  return ITINERARY
    .filter(d => d.cities.includes(city))
    .map(d => d.day);
}