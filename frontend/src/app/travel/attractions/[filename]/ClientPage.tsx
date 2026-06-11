"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { type Attraction } from "../../data";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/components/GlobalToastHost";
import ShareButtons from "@/components/ShareButtons";
import {
  getHiddenImages, hideImage, unhideImage,
  composeKey, extractImageUrl,
} from "@/utils/attractionGalleryService";

// ── Dynamic 互動式地圖 (子層用) ──
const DynamicAttractionsMap = dynamic(() => import("../../AttractionsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] sm:h-[400px] bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-gray-500">地圖載入中...</div>
    </div>
  ),
});

const STORAGE_KEY = "hangzhou-trip-planner";

export default function AttractionDetailClientPage({
  attraction,
  requestedName,
}: {
  attraction: Attraction | undefined;
  requestedName: string;
}) {
  // 找不到 attraction 的 fallback
  if (!attraction) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-orange-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-md p-8">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2 text-stone-900">
            找不到景點
          </h1>
          <p className="text-sm text-stone-600 mb-1">
            請求名稱：<span className="font-mono">{requestedName}</span>
          </p>
          <p className="text-xs text-stone-500 mb-6">
            URL 中的景點名稱不在資料庫內, 可能是連結過期或名稱變更
          </p>
          <Link
            href="/travel/attractions"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 px-6 rounded-lg transition-colors"
          >
            ← 回景點寫真
          </Link>
        </div>
      </div>
    );
  }

  return <AttractionDetail attraction={attraction} />;
}

function AttractionDetail({ attraction }: { attraction: Attraction }) {
  const images = attraction.images || [];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const [plannedAttractions, setPlannedAttractions] = useState<string[]>([]);
  const [inItinerary, setInItinerary] = useState(false);

  // 讀 hidden + planned
  useEffect(() => {
    getHiddenImages().then(setHiddenSet);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const all = parsed.flatMap(
            (d: { attractions?: string[] }) => d.attractions || []
          );
          setPlannedAttractions(all);
          setInItinerary(all.includes(attraction.name));
        }
      }
    } catch {
      // localStorage 讀取失敗
    }
  }, [attraction.name]);

  const visibleImages = images.filter(
    (img) => !hiddenSet.has(composeKey(attraction.name, img))
  );
  const currentImage = visibleImages[selectedIdx] || visibleImages[0];

  // 加入/移除行程
  const toggleItinerary = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      let next: { day?: number; title?: string; attractions?: string[] }[] = [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (parsed[0].attractions !== undefined) {
          next = parsed;
        } else if (parsed[0].title !== undefined) {
          // 舊 Activity[] format: 升級成 PlannedDay
          next = [
            {
              day: 1,
              title: "Day 1",
              attractions: parsed
                .map((a: { title?: string }) => a.title)
                .filter((t): t is string => Boolean(t)),
            },
          ];
        }
      }
      if (next.length === 0) {
        next = [{ day: 1, title: "Day 1", attractions: [] }];
      }
      // 確保 day 1 存在
      if (!next[0].attractions) next[0].attractions = [];
      const day1 = next[0];
      if (inItinerary) {
        day1.attractions = (day1.attractions || []).filter(
          (n) => n !== attraction.name
        );
        toast.success(`已從行程移除 ${attraction.name}`);
        setInItinerary(false);
      } else {
        day1.attractions = [...(day1.attractions || []), attraction.name];
        toast.success(`已加入 ${attraction.name} 到 Day 1 行程`);
        setInItinerary(true);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // 觸發 storage 事件讓其他元件同步
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch (e) {
      toast.error("行程更新失敗");
      console.error(e);
    }
  };

  const handleHideImage = async (img: string) => {
    await hideImage(img, attraction.name);
    setHiddenSet(
      (prev) => new Set([...prev, composeKey(attraction.name, img)])
    );
    if (selectedIdx >= visibleImages.length - 1) {
      setSelectedIdx(Math.max(0, selectedIdx - 1));
    }
    toast.success("已隱藏此照片");
  };

  const handleUnhideImage = async (img: string) => {
    await unhideImage(img, attraction.name);
    setHiddenSet(
      (prev) => {
        const next = new Set(prev);
        next.delete(composeKey(attraction.name, img));
        return next;
      }
    );
    toast.success("已還原此照片");
  };

  const handlePrev = () => {
    if (visibleImages.length <= 1) return;
    setSelectedIdx((i) => (i - 1 + visibleImages.length) % visibleImages.length);
  };

  const handleNext = () => {
    if (visibleImages.length <= 1) return;
    setSelectedIdx((i) => (i + 1) % visibleImages.length);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-orange-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/travel/attractions"
            className="text-xs sm:text-sm text-orange-600 hover:text-orange-700"
          >
            ← 回景點寫真
          </Link>
        </div>

        {/* Title */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 font-serif mb-1">
              {attraction.name}
            </h1>
            {attraction.nameEn && (
              <p className="text-base sm:text-lg text-stone-500 italic">
                {attraction.nameEn}
              </p>
            )}
            <p className="mt-3 text-sm sm:text-base text-stone-700">
              {attraction.highlight}
            </p>
          </div>
          <ShareButtons
            title={attraction.name}
            text={`2026 江南水鄉 📷 ${attraction.name}${attraction.highlight ? " · " + attraction.highlight : ""}`}
          />
        </div>

        {/* Main Image Carousel */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
          {visibleImages.length > 0 ? (
            <div className="relative">
              <div className="relative aspect-[16/10] bg-stone-100">
                <img
                  src={currentImage}
                  alt={attraction.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                {/* Prev / Next */}
                {visibleImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-xl transition-colors"
                      aria-label="上一張"
                    >
                      ‹
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center text-xl transition-colors"
                      aria-label="下一張"
                    >
                      ›
                    </button>
                  </>
                )}
                {/* Hide current */}
                <button
                  onClick={() => handleHideImage(currentImage)}
                  className="absolute top-3 right-3 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-lg shadow-md transition-colors"
                  title="隱藏此照片（其他景點共用此圖時不受影響）"
                  aria-label="隱藏此照片"
                >
                  ×
                </button>
                {/* Counter */}
                {visibleImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                    {selectedIdx + 1} / {visibleImages.length}
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {visibleImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {visibleImages.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => setSelectedIdx(i)}
                      className={`flex-shrink-0 w-20 h-16 rounded overflow-hidden border-2 transition-all ${
                        i === selectedIdx
                          ? "border-orange-500"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`第 ${i + 1} 張`}
                    >
                      <img
                        src={img}
                        alt=""
                        width={80}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[16/10] bg-stone-100 flex items-center justify-center">
              <div className="text-center text-stone-400">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-sm">所有照片都已隱藏</p>
                {images.length > 0 && (
                  <button
                    onClick={() => images.forEach(handleUnhideImage)}
                    className="mt-3 text-xs text-orange-600 hover:text-orange-700 underline"
                  >
                    全部還原
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <InfoCard icon="🎫" label="門票" value={attraction.ticket} />
          <InfoCard icon="⏰" label="開放時間" value={attraction.hours} />
          <InfoCard
            icon="📍"
            label="座標"
            value={`${attraction.lat.toFixed(4)}, ${attraction.lng.toFixed(4)}`}
          />
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg font-bold mb-3 text-stone-900">
            行程整合
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={toggleItinerary}
              className={`flex-1 font-medium py-2.5 px-4 rounded-lg transition-colors ${
                inItinerary
                  ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {inItinerary ? "✗ 從行程移除" : "✓ 加入 Day 1 行程"}
            </button>
            <Link
              href="/travel/planner"
              className="flex-1 text-center bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              🗓️ 開行程規劃器
            </Link>
            <Link
              href={`https://www.google.com/maps?q=${attraction.lat},${attraction.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              🗺️ Google Maps
            </Link>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            行程資料儲存在 localStorage, 跨裝置請使用匯出/匯入備份
          </p>
        </div>

        {/* Mini Map */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg font-bold mb-3 text-stone-900 flex items-center gap-2">
            <span>🗺️</span>
            <span>位置地圖</span>
          </h2>
          <ErrorBoundary name="景點地圖">
            <DynamicAttractionsMap
              plannedAttractions={plannedAttractions}
            />
          </ErrorBoundary>
        </div>

        {/* Hidden image counter (only show if any hidden) */}
        {images.length - visibleImages.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-amber-800">
            <span className="font-medium">已隱藏 {images.length - visibleImages.length} / {images.length} 張照片</span>
            <span className="block mt-1 text-amber-700">
              隱藏是 per-(景點, 照片) 範圍, 與其他共用此圖的景點互不影響
            </span>
            <button
              onClick={() => images.forEach((img) => {
                if (hiddenSet.has(composeKey(attraction.name, img))) {
                  handleUnhideImage(img);
                }
              })}
              className="mt-2 text-amber-700 hover:text-amber-900 underline"
            >
              全部還原
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-stone-100">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs text-stone-500 mb-1">{label}</div>
      <div className="text-sm sm:text-base font-medium text-stone-900 break-words">
        {value}
      </div>
    </div>
  );
}
