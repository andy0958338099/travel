/**
 * Google Drive 存取模組（server-side only）
 *
 * 用途：讓部落格照片可以直接存放在 Google Drive 的指定資料夾，
 *   而不必全部塞進 Supabase Storage。posts.image_url 欄位存
 *   `gdrive:<fileId>` 前綴的 token，渲染前由 toDisplayImageUrl() 解析成
 *   真正可取的圖片網址。
 *
 * 憑證來源（.env.local）：
 *   GOOGLE_PHOTOS_CLIENT_ID / GOOGLE_PHOTOS_CLIENT_SECRET  — OAuth Client
 *   GOOGLE_DRIVE_REFRESH_TOKEN                            — OAuth refresh token
 *
 * OAuth scope：https://www.googleapis.com/auth/drive.readonly
 *   （只需讀取；寫入用 drive.file）
 *
 * 設計要點：
 *   1. 拿不到憑證時不回傳錯誤，讓呼叫端決定是否 fallback 到 Supabase。
 *   2. access token 由 refresh token 換取，並在到期前自動續期。
 *   3. 圖片網址走 Google 的 lh3.googleusercontent.com 端點（免 CORS、免計費），
 *      需要檔案是「知道連結的 anyone」或已用 service account 共享。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 型別
// ─────────────────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  parents?: string[];
}

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

// refresh token 換來的 access token 快取（避免每張圖都換一次 token）
let tokenCache: TokenState | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// 憑證
// ─────────────────────────────────────────────────────────────────────────────

function getClientId(): string | null {
  return process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_PHOTOS_CLIENT_ID || null;
}

function getClientSecret(): string | null {
  return (
    process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_PHOTOS_CLIENT_SECRET || null
  );
}

function getRefreshToken(): string | null {
  return process.env.GOOGLE_DRIVE_REFRESH_TOKEN || null;
}

/** 憑證是否齊全（缺任何一項都無法存取 Drive） */
export function hasDriveCredentials(): boolean {
  return Boolean(getClientId() && getClientSecret() && getRefreshToken());
}

// ─────────────────────────────────────────────────────────────────────────────
// Token
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 用 refresh token 換 access token，並快取到快到期前才續期。
 * 任何失敗都回傳 null（呼叫端自行 fallback），不丟例外。
 */
export async function getAccessToken(): Promise<string | null> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = getRefreshToken();
  if (!clientId || !clientSecret || !refreshToken) return null;

  // 快取還有效就直接用（提前 60 秒續期）
  if (tokenCache && tokenCache.expiresAt - 60_000 > Date.now()) {
    return tokenCache.accessToken;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    return tokenCache.accessToken;
  } catch {
    return null;
  }
}

/** 測試用：清掉 token 快取 */
export function resetTokenCache(): void {
  tokenCache = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drive API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 列出 Drive 資料夾底下的檔案。
 *
 * @param folderId Drive 資料夾 ID（也可以是 'root'）
 * @param opts.mimeType 只取特定 MIME type（圖片用 image/）
 * @param opts.pageSize 分頁大小（Drive 上限 1000）
 */
export async function listDriveFolder(
  folderId: string,
  opts: { mimeType?: string; pageSize?: number } = {}
): Promise<DriveFile[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const pageSize = Math.min(opts.pageSize ?? 200, 1000);
  const q = [`'${folderId}' in parents`, `trashed = false`];
  if (opts.mimeType) q.push(`mimeType contains '${opts.mimeType}'`);

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", q.join(" and "));
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webContentLink,parents)"
  );
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { files?: DriveFile[] };
    return data.files ?? [];
  } catch {
    return [];
  }
}

/**
 * 取得單一檔案 metadata。
 *
 * 加上記憶體快取：Drive metadata API 單次呼叫要 5~40 秒，
 * 而圖片代理每張圖都會查一次，沒有快取會讓頁面慢到不能用。
 * TTL 5 分鐘，夠短所以不會長期過期。
 */
const metaCache = new Map<string, { at: number; file: DriveFile }>();
const META_TTL_MS = 5 * 60 * 1000;

export async function getDriveFile(fileId: string): Promise<DriveFile | null> {
  const cached = metaCache.get(fileId);
  if (cached && Date.now() - cached.at < META_TTL_MS) {
    return cached.file;
  }

  const token = await getAccessToken();
  if (!token) return null;

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  url.searchParams.set(
    "fields",
    "id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webContentLink,parents"
  );
  url.searchParams.set("supportsAllDrives", "true");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const file = (await res.json()) as DriveFile;
    metaCache.set(fileId, { at: Date.now(), file });
    return file;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 圖片網址
// ─────────────────────────────────────────────────────────────────────────────

/** 圖片 MIME type 判斷 */
export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * 把 Drive file ID 轉成可直接放進 <img src> 的網址。
 *
 * 用 lh3.googleusercontent.com 的 /d/<id>=w1600 形式：
 *   - 免 CORS（純 <img> 載入不需要）
 *   - Google CDN，圖片流量不佔 Supabase
 *   - 支援寬度參數，自動產生縮圖
 *
 * 注意：檔案需要對該 Google 帳號可見（anyone with link 或同帳號）。
 */
export function driveImageUrl(fileId: string, width = 1600): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${width}`;
}

/**
 * Drive 檔案的原始內容網址（走 Drive API，需要 token）。
 * 適合需要原始解析度或需要重新上傳的場合。
 */
export async function driveFileContentUrl(fileId: string): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?alt=media&access_token=${encodeURIComponent(token)}`;
}
