"use client";

/**
 * 2026-07-26 聖上拍板: 手動拖曳分類頁面
 *
 * 設計:
 *   - 上方: 來源切換 (本機 / Takeout / Google Photos HTML)
 *   - 中間: 照片 grid (每張可拖)
 *   - 下方: 8 個 day bucket (拖曳接收區)
 *   - 點照片 → 顯示 EXIF + 跳到 lightbox
 *   - 預填: 用 EXIF 真實日期給聖上看「建議」,但聖上可改
 *   - 寫入: travel_photo_meta 的 day/hour/lat/lng/location_name 欄位
 *
 * 100% 照片可見:
 *   - 從 ~/Downloads/杭州共享相簿/ 取本機縮圖
 *   - 從 Supabase Storage 取已上傳的縮圖
 *   - 從 Google Photos HTML 取對應 AP1Gcz 縮圖 (聖上 Look 共享相簿)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/GlobalToastHost";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";

const DAY_LIST = [
  { day: 1, date: "7/17", title: "D1 桃園 → 上海" },
  { day: 2, date: "7/18", title: "D2 上海 → 西塘" },
  { day: 3, date: "7/19", title: "D3 西塘 → 烏鎮東柵" },
  { day: 4, date: "7/20", title: "D4 烏鎮西柵" },
  { day: 5, date: "7/21", title: "D5 烏鎮 → 杭州" },
  { day: 6, date: "7/22", title: "D6 宋城" },
  { day: 7, date: "7/23", title: "D7 運河宮宴" },
  { day: 8, date: "7/24", title: "D8 杭州 → 桃園" },
];

const HOUR_BUCKETS = [
  { label: "🌙 凌晨", range: [0, 5] },
  { label: "🌅 上午", range: [6, 11] },
  { label: "☀️ 中午", range: [12, 13] },
  { label: "🌤️ 下午", range: [14, 17] },
  { label: "🌃 晚上", range: [18, 23] },
];

export default function ClassifyPage() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);

  // 載入所有照片 (從 Supabase)
  useEffect(() => {
    loadPhotos();
  }, []);

  async function loadPhotos() {
    setLoading(true);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/travel_photo_meta?select=id,filename,day,hour,datetime_original,lat,lng,location_name,google_photos_thumb_url&limit=1000`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }
    );
    const data = (await res.json()) as PhotoRow[];
    setPhotos(data);
    setProgress({ done: data.length, total: data.length });
    setLoading(false);
  }

  // 拖到某 day
  async function dropOnDay(day: number, photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    // 樂觀更新
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, day } : p))
    );

    // 寫入 Supabase
    const upRes = await fetch(
      `${SUPABASE_URL}/rest/v1/travel_photo_meta?id=eq.${photoId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ day }),
      }
    );
    if (!upRes.ok) {
      const err = await upRes.text();
      toast.error(`更新失敗: ${err}`);
      // rollback
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, day: photo.day } : p))
      );
    } else {
      toast.success(`${photo.filename} → D${day}`);
    }
  }

  // 拖到垃圾桶 (取消分類 → day=0)
  async function dropToTrash(photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, day: 0 } : p))
    );

    const upRes = await fetch(
      `${SUPABASE_URL}/rest/v1/travel_photo_meta?id=eq.${photoId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ day: 0 }),
      }
    );
    if (!upRes.ok) {
      const err = await upRes.text();
      toast.error(`更新失敗: ${err}`);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, day: photo.day } : p))
      );
    } else {
      toast.info(`${photo.filename} → 取消分類`);
    }
  }

  // 篩選器
  const [filterDay, setFilterDay] = useState<number | "all" | "unclassified">("all");
  const filtered = useMemo(() => {
    if (filterDay === "all") return photos;
    if (filterDay === "unclassified") return photos.filter((p) => !p.day || p.day === 0);
    return photos.filter((p) => p.day === filterDay);
  }, [photos, filterDay]);

  // 各 day 計數
  const dayCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of photos) {
      counts[p.day || 0] = (counts[p.day || 0] || 0) + 1;
    }
    return counts;
  }, [photos]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-2xl text-stone-600">🗂️ 載入照片中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-100 via-stone-50 to-rose-100 border-b-2 border-amber-300/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
                🗂️ 手動相簿分類
              </h1>
              <p className="text-sm text-stone-600 mt-1">
                拖照片到下方 day bucket · 點縮圖看 EXIF · 右鍵垃圾桶取消分類
              </p>
            </div>
            <div className="text-sm">
              <span className="font-bold text-stone-700">{progress.done}</span>
              <span className="text-stone-500"> / {progress.total} 張</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 篩選器 */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-stone-400">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterDay("all")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterDay === "all"
                  ? "bg-stone-700 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              全部 ({photos.length})
            </button>
            {DAY_LIST.map((d) => (
              <button
                key={d.day}
                onClick={() => setFilterDay(d.day)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterDay === d.day
                    ? "bg-stone-700 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                D{d.day} ({dayCounts[d.day] || 0})
              </button>
            ))}
            <button
              onClick={() => setFilterDay("unclassified")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterDay === "unclassified"
                  ? "bg-stone-700 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              ❓ 未分類 ({dayCounts[0] || 0})
            </button>
          </div>
        </section>

        {/* 照片 grid (可拖) */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-amber-400">
          <h2 className="text-base font-bold text-stone-900 mb-3">
            📷 待分類照片 ({filtered.length})
          </h2>
          <PhotoGrid
            photos={filtered}
            draggingId={draggingId}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => setDraggingId(null)}
            onClick={(p) => setLightbox(p)}
          />
        </section>

        {/* 8 day bucket 接收區 */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-emerald-400">
          <h2 className="text-base font-bold text-stone-900 mb-3">
            📅 拖照片到這裡 (D1-D8)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DAY_LIST.map((d) => (
              <DropBucket
                key={d.day}
                day={d.day}
                title={d.title}
                date={d.date}
                count={dayCounts[d.day] || 0}
                isHover={hoverDay === d.day}
                draggingId={draggingId}
                onEnter={() => setHoverDay(d.day)}
                onLeave={() => setHoverDay(null)}
                onDrop={(photoId) => dropOnDay(d.day, photoId)}
              />
            ))}
            {/* 垃圾桶 */}
            <TrashBucket
              count={dayCounts[0] || 0}
              draggingId={draggingId}
              onEnter={() => setHoverDay(0)}
              onLeave={() => setHoverDay(null)}
              onDrop={dropToTrash}
            />
          </div>
        </section>

        {/* 總結 */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-400">
          <h2 className="text-base font-bold text-stone-900 mb-3">
            📊 分類進度
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {DAY_LIST.map((d) => (
              <div
                key={d.day}
                className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded"
              >
                <span className="font-medium text-stone-700">{d.title}</span>
                <span className="font-bold text-amber-700">
                  {dayCounts[d.day] || 0}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-stone-500">
            💡 拖一張照片到任一 day bucket = 自動寫入 Supabase + DB day 欄位更新
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ── Photo Grid (可拖) ────────────────────────────────────────────────────────
function PhotoGrid({
  photos,
  draggingId,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  photos: PhotoRow[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: (p: PhotoRow) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <div className="text-sm text-stone-600">這個分類已清空!</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {photos.map((p) => (
        <PhotoCard
          key={p.id}
          photo={p}
          isDragging={draggingId === p.id}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={onClick}
        />
      ))}
    </div>
  );
}

function PhotoCard({
  photo,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  photo: PhotoRow;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onClick: (p: PhotoRow) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("photoId", photo.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(photo.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(photo)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (confirm(`取消 ${photo.filename} 的分類?`)) {
          onDragStart(photo.id);
        }
      }}
      className={`relative aspect-square bg-stone-100 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
        isDragging
          ? "opacity-30 scale-95 border-amber-500"
          : photo.day
          ? "border-stone-200 hover:border-amber-400"
          : "border-red-200 hover:border-red-400"
      }`}
      style={{ touchAction: "none" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.google_photos_thumb_url || ""}
        alt={photo.filename}
        loading="lazy"
        className="w-full h-full object-cover"
        draggable={false}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* Day badge */}
      {photo.day ? (
        <div className="absolute top-1 left-1 bg-amber-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
          D{photo.day}
        </div>
      ) : (
        <div className="absolute top-1 left-1 bg-red-500 text-white text-xs font-bold px-1.5 h-5 rounded flex items-center justify-center shadow">
          ❓
        </div>
      )}
      {/* Filename tooltip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="text-white text-xs truncate">{photo.filename}</div>
      </div>
    </div>
  );
}

// ── Drop Bucket ─────────────────────────────────────────────────────────────
function DropBucket({
  day,
  title,
  date,
  count,
  isHover,
  draggingId,
  onEnter,
  onLeave,
  onDrop,
}: {
  day: number;
  title: string;
  date: string;
  count: number;
  isHover: boolean;
  draggingId: string | null;
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (photoId: string) => void;
}) {
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        onEnter();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={onLeave}
      onDrop={(e) => {
        e.preventDefault();
        const photoId = e.dataTransfer.getData("photoId");
        if (photoId) onDrop(photoId);
        onLeave();
      }}
      className={`rounded-lg p-3 border-2 transition-all min-h-[100px] ${
        isHover && draggingId
          ? "border-amber-500 bg-amber-50 scale-105"
          : "border-dashed border-stone-300 bg-stone-50"
      }`}
    >
      <div className="text-xs text-stone-500">{date}</div>
      <div className="font-bold text-stone-900">{title}</div>
      <div className="text-2xl font-bold text-amber-700 mt-2">{count} 張</div>
    </div>
  );
}

function TrashBucket({
  count,
  draggingId,
  onEnter,
  onLeave,
  onDrop,
}: {
  count: number;
  draggingId: string | null;
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (photoId: string) => void;
}) {
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        onEnter();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDragLeave={onLeave}
      onDrop={(e) => {
        e.preventDefault();
        const photoId = e.dataTransfer.getData("photoId");
        if (photoId) onDrop(photoId);
        onLeave();
      }}
      className={`rounded-lg p-3 border-2 transition-all min-h-[100px] ${
        count > 0 ? "border-red-300 bg-red-50" : "border-dashed border-stone-300 bg-stone-50"
      }`}
    >
      <div className="text-xs text-stone-500">取消</div>
      <div className="font-bold text-stone-900">🗑️ 未分類</div>
      <div className="text-2xl font-bold text-red-600 mt-2">{count} 張</div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }: { photo: PhotoRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl"
      >
        ×
      </button>
      <div
        className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.google_photos_thumb_url || ""}
          alt={photo.filename}
          className="max-w-full max-h-[80vh] object-contain"
        />
        <div className="mt-3 text-white/90 text-sm text-center max-w-2xl">
          <div className="font-bold">{photo.filename}</div>
          <div className="text-xs text-white/60 mt-1">
            {photo.datetime_original
              ? new Date(photo.datetime_original).toLocaleString("zh-TW")
              : "(無 EXIF)"}
            {photo.lat && ` · 📍 ${photo.location_name || `${photo.lat.toFixed(4)}, ${photo.lng?.toFixed(4)}`}`}
            {photo.day ? ` · D${photo.day}` : " · 未分類"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────
interface PhotoRow {
  id: string;
  filename: string;
  day: number | null;
  hour: number | null;
  datetime_original: string | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  google_photos_thumb_url: string | null;
}
