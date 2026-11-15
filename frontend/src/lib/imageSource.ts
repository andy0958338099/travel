/**
 * 部落格圖片來源解析
 *
 * posts.image_url 可能有三種形態：
 *   1. https://...               — 直接可取的網址（Supabase Storage / Google 相簿 / Drive）
 *   2. gdrive:<fileId>           — Google Drive 檔案（由 toDisplayImageUrl 解析）
 *   3. /outputs/... 等專案相對路徑 → 交給 toAssetUrl 轉後端網址
 *
 * 為什麼需要這一層：資料表欄位保持單一（不新增欄位、不動既有 371 筆），
 *   但渲染時可以把 `gdrive:` token 換成 Google 的圖片網址。
 *   這樣雲端資料完全不動，就能先驗證「直接取用 Google Drive」的可行性。
 */

/** gdrive: token 前綴 */
export const GDRIVE_PREFIX = "gdrive:";

/** 判斷是否為 gdrive token */
export function isGdriveToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().startsWith(GDRIVE_PREFIX);
}

/** 從 gdrive token 取出 file ID */
export function gdriveFileId(value: string | null | undefined): string | null {
  if (!isGdriveToken(value)) return null;
  const id = (value as string).trim().slice(GDRIVE_PREFIX.length).trim();
  return id || null;
}

/** 把 gdrive token 組成 gdrive: 前綴 */
export function toGdriveToken(fileId: string): string {
  return `${GDRIVE_PREFIX}${fileId}`;
}

/**
 * Google Drive 圖片網址。
 *
 * 走本站的認證代理 /api/gdrive/image?fileId=<id>：
 *   - Drive 的私人檔案無法用公開的 lh3.googleusercontent.com 取
 *   - 代理端用 refresh token 換 access token，再轉發 Drive 內容
 *   - 圖片流量走 Google，不佔 Supabase Storage
 *
 * 相對網址在 server component 與 client component 都能用（皆同源）。
 */
export function gdriveImageUrl(fileId: string, width = 1600): string {
  // 伺服器端縮圖：Drive 原圖常是 3000x4000 / 1.5MB+，直接給瀏覽器太重
  return `/api/gdrive/image?fileId=${encodeURIComponent(fileId)}&w=${Math.round(width)}`;
}

/**
 * 把 image_url 轉成可以直接放進 <img src> 的網址。
 *
 * - gdrive:<fileId> → Google 圖片網址
 * - http(s)://      → 原樣
 * - 其他（相對路徑）→ 交給 toAssetUrl（避免循環 import，這裡內嵌最小邏輯）
 *
 * @param width 圖片寬度上限（僅對 gdrive 生效）
 */
export function toDisplayImageUrl(
  imageUrl: string | null | undefined,
  width = 1600
): string {
  if (!imageUrl) return "";
  const trimmed = imageUrl.trim();
  if (!trimmed) return "";

  const fileId = gdriveFileId(trimmed);
  if (fileId) return gdriveImageUrl(fileId, width);

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // 專案相對路徑 → 指向後端靜態掛載
  const API_ORIGIN = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
  ).replace(/\/api\/?$/, "");
  const normalized = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  if (
    ["/outputs", "/assets", "/diary_audio", "/songs"].some(
      (p) => normalized.startsWith(p + "/") || normalized === p
    )
  ) {
    return `${API_ORIGIN}${normalized}`;
  }
  return normalized;
}
