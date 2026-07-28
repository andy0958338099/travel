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
 * 🆕 2026-07-27 簡化: 砍掉地圖 + 排行, 只留 3 個區塊
 *   A. ⏱️ 日期篩選 (filter bar)
 *   B. 🖼️ 相片集 (GallerySection, 4×4 grid, 16 張/頁)
 *   C. 🛡️ EXIF 完整性規範
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/GlobalToastHost";
import GallerySection from "./GallerySection";
import {
  fetchAllPhotos,
  fetchLikedPhotoIds,
  toggleLike,
  recordView,
  updatePhotoDay,
  deletePhoto,
  uploadPhotoFromFile,
  type TravelPhoto,
  DAY_TITLES,
  DAY_RANGES,
  DAY_COLOR,
} from "@/utils/travelPhotos";

// 🆕 2026-07-27 聖上拍板: 砍掉「時空軸地圖」+「互動統計排行」, 只留「相片集」
//   - 原 DynamicMap + ExifMap.tsx + 排行 section 全刪
//   - fetchTopRankedPhotos import 不再使用
//   - 整理: 頁面從 5 大區塊縮到 3 大區塊 (相簿封面 + 日期篩選 + 相片集)

// ── Google 相簿 URL ─────────────────────────────────────────────────────────
const ALBUM_URL =
  "https://photos.google.com/share/AF1QipNtGu6ZAce_6W_BKFOs9LOcWozrGOGIuYJcIswiZYCwosGHtK1JU-1R7eMHqzvA8w?key=eDhUSF94N3RYNE1qdURTakdTbDVKZE1wUVJQSmZn";
const SHORT_URL = "https://photos.app.goo.gl/jPL9tjmkFsewqZGHA";
const COVER_IMAGE =
  "https://lh3.googleusercontent.com/pw/AP1GczOrI2KER8GzgR6_K-eaUZxzx-uMEYRiwUC0kxeMugQTtIRpc9K8J9rLR50fLbED_DmmiGoxdNLgggTVl83XVr_NeiukObeqY5UuKXog33J5dbAafIw=w1200-h630-p-k";

export default function PhotoAlbumPage() {
  const [allPhotos, setAllPhotos] = useState<TravelPhoto[]>([]);
  // 🆕 2026-07-27 砍掉 topRanked state (排行已刪)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  // 🆕 2026-07-26 預設選 D1 (避免 fitBounds 把所有 day marker 疊在一起)
  const [selectedDay, setSelectedDay] = useState<number | "all">(1);
  // 🆕 2026-07-27 聖上拍板: 砍掉「時段 Hour Bucket」+「團員 Uploader」兩個 filter 維度
  //   - 只保留「日期 Day」一個維度,UX 簡化
  //   - 原 selectedBucket + selectedUploader state 刪除
  const [loading, setLoading] = useState(true);
  // 🆕 2026-07-27 當 day chip 切換, 自動把整個 filteredPhotos 餵給 GallerySection
  // (GallerySection 內部 PAGE_SIZE=12 自動分頁, 不要在這裡 slice)
  const [selectedClusterPhotos, setSelectedClusterPhotos] = useState<
    TravelPhoto[] | null
  >(null);
  // 🆕 2026-07-27 拖曳中: 記住正在拖的 photoId 跟目標 day, 給 chip 視覺反饋
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | "all" | "trash" | null>(null);
  // 🆕 2026-07-27 拖到 🗑️ 垃圾筒 → 確認 modal (危險操作)
  const [pendingDelete, setPendingDelete] = useState<{ photoId: string; filename: string } | null>(null);
  // 🆕 2026-07-27 上傳照片 drop zone: 拖檔案到本頁時的視覺反饋
  const [isUploadDragging, setIsUploadDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number; errors: string[] }>({ done: 0, total: 0, errors: [] });
  // 🆕 2026-07-27 本機路徑 import (server-side, 給路徑讓 server 讀 + 抽 EXIF)
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [isPathImporting, setIsPathImporting] = useState(false);
  const [pathResults, setPathResults] = useState<{ path: string; ok: boolean; day?: number; hour?: number; error?: string }[]>([]);

  // ── Initial load: 全部 + top 10 + 已讚清單 ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 🆕 2026-07-27 砍掉 fetchTopRankedPhotos, 不再需要 top 10 排行
      const [all, liked] = await Promise.all([
        fetchAllPhotos(),
        fetchLikedPhotoIds(),
      ]);
      if (cancelled) return;
      setAllPhotos(all);
      setLikedIds(liked);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 計算目前顯示的照片(過濾後) — 2026-07-27 砍掉時段/團員,只保留日期 ──
  const filteredPhotos = useMemo(() => {
    if (allPhotos.length === 0) return [];
    return allPhotos.filter((p) => {
      if (selectedDay !== "all" && p.day !== selectedDay) return false;
      return true;
    });
  }, [allPhotos, selectedDay]);

  // 🆕 2026-07-26 當 chip 改 filter, 自動把整個 filteredPhotos 餵給 GallerySection
  // (GallerySection 內部 PAGE_SIZE=16 自動分頁, 不要在這裡 slice)
  useEffect(() => {
    setSelectedClusterPhotos(filteredPhotos.length > 0 ? filteredPhotos : null);
  }, [filteredPhotos]);

  // ── 統計 (🆕 2026-07-27 砍掉 withGPS, 地圖已刪不需要) ─────────────────────
  const stats = useMemo(() => {
    const totalLikes = allPhotos.reduce((sum, p) => sum + p.likes_count, 0);
    const totalViews = allPhotos.reduce((sum, p) => sum + p.views_count, 0);
    const uploaderSet = new Set(
      allPhotos.map((p) => p.uploader_name).filter(Boolean)
    );
    return {
      total: allPhotos.length,
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
    // 🆕 2026-07-27 砍掉 setTopRanked (排行已刪)
  }

  function copyShareLink() {
    navigator.clipboard
      .writeText(SHORT_URL)
      .then(() => toast.success("已複製相簿短網址"))
      .catch(() => toast.error("複製失敗,請手動選取"));
  }

  // 🆕 2026-07-27 聖上拍板: 拖曳照片到 day chip 改分類
  //   - target day: 1-8 ("all" 不處理, 拖到「全部 8 天」不做事)
  //   - 樂觀更新: local allPhotos 立即改 day, API 失敗才 revert
  //   - Supabase PATCH: updatePhotoDay → travel_photo_meta.day
  // 🆕 2026-07-27 + "trash" 觸發 pendingDelete modal
  async function handleDropToDay(
    targetDay: number | "all" | "trash",
    photoId: string | null
  ) {
    // 拖到 🗑️ 垃圾筒 → 跳確認 modal (不直接刪)
    if (targetDay === "trash" && photoId) {
      const photo = allPhotos.find((p) => p.id === photoId);
      setPendingDelete({ photoId, filename: photo?.filename || photoId });
      setDraggingPhotoId(null);
      setDragOverDay(null);
      return;
    }
    if (targetDay === "all" || !photoId) {
      setDraggingPhotoId(null);
      setDragOverDay(null);
      return;
    }
    // 🆕 2026-07-27 TS narrow: 用 type guard 確認到這裡是 number
    if (typeof targetDay !== "number") {
      setDraggingPhotoId(null);
      setDragOverDay(null);
      return;
    }
    const newDay = targetDay;
    const prev = allPhotos.find((p) => p.id === photoId);
    if (!prev || prev.day === newDay) {
      setDraggingPhotoId(null);
      setDragOverDay(null);
      return;
    }
    // 樂觀更新
    setAllPhotos((all) =>
      all.map((p) => (p.id === photoId ? { ...p, day: newDay } : p))
    );
    setSelectedClusterPhotos((sel) =>
      sel ? sel.map((p) => (p.id === photoId ? { ...p, day: newDay } : p)) : sel
    );
    setDraggingPhotoId(null);
    setDragOverDay(null);
    // 寫 Supabase
    const result = await updatePhotoDay(photoId, newDay);
    if (!result.ok) {
      // revert
      setAllPhotos((all) =>
        all.map((p) => (p.id === photoId ? { ...p, day: prev.day } : p))
      );
      setSelectedClusterPhotos((sel) =>
        sel ? sel.map((p) => (p.id === photoId ? { ...p, day: prev.day } : p)) : sel
      );
      toast.error(`改 day 失敗: ${result.error}`);
    } else {
      toast.success(`已移到 D${newDay} · ${DAY_TITLES[newDay - 1]}`);
    }
  }

  // 🆕 2026-07-27 確認刪除 → DELETE from Supabase + 從 local state 拿掉
  async function handleDeleteConfirm() {
    if (!pendingDelete) return;
    const { photoId, filename } = pendingDelete;
    setPendingDelete(null);
    // 樂觀刪除 (從 local state 拿掉)
    setAllPhotos((all) => all.filter((p) => p.id !== photoId));
    setSelectedClusterPhotos((sel) => sel ? sel.filter((p) => p.id !== photoId) : sel);
    setDraggingPhotoId(null);
    setDragOverDay(null);
    const result = await deletePhoto(photoId);
    if (!result.ok) {
      // 失敗 — 不 revert (因為不知道原本資料細節, 重新 fetch 比較安全)
      toast.error(`刪除失敗: ${result.error} (請重新整理)`);
    } else {
      toast.success(`已永久刪除 ${filename}`);
    }
  }

  // 🆕 2026-07-27 聖上拍板: 從 Google 相簿下載原檔後, 拖到本頁 → client 端抽 EXIF → 上傳 + 寫 DB
  //   - 接受 HEIC / JPG / PNG (Google 原始下載)
  //   - 一次可拖多張
  //   - 進度條 + 錯誤訊息顯示
  async function handleFileUpload(files: FileList | File[], targetDay?: number) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsUploading(true);
    setUploadProgress({ done: 0, total: fileArray.length, errors: [] });
    let successCount = 0;
    const errors: string[] = [];
    for (const file of fileArray) {
      // 🆕 2026-07-28 聖上拍板: 拖檔案到 Day chip 時, targetDay 帶過來, EXIF 缺 fallback 用這個 day
      const result = await uploadPhotoFromFile(file, targetDay);
      if (result.ok) {
        successCount++;
        // 🆕 7-28: 統計用了 fallback day 的張數 (放進 errors 但 prefix 標記, 不算真錯誤)
        if (result.usedFallbackDay) {
          errors.push(`FALLBACK:${file.name}`);
        }
        // 加入 local state (讓相片集立刻顯示)
        if (result.photoId) {
          setAllPhotos((prev) => [
            ...prev,
            {
              id: result.photoId!,
              filename: result.filename!,
              day: result.day!,
              hour: result.hour!,
              google_drive_url: null,
              google_photos_thumb_url: null,
              datetime_original: "",
              lat: null,
              lng: null,
              location_name: null,
              uploader_id: null,
              uploader_name: null,
              caption: null,
              likes_count: 0,
              views_count: 0,
              rank_score: 0,
              created_at: new Date().toISOString(),
            } as TravelPhoto,
          ]);
        }
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
      setUploadProgress((p) => ({ ...p, done: p.done + 1, errors }));
    }
    setIsUploading(false);
    setIsUploadDragging(false);
    if (successCount > 0) {
      // 🆕 7-28: 統計多少張用了 fallback day (EXIF 缺)
      const fallbackCount = uploadProgress.errors.filter(e => e.startsWith("FALLBACK:")).length;
      const realSuccess = successCount;
      const dayHint = targetDay ? ` → D${targetDay} ${DAY_TITLES[targetDay - 1] || ""}` : "";
      const fallbackHint = fallbackCount > 0 ? ` (${fallbackCount} 張 EXIF 缺, 用 chip 選的 day)` : "";
      toast.success(`✅ 成功上傳 ${realSuccess} 張${dayHint}${fallbackHint}`);
    } else {
      toast.error(`上傳全部失敗, 請看 toast 訊息`);
    }
  }

  // 🆕 2026-07-27 聖上拍板: 給本機檔案路徑 → server 讀 + 抽 EXIF + 上傳 Supabase
  //   - localhost dev server 跑得通 (server 讀聖上 Mac 檔案)
  //   - 部署後失效 (Netlify serverless 讀不到 Mac)
  async function handlePathImport() {
    if (!pathInput.trim()) return;
    // 解析路徑: 一行一個, 支援逗號/分號/空白分隔
    const paths = pathInput
      .split(/[\n,;\s]+/)
      .map(p => p.trim().replace(/^["']|["']$/g, ""))  // 去引號
      .filter(p => p.length > 0);
    if (paths.length === 0) {
      toast.error("沒有有效的路徑");
      return;
    }
    if (paths.length > 50) {
      toast.error("一次最多 50 個檔案");
      return;
    }
    setIsPathImporting(true);
    setPathResults([]);
    try {
      const r = await fetch("/api/import-photo-from-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(`Server 失敗: ${data.error || r.statusText}`);
        setPathResults([]);
        return;
      }
      setPathResults(data.results || []);
      const success = (data.results || []).filter((r: any) => r.ok).length;
      const failed = (data.results || []).filter((r: any) => !r.ok).length;
      if (success > 0) {
        toast.success(`✅ 從本機匯入 ${success} 張${failed ? ` (${failed} 失敗)` : ""}`);
        // 把成功的加到 local state
        for (const r of (data.results || []).filter((x: any) => x.ok)) {
          setAllPhotos((prev) => [
            ...prev,
            {
              id: r.photoId || crypto.randomUUID(),
              filename: r.filename || r.path.split("/").pop() || "",
              day: r.day,
              hour: r.hour,
              google_drive_url: null,
              google_photos_thumb_url: r.publicUrl || null,
              datetime_original: "",
              lat: null,
              lng: null,
              location_name: null,
              uploader_id: null,
              uploader_name: null,
              caption: null,
              likes_count: 0,
              views_count: 0,
              rank_score: 0,
              created_at: new Date().toISOString(),
            } as TravelPhoto,
          ]);
        }
      } else if (failed > 0) {
        toast.error(`本機匯入 ${failed} 個全部失敗, 看下方結果`);
      }
    } catch (e: any) {
      toast.error(`本機匯入失敗: ${e.message}`);
    } finally {
      setIsPathImporting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-stone-50 relative"
      onDragEnter={(e) => {
        // 🆕 2026-07-27 區分兩種拖曳: 照片 → day chip (chip 接管) vs 檔案 → 上傳 (本 div 接管)
        //   拖 day chip: e.dataTransfer.types 不含 'Files'
        //   拖檔案 (從 desktop/其他瀏覽器分頁): e.dataTransfer.types 包含 'Files'
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsUploadDragging(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(e) => {
        // 只在離開整個 main div 時才清掉
        if (e.currentTarget === e.target) setIsUploadDragging(false);
      }}
      onDrop={async (e) => {
        if (e.dataTransfer.files.length > 0) {
          e.preventDefault();
          setIsUploadDragging(false);
          await handleFileUpload(e.dataTransfer.files);
        }
      }}
    >
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
        {/* 🆕 2026-07-28 聖上拍板: Google 相簿封面區塊搬到最下面 (原最上面) */}
        {/* ── A. ⏱️ 時空軸篩選 (filter bar) ────────────────────────── */}

        <section className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-vermilion)]">
          <SectionHeader
            emoji="⏱️"
            label="時空軸篩選"
            subtitle="按 Day 篩選 (8 天行程)"
            colorClass="bg-[var(--jn-vermilion)]"
          />

          {/* 🆕 2026-07-27 上傳提示: 拖 Google 相簿下載的原檔到本頁任何位置 */}
          <div className="mt-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
            💡 從 Google 相簿下載原檔後, <strong>拖到本頁任何空白處</strong> 自動上傳 + 從 EXIF 算 day
            (HEIC / JPG 都可以, 接受多張)
          </div>

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
                // 🆕 2026-07-27 拖曳支援
                day="all"
                isDragOver={dragOverDay === "all"}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverDay("all");
                }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const photoId = e.dataTransfer.getData("text/plain") || draggingPhotoId;
                  handleDropToDay("all", photoId);
                }}
              />
              {DAY_TITLES.map((title, i) => (
                <FilterChip
                  key={i + 1}
                  active={selectedDay === i + 1}
                  onClick={() => setSelectedDay(i + 1)}
                  label={title}
                  color={DAY_COLOR[i + 1]}
                  // 🆕 2026-07-27 拖曳支援
                  day={i + 1}
                  isDragOver={dragOverDay === i + 1}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setDragOverDay(i + 1);
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    // 🆕 2026-07-28 聖上拍板: 拖檔案到 chip → 上傳到該 day (EXIF 缺 fallback 用這個 day)
                    if (e.dataTransfer.files.length > 0) {
                      handleFileUpload(e.dataTransfer.files, i + 1);
                      return;
                    }
                    // 既有照片拖到 chip → 改 day
                    const photoId = e.dataTransfer.getData("text/plain") || draggingPhotoId;
                    handleDropToDay(i + 1, photoId);
                  }}
                />
              ))}
              {/* 🆕 2026-07-27 聖上拍板: 🗑️ 垃圾筒 — 拖到這裡 = 刪除確認 */}
              <FilterChip
                key="trash"
                active={false}
                onClick={() => {}}  // 不能點, 只能拖入
                label="🗑️ 垃圾筒"
                color="#dc2626"
                day="trash"
                isDragOver={dragOverDay === "trash"}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverDay("trash");
                }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const photoId = e.dataTransfer.getData("text/plain") || draggingPhotoId;
                  handleDropToDay("trash", photoId);
                }}
                isTrash
              />
              {/* 🆕 2026-07-27 聖上拍板: 📤 上傳區 — 拖到這裡 OR 點擊都開 file picker */}
              <FilterChip
                key="upload"
                active={false}
                onClick={() => {
                  // 開隱藏 file input
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*,.heic,.jpg,.jpeg,.png,.mov";
                  input.multiple = true;
                  input.onchange = () => {
                    if (input.files && input.files.length > 0) {
                      handleFileUpload(input.files);
                    }
                  };
                  input.click();
                }}
                label="📤 上傳"
                color="#0e7490"
                day="upload"
                isDragOver={isUploadDragging}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("Files")) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    setIsUploadDragging(true);
                  }
                }}
                onDragLeave={() => setIsUploadDragging(false)}
                onDrop={(e) => {
                  if (e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    setIsUploadDragging(false);
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
                isUpload
              />
              {/* 🆕 2026-07-27 聖上拍板: 📁 本機路徑 — 點開 modal 貼聖上 Mac 檔案路徑, server 讀 + 抽 EXIF */}
              <FilterChip
                key="path"
                active={false}
                onClick={() => setIsPathModalOpen(true)}
                label="📁 本機"
                color="#7c3aed"
                day="path"
                isDragOver={false}
                isPath
              />
            </div>
          </div>

          {/* 🆕 2026-07-27 砍掉時段/團員 2 個 filter chip 區塊 (只留日期) */}

          {/* Filter result — 🆕 2026-07-26 聖上拍板: 0 張不顯示 "0 / 297", 改顯示「沒人拍」友善提示 */}
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-600">
            {filteredPhotos.length === 0 ? (
              <span className="text-stone-500">
                📷 這天目前還沒人上傳照片
                {selectedDay !== "all" && ` · ${DAY_TITLES[selectedDay - 1]}`}
              </span>
            ) : filteredPhotos.length === allPhotos.length ? (
              <span>📊 共 {filteredPhotos.length} 張</span>
            ) : (
              <span>
                📊 {selectedDay !== "all" ? DAY_TITLES[selectedDay - 1] : "全部"}
                · {filteredPhotos.length} 張
              </span>
            )}
          </div>

          {/* 🆕 2026-07-26 GallerySection — 時空軸篩選下面, 顯示 8 張大圖 (不嵌在地圖裡) */}
          {/* 🆕 2026-07-28 聖上拍板: locationLabel 優先用「day 標題」(D3 西塘→烏鎮東柵) */}
          {/*   - 原因: chip 是按 day 篩選, 不是按 location; 跨 location 的 day 不該用第一張的 location */}
          {/*   - 例: D3 含 119 西塘 + 5 上海 + 139 無GPS, 標題應該是「D3 西塘→烏鎮東柵」 */}
          <div className="mt-4 pt-4 border-t border-stone-200">
            <GallerySection
              photos={selectedClusterPhotos}
              onPhotoDragStart={(photoId) => setDraggingPhotoId(photoId)}
              filterKey={String(selectedDay)}
              locationLabel={(() => {
                if (!selectedClusterPhotos || selectedClusterPhotos.length === 0) return undefined;
                // 🆕 7-28: chip 篩選時, 優先顯示 day 標題 (D3 西塘→烏鎮東柵)
                //   DAY_TITLES 已含 "D3" 前綴, 不要重複加
                if (typeof selectedDay === "number") {
                  return DAY_TITLES[selectedDay - 1];
                }
                // 「全部 8 天」時, 用第一張照片的 location (當下位置感)
                const first = selectedClusterPhotos[0];
                if (first.location_name) return first.location_name;
                return DAY_TITLES[first.day - 1] || `D${first.day}`;
              })()}
              emptyMessage={
                filteredPhotos.length === 0
                  ? `目前篩選條件 (${
                      selectedDay !== "all" ? `D${selectedDay} ${DAY_TITLES[selectedDay - 1]}` : "全部 8 天"
                    }) 沒有照片`
                  : undefined
              }
            />
          </div>
        </section>

        {/* ── A. ⏱️ 日期篩選 (filter bar) ────────────────────────── */}

        {/* 🆕 2026-07-27 砍掉 EXIF 完整性規範 + 上傳指引, 直接不 render */}

        {/* ── C. Google Photos iframe + cover (搬到底部) ─────────────────── */}
        <GooglePhotosSection
          iframeLoaded={loading ? false : true}
          coverImage={COVER_IMAGE}
          albumUrl={ALBUM_URL}
          shortUrl={SHORT_URL}
          onCopy={copyShareLink}
        />
      </div>

      {/* 🆕 2026-07-27 上傳照片 drop overlay (拖檔案到本頁時顯示) */}
      {isUploadDragging && !isUploading && (
        <div className="fixed inset-0 z-40 bg-amber-500/30 border-4 border-dashed border-amber-600 pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 text-center">
            <div className="text-6xl mb-2">📤</div>
            <div className="text-xl font-bold text-amber-900">鬆手上傳</div>
            <div className="text-sm text-amber-700 mt-1">從 Google 相簿下載的原檔 (HEIC / JPG)</div>
          </div>
        </div>
      )}

      {/* 🆕 2026-07-27 上傳中進度條 */}
      {isUploading && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl px-6 py-4 w-96 max-w-[90vw]">
          <div className="text-sm font-bold text-stone-800 mb-2 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>上傳中... {uploadProgress.done} / {uploadProgress.total}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[var(--jn-vermilion)] h-2 transition-all"
              style={{
                width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
          {uploadProgress.errors.length > 0 && (
            <details className="mt-2 text-xs text-red-700">
              <summary className="cursor-pointer">
                ⚠️ {uploadProgress.errors.length} 個錯誤 (點開看)
              </summary>
              <ul className="mt-1 list-disc list-inside max-h-32 overflow-y-auto">
                {uploadProgress.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* 🆕 2026-07-27 本機路徑 import modal (點 📁 本機 chip 開) */}
      {isPathModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => !isPathImporting && setIsPathModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">
                📁
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-stone-900">從本機路徑匯入</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  貼聖上 Mac 檔案路徑 (每行一個), server 讀 + 抽 EXIF + 上傳 Supabase
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-xs text-amber-900">
              ⚠️ 只在 localhost dev server 跑得通, 部署到 Netlify 後失效
              <br />
              範例: <code className="bg-amber-100 px-1 rounded">/Users/brian/Downloads/杭州共享相簿/IMG_1217.HEIC</code>
            </div>
            <textarea
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              placeholder="/Users/brian/Downloads/杭州共享相簿/IMG_1217.HEIC
/Users/brian/Downloads/杭州共享相簿/IMG_1218.HEIC
/Users/brian/Downloads/杭州共享相簿/IMG_1220.HEIC"
              rows={6}
              disabled={isPathImporting}
              className="w-full border border-stone-300 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-purple-500 disabled:bg-stone-100"
            />
            {pathResults.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto border border-stone-200 rounded-lg">
                {pathResults.map((r, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 text-xs flex items-center gap-2 ${
                      r.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                    } ${i > 0 ? "border-t border-stone-200" : ""}`}
                  >
                    <span>{r.ok ? "✅" : "❌"}</span>
                    <span className="font-mono truncate flex-1">{r.path}</span>
                    <span className="flex-shrink-0">
                      {r.ok ? `D${r.day} H${r.hour?.toString().padStart(2, "0")}` : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => {
                  setIsPathModalOpen(false);
                  setPathInput("");
                  setPathResults([]);
                }}
                disabled={isPathImporting}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium disabled:opacity-50"
              >
                關閉
              </button>
              <button
                onClick={handlePathImport}
                disabled={isPathImporting || !pathInput.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold flex items-center gap-1 disabled:opacity-50"
              >
                {isPathImporting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>處理中...</span>
                  </>
                ) : (
                  <>
                    <span>📁</span>
                    <span>匯入</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 2026-07-27 刪除確認 modal (拖到 🗑️ 垃圾筒後跳出) */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-stone-900">永久刪除照片?</h3>
                <p className="text-xs text-stone-500 mt-0.5">此操作無法復原</p>
              </div>
            </div>
            <div className="bg-stone-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-mono text-stone-800 break-all">
                {pendingDelete.filename}
              </div>
            </div>
            <p className="text-sm text-stone-600 mb-5">
              從 Supabase <code className="bg-stone-100 px-1 rounded">travel_photo_meta</code> 永久刪除此筆 EXIF metadata。
              Google Photos 上的原圖不會受影響,但本頁的「相片集」會立刻看不到這張。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-1"
              >
                <span>🗑️</span>
                <span>確認永久刪除</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
  // 🆕 2026-07-27 拖曳支援
  day,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  isTrash,  // 🆕 2026-07-27 🗑️ 垃圾筒 chip 樣式 (紅色 + cursor-not-allowed)
  isUpload, // 🆕 2026-07-27 📤 上傳 chip 樣式 (青色 + dashed border)
  isPath,   // 🆕 2026-07-27 📁 本機路徑 chip 樣式 (紫色 + dashed border)
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: string;
  day?: number | "all" | "trash" | "upload" | "path";
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isTrash?: boolean;
  isUpload?: boolean;
  isPath?: boolean;
}) {
  // 🆕 2026-07-27 拖曳高亮: 朱紅色 + scale 110% (chip 變大表示「準備接收」)
  // 🆕 2026-07-27 垃圾筒拖曳高亮: 深紅色 + scale 115% (危險感更強)
  // 🆕 2026-07-27 上傳 chip 拖曳高亮: 青色 + scale 115% (跟藍色主題一致)
  const dragStyle = isDragOver
    ? isTrash
      ? {
          backgroundColor: "#7f1d1d",
          color: "white",
          borderColor: "#7f1d1d",
          transform: "scale(1.15)",
          boxShadow: "0 0 0 6px rgba(220,38,38,0.3)",
        }
      : isUpload
      ? {
          backgroundColor: "var(--jn-blue)",
          color: "white",
          borderColor: "var(--jn-blue)",
          transform: "scale(1.15)",
          boxShadow: "0 0 0 6px rgba(14,116,144,0.3)",
        }
      : {
          backgroundColor: "var(--jn-vermilion)",
          color: "white",
          borderColor: "var(--jn-vermilion)",
          transform: "scale(1.1)",
          boxShadow: "0 0 0 4px rgba(220,38,38,0.2)",
        }
    : isTrash
    ? {
        backgroundColor: "white",
        color: "#dc2626",
        borderColor: "#dc2626",
        borderStyle: "dashed",
      }
    : isUpload
    ? {
        backgroundColor: "white",
        color: "var(--jn-blue)",
        borderColor: "var(--jn-blue)",
        borderStyle: "dashed",
      }
    : isPath
    ? {
        backgroundColor: "white",
        color: "#7c3aed",
        borderColor: "#7c3aed",
        borderStyle: "dashed",
      }
    : {
        backgroundColor: active ? color : "white",
        color: active ? "white" : "#1e293b",
        borderColor: active ? color : "#e7e5e4",
      };
  return (
    <button
      onClick={isTrash ? undefined : onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={dragStyle}
      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border-2 font-medium transition-all ${
        isTrash ? "cursor-not-allowed" : isUpload || isPath ? "cursor-pointer hover:scale-105" : "hover:scale-105"
      }`}
    >
      {label}
      {isDragOver && <span className="ml-1">📥</span>}
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
  // 🆕 2026-07-27 聖上拍板: 刪除 EXIF 完整性規範整段, 不顯示
  return null;
}

function UploadGuideSection() {
  // 🆕 2026-07-27 聖上拍板: 刪除「怎麼加入上傳照片」整段, 不顯示
  return null;
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