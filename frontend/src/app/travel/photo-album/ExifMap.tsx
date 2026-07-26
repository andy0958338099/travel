"use client";

/**
 * ExifMap — EXIF 時空軸地圖
 *
 * 2026-07-26 聖上拍板, 修 2 個問題:
 *   1. SSR 時 leaflet import 會炸 (window is not defined) → 加 SSR guard
 *   2. 聖上 chip 篩選後 0 張時不應該顯示地圖 (由 ClientPage 條件式渲染處理)
 *
 * 修法 (沿用 6-18 useId + cleanup fix):
 *   - useId() 給 MapContainer 綁定 key
 *   - cleanup effect 主動 map.remove() + 刪 _leaflet_id
 *   - SSR guard: isClient state 控制 MapContainer 是否渲染
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  type TravelPhoto,
  DAY_COLOR,
} from "@/utils/travelPhotos";

interface ExifMapProps {
  photos: TravelPhoto[];
  allPhotos: TravelPhoto[];
  selectedDay: number | "all";
  /** 🆕 2026-07-26 點 marker → 傳整個 cluster 的 photos (不只一張) */
  onMarkerClick: (photos: TravelPhoto[]) => void;
}

const MARKER_PAGE_SIZE = 20; // 🆕 2026-07-26 每頁 marker 數量上限 (超過會分頁)

// 自動 fitBounds
function FitBounds({ photos }: { photos: TravelPhoto[] }) {
  const map = useMap() as L.Map & { _userZoomed?: boolean };
  useEffect(() => {
    if (map._userZoomed) return;
    const withGPS = photos.filter((p) => p.lat !== null && p.lng !== null);
    if (withGPS.length === 0) return;
    if (withGPS.length === 1) {
      map.setView([withGPS[0].lat!, withGPS[0].lng!], 14);
      return;
    }
    const bounds = L.latLngBounds(
      withGPS.map((p) => [p.lat!, p.lng!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [photos, map]);
  return null;
}

// 🆕 2026-07-26 ClusterLayer: 動態 cluster, 根據 zoom 自動重新計算合併半徑
function ClusterLayer({
  photos,
  onMarkerClick,
}: {
  photos: TravelPhoto[];
  onMarkerClick: (photos: TravelPhoto[]) => void;
}) {
  const map = useMap() as L.Map & { _userZoomed?: boolean };
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handler = () => {
      map._userZoomed = true; // 🆕 2026-07-26 標記 user 已手動縮放
      setZoom(map.getZoom());
    };
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map]);

  const radiusM = getClusterRadius(zoom);
  const clusters = useMemo(() => buildClusters(photos, radiusM), [photos, radiusM]);

  return (
    <>
      {clusters.map((cluster, idx) => (
        <Marker
          key={`cluster-${idx}-${cluster.lat.toFixed(5)}-${cluster.lng.toFixed(5)}-${cluster.count}`}
          position={[cluster.lat, cluster.lng]}
          icon={createClusterMarker(cluster.photos[0].day, cluster.count)}
          eventHandlers={{
            click: () => onMarkerClick(cluster.photos),
          }}
        >
          <Popup maxWidth={320} minWidth={240}>
            <div className="text-xs space-y-1 max-h-[400px] overflow-y-auto">
              <div className="font-bold text-sm text-stone-900 sticky top-0 bg-white py-1 border-b border-stone-200 flex items-center justify-between">
                <span>📍 這個位置有 {cluster.count} 張照片</span>
                <a
                  href="https://photos.app.goo.gl/jPL9tjmkFsewqZGHA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                >
                  🗂️ 開啟相簿
                </a>
              </div>
              {cluster.photos.slice(0, 30).map((photo) => (
                <div
                  key={photo.id}
                  className="border-b border-stone-100 py-1.5"
                >
                  <div className="flex gap-2">
                    {photo.google_photos_thumb_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.google_photos_thumb_url}
                        alt={photo.filename}
                        loading="lazy"
                        className="w-20 h-20 object-cover rounded border border-stone-200 flex-shrink-0 bg-stone-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-800 flex items-center justify-between gap-2">
                        <span className="truncate text-xs">{photo.filename}</span>
                      </div>
                      <div className="text-stone-600 text-xs mt-0.5">
                        📅 D{photo.day} ·{" "}
                        {new Date(photo.datetime_original).toLocaleTimeString(
                          "zh-TW",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                        {photo.uploader_name && ` · 👤 ${photo.uploader_name}`}
                      </div>
                      {photo.location_name && (
                        <div className="text-stone-500 text-xs truncate">
                          📍 {photo.location_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {cluster.count > 30 && (
                <div className="text-stone-500 italic pt-2 text-center">
                  ... 還有 {cluster.count - 30} 張
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// 🆕 2026-07-26 Cluster 同位置 marker: 把同一個範圍內的照片合成一個 cluster
//   動態半徑: 地圖 zoom-out 時合併更大, zoom-in 時保留單張
function getClusterRadius(zoom: number): number {
  if (zoom <= 6) return 5000;
  if (zoom <= 9) return 500;
  if (zoom <= 12) return 100;
  if (zoom <= 15) return 20;
  return 5;
}

function buildClusters(
  photos: TravelPhoto[],
  radiusM: number = 100
): Array<{
  lat: number;
  lng: number;
  count: number;
  photos: TravelPhoto[];
}> {
  const clusters: Array<{ lat: number; lng: number; count: number; photos: TravelPhoto[] }> = [];

  for (const photo of photos) {
    if (photo.lat == null || photo.lng == null) continue;
    let found = false;
    for (const cluster of clusters) {
      const dx = (photo.lat - cluster.lat) * 111000;
      const dy = (photo.lng - cluster.lng) * 111000 * Math.cos((photo.lat * Math.PI) / 180);
      const distM = Math.sqrt(dx * dx + dy * dy);
      if (distM < radiusM) {
        cluster.photos.push(photo);
        cluster.count++;
        cluster.lat = cluster.photos.reduce((s, p) => s + (p.lat ?? 0), 0) / cluster.count;
        cluster.lng = cluster.photos.reduce((s, p) => s + (p.lng ?? 0), 0) / cluster.count;
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({
        lat: photo.lat,
        lng: photo.lng,
        count: 1,
        photos: [photo],
      });
    }
  }
  return clusters;
}

// 自訂 day-color marker (單張)
function createDayMarker(day: number): L.DivIcon {
  const color = DAY_COLOR[day] ?? "#1e293b";
  return L.divIcon({
    className: "exif-marker",
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: bold;
    ">${day}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// 自訂 cluster marker (動態大小)
function createClusterMarker(day: number, count: number): L.DivIcon {
  const color = DAY_COLOR[day] ?? "#1e293b";
  const size = count >= 20 ? 48 : count >= 5 ? 40 : 32;
  return L.divIcon({
    className: "exif-cluster-marker",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${count >= 20 ? 16 : 14}px;
      font-weight: bold;
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ExifMap({
  photos,
  allPhotos,
  selectedDay,
  onMarkerClick,
}: ExifMapProps) {
  const reactId = useId();
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // 🆕 2026-07-26 SSR guard: SSR 時 leaflet import 會炸 → 等 client 才顯示
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 6-18 修 React Strict Mode 雙 mount race
  useEffect(() => {
    return () => {
      const el = mapWrapperRef.current?.querySelector(".leaflet-container") as
        | (HTMLDivElement & { _leaflet_id?: number; _leaflet_map?: unknown })
        | null;
      if (el) {
        try {
          const mapInstance = (el as any)._leaflet_map;
          if (mapInstance && typeof mapInstance.remove === "function") {
            mapInstance.remove();
          }
        } catch {
          /* ignore */
        }
        delete el._leaflet_id;
        delete (el as any)._leaflet_map;
      }
    };
  }, [reactId]);

  const photosWithGPS = useMemo(
    () => photos.filter((p) => p.lat !== null && p.lng !== null),
    [photos]
  );

  // 🆕 2026-07-26 marker 分頁: 用 cluster 數量分頁
  const [markerPage, setMarkerPage] = useState(0);
  useEffect(() => {
    setMarkerPage(0);
  }, [photos, photosWithGPS]);

  const maxClusterCount = useMemo(() => {
    return buildClusters(photosWithGPS, 5).length;
  }, [photosWithGPS]);

  const totalMarkerPages = Math.ceil(maxClusterCount / MARKER_PAGE_SIZE);
  const hasMarkerPaging = maxClusterCount > MARKER_PAGE_SIZE;
  const visibleForMarkers = useMemo(() => {
    if (!hasMarkerPaging) return photosWithGPS;
    const start = markerPage * MARKER_PAGE_SIZE;
    return photosWithGPS.slice(start, start + MARKER_PAGE_SIZE);
  }, [photosWithGPS, markerPage, hasMarkerPaging]);

  const center: [number, number] =
    photosWithGPS.length > 0
      ? [
          photosWithGPS.reduce((s, p) => s + (p.lat ?? 0), 0) /
            photosWithGPS.length,
          photosWithGPS.reduce((s, p) => s + (p.lng ?? 0), 0) /
            photosWithGPS.length,
        ]
      : [30.25, 120.15];

  // 🆕 2026-07-26 SSR guard: SSR 時不渲染 MapContainer (避免 window is not defined)
  if (!isClient) {
    return (
      <div ref={mapWrapperRef} className="mt-3 h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center text-stone-400">
        🗺️ 時空軸地圖 (客戶端載入中…)
      </div>
    );
  }

  if (photosWithGPS.length === 0) {
    return (
      <div className="mt-3 bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl p-6 sm:p-8 text-center">
        <div className="text-4xl sm:text-5xl mb-2">🗺️</div>
        <div className="text-sm text-stone-500">
          當前篩選條件下沒有 GPS 標記的照片。
          {allPhotos.filter((p) => p.lat !== null).length > 0
            ? "試試切換 Day 或取消時段/團員篩選。"
            : "請確認 exiftool 匯出 CSV 有包含 GPS 座標。"}
        </div>
      </div>
    );
  }

  return (
    <div ref={mapWrapperRef} className="mt-3 h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-stone-200">
      <MapContainer
        key={reactId}
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds photos={visibleForMarkers} />
        <ClusterLayer photos={visibleForMarkers} onMarkerClick={onMarkerClick} />
      </MapContainer>

      {/* Legend + 翻頁 */}
      <div className="mt-2 text-xs text-stone-500 flex flex-wrap gap-2 items-center">
        <span className="font-semibold">圖例:</span>
        {Object.entries(DAY_COLOR).map(([day, color]) => (
          <span key={day} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: color }}
            />
            <span>D{day}</span>
          </span>
        ))}
        {hasMarkerPaging && (
          <span className="ml-2 inline-flex items-center gap-1.5 bg-stone-100 rounded-full px-2 py-0.5">
            <button
              onClick={() => setMarkerPage((p) => Math.max(0, p - 1))}
              disabled={markerPage === 0}
              className="px-2 py-0.5 text-xs rounded hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="上一頁"
            >
              ←
            </button>
            <span className="text-xs text-stone-700 font-semibold">
              頁 {markerPage + 1} / {totalMarkerPages}
            </span>
            <button
              onClick={() => setMarkerPage((p) => Math.min(totalMarkerPages - 1, p + 1))}
              disabled={markerPage >= totalMarkerPages - 1}
              className="px-2 py-0.5 text-xs rounded hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="下一頁"
            >
              →
            </button>
            <span className="text-xs text-stone-500 ml-1">
              (共 {maxClusterCount} 個 marker)
            </span>
          </span>
        )}
        {selectedDay !== "all" && !hasMarkerPaging && (
          <span className="ml-2 text-red-600">
            (當前顯示 D{selectedDay} 共 {photosWithGPS.length} 個 GPS 點)
          </span>
        )}
      </div>
    </div>
  );
}