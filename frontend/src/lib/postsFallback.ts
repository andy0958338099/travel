/**
 * 🆕 2026-11-14: 部落格 posts 取資料（含本地 fallback）
 * 🆕 2026-11-15: 改為「站內快照優先」—— 線上不再依賴 Supabase REST
 *
 * 情境：Supabase 專案被 spend cap / egress quota 限制時，REST API 回 402，
 * 前端 createClient() 拿不到資料 → 部落格顯示「0 個故事」（正式站也一樣）。
 *
 * 新的讀取順序：
 *   1. `/api/posts-fallback`（站內快照：Blobs 或 repo 靜態檔，不碰 Supabase）
 *   2. Supabase REST（快照不存在時才試；將來 quota 恢復後這條會自然接回）
 *
 * 之所以把快照放前面：REST 目前必定 402，每次先打它只是白白多一個
 * 失敗請求 + 延遲。快照成功就不會再碰 Supabase。
 */

import { createClient } from "@/utils/supabase/client";

export interface FetchPostsResult<T = Record<string, unknown>> {
  rows: T[];
  source: "supabase" | "local-pooler" | "site-snapshot";
  error?: string;
}

/**
 * 取某 trip 的 posts。站內快照優先，失敗才退回 Supabase REST。
 */
export async function fetchPostsWithFallback<T = Record<string, unknown>>(
  tripId: string
): Promise<FetchPostsResult<T>> {
  // 1) 站內快照（線上主路徑）
  try {
    const res = await fetch(
      `/api/posts-fallback?trip_id=${encodeURIComponent(tripId)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = await res.json();
      const rows = (json.rows || []) as T[];
      if (rows.length > 0) {
        return {
          rows,
          source:
            (json.source as FetchPostsResult<T>["source"]) || "site-snapshot",
        };
      }
    } else {
      const body = await res.json().catch(() => ({}));
      console.warn(
        "[posts-fallback] 站內快照失敗，改用 Supabase:",
        body.error || `HTTP ${res.status}`
      );
    }
  } catch (e) {
    console.warn("[posts-fallback] 站內快照例外，改用 Supabase:", e);
  }

  // 2) Supabase REST（快照不可用時的退路）
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
    if (error) {
      console.warn("[posts-fallback] Supabase 查詢失敗:", error.message);
    }
  } catch (e) {
    console.warn("[posts-fallback] Supabase 例外:", e);
  }

  return { rows: [], source: "supabase", error: "所有來源都無法取得資料" };
}

/**
 * 取 trip 資料。站內快照優先，失敗才退回 Supabase REST。
 */
export async function fetchTripWithFallback<T = Record<string, unknown>>(
  tripId: string
): Promise<FetchPostsResult<T>> {
  // 1) 站內快照
  try {
    const res = await fetch(
      `/api/posts-fallback?table=trips&trip_id=${encodeURIComponent(tripId)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const json = await res.json();
      const rows = (json.rows || []) as T[];
      if (rows.length > 0) {
        return {
          rows,
          source:
            (json.source as FetchPostsResult<T>["source"]) || "site-snapshot",
        };
      }
    }
  } catch (e) {
    console.warn("[posts-fallback] trips 快照例外:", e);
  }

  // 2) Supabase REST
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
      console.warn("[posts-fallback] trips 查詢失敗:", error.message);
    }
  } catch (e) {
    console.warn("[posts-fallback] trips 例外:", e);
  }

  return { rows: [], source: "supabase", error: "所有來源都無法取得資料" };
}
