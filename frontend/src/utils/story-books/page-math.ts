/**
 * 🆕 2026-10-20 聖上指示: 客製書頁數估算 (與 print 頁 paginateDay 對齊)
 *
 * 為什麼獨立檔:
 *   - /story-blog-custom 勾選頁 → 給「live 估算」用,即時回應 < 100ms
 *   - /story-blog-print/preview/[slug] → 給 Puppeteer 真拍用,精準 paginateDay
 *   - 兩者用同一份算法 ≈,只是 print preview 多了 image dims + content shorten
 *
 * 估算規則 (對齊 print 頁 paginateDay v23):
 *   - 封面 1 頁 + 扉頁 1 頁 + 目錄 1 頁 = 3 頁 (固定)
 *   - 每 Day 一個 intro 頁 = unique_days 頁
 *   - 模式 A / B:每篇獨立,post_pages ≈ ceil(N / 1.0)
 *   - 模式 C:智慧共頁(post < 100 字 + 同 orientation),post_pages ≈ ceil(N / 2.2)
 *   - unique_days 估算:有勾到的 posts 跨多少 Day (真算,不假設)
 */

type PostLite = {
  id: string;
  day_number: number;
  content: string;
  image_url: string | null;
  layout_type?: string; // left-image / right-image / top-image
};

type LayoutMode = "A" | "B" | "C";

/** 取得勾選 posts 跨的 unique days(用真實 posts) */
function uniqueDayCount(selectedPosts: PostLite[]): number {
  const set = new Set<number>();
  for (const p of selectedPosts) set.add(p.day_number);
  return set.size;
}

/**
 * 估算頁數
 * @param selectedPostCount 已選篇數 (整數)
 * @param layoutMode A/B/C
 * @param selectedPosts 可選 — 提供時用真實 day 分布算 intro 頁
 */
export function estimatePageCount(
  selectedPostCount: number,
  layoutMode: LayoutMode,
  selectedPosts?: PostLite[],
): number {
  if (selectedPostCount === 0) return 3; // 封面+扉頁+目錄,空書

  // intro 頁 = unique days
  const days =
    selectedPosts && selectedPosts.length > 0
      ? Math.max(1, uniqueDayCount(selectedPosts))
      : Math.min(10, Math.ceil(selectedPostCount / 30)); // fallback 估算

  // 模式差異
  const perPage = layoutMode === "C" ? 2.2 : 1.0; // A/B 一篇/頁
  const postPages = Math.ceil(selectedPostCount / perPage);

  return 3 /* cover+frontispiece+toc */ + days + postPages;
}
