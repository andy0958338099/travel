/**
 * 🆕 2026-11-14: 部落格 posts 取資料（含本地 fallback）
 *
 * 情境：Supabase 專案被 spend cap / egress quota 限制時，REST API 回 402，
 * 前端 createClient() 拿不到資料 → 部落格顯示「0 個故事」（正式站也一樣）。
 *
 * 解法：先照常走 Supabase REST；若失敗或回空陣列，改打 /api/posts-fallback，
 * 那支 route 走 pooler 直連 Postgres（同一份 DB），並把圖片網址指向本地代理。
 *
 * 恢復雲端後（REST 重新回 200），這裡會自動走回原本的 Supabase 路徑，
 * 不需要手動改任何設定。
 */

import { createClient } from "@/utils/supabase/client";

export interface FetchPostsResult<T> {
  rows: T[];
  source: "supabase" | "local-pooler";
  error?: string;
}

/**
 * 取某 trip 的 posts。Supabase 優先，失敗則退回本地 pooler。
 */
export async function fetchPostsWithFallback<T = Record<string, unknown>>(
  tripId: string
): Promise<FetchPostsResult<T>> {
  // 1) Supabase REST（正常情況）
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      return { rows: data as T[], source: "supabase" };
    }
    // 有 error 或空 → 往下試 fallback
    if (error) {
      console.warn("[posts-fallback] Supabase 查詢失敗，改用本地 pooler:", error.message);
    }
  } catch (e) {
    console.warn("[posts-fallback] Supabase 例外，改用本地 pooler:", e);
  }

  // 2) 本地 pooler fallback
  try {
    const res = await fetch(
      `/api/posts-fallback?trip_id=${encodeURIComponent(tripId)}`
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        rows: [],
        source: "local-pooler",
        error: body.error || `HTTP ${res.status}`,
      };
    }
    const json = await res.json();
    return { rows: (json.rows || []) as T[], source: "local-pooler" };
  } catch (e) {
    return {
      rows: [],
      source: "local-pooler",
      error: (e as Error).message,
    };
  }
}

/**
 * 取 trip 資料。Supabase 優先，失敗則退回本地 pooler。
 */
export async function fetchTripWithFallback<T = Record<string, unknown>>(
  tripId: string
): Promise<FetchPostsResult<T>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle();

    if (!error && data) {
      return { rows: [data as T], source: "supabase" };
    }
    if (error) {
      console.warn("[posts-fallback] trips 查詢失敗，改用本地 pooler:", error.message);
    }
  } catch (e) {
    console.warn("[posts-fallback] trips 例外，改用本地 pooler:", e);
  }

  try {
    const res = await fetch(
      `/api/posts-fallback?table=trips&trip_id=${encodeURIComponent(tripId)}`
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { rows: [], source: "local-pooler", error: body.error || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { rows: (json.rows || []) as T[], source: "local-pooler" };
  } catch (e) {
    return { rows: [], source: "local-pooler", error: (e as Error).message };
  }
}
