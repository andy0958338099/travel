/**
 * 🆕 2026-11-17 客製書瀏覽次數背景計數器
 *
 * POST /.netlify/functions/story-view-count?slug=<share_slug>
 *
 * 為什麼要獨立成背景 function：
 *   1. Supabase 的 `increment_book_view_count` RPC 在正式站全回 402
 *      `exceed_cached_egress_quota` → 公開預覽路徑每次都噴錯。
 *   2. 就算改成寫 Netlify Blobs，在 GET 請求裡同步做 compare-and-swap
 *      也會有兩個問題：
 *        a. Blob 讀寫各約 500ms → 每次預覽多花 1 秒。
 *        b. 同時開同一本書時 CAS 會衝突重試（實測 20 併發要 19 秒）
 *           → 撞上 function 執行時間上限。
 *   3. 背景 function 沒有回應時限包袱，可以放心重試到成功。
 *
 * 所以分工：
 *   GET /api/story-books?slug=xxx   → 只讀計數（顯示用），不寫入
 *   這個 background function          → 負責寫入計數
 *
 * 觸發時機：preview 頁面載入時（前端 fetch，fire-and-forget，不等結果）。
 *
 * ⚠️ 這支 function 刻意不 import 任何 `@/` alias：
 *    standalone function 由 esbuild 打包，不吃 tsconfig 的 paths。
 */

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  incrementViewCountWithCas,
  VIEW_COUNT_STORE,
} from "../../src/lib/viewCounterCore";

export const config: Config = {
  // 背景模式：client 立刻收到 202，實際工作在後台跑（最多 15 分鐘）
  background: true,
};

export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(JSON.stringify({ error: "Provide slug" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // Netlify runtime 會自動注入 Blobs context，getStore(name) 即可
    const store = getStore(VIEW_COUNT_STORE);
    const count = await incrementViewCountWithCas(store, slug);

    console.log(`[story-view-count] slug=${slug} count=${count}`);
    return new Response(JSON.stringify({ ok: count !== null, count }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[story-view-count] 失敗:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
