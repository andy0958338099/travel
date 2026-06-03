/**
 * /travel/manga — AI 旅遊漫畫圖鑑
 *
 * 33 個景點 → 點 🎨 → 4 格 AI 漫畫（MiniMax i2i）+ 導遊風格文案
 * MVP 範圍：個人 anon 體驗，每個 sourceType+sourceId 一份快取
 *
 * 設計：
 * - Server component 只負責 metadata + 載入 client（避 SSR 卡）
 * - Client 端：景點 grid、generate 按鈕、漫畫 modal、regenerate per panel
 * - 雲端：Supabase travel_mangas + ai_characters + travel-manga bucket
 * - 本地：localStorage 存「正在生成中」的狀態（避免重新整理就丟）
 */

import MangaStudio from "./MangaStudio";
import { ALL_ATTRACTIONS } from "../data";
import { ATTRACTION_CATEGORIES } from "@/utils/mangaTaxonomy";

export const metadata = {
  title: "AI 旅遊漫畫圖鑑 | 江南 8 日",
  description: "把每個景點變成 4 格漫畫，配上導遊風格介紹",
};

export default function MangaPage() {
  // 預先在 server 端準備好資料，client 拿到的就只是 JSON（避免打包整個 data.ts）
  const attractions = ALL_ATTRACTIONS.map((a) => ({
    name: a.name,
    nameEn: a.nameEn || "",
    category: a.category,
    cover: a.images?.[0] || "",
    highlight: a.highlight,
    // 對映到 manga region（給後端選角色用）
    region: ATTRACTION_CATEGORIES[a.category]?.region || "china",
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      <MangaStudio attractions={attractions} />
    </main>
  );
}
