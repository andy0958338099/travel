'use client';

import { useState, useEffect } from 'react';
import { ATTRACTIONS, type Attraction } from './data';
import { getHiddenImages, hideImage, getHiddenAttractions, hideAttraction } from '@/utils/attractionGalleryService';

function AttractionCard({
  attraction,
  onDelete,
}: {
  attraction: Attraction;
  onDelete: (name: string) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>(attraction.images || []);
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    getHiddenImages().then(setHiddenSet);
  }, []);

  const visibleImages = images.filter((img) => !hiddenSet.has(img));

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
        {/* 刪除景點按鈕 */}
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm shadow"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(attraction.name);
          }}
          title="刪除此景點"
        >
          🗑️
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
          {/* 刪除景點按鈕 */}
          <button
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-sm shadow"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attraction.name);
            }}
            title="刪除此景點"
          >
            🗑️
          </button>
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-500">{attraction.nameEn || ''}</p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{attraction.highlight}</p>
        </div>
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
              className="w-full h-full object-contain rounded-lg"
              style={{ maxHeight: '80vh' }}
            />
            <div className="text-center mt-3 text-white">
              <p className="font-medium">{attraction.name}</p>
              <p className="text-sm text-gray-300">
                {selectedIdx + 1} / {visibleImages.length}
                {attraction.nameEn && ` · ${attraction.nameEn}`}
              </p>
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
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                    {/* 刪除該照片按鈕 */}
                    <button
                      className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await hideImage(img);
                        setHiddenSet((prev) => new Set([...prev, img]));
                        if (selectedIdx >= visibleImages.length - 1) {
                          setSelectedIdx((prev) => Math.max(0, (prev || 1) - 1));
                        }
                      }}
                      title="刪除此照片"
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
  const [hiddenAttractions, setHiddenAttractions] = useState<Set<string>>(new Set());

  useEffect(() => {
    getHiddenAttractions().then(setHiddenAttractions);
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

  const visible = allFiltered.filter((a) => !hiddenAttractions.has(a.name));

  const handleDeleteAttraction = async (name: string) => {
    await hideAttraction(name);
    setHiddenAttractions((prev) => new Set([...prev, name]));
  };

  return (
    <div className="space-y-4">
      {/* 篩選器 */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === cat.key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* 統計 */}
      <p className="text-sm text-gray-500">
        共 {visible.length} 個景點
      </p>

      {/* 照片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visible.map((attraction) => (
          <AttractionCard
            key={attraction.name}
            attraction={attraction}
            onDelete={handleDeleteAttraction}
          />
        ))}
      </div>
    </div>
  );
}
