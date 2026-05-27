'use client';
import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'all', label: '全部', emoji: '📷' },
  { id: 'room', label: '客房', emoji: '🛏️' },
  { id: 'suite', label: '套房', emoji: '🛋️' },
  { id: 'public', label: '公共區域', emoji: '🏛️' },
  { id: 'dining', label: '餐飲', emoji: '🍽️' },
  { id: 'facility', label: '設施', emoji: '🏋️' },
];

interface Photo {
  src: string;
  caption: string;
  category: string;
  location: string;
}

const PHOTOS: Photo[] = [
  // ── 客房 ──
  {
    src: '/hotels/kingtown-plaza/shanghai/room_06.jpg',
    caption: '豪華客房（60平方米景觀空間）',
    category: 'room',
    location: '8-15樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_07.jpg',
    caption: '行政雙人床客房',
    category: 'room',
    location: '12-18樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_08.jpg',
    caption: '城市景觀客房（夜景）',
    category: 'room',
    location: '10-20樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_09.jpg',
    caption: '商務客房（辦公區配置）',
    category: 'room',
    location: '5-12樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_10.jpg',
    caption: '精緻雙床客房',
    category: 'room',
    location: '6-14樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_11.jpg',
    caption: '豪華套房臥室',
    category: 'room',
    location: '16-22樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_12.jpg',
    caption: '客房衛浴空間',
    category: 'room',
    location: '全館',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_15.jpg',
    caption: '精緻單人客房',
    category: 'room',
    location: '3-8樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_20.jpg',
    caption: '行政客房（加大床）',
    category: 'room',
    location: '18-25樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_suite_01.jpg',
    caption: '尊享套房（60平方米）',
    category: 'suite',
    location: '20-25樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_suite_02.jpg',
    caption: '行政套房客廳',
    category: 'suite',
    location: '20-25樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/room_suite_03.jpg',
    caption: '尊享套房衛浴',
    category: 'suite',
    location: '20-25樓',
  },
  // ── 公共區域 ──
  {
    src: '/hotels/kingtown-plaza/shanghai/lobby_01.jpg',
    caption: '酒店大堂（挑高三層）',
    category: 'public',
    location: '1樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/lobby_02.jpg',
    caption: '大堂休閒區',
    category: 'public',
    location: '1樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/corridor_01.jpg',
    caption: '高空走廊景觀',
    category: 'public',
    location: '15樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/hotel_exterior_01.jpg',
    caption: '酒店外觀（夜景）',
    category: 'public',
    location: '外觀',
  },
  // ── 餐飲 ──
  {
    src: '/hotels/kingtown-plaza/shanghai/restaurant_01.jpg',
    caption: '自助餐廳',
    category: 'dining',
    location: '2樓',
  },
  // ── 設施 ──
  {
    src: '/hotels/kingtown-plaza/shanghai/gym_01.jpg',
    caption: '健身中心',
    category: 'facility',
    location: '3樓',
  },
  {
    src: '/hotels/kingtown-plaza/shanghai/area_01.jpg',
    caption: '酒店周邊環境',
    category: 'facility',
    location: '周邊',
  },
];

export default function RoomTourPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const filtered =
    activeCategory === 'all'
      ? PHOTOS
      : PHOTOS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/travel" className="text-white/80 hover:text-white text-sm">
              ← 返回首頁
            </Link>
            <Link href="/travel/planner" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              🗓️ 行程規劃
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">🏨 Room Tour</h1>
          <p className="text-white/80 text-lg">
            上海嘉廷酒店 · Kingtown Riverside Hotel Plaza Shanghai
          </p>
          <p className="text-white/60 text-sm mt-1">
            地址：上海靜安區新閘路126號（近昌平路）
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-blue-700 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <span className="ml-auto text-gray-500 text-sm self-center">
            {filtered.length} 張照片
          </span>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setLightbox(photo)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200 cursor-zoom-in"
            >
              <img
                src={photo.src}
                alt={photo.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption}
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {photo.location}
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📷</div>
            <p>此分類暫無照片</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.caption}
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-medium">{lightbox.caption}</p>
              <p className="text-white/60 text-sm mt-1">📍 {lightbox.location}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}