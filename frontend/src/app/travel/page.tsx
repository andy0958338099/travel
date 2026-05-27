"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ATTRACTIONS, HOTELS, TRANSPORT, TIPS, ITINERARY, ALL_ATTRACTIONS } from "./data";
import dynamic from "next/dynamic";
import ItineraryPlanner from "./ItineraryPlanner";
import BudgetTracker from "./BudgetTracker";
import WeatherWidget from "./WeatherWidget";
import SmartDropZone, { ExtractedData } from "./SmartDropZone";

const CNY_RATE = 4.5;
const TRIP_START = new Date("2026-07-17");

const DynamicAttractionsMap = dynamic(() => import("./AttractionsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [plannedAttractions, setPlannedAttractions] = useState<string[]>([]);
  const [daysUntil, setDaysUntil] = useState(0);
  const [budgetData, setBudgetData] = useState({ budget: 50000, spent: 0, percent: 0 });
  const [packingData, setPackingData] = useState({ packed: 0, total: 0 });
  const [realFlight, setRealFlight] = useState<ExtractedData | null>(null);
  const [realHotel, setRealHotel] = useState<ExtractedData | null>(null);

  // Real flight/hotel extracted from SmartDropZone

  // Load flight/hotel from localStorage on mount
  useEffect(() => {
    try {
      const savedFlight = localStorage.getItem("hangzhou-trip-flight");
      if (savedFlight) {
        const parsed = JSON.parse(savedFlight);
        if (parsed.confirmed) {
          setRealFlight(parsed);
        }
      }
      const savedHotel = localStorage.getItem("hangzhou-trip-hotel");
      if (savedHotel) {
        const parsed = JSON.parse(savedHotel);
        if (parsed.confirmed) {
          setRealHotel(parsed);
        }
      }
    } catch {}
  }, []);

  // Live countdown + localStorage readers
  // Read planned attractions from ItineraryPlanner's localStorage data
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const days = Math.ceil((TRIP_START.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntil(Math.max(0, days));

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
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-white/80 hover:text-white">
              ← 返回首頁
            </Link>
            <Link href="/travel/planner" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              🗓️ 行程規劃器
            </Link>
            <Link href="/travel/journal" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              📖 旅程日誌
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-2">🗺️ 江南水鄉八日之旅</h1>
          <p className="text-white/80">8天7夜 · 杭州 → 上海 → 西塘 → 烏鎮 → 杭州</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">📅 7月17日 - 7月24日</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">👥 2人</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">💰 預算 NT$40,000-60,000</span>
          </div>
        </div>
      </div>

      {/* Live Overview Dashboard */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols5 gap-3">
            {/* Countdown */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="text-2xl">⏱️</div>
              <div>
                <div className="text-xs text-gray-500">距離出發</div>
                <div className="font-bold text-lg leading-tight">
                  {daysUntil > 0 ? `${daysUntil} 天` : "✨ 旅途中"}
                </div>
              </div>
            </div>
            {/* Planned Attractions */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="text-2xl">📍</div>
              <div>
                <div className="text-xs text-gray-500">已規劃景點</div>
                <div className="font-bold text-lg leading-tight">
                  {plannedAttractions.length} <span className="text-xs font-normal text-gray-400">/ {ALL_ATTRACTIONS.length}</span>
                </div>
              </div>
            </div>
            {/* Budget */}
            <div className="flex items-center gap-3 px-3 py-2">
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
            <div className="flex items-center gap-3 px-3 py-2">
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
            <div className="flex items-center gap-3 px-3 py-2">
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Flight Info */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                ✈️ 航班資訊
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">去程 7/17</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">建議航班</span>
                  </div>
                  <div className="font-bold text-lg"> TPE → HGH</div>
                  <div className="text-gray-600">桃園TPE 11:15 → 杭州HGH 13:20</div>
                  <div className="text-sm text-gray-500 mt-1">飛行約2小時05分</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">回程 7/24</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">建議航班</span>
                  </div>
                  <div className="font-bold text-lg"> HGH → TPE</div>
                  <div className="text-gray-600">杭州HGH 19:50 → 桃園TPE 21:50</div>
                  <div className="text-sm text-gray-500 mt-1">飛行約2小時10分</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                <div className="font-medium mb-1">其他航空公司選擇：</div>
                <div>長榮 BR 758 / 廈門航空 MF 890 / 中國航空 CA 150</div>
                <div className="mt-1 text-gray-500">來回票價參考：NT$8,000-22,000（依艙等而定）</div>
              </div>

              {/* 智慧航班分析槽 */}
              <div className="mt-4">
                <SmartDropZone
                  type="flight"
                  label="✈️ 填入真實航班"
                  placeholder="貼上 Skyscanner / 中華航空 / 任何航班頁面的網址，或直接貼上航班資訊文字\n\n例如：CI 581 08:30 TPE→HGH 10:40 或 https://www.skyscanner.com.tw/..."
                  hint="支援：航班確認信文字、Skyscanner/中华航空/長榮航空 等航班網址。AI 會自動分析航班號、時間、日期與價格。"
                  icon="✈️"
                  accentColor="#0d5c63"
                  onDataExtracted={(data) => {
                    setRealFlight(data);
                    if (data.confirmed) {
                      localStorage.setItem("hangzhou-trip-flight", JSON.stringify(data));
                    }
                  }}
                />
                {realFlight?.confirmed && (
                  <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="text-xs text-teal-700 font-medium mb-1">✓ 已填入真實航班資料</div>
                    <div className="text-xs text-teal-600">
                      {realFlight.flightNumber && `航班：${realFlight.flightNumber} · `}
                      {realFlight.departureTime && `${realFlight.departureTime} → ${realFlight.arrivalTime} · `}
                      {realFlight.price && `價格：${realFlight.price}`}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Interactive Map */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                🗺️ 互動式景點地圖
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                點擊標記查看景點詳情，或點擊下方列表快速定位
              </p>
              <DynamicAttractionsMap plannedAttractions={plannedAttractions} />
            </section>

            {/* PDF Export */}
            <section className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📄</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">匯出 PDF 行程表</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    將完整八日行程、景點門票、交通住宿等資訊下載為 PDF，離線隨身攜帶。
                  </p>
                  <DynamicPdfExporter plannedAttractions={plannedAttractions} />
                </div>
              </div>
            </section>

            {/* Cartoon Postcard Generator */}
            <section className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🖼️</div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">卡通行程圖卡</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    小紅書 / IG 風格卡通時間軸，一鍵生成可分享圖卡，懶人包首選！
                  </p>
                  <Link
                    href="/travel/postcard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold rounded-xl hover:from-pink-700 hover:to-orange-700 transition-all shadow-lg"
                  >
                    🎨 開啟圖卡生成器
                  </Link>
                </div>
              </div>
            </section>

            {/* Attraction Gallery */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📷 景點寫真
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                點擊照片可放大查看，一起感受最美的杭州風景
              </p>
              <DynamicAttractionGallery />
            </section>

            {/* Itinerary Planner */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <ItineraryPlanner onUpdateAttractions={setPlannedAttractions} />
            </section>

            {/* Budget Tracker */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <BudgetTracker />
            </section>

            {/* Day by Day Itinerary */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📅 八日行程總覽
              </h2>
              <div className="space-y-3">
                {ITINERARY.map((day) => (
                  <div
                    key={day.day}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedDay === day.day
                        ? "border-teal-500 bg-teal-50"
                        : "hover:border-teal-300"
                    }`}
                    onClick={() => setSelectedDay(selectedDay === day.day ? null : day.day)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-sm font-bold">
                            {day.day}
                          </span>
                          <span className="font-bold">{day.title}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{day.highlight}</p>
                      </div>
                      <span className="text-gray-400">{selectedDay === day.day ? "▲" : "▼"}</span>
                    </div>
                    
                    {selectedDay === day.day && (
                      <div className="mt-4 pt-4 border-t border-teal-200 space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-teal-700 mb-1">行程內容</div>
                          <p className="text-gray-700 whitespace-pre-line">{day.content}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-500">早餐</span>
                            <div className="font-medium">{day.meals.breakfast}</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-500">午餐</span>
                            <div className="font-medium">{day.meals.lunch}</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <span className="text-gray-500">晚餐</span>
                            <div className="font-medium">{day.meals.dinner}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-gray-500">🚗 {day.transport}</span>
                          <span className="text-teal-600 font-medium">預算 {day.budget}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Attractions */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold mb-4">🏛️ 景點門票總覽</h2>
              
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-teal-700">西湖風景區</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ATTRACTIONS.westLake.map((spot) => (
                    <div key={spot.name} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{spot.name}</span>
                        <span className="text-teal-600 font-bold text-sm">{spot.ticket}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{spot.hours}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 text-amber-700">烏鎮水鄉</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ATTRACTIONS.wuzhen.map((spot) => (
                    <div key={spot.name} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{spot.name}</span>
                        <span className="text-amber-600 font-bold text-sm">{spot.ticket}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{spot.hours}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-3 text-blue-700">杭州其他景點</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ATTRACTIONS.other.map((spot) => (
                    <div key={spot.name} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{spot.name}</span>
                        <span className="text-blue-600 font-bold text-sm">{spot.ticket}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{spot.hours}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Transport Info */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">🚗 交通攻略</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-teal-700 mb-2">機場 ↔ 市區</div>
                  <div className="space-y-2 text-sm">
                    {TRANSPORT.airport.map((t) => (
                      <div key={t.method} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{t.method}</div>
                        <div className="text-gray-600">{t.duration} · {t.price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-medium text-teal-700 mb-2">杭州 ↔ 烏鎮</div>
                  <div className="space-y-2 text-sm">
                    {TRANSPORT.toWuzhen.map((t) => (
                      <div key={t.method} className="bg-gray-50 p-2 rounded">
                        <div className="font-medium">{t.method}</div>
                        <div className="text-gray-600">{t.duration} · {t.price}</div>
                        {t.frequency && <div className="text-gray-500 text-xs">{t.frequency}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Hotels */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">🏨 住宿推薦</h2>

              {/* 智慧飯店分析槽 */}
              <div className="mb-4">
                <SmartDropZone
                  type="hotel"
                  label="🏨 填入真實飯店"
                  placeholder="貼上 Booking.com / Agoda / 攜程飯店頁面網址，或直接貼上飯店確認資訊\n\n例如：杭州西子湖四季酒店 豪華房 ¥2800/晚 或 https://www.booking.com/..."
                  hint="支援：Booking.com、Agoda、Hotels.com、攜程等飯店頁面網址。AI 會自動分析飯店名稱、星級、房型、入住日期與價格。"
                  icon="🏨"
                  accentColor="#b47800"
                  onDataExtracted={(data) => {
                    setRealHotel(data);
                    if (data.confirmed) {
                      localStorage.setItem("hangzhou-trip-hotel", JSON.stringify(data));
                    }
                  }}
                />
                {realHotel?.confirmed && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs text-amber-700 font-medium mb-1">✓ 已填入真實飯店資料</div>
                    <div className="text-xs text-amber-600">
                      {realHotel.hotelName && `${realHotel.hotelName} · `}
                      {realHotel.roomType && `${realHotel.roomType} · `}
                      {realHotel.hotelPrice && `${realHotel.hotelPrice}`}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="font-medium text-teal-700 mb-2">杭州西湖（高檔）</div>
                  {HOTELS.hangzhouLuxury.map((h) => (
                    <div key={h.name} className="bg-gray-50 p-3 rounded-lg mb-2">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-gray-600">{h.location}</div>
                      <div className="text-teal-600 font-bold mt-1">{h.price}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-medium text-teal-700 mb-2">杭州（中價位）</div>
                  {HOTELS.hangzhouMid.map((h) => (
                    <div key={h.name} className="bg-gray-50 p-3 rounded-lg mb-2">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-gray-600">{h.location}</div>
                      <div className="text-teal-600 font-bold mt-1">{h.price}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-medium text-amber-700 mb-2">烏鎮</div>
                  {HOTELS.wuzhen.map((h) => (
                    <div key={h.name} className="bg-gray-50 p-3 rounded-lg mb-2">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-amber-600 font-bold mt-1">{h.price}</div>
                      {h.highlight && <div className="text-xs text-gray-500 mt-1">{h.highlight}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tips */}
            <section className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">💡 旅遊 tips</h2>
              <ul className="space-y-2 text-sm">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-500 mt-0.5">✓</span>
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Weather Widget */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <WeatherWidget />
            </section>

            {/* Packing Checklist */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <DynamicPackingChecklist />
            </section>

            {/* Budget Summary */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">💰 費用預估</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>來回機票（2人）</span>
                  <span className="font-bold">NT$16,000-44,000</span>
                </div>
                <div className="flex justify-between">
                  <span>住宿（7晚）</span>
                  <span className="font-bold">NT$8,000-20,000</span>
                </div>
                <div className="flex justify-between">
                  <span>門票+活動</span>
                  <span className="font-bold">NT$3,000-6,000</span>
                </div>
                <div className="flex justify-between">
                  <span>餐食（8天）</span>
                  <span className="font-bold">NT$4,000-8,000</span>
                </div>
                <div className="flex justify-between">
                  <span>交通</span>
                  <span className="font-bold">NT$2,000-3,000</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>總計（2人）</span>
                  <span className="text-teal-600">NT$40,000-60,000</span>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
