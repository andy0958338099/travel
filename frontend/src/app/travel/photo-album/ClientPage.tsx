"use client";

/**
 * /travel/photo-album — 旅程照片集完整版
 *
 * 2026-07-26 聖上拍板 §一~三 完整版:
 *   1. 讀 EXIF 拍攝時間 + GPS, 嚴禁壓縮/刪除/篡改
 *   2. 雙層排序: 第一層 EXIF 時空軸, 第二層 點讚×0.7 + 瀏覽×0.3
 *   3. 全員可上傳/瀏覽/點讚/下載原圖, 只收本次旅行素材 (day 1-8)
 *
 * 資料流:
 *   Google Photos iframe (看圖) + Google Drive (原檔 EXIF 保留)
 *     → 聖上 exiftool 匯出 CSV → scripts/import-photos-from-csv.mjs
 *     → Supabase travel_photo_meta → 這頁從 Supabase 拉 metadata 顯示
 *
 * 5 個新區塊:
 *   B. 🗺️ EXIF 時空軸地圖 (leaflet + day 顏色 marker)
 *   C. 📊 互動統計排行 (top 10 rank = likes×0.7 + views×0.3)
 *   D. 👥 13 位團員 filter chip
 *   E. ⏱️ 時間軸 slider (D1-D8 × 凌晨/上午/中午/下午/晚上)
 *   F. 🛡️ EXIF 完整性規範
 */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/GlobalToastHost";
import GallerySection from "./GallerySection";
import {
  fetchAllPhotos,
  fetchTopRankedPhotos,
  fetchPhotosByUploader,
  fetchPhotosByTimeSlot,
  fetchLikedPhotoIds,
  toggleLike,
  recordView,
  TEAM_MEMBERS,
  type TravelPhoto,
  type TeamMember,
  DAY_TITLES,
  DAY_RANGES,
  HOUR_BUCKETS,
  DAY_COLOR,
} from "@/utils/travelPhotos";

// 🆕 2026-07-26 聖上拍板: 用 next/dynamic + ssr:false 載 ExifMap
//   - 原因: SSR prerender 時 leaflet / react-leaflet 內部 reference window
//   - 聖上之前報 "Map container is being reused" 的 leaflet race 已透過
//     ClientPage 條件式渲染 (filteredPhotos.length === 0 ? 不渲染地圖) 避開
const DynamicMap = dynamic(() => import("./ExifMap").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-stone-100 rounded-xl flex items-center justify-center text-stone-500">
      🗺️ 時空軸地圖載入中…
    </div>
  ),
});

// ── Google 相簿 URL ─────────────────────────────────────────────────────────
const ALBUM_URL =
  "https://photos.google.com/share/AF1QipNtGu6ZAce_6W_BKFOs9LOcWozrGOGIuYJcIswiZYCwosGHtK1JU-1R7eMHqzvA8w?key=eDhUSF94N3RYNE1qdURTakdTbDVKZE1wUVJQSmZn";
const SHORT_URL = "https://photos.app.goo.gl/jPL9tjmkFsewqZGHA";
const COVER_IMAGE =
  "https://lh3.googleusercontent.com/pw/AP1GczOrI2KER8GzgR6_K-eaUZxzx-uMEYRiwUC0kxeMugQTtIRpc9K8J9rLR50fLbED_DmmiGoxdNLgggTVl83XVr_NeiukObeqY5UuKXog33J5dbAafIw=w1200-h630-p-k";

export default function PhotoAlbumPage() {
  const [allPhotos, setAllPhotos] = useState<TravelPhoto[]>([]);
  const [topRanked, setTopRanked] = useState<TravelPhoto[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  // 🆕 2026-07-26 預設選 D1 (避免 fitBounds 把所有 day marker 疊在一起)
  const [selectedDay, setSelectedDay] = useState<number | "all">(1);
  const [selectedBucket, setSelectedBucket] = useState<string>("all");
  const [selectedUploader, setSelectedUploader] = useState<
    TeamMember | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  // 🆕 2026-07-26 當前地圖點選的 cluster (給 GallerySection 顯示 8 張大圖)
  const [selectedClusterPhotos, setSelectedClusterPhotos] = useState<
    TravelPhoto[] | null
  >(null);

  // ── Initial load: 全部 + top 10 + 已讚清單 ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [all, top, liked] = await Promise.all([
        fetchAllPhotos(),
        fetchTopRankedPhotos(10),
        fetchLikedPhotoIds(),
      ]);
      if (cancelled) return;
      setAllPhotos(all);
      setTopRanked(top);
      setLikedIds(liked);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 計算目前顯示的照片(過濾後) ─────────────────────────────────────────
  const filteredPhotos = useMemo(() => {
    if (allPhotos.length === 0) return [];
    return allPhotos.filter((p) => {
      if (selectedDay !== "all" && p.day !== selectedDay) return false;
      if (selectedUploader !== "all" && p.uploader_name !== selectedUploader)
        return false;
      if (selectedBucket !== "all") {
        const bucket = HOUR_BUCKETS.find((b) => b.label === selectedBucket);
        if (bucket && (p.hour < bucket.range[0] || p.hour > bucket.range[1]))
          return false;
      }
      return true;
    });
  }, [allPhotos, selectedDay, selectedBucket, selectedUploader]);

  // 🆕 2026-07-26 當 chip 改 filter, 自動把整個 filteredPhotos 餵給 GallerySection
  // (GallerySection 內部 PAGE_SIZE=8 自動分頁, 不要在這裡 slice)
  useEffect(() => {
    setSelectedClusterPhotos(filteredPhotos.length > 0 ? filteredPhotos : null);
  }, [filteredPhotos]);

  // ── 統計 ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const photosWithGPS = allPhotos.filter((p) => p.lat !== null).length;
    const totalLikes = allPhotos.reduce((sum, p) => sum + p.likes_count, 0);
    const totalViews = allPhotos.reduce((sum, p) => sum + p.views_count, 0);
    const uploaderSet = new Set(
      allPhotos.map((p) => p.uploader_name).filter(Boolean)
    );
    return {
      total: allPhotos.length,
      withGPS: photosWithGPS,
      uploaders: uploaderSet.size,
      totalLikes,
      totalViews,
    };
  }, [allPhotos]);

  // ── 按讚 handler ────────────────────────────────────────────────────────
  async function handleToggleLike(photoId: string) {
    const { liked, likesCount } = await toggleLike(photoId);
    // 樂觀更新本地 state
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
    setAllPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, likes_count: likesCount } : p))
    );
    setTopRanked((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, likes_count: likesCount } : p))
    );
  }

  function copyShareLink() {
    navigator.clipboard
      .writeText(SHORT_URL)
      .then(() => toast.success("已複製相簿短網址"))
      .catch(() => toast.error("複製失敗,請手動選取"));
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero — 🆕 2026-07-26 聖上拍板: 縮成一小列 (原本 Hero 太大) */}
      <div className="bg-gradient-to-r from-amber-100 via-stone-50 to-rose-100 border-b-2 border-amber-300/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-stone-900 font-serif whitespace-nowrap">
              📷 旅程照片集
              <span className="ml-2 text-xs sm:text-sm font-normal text-stone-600">
                杭州 8 日 · EXIF 完整保留 · {stats.total > 0 && `${stats.total} 張`}
              </span>
            </h1>
            {stats.total > 0 && (
              <span className="text-xs text-stone-500 whitespace-nowrap">
                {stats.total} 張 · ❤️ {stats.totalLikes} · 👁️ {stats.totalViews}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ── A. Google Photos iframe + cover ─────────────────────────── */}
        <GooglePhotosSection
          iframeLoaded={loading ? false : true}
          coverImage={COVER_IMAGE}
          albumUrl={ALBUM_URL}
          shortUrl={SHORT_URL}
          onCopy={copyShareLink}
        />

        {/* 🆕 2026-07-26 第 1 個位置 (原本第 2 個) */}
        {/* ── A. ⏱️ 時空軸篩選 (filter bar) ────────────────────────── */}
        {/* 🆕 2026-07-26 移到第二個位置 (地圖後, 排行前) */}

        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-vermilion)]">
          <SectionHeader
            emoji="⏱️"
            label="時空軸篩選"
            subtitle="按 Day / 時段 / 團員 多維度過濾"
            colorClass="bg-[var(--jn-vermilion)]"
          />

          {/* Day selector */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-stone-600 mb-1.5">
              📅 日期 (Day)
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <FilterChip
                active={selectedDay === "all"}
                onClick={() => setSelectedDay("all")}
                label="全部 8 天"
                color="#1e293b"
              />
              {DAY_TITLES.map((title, i) => (
                <FilterChip
                  key={i + 1}
                  active={selectedDay === i + 1}
                  onClick={() => setSelectedDay(i + 1)}
                  label={title}
                  color={DAY_COLOR[i + 1]}
                />
              ))}
            </div>
          </div>

          {/* Hour bucket selector */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-stone-600 mb-1.5">
              🕐 時段 (Hour Bucket)
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <FilterChip
                active={selectedBucket === "all"}
                onClick={() => setSelectedBucket("all")}
                label="⏰ 全天"
                color="#1e293b"
              />
              {HOUR_BUCKETS.map((bucket) => (
                <FilterChip
                  key={bucket.label}
                  active={selectedBucket === bucket.label}
                  onClick={() => setSelectedBucket(bucket.label)}
                  label={`${bucket.label} (${bucket.range[0]}-${bucket.range[1]}時)`}
                  color="#0e7490"
                />
              ))}
            </div>
          </div>

          {/* Uploader selector */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-stone-600 mb-1.5">
              👥 團員 (Uploader)
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <FilterChip
                active={selectedUploader === "all"}
                onClick={() => setSelectedUploader("all")}
                label="👥 全員"
                color="#1e293b"
              />
              {TEAM_MEMBERS.map((member) => (
                <FilterChip
                  key={member}
                  active={selectedUploader === member}
                  onClick={() => setSelectedUploader(member)}
                  label={member}
                  color="#10b981"
                />
              ))}
            </div>
          </div>

          {/* Filter result — 🆕 2026-07-26 聖上拍板: 0 張不顯示 "0 / 297", 改顯示「沒人拍」友善提示 */}
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-600">
            {filteredPhotos.length === 0 ? (
              <span className="text-stone-500">
                📷 這個組合目前還沒人上傳照片
                {selectedDay !== "all" && ` · ${DAY_TITLES[selectedDay - 1]}`}
                {selectedBucket !== "all" && ` · ${selectedBucket}`}
                {selectedUploader !== "all" && ` · ${selectedUploader}`}
              </span>
            ) : filteredPhotos.length === allPhotos.length ? (
              <span>📊 共 {filteredPhotos.length} 張</span>
            ) : (
              <span>
                📊 篩選結果: {filteredPhotos.length} / {allPhotos.length} 張
                {selectedDay !== "all" && ` · ${DAY_TITLES[selectedDay - 1]}`}
                {selectedBucket !== "all" && ` · ${selectedBucket}`}
                {selectedUploader !== "all" && ` · ${selectedUploader}`}
              </span>
            )}
          </div>

          {/* 🆕 2026-07-26 GallerySection — 時空軸篩選下面, 顯示 8 張大圖 (不嵌在地圖裡) */}
          <div className="mt-4 pt-4 border-t border-stone-200">
            <GallerySection
              photos={selectedClusterPhotos}
              locationLabel={(() => {
                if (!selectedClusterPhotos || selectedClusterPhotos.length === 0) return undefined;
                // 優先: 第一張的 location_name
                const first = selectedClusterPhotos[0];
                if (first.location_name) return first.location_name;
                // fallback: 根據 filter 描述
                const parts: string[] = [];
                if (selectedDay !== "all") parts.push(`D${selectedDay}`);
                if (selectedBucket !== "all") parts.push(selectedBucket);
                if (selectedUploader !== "all") parts.push(selectedUploader);
                return parts.length > 0 ? parts.join(" · ") : `D${first.day}`;
              })()}
              emptyMessage={
                filteredPhotos.length === 0
                  ? `目前篩選條件 (${[
                      selectedDay !== "all" ? `D${selectedDay}` : null,
                      selectedBucket !== "all" ? selectedBucket : null,
                      selectedUploader !== "all" ? selectedUploader : null,
                    ]
                      .filter(Boolean)
                      .join(" + ") || "全部條件"}) 沒有照片`
                  : undefined
              }
            />
          </div>
        </section>

        {/* 🆕 2026-07-26 第 2 個位置 (原本第 1 個) */}
        {/* ── B. 🗺️ EXIF 時空軸地圖 ────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-blue)]">
          <SectionHeader
            emoji="🗺️"
            label="EXIF 時空軸地圖"
            subtitle={`GPS 標記每張照片的拍攝地點 · 聖旨規則 §一 第 1 條: 讀 GPS 自動排序`}
            colorClass="bg-[var(--jn-blue)]"
            extra={
              stats.total > 0 ? (
                <span className="text-xs text-stone-500">
                  {stats.withGPS}/{stats.total} 張有 GPS 座標
                </span>
              ) : undefined
            }
          />
          {allPhotos.length === 0 ? (
            <EmptyState
              icon="🗺️"
              message={
                loading
                  ? "載入中…"
                  : "尚未匯入照片 EXIF。請聖上跑 exiftool 匯出 CSV,再執行 scripts/import-photos-from-csv.mjs 匯入 Supabase。"
              }
            />
          ) : filteredPhotos.length === 0 ? (
            // 🆕 2026-07-26 聖上拍板: 篩選後 0 張不顯示地圖 (避免 leaflet race + 給乾淨畫面)
            <div className="bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl p-6 sm:p-8 text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <div className="text-sm text-stone-600">
                目前篩選條件下沒有任何照片
              </div>
              <div className="text-xs text-stone-500 mt-2">
                試著切換其他 Day / 時段 / 團員,讓地圖有資料可顯示
              </div>
            </div>
          ) : (
            <DynamicMap
              key={`map-${filteredPhotos.length}`}
              photos={filteredPhotos}
              allPhotos={allPhotos}
              selectedDay={selectedDay}
              onMarkerClick={(photos) => {
                // 🆕 2026-07-26 設定當前 cluster photos 給 GallerySection
                if (photos.length > 0) {
                  setSelectedClusterPhotos(photos);
                  // 順便記錄 view 計數 (用第一張代表性)
                  recordView(photos[0].id);
                }
              }}
            />
          )}
        </section>



        {/* ── C. 📊 互動統計排行 (從第 3 個位置移到這) ─────────────── */}
        {/* ── C. 📊 互動統計排行 (從第 3 個位置移到這) ─────────────── */}
        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-gold)]">
          <SectionHeader
            emoji="📊"
            label="互動統計排行 (TOP 10)"
            subtitle={`聖旨規則 §二 第 2 條: 點讚權重 70% + 瀏覽權重 30% · rank = likes × 0.7 + views × 0.3`}
            colorClass="bg-[var(--jn-gold)]"
          />
          {topRanked.length === 0 ? (
            <EmptyState icon="🏆" message="還沒有照片上榜" />
          ) : (
            <ol className="space-y-2 sm:space-y-3 mt-3">
              {topRanked.map((photo, idx) => (
                <RankedItem
                  key={photo.id}
                  photo={photo}
                  rank={idx + 1}
                  liked={likedIds.has(photo.id)}
                  onToggleLike={() => handleToggleLike(photo.id)}
                />
              ))}
            </ol>
          )}
        </section>

        {/* 🆕 2026-07-26 第 1 個位置 (原本第 2 個) */}
        {/* ── A. ⏱️ 時空軸篩選 (filter bar) ────────────────────────── */}
        {/* 🆕 2026-07-26 移到第二個位置 (地圖後, 排行前) */}

        <ExifRulesSection />

        {/* ── G. 上傳指引 (How to contribute) ──────────────────────────── */}
        <UploadGuideSection />
      </div>
    </div>
  );
}

// ── 子元件 ──────────────────────────────────────────────────────────────────

function GooglePhotosSection({
  iframeLoaded,
  coverImage,
  albumUrl,
  shortUrl,
  onCopy,
}: {
  iframeLoaded: boolean;
  coverImage: string;
  albumUrl: string;
  shortUrl: string;
  onCopy: () => void;
}) {
  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-[var(--jn-vermilion)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="relative aspect-video md:aspect-auto md:min-h-[180px] bg-stone-200 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt="杭州共享相簿封面"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 sm:p-3">
            <div className="text-white text-xs sm:text-sm font-bold drop-shadow">
              杭州共享相簿 · Jul 17 – 25 📸
            </div>
            <div className="text-white/90 text-xs mt-0.5 hidden sm:block">
              Google Photos · 共用相簿 · 全員可上傳
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6 flex flex-col justify-center space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-2">
              📸 全員共享相簿 (Google Photos)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              這趟旅程的照片都自動彙整到聖上的 Google 相簿。
              <strong className="text-red-700">
                注意:Google Photos 會壓縮並刪除 EXIF
              </strong>
              ,本頁下方另有 EXIF 完整保留規範。
            </p>
          </div>
          <a
            href={albumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm sm:text-base font-bold rounded-xl hover:from-red-700 hover:to-rose-700 transition-all shadow-lg"
          >
            📸 開啟 Google 相簿
            <span className="text-xs opacity-90">(新分頁)</span>
          </a>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200"
            >
              📋 複製短網址
            </button>
            <a
              href={`https://line.me/R/msg/text/?${encodeURIComponent(
                `江南水鄉 8 日照片集 📸\n${shortUrl}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-green-50 hover:bg-green-100 text-green-800 rounded-lg border border-green-200"
            >
              💬 LINE 分享
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-200"
            >
              📘 FB 分享
            </a>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
            <Chip color="vermilion" emoji="🏮" label="Google Photos" />
            <Chip color="gold" emoji="📷" label="8 日真實照片" />
            <Chip color="blue" emoji="📱" label="手機友善" />
            <Chip color="ink" emoji="🛡️" label="EXIF 規範必讀" />
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? color : "white",
        color: active ? "white" : "#1e293b",
        borderColor: active ? color : "#e7e5e4",
      }}
      className="px-3 py-1.5 rounded-full text-xs sm:text-sm border-2 font-medium transition-all hover:scale-105"
    >
      {label}
    </button>
  );
}

function SectionHeader({
  emoji,
  label,
  subtitle,
  colorClass,
  extra,
}: {
  emoji: string;
  label: string;
  subtitle: string;
  colorClass: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4 mb-2">
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${colorClass} text-white flex items-center justify-center text-xl sm:text-2xl shadow-md flex-shrink-0`}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
          {label}
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-0.5">{subtitle}</p>
      </div>
      {extra && <div className="flex-shrink-0">{extra}</div>}
    </div>
  );
}

function RankedItem({
  photo,
  rank,
  liked,
  onToggleLike,
}: {
  photo: TravelPhoto;
  rank: number;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const rankColor =
    rank === 1
      ? "bg-amber-400 text-amber-900"
      : rank === 2
      ? "bg-stone-300 text-stone-800"
      : rank === 3
      ? "bg-orange-300 text-orange-900"
      : "bg-stone-100 text-stone-600";

  return (
    <li className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 ${rankColor} rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0`}
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm sm:text-base text-stone-900 truncate">
          {photo.filename}
        </div>
        <div className="text-xs text-stone-500 truncate">
          {DAY_TITLES[photo.day - 1]} ·{" "}
          {new Date(photo.datetime_original).toLocaleTimeString("zh-TW", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          {photo.uploader_name && <span>· 👤 {photo.uploader_name}</span>}{" "}
          {photo.location_name && <span>· 📍 {photo.location_name}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <span className="text-xs text-stone-500">
          ❤️ {photo.likes_count} · 👁️ {photo.views_count}
        </span>
        <button
          onClick={onToggleLike}
          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            liked
              ? "bg-red-100 text-red-700 border-2 border-red-300"
              : "bg-white text-stone-600 border border-stone-300 hover:bg-stone-100"
          }`}
        >
          {liked ? "❤️ 已讚" : "🤍 讚"}
        </button>
      </div>
    </li>
  );
}

function ExifRulesSection() {
  return (
    <section className="bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-vermilion)]">
      <div className="flex items-start gap-3 sm:gap-4 mb-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[var(--jn-vermilion)] text-white flex items-center justify-center text-xl sm:text-2xl shadow-md flex-shrink-0">
          🛡️
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 font-serif">
            EXIF 完整性規範 (必讀)
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 mt-0.5">
            聖旨規則 §一 第 1 條:系統讀取 EXIF 拍攝時間 + GPS,
            <strong className="text-red-700">
              嚴禁自動壓縮、刪除、篡改任何元資料
            </strong>
            ,團員必須上傳原始檔,禁止截圖、二次轉發壓縮檔。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4">
        {/* DO */}
        <div className="bg-white/80 rounded-lg p-3 sm:p-4 border border-emerald-200">
          <div className="font-bold text-emerald-800 mb-2 flex items-center gap-1">
            ✅ 必須這樣做
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700">
            <li>• 從手機相簿「直接選原始照片」上傳</li>
            <li>• iPhone 用「AirDrop → Mac → Google Drive」</li>
            <li>• 或 Google Photos App 自動備份上傳</li>
            <li>• 影片 (MP4/MOV) 請傳 Drive 保留完整 EXIF</li>
            <li>• 同一張照若多人想上傳,各自傳一份 (不同時間 metadata)</li>
          </ul>
        </div>

        {/* DON'T */}
        <div className="bg-white/80 rounded-lg p-3 sm:p-4 border border-red-200">
          <div className="font-bold text-red-800 mb-2 flex items-center gap-1">
            ❌ 禁止這樣做
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-stone-700">
            <li>• 禁止截圖 (會丟失 GPS + 時間)</li>
            <li>• 禁止 LINE 轉傳後再下載 (重新編碼 EXIF)</li>
            <li>• 禁止從 IG 限動下載 (EXIF 完全被剝)</li>
            <li>• 禁止從微信 / 微博 / 小紅書下載壓縮版</li>
            <li>• 禁止編輯修圖後再上傳 (覆蓋原始拍攝時間)</li>
          </ul>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 bg-amber-100 border border-amber-300 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm text-amber-900">
        💡 <strong>怎麼驗證原檔?</strong>{" "}
        Mac 終端機: <code className="bg-amber-200 px-1 rounded">exiftool IMG_4523.jpg</code>{" "}
        應能看到 <code>Date Time Original</code> + <code>GPS Position</code>。
        沒有 = 已被壓縮過。
      </div>
    </section>
  );
}

function UploadGuideSection() {
  return (
    <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-gold)]">
      <h2 className="text-lg sm:text-xl font-bold text-stone-900 mb-3 flex items-center gap-2">
        <span className="text-2xl">📲</span>
        <span>怎麼加入上傳照片？</span>
      </h2>
      <ol className="space-y-2.5 text-sm text-stone-700">
        {[
          "手機開啟 Google Photos App,點聖上分享的相簿連結",
          "加入「貢獻者」,即可從手機相機 / 既有相簿挑選照片上傳",
          "或開啟 Google Photos 「備份」→ 相簿自動彙整到這趟旅程",
          "影片直接上傳到 Google Drive「江南水鄉 2026-原檔備份」資料夾",
          "完成後聖上跑 exiftool + scripts/import-photos-from-csv.mjs 匯入 metadata",
          "所有人在這頁都能看到自己的照片 + 互動統計",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="bg-red-100 text-red-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-amber-900">
        💡 <strong>小提示</strong>:Google Photos 共享相簿貢獻者人數無上限,
        但「每人每天上傳 1,000 張 / 200 GB」,8 天行程綽綽有餘。
      </div>
    </section>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: string;
  message: string;
}) {
  return (
    <div className="mt-3 bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl p-6 sm:p-8 text-center">
      <div className="text-4xl sm:text-5xl mb-2">{icon}</div>
      <div className="text-sm text-stone-500">{message}</div>
    </div>
  );
}

// ── 江楠 5 色 chip ─────────────────────────────────────────────────────────
function Chip({
  color,
  emoji,
  label,
}: {
  color: "vermilion" | "gold" | "ink" | "blue";
  emoji: string;
  label: string;
}) {
  const colorClass = {
    vermilion: "bg-[var(--jn-vermilion)] text-white",
    gold: "bg-[var(--jn-gold)] text-stone-900",
    ink: "bg-[var(--jn-ink)] text-white",
    blue: "bg-[var(--jn-blue)] text-white",
  }[color];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}