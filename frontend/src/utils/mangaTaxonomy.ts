/**
 * 景點 → 漫畫 region/character 對映
 * 後端依 region 自動選角色；給前端顯示用的分類
 */
import type { Attraction } from "@/app/travel/data";

type Category = Attraction["category"];

export interface CategoryMeta {
  label: string;
  emoji: string;
  region: string;        // 對應 ai_characters.region
  description: string;
}

export const ATTRACTION_CATEGORIES: Record<Category, CategoryMeta> = {
  westLake: {
    label: "西湖景點",
    emoji: "🌊",
    region: "china",
    description: "杭州西湖十景，詩畫江南",
  },
  wuzhen: {
    label: "烏鎮水鄉",
    emoji: "🚣",
    region: "china",
    description: "江南水鄉古鎮，搖櫓船與石板巷",
  },
  other: {
    label: "其他景點",
    emoji: "🗺️",
    region: "china",
    description: "宋城、西塘、上海、周邊景點",
  },
};

/** 給前端顯示的 region 對映（給 user 選角色用） */
export const CHARACTER_REGION_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "", label: "自動配對", emoji: "🎲" },
  { value: "china", label: "中國風", emoji: "🏯" },
  { value: "japan", label: "日本風", emoji: "⛩️" },
  { value: "korea", label: "韓國風", emoji: "🎀" },
  { value: "taiwan", label: "台灣風", emoji: "🧋" },
  { value: "europe", label: "歐洲風", emoji: "🏰" },
  { value: "history", label: "歷史人物", emoji: "📜" },
  { value: "cute", label: "可愛動物", emoji: "🐼" },
  { value: "qstyle", label: "Q版漫畫", emoji: "🎨" },
];
