/**
 * 🆕 2026-11-17 客製書瀏覽次數計數器核心（Netlify Blobs，脫離 Supabase）
 *
 * 背景：Supabase 專案被 spend cap 限制，REST / RPC 全回 402
 *   `exceed_cached_egress_quota`。原本的 `increment_book_view_count` RPC
 *   在正式站每個預覽請求都會噴錯（雖被 try/catch 吞掉、不影響功能，
 *   但會拖慢回應並留下大量錯誤日誌）。
 *
 * 決策：把計數搬到 Netlify Blobs，公開預覽路徑完全不需要 Supabase。
 *
 * 資料模型：**每本書一個 key**（不是共用一個大檔）
 *   counters/views/<share_slug>.json  →  { "count": 42 }
 *
 * 為什麼每本書一個 key：
 *   共用一個檔的話，A 書的寫入會跟 B 書的寫入搶同一個 ETag →
 *   熱門時互相衝突、重試暴增。每本一個 key 讓不同書完全平行，
 *   只有「同一本書被同時開」才會衝突（機率低得多）。
 *
 * 為什麼用 compare-and-swap（ETag）而不是直接讀改寫：
 *   讀改寫會有 lost update —— 兩人同時開書，A 讀到 10、B 讀到 10，
 *   A 寫 11、B 寫 11 → 實際看了 12 次卻只記到 11。
 *   Netlify Blobs 的 `setJSON` 支援 `onlyIfMatch`（比對 ETag），
 *   條件不符時回 `modified: false` → 重讀重試即可。
 *
 * ⚠️ 本檔刻意 **不 import 任何 `@/` alias**：
 *    Netlify standalone function 用 esbuild 打包，不吃 tsconfig 的 paths。
 *    同一份程式要能同時被 Next.js route 與 standalone function 使用。
 */

/** Blobs store 名稱（與圖片／內容同一個 store） */
export const VIEW_COUNT_STORE = "blog-images";

/** 計數檔 key 前綴 */
export const VIEW_COUNT_PREFIX = "counters/views/";

/** 單本書的計數檔 key */
export function viewCountKey(slug: string): string {
  return `${VIEW_COUNT_PREFIX}${slug}.json`;
}

export interface ViewCountRecord {
  count: number;
}

/**
 * 本檔用到的 Blob store 最小介面。
 *
 * 為什麼不直接用 SDK 的 `Store` 型別：
 *   SDK 的 `getWithMetadata` 有多個 overload（依 `type` 選回傳型別），
 *   用結構型別描述會讓 TS 選到不對的 overload 而報錯。
 *   這裡只宣告「我實際用到的能力」，兩邊（SDK / 測試 stub）都能滿足。
 */
export interface ViewCountStore {
  getWithMetadata(
    key: string,
    options: { type: "text" },
  ): Promise<{ data: string; etag?: string } | null>;
  setJSON(
    key: string,
    data: unknown,
    options?: { onlyIfMatch?: string; onlyIfNew?: boolean },
  ): Promise<{ modified: boolean; etag?: string }>;
}

/**
 * 從任意 Blob store 讀出某本書的計數（含 ETag）。
 *
 * @param store Blob store（由呼叫端注入，方便測試）
 * @returns { count, etag }；key 不存在時回 null
 */
export async function readViewCountWithEtag(
  store: ViewCountStore,
  slug: string,
): Promise<{ count: number; etag?: string } | null> {
  const res = await store.getWithMetadata(viewCountKey(slug), { type: "text" });
  if (!res) return null;
  const etag = res.etag ?? undefined;
  const text = typeof res.data === "string" ? res.data : String(res.data ?? "");
  if (!text) return { count: 0, etag };
  try {
    const parsed = JSON.parse(text) as Partial<ViewCountRecord>;
    const count = typeof parsed.count === "number" ? parsed.count : 0;
    return { count, etag };
  } catch {
    // 檔案毀損 → 當作 0 重新建立
    return { count: 0, etag };
  }
}

/**
 * 原子遞增某本書的計數，回傳遞增後的次數。
 *
 * 流程（compare-and-swap）：
 *   1. getWithMetadata 讀出目前值 + ETag
 *   2. setJSON 帶 onlyIfMatch=ETag 寫入新值
 *   3. 若 modified=false（有人搶先寫入）→ 重讀重試
 *
 * @param maxRetries 競態時的最大重試次數
 * @returns 遞增後的次數；失敗回 null
 */
export async function incrementViewCountWithCas(
  store: ViewCountStore,
  slug: string,
  maxRetries = 30,
): Promise<number | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = await readViewCountWithEtag(store, slug);
    const next = (current?.count ?? 0) + 1;

    const writeResult = current?.etag
      ? await store.setJSON(
          viewCountKey(slug),
          { count: next } satisfies ViewCountRecord,
          { onlyIfMatch: current.etag },
        )
      : await store.setJSON(
          viewCountKey(slug),
          { count: next } satisfies ViewCountRecord,
          { onlyIfNew: true },
        );

    if (writeResult.modified) return next;

    // modified=false → ETag 不符（競態）或 key 不存在 → 重試
    await new Promise((r) => setTimeout(r, Math.min(50 * (attempt + 1), 500)));
  }
  return null;
}
