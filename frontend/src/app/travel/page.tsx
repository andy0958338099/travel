"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TIPS, ALL_ATTRACTIONS } from "./data";
import dynamic from "next/dynamic";
import ItineraryPlanner from "./ItineraryPlanner";
import WeatherWidget from "./WeatherWidget";
import { loadNavOrder, saveNavOrder, applyOrder, DEFAULT_NAV_ITEMS, NAV_ORDER_KEY, NavItem } from "@/utils/navOrderService";
import { useCloudState } from "@/utils/useCloudState";
import { exportCloudBackup, importCloudBackup } from "@/utils/cloudBackup";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toast } from "@/components/Toast";
import { SyncIndicator } from "@/components/SyncIndicator";
import OnboardingTour from "@/components/OnboardingTour";

const CNY_RATE = 4.5;
const TRIP_START = new Date("2026-07-17");

const DynamicAttractionsMap = dynamic(() => import("./AttractionsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] sm:h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">地圖載入中...</div>
    </div>
  ),
});

const DynamicPackingChecklist = dynamic(() => import("./PackingChecklist"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-gray-500">行李清單載入中...</div>
    </div>
  ),
});

const DynamicPdfExporter = dynamic(() => import("./PdfExporter"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="text-gray-500">PDF 匯出載入中...</div>
    </div>
  ),
});

const DynamicAttractionGallery = dynamic(() => import("./AttractionGallery"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  ),
});

export default function TravelPage() {
  const [plannedAttractions, setPlannedAttractions] = useState<string[]>([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [budgetData, setBudgetData] = useState({ budget: 50000, spent: 0, percent: 0 });
  const [packingData, setPackingData] = useState({ packed: 0, total: 0 });
  // Nav order: cloud-synced, reactive to other-tab updates. The first-load
  // call below is just an optimisation — the cloud subscription will fill
  // the value in as soon as the initial fetch returns.
  const [cloudNavOrder] = useCloudState<string[] | null>(NAV_ORDER_KEY, null);
  const [navOrder, setNavOrder] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  useEffect(() => {
    // Prefer the cloud value when it arrives; otherwise read directly.
    if (cloudNavOrder) {
      setNavOrder(applyOrder(cloudNavOrder));
      return;
    }
    loadNavOrder().then(setNavOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudNavOrder]);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 0 | 1 | 2 }>({
    show: false, message: "", type: 2,
  });

  // Load nav order from Supabase
  useEffect(() => {
    loadNavOrder().then(setNavOrder);
  }, []);

  // FAB 回到頂部 — 監聽 scroll
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Live countdown + localStorage readers
  // Read planned attractions from ItineraryPlanner's localStorage data
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = Math.max(0, TRIP_START.getTime() - now.getTime());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });

      // Read planned attractions from ItineraryPlanner (PlannedDay format)
      // Priority: planner key (hangzhou-trip-planner) > old itinerary key
      try {
        // Try planner key first (current ItineraryPlanner saves here)
        const plannerSaved = localStorage.getItem("hangzhou-trip-planner");
        if (plannerSaved) {
          const parsed = JSON.parse(plannerSaved);
          // Support both PlannedDay[] and Activity[] formats
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (parsed[0].attractions) {
              // PlannedDay format: { day, title, description, attractions[] }
              const all = parsed.flatMap((d: { attractions?: string[] }) => d.attractions || []);
              setPlannedAttractions(all);
            } else if (parsed[0].title !== undefined && parsed[0].day !== undefined) {
              // Activity format (from /travel/planner): { id, title, day, startHour, duration, color, cost }
              const titles = parsed.map((a: { title?: string }) => a.title || "");
              setPlannedAttractions(titles);
            }
          }
        } else {
          // Fallback: old itinerary key
          const saved = localStorage.getItem("hangzhou-trip-itinerary");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].attractions) {
              const all = parsed.flatMap((d: { attractions?: string[] }) => d.attractions || []);
              setPlannedAttractions(all);
            }
          }
        }
      } catch {}

      try {
        const budget = JSON.parse(localStorage.getItem("hangzhou-trip-budget") || "{}");
        const totalSpent = (budget.expenses || []).reduce((s: number, e: { paidIn: string; amount: number }) => {
          return s + (e.paidIn === "CNY" ? e.amount * CNY_RATE : e.amount);
        }, 0);
        setBudgetData({
          budget: budget.budget || 50000,
          spent: totalSpent,
          percent: budget.budget > 0 ? Math.round((totalSpent / budget.budget) * 100) : 0,
        });
      } catch {}

      try {
        const packing = JSON.parse(localStorage.getItem("hangzhou-trip-packing") || "{}") as Record<string, { checked: boolean }[]>;
        const all = Object.values(packing).flat();
        const total = all.length;
        const packed = all.filter(i => i.checked).length;
        setPackingData({ packed, total });
      } catch {}
    };

    update();

    // Storage event: 即時同步同源其他 tab/window 的 localStorage 變更
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.startsWith("hangzhou-trip-")) update();
    };
    window.addEventListener("storage", onStorage);

    // 分頁從隱藏變可見時立即同步（涵蓋手機切回瀏覽器、PC 切回視窗）
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 lg:py-8">
          {/* Nav row: 返回首頁 + nav scrollable + 排序按鈕 */}
          <div className="flex items-center gap-2 mb-3">
            <Link href="/" className="text-white/80 hover:text-white text-sm flex-shrink-0">
              ← 返回首頁
            </Link>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {navOrder.map(item => (
                <Link key={item.key} href={item.href} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm flex-shrink-0 whitespace-nowrap">
                  {item.label}
                </Link>
              ))}
            </div>
            {isEditingOrder ? (
              <>
                <button
                  onClick={() => { setIsEditingOrder(false); saveNavOrder(navOrder); }}
                  className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded-full text-sm font-medium"
                >
                  ✓ 儲存順序
                </button>
                <button
                  onClick={() => { setIsEditingOrder(false); setNavOrder(DEFAULT_NAV_ITEMS); }}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-sm"
                >
                  ✕ 取消
                </button>
                <div className="w-full" />
                <div className="flex flex-wrap gap-1 mt-2 w-full">
                  {navOrder.map((item, idx) => (
                    <div key={item.key} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                      <button
                        onClick={() => {
                          const next = [...navOrder];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          setNavOrder(next.filter(Boolean));
                        }}
                        disabled={idx === 0}
                        className="text-white/60 hover:text-white disabled:opacity-30 text-xs px-1"
                      >
                        ↑
                      </button>
                      <span className="text-xs text-white/80">{item.label}</span>
                      <button
                        onClick={() => {
                          const next = [...navOrder];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          setNavOrder(next.filter(Boolean));
                        }}
                        disabled={idx === navOrder.length - 1}
                        className="text-white/60 hover:text-white disabled:opacity-30 text-xs px-1"
                      >
                        ↓
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsEditingOrder(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-full text-sm font-medium"
              >
                ✏️ 排序
              </button>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">🗺️ 江南水鄉八日之旅</h1>
          <p className="text-sm sm:text-base text-white/80">8天7夜 · 杭州 → 上海 → 西塘 → 烏鎮 → 杭州</p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-3 sm:mt-4 text-xs sm:text-sm">
            <span className="bg-white/20 px-2.5 sm:px-3 py-1 rounded-full">📅 7月17日 - 7月24日</span>
            <span className="bg-white/20 px-2.5 sm:px-3 py-1 rounded-full">👥 2人</span>
            <span className="bg-white/20 px-2.5 sm:px-3 py-1 rounded-full">💰 NT$40,000-60,000</span>
          </div>
        </div>
      </div>

      {/* Live Overview Dashboard */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* 手機版：水平滾動 5 個 stat 卡；sm 以上：3 欄 grid；lg 以上：5 欄 grid */}
          <div className="flex overflow-x-auto scrollbar-hide gap-3 -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
            {/* Countdown */}
            <div className="flex items-center gap-3 px-3 py-2 min-w-[150px] sm:min-w-0 flex-shrink-0">
              <div className="text-2xl">⏱️</div>
              <div>
                <div className="text-xs text-gray-500">距離出發</div>
                <div className="font-bold text-lg leading-tight">
                  {countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0
                    ? `${countdown.days} 天 ${String(countdown.hours).padStart(2,'0')} : ${String(countdown.minutes).padStart(2,'0')} : ${String(countdown.seconds).padStart(2,'0')}`
                    : "✨ 旅途中"}
                </div>
              </div>
            </div>
            {/* Planned Attractions */}
            <div className="flex items-center gap-3 px-3 py-2 min-w-[150px] sm:min-w-0 flex-shrink-0">
              <div className="text-2xl">📍</div>
              <div>
                <div className="text-xs text-gray-500">已規劃景點</div>
                <div className="font-bold text-lg leading-tight">
                  {plannedAttractions.length} <span className="text-xs font-normal text-gray-400">/ {ALL_ATTRACTIONS.length}</span>
                </div>
              </div>
            </div>
            {/* Budget */}
            <div className="flex items-center gap-3 px-3 py-2 min-w-[180px] sm:min-w-0 flex-shrink-0">
              <div className="text-2xl">💰</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">預算使用</div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg leading-tight ${budgetData.percent >= 90 ? "text-red-500" : budgetData.percent >= 70 ? "text-amber-500" : "text-emerald-500"}`}>
                    {budgetData.percent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className={`h-1 rounded-full transition-all ${budgetData.percent >= 90 ? "bg-red-500" : budgetData.percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(budgetData.percent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            {/* Packing */}
            <div className="flex items-center gap-3 px-3 py-2 min-w-[160px] sm:min-w-0 flex-shrink-0">
              <div className="text-2xl">🧳</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">行李準備</div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg leading-tight ${packingData.total > 0 && packingData.packed === packingData.total ? "text-emerald-500" : "text-gray-700"}`}>
                    {packingData.packed}/{packingData.total}
                  </span>
                </div>
                {packingData.total > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div
                      className={`h-1 rounded-full transition-all ${packingData.packed === packingData.total ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${(packingData.packed / packingData.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Quick Weather */}
            <div className="flex items-center gap-3 px-3 py-2 min-w-[140px] sm:min-w-0 flex-shrink-0">
              <div className="text-2xl">🌤️</div>
              <div>
                <div className="text-xs text-gray-500">杭州天氣</div>
                <div className="font-bold text-sm leading-tight">7/17-7/24</div>
                <div className="text-xs text-gray-400">高溫 30-35°C</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync status + Export / Import JSON */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 flex-wrap">
          <SyncIndicator />
          <span className="text-xs text-gray-400 hidden sm:inline">資料管理：</span>
          <button
            onClick={async () => {
              try {
                setToast({ show: true, message: "正在從雲端拉取最新資料…", type: 2 });
                const { filename, count, json } = await exportCloudBackup();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                setToast({ show: true, message: `已匯出 ${count} 筆雲端資料`, type: 1 });
              } catch (e: any) {
                setToast({ show: true, message: e.message || "匯出失敗", type: 0 });
              }
            }}
            className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 sm:py-1 rounded-full border border-teal-200 transition-colors"
          >
            📤 匯出備份
          </button>
          <label className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 sm:py-1 rounded-full border border-blue-200 cursor-pointer transition-colors">
            📥 匯入還原
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  try {
                    const { count, rejected } = await importCloudBackup(
                      ev.target?.result as string
                    );
                    setToast({
                      show: true,
                      message: `已還原 ${count} 筆到雲端${rejected > 0 ? `（略過 ${rejected} 筆未知 key）` : ""}，3 秒後自動重新整理…`,
                      type: 1,
                    });
                    setTimeout(() => window.location.reload(), 3000);
                  } catch (e: any) {
                    setToast({ show: true, message: e.message || "匯入失敗", type: 0 });
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
          <span className="text-xs text-gray-400 hidden sm:inline">（雲端 ↔ JSON 檔案）</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">

            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                📷 景點寫真
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                點擊照片可放大查看，一起感受最美的杭州風景
              </p>
              <ErrorBoundary name="景點寫真">
                <DynamicAttractionGallery />
              </ErrorBoundary>
            </section>


            {/* Interactive Map */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                🗺️ 互動式景點地圖
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                點擊標記查看景點詳情，或點擊下方列表快速定位
              </p>
              <ErrorBoundary name="互動式景點地圖">
                <DynamicAttractionsMap plannedAttractions={plannedAttractions} />
              </ErrorBoundary>
            </section>

            {/* PDF Export */}
            <section className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">📄</div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-bold mb-1">匯出 PDF 行程表</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    將完整八日行程、景點門票、交通住宿等資訊下載為 PDF，離線隨身攜帶。
                  </p>
                  <ErrorBoundary name="PDF 匯出">
                    <DynamicPdfExporter plannedAttractions={plannedAttractions} />
                  </ErrorBoundary>
                </div>
              </div>
            </section>

            {/* Cartoon Postcard Generator */}
            <section className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="text-2xl sm:text-3xl">🖼️</div>
                <div className="flex-1">
                  <h2 className="text-base sm:text-lg font-bold mb-1">卡通行程圖卡</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    小紅書 / IG 風格卡通時間軸，一鍵生成可分享圖卡，懶人包首選！
                  </p>
                  <Link
                    href="/travel/postcard"
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-pink-600 to-orange-600 text-white text-sm sm:text-base font-bold rounded-xl hover:from-pink-700 hover:to-orange-700 transition-all shadow-lg"
                  >
                    🎨 開啟圖卡生成器
                  </Link>
                </div>
              </div>
            </section>

            {/* Attraction Gallery */}

            {/* Itinerary Planner */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <ItineraryPlanner onUpdateAttractions={setPlannedAttractions} />
            </section>

            {/* Flight Info */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                ✈️ 航班資訊
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-500">去程 7/17</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">建議航班</span>
                  </div>
                  <div className="font-bold text-base sm:text-lg"> TPE → HGH</div>
                  <div className="text-sm sm:text-base text-gray-600">桃園TPE 11:15 → 杭州HGH 13:20</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">飛行約2小時05分</div>
                </div>
                <div className="border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm text-gray-500">回程 7/24</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">建議航班</span>
                  </div>
                  <div className="font-bold text-base sm:text-lg"> HGH → TPE</div>
                  <div className="text-sm sm:text-base text-gray-600">杭州HGH 19:50 → 桃園TPE 21:50</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">飛行約2小時10分</div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tips */}
            <section className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">💡 旅遊 tips</h2>
              <ul className="space-y-2 text-xs sm:text-sm">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">✓</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Weather Widget */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <WeatherWidget />
            </section>

            {/* Packing Checklist */}
            <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <DynamicPackingChecklist />
            </section>

          </div>
        </div>
      </div>

      {/* FAB 回到頂部 */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="回到頂部"
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 active:scale-95 transition-all flex items-center justify-center text-xl ${
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        ↑
      </button>

      {/* 全站 toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* 首次訪問自動導覽（localStorage flag 控制只跑一次） */}
      <OnboardingTour />
    </div>
  );
}
