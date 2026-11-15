/**
 * 🆕 2026-11-15: 站內內容快照層（完全脫離 Supabase）
 *
 * 背景：Supabase 專案被 spend cap 限制（REST / Storage 全回 402
 * `exceed_cached_egress_quota`），線上部落格顯示「0 個故事」且圖片全破。
 *
 * 決策：把「公開可見的內容」從 Supabase 搬出來，改成 **Netlify Blobs 快照**：
 *   - `content/site-content.json` —— posts + trips + custom_story_books
 *   - `content/image-index.json` —— post id → 圖片 key 對照表
 *
 * 讀取順序：
 *   1. Netlify Blobs（線上，權限自動由 Netlify runtime 注入）
 *   2. repo 內的靜態快照（離線 / 首次部署 / Blobs 故障時的保底）
 *
 * ⚠️ 靜態快照 **不含** author_token —— repo 是公開的，token 不能進版控。
 *    有 token 的讀取（作者模式）走 Supabase pooler 或 Blobs 快照。
 *
 * 寫入：作者在編輯器存檔時，會同步更新 Blobs 快照（見 api/story-books/route.ts），
 *      所以公開頁不需要重新部署就能看到新內容。
 */

import fs from "fs";
import path from "path";
import bundledSnapshot from "@/data/site-content.public.json";

export interface SitePost {
  id: string;
  trip_id: string;
  day_number: number | string | null;
  sort_order: number | string | null;
  title: string;
  content: string;
  image_url: string | null;
  layout_type: string | null;
  author_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  frame_style: string | null;
  /** 圖片在 Blobs 的 key（由 image-index 補上） */
  image_key?: string | null;
}

export interface SiteTrip {
  id: string;
  title: string;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  hero_image?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SiteStoryBook {
  book_id: string;
  trip_id: string;
  author_name: string | null;
  author_token?: string | null;
  share_slug: string | null;
  is_public: boolean;
  title: string | null;
  layout_mode: string | null;
  selected_post_ids: string[];
  page_count_estimate?: number | null;
  view_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SiteContent {
  version: string;
  exported_at: string;
  posts: SitePost[];
  trips: SiteTrip[];
  books: SiteStoryBook[];
  /** post id → 圖片 blob key */
  imageIndex: Record<string, string>;
}

/** Blobs store 名稱（圖片與內容同一個 store） */
export const CONTENT_STORE = "blog-images";
export const CONTENT_KEY = "content/site-content.json";

/** repo 內的靜態保底快照（由 scripts/export-site-content.mjs 產生，不含 author_token） */

let memoryCache: { value: SiteContent; fetchedAt: number } | null = null;
const MEMORY_TTL_MS = 30 * 1000;

/** 讀 repo 內的靜態快照（編進 bundle，部署後一定可用） */
export function readStaticSnapshot(): SiteContent | null {
  try {
    return bundledSnapshot as unknown as SiteContent;
  } catch (e) {
    console.error("[siteContent] 靜態快照讀取失敗:", (e as Error).message);
    return null;
  }
}

/** 讀 Netlify Blobs 快照（需要 NETLIFY_BLOBS_CONTEXT 或明確 siteID/token） */
export async function readBlobSnapshot(): Promise<SiteContent | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    const store =
      siteID && token
        ? getStore({ name: CONTENT_STORE, siteID, token })
        : getStore(CONTENT_STORE);
    // SDK v11 只有 setJSON，沒有 getJSON → 用 get + JSON.parse
    const raw = await store.get(CONTENT_KEY, { type: "text" });
    if (!raw) return null;
    const text = typeof raw === "string" ? raw : String(raw);
    return JSON.parse(text) as SiteContent;
  } catch (e) {
    console.error("[siteContent] Blobs 快照讀取失敗:", (e as Error).message);
    return null;
  }
}

/**
 * 取得站內內容快照。
 * 線上走 Blobs，本地走磁碟；兩者都拿不到回 null。
 */
export async function getSiteContent(): Promise<SiteContent | null> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < MEMORY_TTL_MS) {
    return memoryCache.value;
  }

  const blob = await readBlobSnapshot();
  if (blob && Array.isArray(blob.posts) && blob.posts.length > 0) {
    memoryCache = { value: blob, fetchedAt: Date.now() };
    return blob;
  }

  const stat = readStaticSnapshot();
  if (stat) {
    memoryCache = { value: stat, fetchedAt: Date.now() };
    return stat;
  }

  return null;
}

/** 把快照寫回 Netlify Blobs（作者存檔後呼叫，讓公開頁即時生效） */
export async function writeBlobSnapshot(
  content: SiteContent
): Promise<boolean> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    const store =
      siteID && token
        ? getStore({ name: CONTENT_STORE, siteID, token })
        : getStore(CONTENT_STORE);
    await store.setJSON(CONTENT_KEY, content);
    memoryCache = { value: content, fetchedAt: Date.now() };
    return true;
  } catch (e) {
    console.error("[siteContent] Blobs 快照寫入失敗:", (e as Error).message);
    return false;
  }
}

/** 清掉記憶體快取（寫入後或測試時用） */
export function resetSiteContentCache() {
  memoryCache = null;
}

/**
 * 重新匯出 books 並寫回 Netlify Blobs（作者存檔後呼叫）。
 *
 * 背景：作者流程（POST / PATCH / DELETE）寫的是雲端 Postgres，
 *   但公開頁讀的是 Blobs 快照 —— 不同步的話作者會「存了但公開頁沒變」。
 *   posts / trips / imageIndex 不常變，直接沿用既有快照的值。
 *
 * 回傳 true 表示快照已更新。
 */
export async function refreshBooksSnapshot(): Promise<boolean> {
  try {
    const { localQuery } = await import("@/lib/localFallback");
    const books = await localQuery<Record<string, unknown>>(
      `select book_id, trip_id, author_name, author_token, share_slug, is_public,
              title, layout_mode, selected_post_ids, page_count_estimate,
              view_count, created_at, updated_at
         from custom_story_books`
    );

    const current = await getSiteContent();
    if (!current) {
      console.error("[siteContent] refreshBooksSnapshot: 沒有既有快照可基底");
      return false;
    }

    const merged: SiteContent = {
      ...current,
      books: books as unknown as SiteContent["books"],
    };
    return await writeBlobSnapshot(merged);
  } catch (e) {
    console.error("[siteContent] refreshBooksSnapshot 失敗:", (e as Error).message);
    return false;
  }
}
