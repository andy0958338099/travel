/**
 * Travel Photos — Supabase 客戶端
 *
 * 2026-07-26 聖旨 §一~三 規則:
 *   - 讀 EXIF 拍攝時間 + GPS, 嚴禁壓縮/刪除/篡改
 *   - 雙層排序: 第一層 EXIF 時空軸, 第二層點讚×0.7 + 瀏覽×0.3
 *   - 全員可上傳/瀏覽/點讚, 只收本次旅行素材 (day 1-8)
 *
 * 資料流:
 *   Google Photos (看圖) + Google Drive (原檔 EXIF 保留)
 *     → 聖上 exiftool 匯出 CSV → scripts/import-photos-from-csv.mjs
 *     → Supabase travel_photo_meta table → 這頁拉資料顯示
 *
 * Schema (聖上在 Supabase 後台跑 SQL 建表):
 *   travel_photo_meta    主表
 *   travel_photo_likes   按讚
 *   travel_photo_views   瀏覽計數
 *
 * RLS: 全部 anon read/insert/update/delete (見 page 完工報告 SQL)
 */

import { createClient } from "@/utils/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────
export interface TravelPhoto {
  id: string;
  filename: string;
  google_drive_url: string | null;
  google_photos_thumb_url: string | null;
  day: number; // 1-8
  hour: number; // 0-23
  datetime_original: string; // ISO
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  uploader_id: string | null;
  uploader_name: string | null;
  caption: string | null;
  likes_count: number;
  views_count: number;
  rank_score: number; // GENERATED column: likes * 0.7 + views * 0.3
  created_at: string;
}

// 13 位團員 + Brian/Mana (從 vlog data.ts / planner 共用)
export const TEAM_MEMBERS = [
  "Brian",
  "Mana",
  "阿喜",
  "黃阿分",
  "阿美",
  "阿評",
  "吳董",
  "黃倩",
  "大宇",
  "小宇",
  "宸瑋",
  "恩齊",
  "阿橋",
  "阿茹",
  "阿伸",
] as const;
export type TeamMember = (typeof TEAM_MEMBERS)[number];

// ── Fingerprint (沿用 gufeng-zhenren pattern) ───────────────────────────────
const FP_KEY = "travel-photo-fingerprint";
export function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(FP_KEY);
  if (!fp) {
    fp =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

// ── 1. 讀取所有照片(時空軸排序) ───────────────────────────────────────────
export async function fetchAllPhotos(): Promise<TravelPhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("travel_photo_meta")
    .select("*")
    // 第一層排序: EXIF 時空軸 (day ASC → datetime_original ASC)
    .order("day", { ascending: true })
    .order("datetime_original", { ascending: true });
  if (error) {
    console.error("[travelPhotos] fetchAllPhotos error:", error.message);
    return [];
  }
  return (data ?? []) as TravelPhoto[];
}

// ── 2. 讀取 top 互動排行(第二層排序: rank_score) ─────────────────────────
export async function fetchTopRankedPhotos(limit = 10): Promise<TravelPhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("travel_photo_meta")
    .select("*")
    // 第二層排序: 同時段內按 rank 分 (likes×0.7 + views×0.3)
    .order("rank_score", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[travelPhotos] fetchTopRankedPhotos error:", error.message);
    return [];
  }
  return (data ?? []) as TravelPhoto[];
}

// ── 3. 篩選: 單一團員拍的照片 ─────────────────────────────────────────────
export async function fetchPhotosByUploader(
  uploader: TeamMember
): Promise<TravelPhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("travel_photo_meta")
    .select("*")
    .eq("uploader_name", uploader)
    .order("datetime_original", { ascending: true });
  if (error) {
    console.error("[travelPhotos] fetchPhotosByUploader error:", error.message);
    return [];
  }
  return (data ?? []) as TravelPhoto[];
}

// ── 4. 篩選: 某天某時段 ────────────────────────────────────────────────────
export async function fetchPhotosByTimeSlot(
  day: number,
  hourStart: number,
  hourEnd: number
): Promise<TravelPhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("travel_photo_meta")
    .select("*")
    .eq("day", day)
    .gte("hour", hourStart)
    .lte("hour", hourEnd)
    .order("datetime_original", { ascending: true });
  if (error) {
    console.error("[travelPhotos] fetchPhotosByTimeSlot error:", error.message);
    return [];
  }
  return (data ?? []) as TravelPhoto[];
}

// ── 5. 按讚(1 人 1 張只能 +1) ─────────────────────────────────────────────
// 用 fetch 取代 RPC, 避免 Supabase 函數依賴 (聖上只要建 3 個 table 就能跑)
async function bumpLikesCount(photoId: string, delta: number): Promise<number> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("travel_photo_meta")
    .select("likes_count")
    .eq("id", photoId)
    .single();
  const newCount = Math.max(0, (row?.likes_count ?? 0) + delta);
  await supabase
    .from("travel_photo_meta")
    .update({ likes_count: newCount })
    .eq("id", photoId);
  return newCount;
}

export async function toggleLike(photoId: string): Promise<{
  liked: boolean;
  likesCount: number;
}> {
  const supabase = createClient();
  const fp = getOrCreateFingerprint();

  // 查是否已讚
  const { data: existing } = await supabase
    .from("travel_photo_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("user_fingerprint", fp)
    .maybeSingle();

  if (existing) {
    // 已讚 → 取消
    await supabase.from("travel_photo_likes").delete().eq("id", existing.id);
    const likesCount = await bumpLikesCount(photoId, -1);
    return { liked: false, likesCount };
  }

  // 沒讚 → 加
  await supabase
    .from("travel_photo_likes")
    .insert({ photo_id: photoId, user_fingerprint: fp });
  const likesCount = await bumpLikesCount(photoId, +1);
  return { liked: true, likesCount };
}

// ── 6. 瀏覽計數(+1, 同一 photo_id × fp 1 分鐘內只算 1 次) ───────────────
async function bumpViewsCount(photoId: string): Promise<void> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("travel_photo_meta")
    .select("views_count")
    .eq("id", photoId)
    .single();
  const newCount = (row?.views_count ?? 0) + 1;
  await supabase
    .from("travel_photo_meta")
    .update({ views_count: newCount })
    .eq("id", photoId);
}

export async function recordView(photoId: string): Promise<void> {
  const supabase = createClient();
  const fp = getOrCreateFingerprint();

  // 用 recent record 判定是否短時間內已記 (1 分鐘內同 fp 同 photo_id)
  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("travel_photo_views")
    .select("id")
    .eq("photo_id", photoId)
    .eq("user_fingerprint", fp)
    .gte("viewed_at", oneMinAgo)
    .maybeSingle();

  if (existing) return; // 1 分鐘內已記過, 跳過

  await supabase
    .from("travel_photo_views")
    .insert({ photo_id: photoId, user_fingerprint: fp });
  await bumpViewsCount(photoId);
}

// ── 7. 已知按讚(用來顯示 like button 高亮) ───────────────────────────────
export async function fetchLikedPhotoIds(): Promise<Set<string>> {
  const supabase = createClient();
  const fp = getOrCreateFingerprint();
  const { data, error } = await supabase
    .from("travel_photo_likes")
    .select("photo_id")
    .eq("user_fingerprint", fp);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.photo_id as string));
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export const DAY_TITLES = [
  "D1 台北→上海",
  "D2 上海→西塘",
  "D3 西塘→烏鎮東柵",
  "D4 烏鎮西柵",
  "D5 烏鎮→杭州",
  "D6 杭州宋城",
  "D7 杭州運河宮宴",
  "D8 杭州→台北",
] as const;

export const DAY_RANGES = {
  1: "07-17",
  2: "07-18",
  3: "07-19",
  4: "07-20",
  5: "07-21",
  6: "07-22",
  7: "07-23",
  8: "07-24",
} as const;

export const HOUR_BUCKETS = [
  { label: "🌙 凌晨", range: [0, 5] as [number, number] },
  { label: "🌅 上午", range: [6, 11] as [number, number] },
  { label: "☀️ 中午", range: [12, 13] as [number, number] },
  { label: "🌤️ 下午", range: [14, 17] as [number, number] },
  { label: "🌃 晚上", range: [18, 23] as [number, number] },
] as const;

// 江楠 5 色對應 D1-D8 (朱紅/金/墨黑/宣紙/青花 + mint 第 6 色)
export const DAY_COLOR: Record<number, string> = {
  1: "#dc2626", // vermilion (出發日, 朱紅熱情)
  2: "#f59e0b", // gold (上海繁華)
  3: "#0e7490", // blue (西塘水鄉)
  4: "#10b981", // mint (烏鎮綠意)
  5: "#dc2626", // vermilion (返抵杭州)
  6: "#f59e0b", // gold (宋城文化)
  7: "#0e7490", // blue (運河宮宴)
  8: "#1e293b", // ink (回家日)
};