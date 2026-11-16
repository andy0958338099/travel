/**
 * 圖片代理的快取版本參數
 *
 * 🆕 2026-11-15
 *
 * 背景：Netlify CDN 的 cache key 曾經不含一般 query（只認 `_rsc` / `__nextDataReq`），
 * 導致所有 `/api/local-image?postId=...` 都回同一張圖。那段期間瀏覽器已經把
 * 每個 postId 的網址各自快取成同一張圖，而回應的 `Cache-Control` 是
 * `public, max-age=604800`（7 天）→ 使用者端會持續看到錯誤圖片，
 * 即使 CDN 端早已修正。
 *
 * 解法：圖片網址帶一個版本參數 `v=<IMAGE_VERSION>`，改版時遞增即可讓
 * 瀏覽器與 CDN 的 cache key 全部失效。
 *
 * ⚠️ 每次更換圖片來源／重新上傳圖片後，務必把這裡的版本 +1。
 */
export const IMAGE_VERSION = "2";
