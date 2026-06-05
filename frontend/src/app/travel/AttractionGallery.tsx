'use client';
import { useState, useEffect } from 'react';
import { ATTRACTIONS, type Attraction } from './data';
import {
  getHiddenImages, hideImage,
  getHiddenAttractions, hideAttraction,
} from '@/utils/attractionGalleryService';
import { toast } from '@/components/GlobalToastHost';
import ShareButtons from '@/components/ShareButtons';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-40 bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

function AttractionCard({
  attraction,
  hiddenAttractions,
  onDeleted,
}: {
  attraction: Attraction;
  hiddenAttractions: Set<string>;
  onDeleted: (name: string) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const images = attraction.images || [];

  useEffect(() => {
    getHiddenImages().then(setHiddenSet);
  }, []);

  const visibleImages = images.filter((img) => !hiddenSet.has(img));
  const isWholeHidden = hiddenAttractions.has(attraction.name);

  if (isWholeHidden) {
    // 整個景點被刪除，渲染一個「已隱藏」小區塊並提供還原按鈕
    return (
      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 overflow-hidden relative p-3 flex flex-col items-center justify-center min-h-[180px]">
        <span className="text-2xl">🗑️</span>
        <h3 className="font-semibold text-gray-500 text-sm mt-1 line-through">
          {attraction.name}
        </h3>
        <p className="text-xs text-gray-400 mt-1">已隱藏</p>
        <button
          onClick={async () => {
            // 還原 = 從 Supabase 移除該記錄（toggle 行為）
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            await supabase
              .from('attraction_gallery_attractions')
              .delete()
              .eq('attraction_name', attraction.name);
            onDeleted(attraction.name);
            toast.success(`已還原 ${attraction.name}`);
          }}
          className="mt-2 text-xs text-teal-600 hover:text-teal-700 underline"
        >
          還原
        </button>
      </div>
    );
  }

  if (visibleImages.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400">
          <span className="text-sm">📷 照片待補</span>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-800 text-sm">{attraction.name}</h3>
          <p className="text-xs text-gray-500">{attraction.nameEn || ''}</p>
        </div>
        {/* 整個景點刪除按鈕（即使沒照片也可刪） */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm(`確定要隱藏「${attraction.name}」這個景點嗎？\n（會在所有裝置同步隱藏）`)) return;
            setDeleting(true);
            await hideAttraction(attraction.name);
            onDeleted(attraction.name);
            toast.success(`已隱藏 ${attraction.name}`);
            setDeleting(false);
          }}
          disabled={deleting}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm transition-colors disabled:opacity-50"
          title="隱藏此景點"
          aria-label={`隱藏 ${attraction.name}`}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
        onClick={() => setSelectedIdx(0)}
      >
        {/* 主圖 */}
        <div className="relative h-40 overflow-hidden bg-gray-50">
          <img
            src={visibleImages[0]}
            alt={attraction.name}
            width={400}
            height={160}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {visibleImages.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              +{visibleImages.length - 1}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-2">
            <span className="text-white text-xs font-medium drop-shadow">{attraction.name}</span>
          </div>
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-500">{attraction.nameEn || ''}</p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{attraction.highlight}</p>
        </div>

        {/* 整個景點刪除按鈕 — 卡片右上角，與 lightbox 內的單張刪除按鈕分開 */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!window.confirm(`確定要隱藏「${attraction.name}」這個景點嗎？\n（會在所有裝置同步隱藏）`)) return;
            setDeleting(true);
            await hideAttraction(attraction.name);
            onDeleted(attraction.name);
            toast.success(`已隱藏 ${attraction.name}`);
            setDeleting(false);
          }}
          disabled={deleting}
          className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm transition-colors disabled:opacity-50"
          title="隱藏此景點"
          aria-label={`隱藏 ${attraction.name}`}
        >
          ×
        </button>
      </div>

      {/* Lightbox */}
      {selectedIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIdx(null)}
        >
          {/* 關閉按鈕 */}
          <button
            className="absolute top-4 left-4 text-white text-3xl hover:text-gray-300 z-10"
            onClick={() => setSelectedIdx(null)}
          >
            ×
          </button>

          {visibleImages.length > 1 && (
            <button
              className="absolute left-4 text-white text-4xl hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIdx((prev) => (prev! > 0 ? prev! - 1 : visibleImages.length - 1));
              }}
            >
              ‹
            </button>
          )}

          <div className="max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={visibleImages[selectedIdx]}
              alt={`${attraction.name} ${selectedIdx + 1}`}
              width={1200}
              height={800}
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain rounded-lg"
              style={{ maxHeight: '80vh' }}
            />
            <div className="text-center mt-3 text-white">
              <p className="font-medium">{attraction.name}</p>
              <p className="text-sm text-gray-300">
                {selectedIdx + 1} / {visibleImages.length}
                {attraction.nameEn && ` · ${attraction.nameEn}`}
              </p>
              <div className="mt-2 flex justify-center">
                <ShareButtons
                  title={attraction.name}
                  text={`2026 江南水鄉八日 📷 ${attraction.name}${attraction.highlight ? ' · ' + attraction.highlight.slice(0, 40) : ''}`}
                  variant="icon"
                />
              </div>
            </div>

            {/* 縮圖列 */}
            {visibleImages.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {visibleImages.map((img, i) => (
                  <div key={i} className="relative">
                    <button
                      className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                        i === selectedIdx ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIdx(i);
                      }}
                    >
                      <img src={img} alt="" width={64} height={48} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </button>
                    {/* 刪除該照片按鈕 — 只刪單張，與卡片右上角的整個景點刪除分開 */}
                    <button
                      className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await hideImage(img);
                        setHiddenSet((prev) => new Set([...prev, img]));
                        if (selectedIdx >= visibleImages.length - 1) {
                          setSelectedIdx((prev) => Math.max(0, (prev || 1) - 1));
                        }
                        toast.success('已刪除此照片');
                      }}
                      title="刪除此照片"
                      aria-label="刪除此照片"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {visibleImages.length > 1 && (
            <button
              className="absolute right-4 text-white text-4xl hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIdx((prev) => (prev! < visibleImages.length - 1 ? prev! + 1 : 0));
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function AttractionGallery() {
  const [filter, setFilter] = useState<'all' | 'westLake' | 'wuzhen' | 'other'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [hiddenAttractions, setHiddenAttractions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 載入隱藏的整個景點清單
    getHiddenAttractions().then(setHiddenAttractions);
  }, []);

  useEffect(() => {
    // Give skeleton time to render before hiding loading
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const categories = [
    { key: 'all', label: '全部景點', emoji: '🗺️' },
    { key: 'westLake', label: '西湖周邊', emoji: '🏛️' },
    { key: 'wuzhen', label: '烏鎮水鄉', emoji: '🌉' },
    { key: 'other', label: '其他景點', emoji: '🎭' },
  ] as const;

  const allFiltered =
    filter === 'all'
      ? [...ATTRACTIONS.westLake, ...ATTRACTIONS.wuzhen, ...ATTRACTIONS.other]
      : ATTRACTIONS[filter];

  // 已隱藏的景點也保留渲染（顯示「已隱藏」區塊+還原按鈕），
  // 但只在該分類下顯示 — 用 useMemo 避免重算
  const visibleAndHidden = allFiltered;

  return (
    <div className="space-y-4">
      {/* 篩選器 — sticky 在手機上跟著捲動 */}
      <div className="sticky top-0 z-20 bg-white -mx-1 px-1 py-2 sm:static sm:mx-0 sm:px-0 sm:py-0">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                filter === cat.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 統計 */}
      <p className="text-sm text-gray-500">
        {isLoading
          ? '載入中…'
          : `共 ${visibleAndHidden.length} 個景點（${visibleAndHidden.filter(a => !hiddenAttractions.has(a.name)).length} 個顯示）`}
      </p>

      {/* 照片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : visibleAndHidden.map((attraction) => (
              <AttractionCard
                key={attraction.name}
                attraction={attraction}
                hiddenAttractions={hiddenAttractions}
                onDeleted={(name) => {
                  setHiddenAttractions((prev) => new Set([...prev, name]));
                }}
              />
            ))}
      </div>
    </div>
  );
}
