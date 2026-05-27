'use client';

import { useState } from 'react';
import { ATTRACTIONS, type Attraction } from './data';

function AttractionCard({ attraction }: { attraction: Attraction }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const images = attraction.images || [];

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400">
          <span className="text-sm">📷 照片待補</span>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-800 text-sm">{attraction.name}</h3>
          <p className="text-xs text-gray-500">{attraction.nameEn || ''}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedIdx(0)}
      >
        {/* 主圖 */}
        <div className="relative h-40 overflow-hidden bg-gray-50">
          <img
            src={images[0]}
            alt={attraction.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              +{images.length - 1}
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
      </div>

      {/* Lightbox */}
      {selectedIdx !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setSelectedIdx(null)}
          >
            ×
          </button>

          {images.length > 1 && (
            <button
              className="absolute left-4 text-white text-4xl hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIdx((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
              }}
            >
              ‹
            </button>
          )}

          <div className="max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedIdx]}
              alt={`${attraction.name} ${selectedIdx + 1}`}
              className="w-full h-full object-contain rounded-lg"
              style={{ maxHeight: '80vh' }}
            />
            <div className="text-center mt-3 text-white">
              <p className="font-medium">{attraction.name}</p>
              <p className="text-sm text-gray-300">
                {selectedIdx + 1} / {images.length}
                {attraction.nameEn && ` · ${attraction.nameEn}`}
              </p>
            </div>

            {/* 縮圖列 */}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {images.map((img, i) => (
                  <button
                    key={i}
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
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <button
              className="absolute right-4 text-white text-4xl hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIdx((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
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

  const categories = [
    { key: 'all', label: '全部景點', emoji: '🗺️' },
    { key: 'westLake', label: '西湖周邊', emoji: '🏛️' },
    { key: 'wuzhen', label: '烏鎮水鄉', emoji: '🌉' },
    { key: 'other', label: '其他景點', emoji: '🎭' },
  ] as const;

  const filtered =
    filter === 'all'
      ? [...ATTRACTIONS.westLake, ...ATTRACTIONS.wuzhen, ...ATTRACTIONS.other]
      : ATTRACTIONS[filter];

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
        共 {filtered.length} 個景點 · {filtered.reduce((acc, a) => acc + (a.images?.length || 0), 0)} 張照片
      </p>

      {/* 照片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((attraction) => (
          <AttractionCard key={attraction.name} attraction={attraction} />
        ))}
      </div>
    </div>
  );
}
