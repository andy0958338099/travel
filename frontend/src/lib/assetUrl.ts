/**
 * 把後端/DB 回傳的檔案路徑轉成前端可直接使用的 URL。
 *
 * 背景（2026-11-13）：
 * SQLite DB 的 path 欄位早期存的是舊機器的絕對路徑，例如
 *   /Volumes/Transcend/manga-studio/outputs/char_xxx.png
 * 前端直接拿來當 <img src> 會變成 http://localhost:3000/Volumes/... → 404 破圖。
 *
 * 修正流程：
 *   1. backend/scripts/migrate_absolute_paths.py 把 DB 改成專案相對路徑 (/outputs/xxx.png)
 *   2. 本函式把相對路徑轉成後端靜態掛載的完整 URL
 *
 * 後端掛載（backend/main.py）：
 *   /outputs → <PROJECT_ROOT>/outputs
 *   /assets  → <PROJECT_ROOT>/assets
 */

const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api\/?$/, "");

/** 舊的外接碟絕對路徑前綴，例如 /Volumes/Transcend/manga-studio 或 /Volumes/T7/江南部落格/manga-studio */
const VOLUME_PREFIX = /^\/Volumes\/[^/]+(?:\/[^/]+)?\/manga-studio/;

/** 後端有掛載靜態目錄的路徑前綴 */
const BACKEND_STATIC_PREFIXES = ["/outputs", "/assets", "/diary_audio", "/songs"];

/**
 * 把各種形態的路徑轉成可存取的 URL。
 * - http(s):// 開頭 → 原樣返回
 * - /outputs/xxx.png（相對路徑）→ http://localhost:8000/outputs/xxx.png
 * - /Volumes/.../manga-studio/outputs/xxx.png（舊絕對路徑）→ 同上
 * - 其他 /xxx → 原樣返回（假設是 public/ 下的靜態檔）
 */
export function toAssetUrl(path: string | null | undefined): string {
  if (!path) return "";

  const trimmed = path.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // 舊的外接碟絕對路徑 → 專案相對路徑
  let normalized = trimmed.replace(VOLUME_PREFIX, "");
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  // 後端有掛載的靜態目錄 → 指向後端
  if (BACKEND_STATIC_PREFIXES.some((p) => normalized.startsWith(p + "/") || normalized === p)) {
    return `${API_ORIGIN}${normalized}`;
  }

  return normalized;
}

/**
 * 相容舊有的 getImageUrl 用法：沒有路徑時回傳 placeholder。
 */
export function toAssetUrlOrPlaceholder(
  path: string | null | undefined,
  placeholder = "/placeholder.png"
): string {
  return toAssetUrl(path) || placeholder;
}
