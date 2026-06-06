'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  loadHotelPhotos,
  syncAllPhotos,
  removePhoto,
  type Photo,
} from '@/utils/roomTourService';

const CATEGORIES = [
  { id: 'all',      label: '全部',     emoji: '📷' },
  { id: 'room',     label: '客房',     emoji: '🛏️' },
  { id: 'suite',    label: '套房',     emoji: '🛋️' },
  { id: 'public',   label: '公共區域', emoji: '🏛️' },
  { id: 'dining',   label: '餐飲',     emoji: '🍽️' },
  { id: 'facility', label: '設施',     emoji: '🏋️' },
];

const HOTEL_META = {
  shanghai:       { name: '上海嘉廷酒店',      nameEn: 'Kingtown Riverside Hotel Plaza Shanghai', address: '上海靜安區新閘路126號（近昌平路）',        color: 'from-blue-800 to-blue-600',   source: undefined },
  hangzhou:        { name: '杭州大酒店',        nameEn: 'Hangzhou Hotel ★★★★',                   address: '杭州延安西路と体育場路の交差点（武林広場エリア）', color: 'from-amber-700 to-amber-500',    source: 'shanghainavi.com' },
  wuzhenYoushe:   { name: '烏鎮悠舍悠得藝術酒店',nameEn: 'Wuzhen Youshe Art Hotel (Xizha)',       address: '烏鎮鎮環河路59號（西柵北門步行2分鐘）',        color: 'from-teal-700 to-teal-500',     source: 'cncn.com' },
  yuzhouChangwan: { name: '西塘尋春·古韻雅居客棧',nameEn: 'Xitang Yuzhou Changwan Inn',          address: '嘉善縣西塘鎮景區內南棚下77號',                color: 'from-amber-700 to-orange-600',  source: 'wingontravel.com' },
  wuzhenHomestay: { name: '烏鎮西柵民宿',        nameEn: 'Wuzhen Xizha Homestay',                 address: '桐鄉市烏鎮鎮西柵景區內',                       color: 'from-emerald-700 to-teal-600',  source: 'ctrip.com' },
};

type HotelKey = keyof typeof HOTEL_META;

// ── Photo hook: all mutations sync to Supabase for cross-user consistency ──────
function useHotelPhotos(hotelKey: HotelKey) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [modified, setModified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from Supabase (falls back to defaults on server error)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadHotelPhotos(hotelKey);
      setPhotos(data);
    } finally {
      setLoading(false);
    }
  }, [hotelKey]);

  useEffect(() => { load(); }, [load]);

  // Persist current state to Supabase and mark modified
  const persist = useCallback(async (next: Photo[]) => {
    setPhotos(next);
    setModified(true);
    await syncAllPhotos(next, hotelKey);
    setModified(false);
  }, [hotelKey]);

  const deletePhoto = useCallback(async (idx: number) => {
    const photo = photos[idx];
    if (!photo) return;
    const next = photos.filter((_, i) => i !== idx);
    await persist(next);
    // Also remove from Supabase by id so the deletion is permanent for all users
    await removePhoto(photo.id);
  }, [photos, persist]);

  const moveLeft = useCallback(async (idx: number) => {
    if (idx === 0) return;
    const next = [...photos];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    await persist(next);
  }, [photos, persist]);

  const moveRight = useCallback(async (idx: number) => {
    if (idx >= photos.length - 1) return;
    const next = [...photos];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    await persist(next);
  }, [photos, persist]);

  const reset = useCallback(async () => {
    await load(); // reload defaults from service (clears any overrides)
  }, [load]);

  return { photos, modified, loading, deletePhoto, moveLeft, moveRight, reset };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RoomTourPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [activeHotel, setActiveHotel] = useState<HotelKey>('shanghai');
  const [editMode, setEditMode] = useState(false);

  const { photos, modified, loading, deletePhoto, moveLeft, moveRight, reset } =
    useHotelPhotos(activeHotel);

  const filtered =
    activeCategory === 'all'
      ? photos
      : photos.filter((p) => p.category === activeCategory);

  const handleHotelChange = (key: HotelKey) => {
    setActiveHotel(key);
    setEditMode(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${HOTEL_META[activeHotel].color} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Link href="/travel" className="text-white/80 hover:text-white text-sm">
              ← 返回首頁
            </Link>
            <Link href="/travel/planner" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              🗓️ 行程規劃
            </Link>
          </div>

          {/* Hotel selector */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {(Object.keys(HOTEL_META) as HotelKey[]).map((key) => (
              <button
                key={key}
                onClick={() => handleHotelChange(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeHotel === key
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {HOTEL_META[key].name}
              </button>
            ))}
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ml-auto ${
                editMode
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/40'
              }`}
            >
              {editMode ? '✏️ 離開編輯' : '✏️ 編輯照片'}
            </button>
          </div>

          <h1 className="text-4xl font-bold mb-2">🏨 Room Tour</h1>
          <p className="text-white/80 text-lg">
            {HOTEL_META[activeHotel].name} · {HOTEL_META[activeHotel].nameEn}
          </p>
          <p className="text-white/60 text-sm mt-1">📍 {HOTEL_META[activeHotel].address}</p>
          {HOTEL_META[activeHotel].source && (
            <p className="text-white/40 text-xs mt-1">圖片來源：{HOTEL_META[activeHotel].source}</p>
          )}

          {editMode && (
            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 flex-wrap">
              <span className="text-white text-sm">✏️ 編輯模式：點擊 × 刪除照片，← → 調整順序</span>
              {modified && (
                <span className="text-yellow-300 text-xs">● 同步中...</span>
              )}
              <button
                onClick={reset}
                className="ml-auto text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full border border-white/40 transition-colors"
              >
                重置為預設
              </button>
            </div>
          )}
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
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <span className="ml-auto text-gray-500 text-sm self-center">
            {loading ? '載入中...' : `${filtered.length} 張照片`}
          </span>
        </div>

        {/* Photo grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">⏳</div>
            <p>從 Supabase 載入照片...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((photo, fidx) => {
              const realIdx = photos.findIndex(
                (p) => p.src === photo.src && p.caption === photo.caption
              );
              return (
                <div
                  key={`${photo.src}-${fidx}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200"
                >
                  <button
                    onClick={() => !editMode && setLightbox(photo)}
                    className={`w-full h-full cursor-zoom-in ${editMode ? 'opacity-60' : ''}`}
                    disabled={editMode}
                  >
                    <img
                      src={photo.src}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </button>

                  {!editMode && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end pointer-events-none">
                      <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        {photo.caption}
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {photo.location}
                  </div>

                  {editMode ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <button
                        onClick={() => moveLeft(realIdx)}
                        disabled={realIdx === 0}
                        className="bg-white/90 hover:bg-white text-gray-800 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow disabled:opacity-30 disabled:cursor-not-allowed"
                        title="向左移動"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => deletePhoto(realIdx)}
                        className="bg-red-500 hover:bg-red-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-xl font-bold shadow"
                        title="刪除"
                      >
                        ×
                      </button>
                      <button
                        onClick={() => moveRight(realIdx)}
                        disabled={realIdx === photos.length - 1}
                        className="bg-white/90 hover:bg-white text-gray-800 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow disabled:opacity-30 disabled:cursor-not-allowed"
                        title="向右移動"
                      >
                        →
                      </button>
                      <span className="text-white text-[10px] bg-black/50 px-1 rounded mt-1">
                        {photo.caption.slice(0, 12)}...
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2">
                      <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.caption}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && !loading && (
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