/**
 * Landing page data — independent copy of the 8-day itinerary
 * (kept in sync with /travel/ItineraryPlanner PRESET_ITINERARY).
 *
 * Kept separate so the landing can be styled/stubbed without
 * touching the planner's editable cloud state.
 */

export interface DayHighlight {
  day: string;             // "D1"
  date: string;            // "7/17 (五)"
  title: string;           // "台北 ➔ 上海"
  emoji: string;           // "✈️"
  short: string;           // 1 行摘要（給時間軸用）
  spots: string[];         // 2-4 個主要景點（給時間軸小字用）
}

export const TRIP = {
  startDate: "2026-07-17",
  endDate: "2026-07-24",
  days: 8,
  nights: 7,
  cities: ["上海", "西塘", "烏鎮", "杭州"],
};

export const DAYS: DayHighlight[] = [
  {
    day: "D1", date: "7/17 (五)", emoji: "✈️",
    title: "台北 ➔ 上海",
    short: "抵達上海浦東、磁浮列車直奔市區",
    spots: ["外灘夜景", "南京東路步行街", "海底撈"],
  },
  {
    day: "D2", date: "7/18 (六)", emoji: "🥟",
    title: "上海 ➔ 西塘",
    short: "豫園城隍廟吃小楊生煎，下午殺到西塘",
    spots: ["小楊生煎", "豫園", "城隍廟", "西塘古鎮"],
  },
  {
    day: "D3", date: "7/19 (日)", emoji: "🎭",
    title: "西塘 ➔ 烏鎮東柵",
    short: "清晨免費遊西塘，換裝拍照，傍晚烏鎮東柵",
    spots: ["西塘古鎮", "江南戲曲服飾", "烏鎮東柵"],
  },
  {
    day: "D4", date: "7/20 (一)", emoji: "🏮",
    title: "烏鎮西柵一日遊",
    short: "整天泡在水鄉裡，夜景必看",
    spots: ["烏鎮西柵", "白蓮塔", "木心美術館", "搖櫓船"],
  },
  {
    day: "D5", date: "7/21 (二)", emoji: "🌊",
    title: "烏鎮 ➔ 杭州西湖",
    short: "西湖十景自由行，晚上武林夜市",
    spots: ["斷橋", "蘇堤", "武林夜市", "河坊街"],
  },
  {
    day: "D6", date: "7/22 (三)", emoji: "🎭",
    title: "杭州宋城文化體驗",
    short: "下午《宋城千古情》大型實景演藝",
    spots: ["宋城千古情", "河坊街", "南宋御街"],
  },
  {
    day: "D7", date: "7/23 (四)", emoji: "🚢",
    title: "杭州運河與宮廷晚宴",
    short: "大馬弄早餐 + 京杭大運河巡禮",
    spots: ["大馬弄", "京杭大運河遊船", "宮宴"],
  },
  {
    day: "D8", date: "7/24 (五)", emoji: "🛫",
    title: "杭州 ➔ 台北",
    short: "最後採買伴手禮，回家",
    spots: ["龍井茶園", "伴手禮採買"],
  },
];

export interface EntryCard {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  gradient: string;        // tailwind from-*/to-*
  cta: string;
  accent: string;          // tailwind text-*
}

export const ENTRY_CARDS: EntryCard[] = [
  {
    href: "/travel",
    emoji: "📋",
    title: "完整行程",
    subtitle: "8 天 7 夜 day-by-day 行程表、地圖、景點寫真、預算追蹤、行李清單",
    gradient: "from-teal-500 to-cyan-600",
    cta: "開啟工具",
    accent: "text-teal-100",
  },
  {
    href: "/travel/postcard",
    emoji: "🖼️",
    title: "我的回憶",
    subtitle: "小紅書風格卡通明信片、景點寫真集、影片分享牆",
    gradient: "from-pink-500 to-rose-600",
    cta: "製作明信片",
    accent: "text-pink-100",
  },
  {
    href: "/travel/planner",
    emoji: "🛠️",
    title: "細節工具",
    subtitle: "時間軸編輯器、預算計算、餐廳口袋名單、AI 行程建議",
    gradient: "from-amber-500 to-orange-600",
    cta: "進入規劃",
    accent: "text-amber-100",
  },
];
