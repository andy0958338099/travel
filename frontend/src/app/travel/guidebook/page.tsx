"use client";

/**
 * /travel/guidebook — AI 漫畫圖鑑首頁
 *
 * 來源：56 個景點 + 26 間美食 = 82 個項目
 * 每個項目有 4 格 AI 漫畫 + 短/中/長介紹文
 *
 * UI:
 *   - Tabs: 全部 / 景點 / 美食
 *   - Filter: 8 天分組
 *   - Grid: 每個漫畫用 panel_1 (cover) + title
 *   - Click → /travel/guidebook/[id]
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ATTRACTIONS, Attraction } from "../data";
import { getRestaurants } from "../dining/data";

interface TravelManga {
  id: string;
  source_type: "attraction" | "food";
  source_id: string;
  source_name: string;
  character_name: string;
  panel_1_url: string | null;
  panel_2_url: string | null;
  panel_3_url: string | null;
  panel_4_url: string | null;
  short_desc: string | null;
  status: string;
  like_count: number;
  updated_at: string;
}

// 8 天分組（從 data.ts 抽）
const DAY_GROUPS: Record<number, { cities: string[]; label: string }> = {
  1: { cities: ["上海"], label: "Day 1 · 上海" },
  2: { cities: ["西塘"], label: "Day 2 · 西塘" },
  3: { cities: ["烏鎮"], label: "Day 3 · 烏鎮東柵" },
  4: { cities: ["烏鎮"], label: "Day 4 · 烏鎮西柵" },
  5: { cities: ["杭州"], label: "Day 5 · 杭州西湖" },
  6: { cities: ["杭州"], label: "Day 6 · 杭州宋城" },
  7: { cities: ["杭州"], label: "Day 7 · 杭州運河" },
  8: { cities: ["杭州", "上海"], label: "Day 8 · 賦歸" },
};

function getDayForAttraction(name: string, attractions: Attraction[]): number {
  // 簡化：從 category 推斷
  const attr = attractions.find((a) => a.name === name);
  if (!attr) return 5;
  if (attr.category === "wuzhen") return name.includes("東柵") ? 3 : 4;
  if (attr.category === "westLake") return 5;
  if (name.includes("千島湖")) return 7;
  if (name.includes("上海") || name.includes("外灘") || name.includes("豫園")) return 1;
  return 5;
}

export default function GuidebookPage() {
  const [mangas, setMangas] = useState<TravelManga[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "attraction" | "food">("all");
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [userFingerprint] = useState(() => {
    if (typeof window === "undefined") return "";
    let fp = localStorage.getItem("manga-fingerprint");
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem("manga-fingerprint", fp);
    }
    return fp;
  });

  useEffect(() => {
    fetch("/api/manga/feed?limit=200")
      .then((r) => r.json())
      .then((data) => {
        setMangas(data.mangas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allAttractions = useMemo(
    () => [
      ...ATTRACTIONS.westLake,
      ...ATTRACTIONS.wuzhen,
      ...ATTRACTIONS.other,
    ],
    []
  );

  const restaurants = useMemo(() => getRestaurants(), []);

  const filtered = useMemo(() => {
    let result = mangas;
    if (tab !== "all") result = result.filter((m) => m.source_type === tab);
    if (dayFilter) {
      if (tab === "food" || tab === "all") {
        // 美食靠 restaurant.day
        if (tab === "all") {
          result = result.filter((m) => {
            if (m.source_type === "food") {
              const r = restaurants.find((x) => x.id === m.source_id);
              return r ? r.day === dayFilter : false;
            } else {
              return getDayForAttraction(m.source_name, allAttractions) === dayFilter;
            }
          });
        } else {
          result = result.filter((m) => {
            const r = restaurants.find((x) => x.id === m.source_id);
            return r ? r.day === dayFilter : false;
          });
        }
      } else {
        result = result.filter(
          (m) => getDayForAttraction(m.source_name, allAttractions) === dayFilter
        );
      }
    }
    return result;
  }, [mangas, tab, dayFilter, restaurants, allAttractions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 text-white py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase opacity-90 mb-3">
            AI Manga Guidebook
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-3">
            江南 8 日 AI 漫畫圖鑑
          </h1>
          <p className="text-sm sm:text-lg opacity-90 max-w-2xl mx-auto">
            56 個景點 + 26 間美食，每個都有一份 4 格漫畫導覽 + 三段介紹文
          </p>
        </div>
      </div>

      {/* Tabs + Filter */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-full p-1 self-start">
            {[
              { v: "all", l: "全部", c: mangas.length },
              { v: "attraction", l: "景點", c: mangas.filter((m) => m.source_type === "attraction").length },
              { v: "food", l: "美食", c: mangas.filter((m) => m.source_type === "food").length },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setTab(t.v as any)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
                  tab === t.v
                    ? "bg-white text-rose-600 shadow"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.l} ({t.c})
              </button>
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 flex-1">
            <button
              onClick={() => setDayFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                !dayFilter ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              所有天
            </button>
            {Object.entries(DAY_GROUPS).map(([d, g]) => (
              <button
                key={d}
                onClick={() => setDayFilter(parseInt(d))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  dayFilter === parseInt(d)
                    ? "bg-rose-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <Link
            href="/travel/guidebook/admin"
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-bold whitespace-nowrap"
          >
            ⚙️ 管理
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🎨</p>
            <p className="text-gray-700 font-bold mb-2">還沒有任何漫畫</p>
            <p className="text-sm text-gray-500 mb-6">
              點管理頁批次生成，或單個 trigger
            </p>
            <Link
              href="/travel/guidebook/admin"
              className="inline-block bg-rose-500 text-white px-6 py-2 rounded-full font-bold hover:bg-rose-600"
            >
              前往管理頁
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((m) => (
              <Link
                key={m.id}
                href={`/travel/guidebook/${m.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="aspect-[4/5] bg-gradient-to-br from-rose-100 to-amber-100 relative">
                  {m.panel_1_url ? (
                    <img
                      src={m.panel_1_url}
                      alt={m.source_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                      🎨
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {m.source_type === "attraction" ? "📍 景點" : "🍜 美食"}
                  </div>
                  {m.status === "partial" && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      部分完成
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-3">
                  <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 mb-1">
                    {m.source_name}
                  </h3>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span>🎭 {m.character_name}</span>
                    {m.like_count > 0 && (
                      <>
                        <span>·</span>
                        <span>❤️ {m.like_count}</span>
                      </>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
