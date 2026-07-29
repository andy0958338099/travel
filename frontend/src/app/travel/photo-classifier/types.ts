// /Volumes/Transcend/manga-studio/frontend/src/app/travel/photo-classifier/types.ts
// 2026-07-30 聖上拍板: 輕量級照片拖曳分類與引用系統 — 資料結構

/**
 * Photo — 單張照片記錄
 * 7 個欄位 + albumId 外鍵對到 Album
 *
 * 設計原則:
 *   - 不綁特定 backend (LocalStorage / Supabase / IndexedDB 都可序列化)
 *   - order = 在 album 內的順序位置 (整數, 越小越前面)
 *   - tags 為快速標籤 (夜景/美食/景點/合照), notes 為自由文字
 *   - uploader 預設 "Unknown" — 13 位成員尚未分配的相簿
 */
export interface Photo {
  id: string;
  src: string;
  uploader: string;
  albumId: string;
  order: number;
  tags: string[];
  notes: string;
}

/**
 * Album — 相簿
 * 預設 1 個 "inbox" (收件匣), 其他由聖上新增
 */
export interface Album {
  id: string;
  name: string;
  emoji?: string;
  createdAt: number; // epoch ms
}

/**
 * 全域狀態
 */
export interface ClassifierState {
  photos: Photo[];
  albums: Album[];
  selectedAlbumId: string; // 當前面板顯示的相簿
  selectedPhotoIds: Set<string>; // 多選的 photo id
}

/**
 * 預設 uploader 常數
 */
export const DEFAULT_UPLOADER = "Unknown";

/**
 * 預設收件匣 ID
 */
export const INBOX_ALBUM_ID = "inbox";

/**
 * Drag & Drop payload schema
 * - 拖一張圖: payload = { photoIds: [id] }
 * - 拖多張: payload = { photoIds: [id1, id2, ...] }
 *
 * 用 application/x-photo-classifier MIME 自訂格式避免 text/plain 在 button 上失效
 * (7-29 聖上實證 text/plain 對 <button> source 會偶發空字串, 所以這裡也用自訂 MIME 雙寫)
 */
export interface DragPayload {
  photoIds: string[];
}

/**
 * generateEmbedCode options
 */
export interface EmbedCodeOptions {
  /** 只導 src 還是連同完整 metadata */
  fields?: Array<keyof Photo>;
  /** 倒序輸出 (最新優先) — 預設 false (order 由小到大) */
  reverse?: boolean;
  /** 限定 n 張 (取前 N 個 order) */
  limit?: number;
  /** 只導這個 tag 內的 */
  tag?: string;
}

/**
 * generateEmbedCode 回傳
 */
export interface EmbedCodeResult {
  json: string;
  photoCount: number;
  generatedAt: number;
}
