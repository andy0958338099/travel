"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ShareButtons from "@/components/ShareButtons";

// ── Dynamic imports (與 /travel 主頁同 pattern, 避免 SSR leaflet 卡住) ──
const DynamicAttractionGallery = dynamic(() => import("../AttractionGallery"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  ),
});

const DynamicAttractionsMap = dynamic(() => import("../AttractionsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] sm:h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">地圖載入中...</div>
    </div>
  ),
});

export default function AttractionsPage() {
  const [plannedAttractions, setPlannedAttractions] = useState<string[]>([]);

  // 跟 /travel 主頁同 pattern: 從 ItineraryPlanner 讀 planned attractions
  useEffect(() => {
    try {
      const plannerSaved = localStorage.getItem("hangzhou-trip-planner");
      if (!plannerSaved) return;
      const parsed = JSON.parse(plannerSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (parsed[0].attractions) {
          // PlannedDay format
          const all = parsed.flatMap(
            (d: { attractions?: string[] }) => d.attractions || []
          );
          setPlannedAttractions(all);
        }
      }
    } catch {
      // localStorage 讀取失敗時保持空陣列
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/travel"
            className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 mb-2 inline-block"
          >
            ← 回到行程總覽
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-stone-900 font-serif flex items-center gap-2">
                <span>📷</span>
                <span>景點寫真 + 互動地圖</span>
              </h1>
              <p className="text-sm sm:text-base text-stone-600">
                57 個江南水鄉景點實景寫真 · 點擊照片放大 · 互動地圖標記行程內景點
              </p>
            </div>
            <ShareButtons
              title="景點寫真 + 互動地圖 | 江南水鄉八日"
              text="📷 江南水鄉 57 個景點實景寫真 + 互動式地圖 🗺️"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* 景點寫真 Grid */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                📷 景點寫真
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                點擊照片可放大查看 · 卡片右上角 × 可隱藏整個景點 · Lightbox 內可隱藏單張照片
              </p>
              <ErrorBoundary name="景點寫真">
                <DynamicAttractionGallery />
              </ErrorBoundary>
            </section>

            {/* 互動式景點地圖 */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                🗺️ 互動式景點地圖
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                點擊標記查看景點詳情 · 行程內景點會高亮顯示
              </p>
              <ErrorBoundary name="互動式景點地圖">
                <DynamicAttractionsMap
                  plannedAttractions={plannedAttractions}
                />
              </ErrorBoundary>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold mb-3 text-stone-900 flex items-center gap-2">
                <span>📌</span>
                <span>使用說明</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700">
                <li className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>點擊寫真卡片可開啟 Lightbox 放大檢視</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>卡片右上角 <span className="font-mono text-red-500">×</span> 隱藏整個景點（雲端同步）</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Lightbox 內 <span className="font-mono text-red-500">×</span> 只隱藏該張照片</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>地圖標記可點擊查看景點資訊</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-500">•</span>
                  <span>行程內景點會在地圖高亮標記</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold mb-3 text-stone-900 flex items-center gap-2">
                <span>🗓️</span>
                <span>行程內景點</span>
              </h3>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {plannedAttractions.length}
                <span className="text-sm font-normal text-stone-500">
                  {" "}
                  / 57
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mb-3">
                從行程規劃器加入景點會在這裡顯示
              </p>
              <Link
                href="/travel/planner"
                className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                前往行程規劃器 →
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold mb-3 text-stone-900 flex items-center gap-2">
                <span>🔗</span>
                <span>相關頁面</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link
                    href="/travel/planner"
                    className="text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    🗓️ 行程規劃器
                  </Link>
                </li>
                <li>
                  <Link
                    href="/travel/manga"
                    className="text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    🎨 Q版漫畫編輯器
                  </Link>
                </li>
                <li>
                  <Link
                    href="/travel/stories"
                    className="text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    📚 地理歷史
                  </Link>
                </li>
                <li>
                  <Link
                    href="/travel/postcard"
                    className="text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    💌 旅遊明信片
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
