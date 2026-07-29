// 2026-07-30 聖上拍板: JSON 驅動 — 主網頁直接 renderGallery 的範例實現
//
// 用法:
//   import { renderGallery, fetchPhotosMetadata } from "./renderGalleryExample";
//   const data = await fetchPhotosMetadata();
//   renderGallery(data, { albumId: "day-1-dinner", target: "#gallery", layout: "grid" });

export interface PhotosMetadata {
  _comment?: string;
  _version?: number;
  _generatedAt?: string;
  albums: Array<{
    id: string;
    name: string;
    emoji?: string;
  }>;
  photos: Array<{
    id: string;
    src: string;
    uploader: string;
    albumId: string;
    order: number;
    tags?: string[];
    notes?: string;
  }>;
  _stats?: {
    totalPhotos: number;
    totalAlbums: number;
    uploaders: string[];
  };
}

export interface RenderOptions {
  /** 要顯示哪個 album 的照片。空字串 = 全部 photos 一起渲染 */
  albumId?: string;
  /** 動態插入 HTML 的容器 (CSS selector 或 HTMLElement) */
  target: string | HTMLElement;
  /** grid 或 carousel slider (聖上前 prompt 提的兩種) */
  layout?: "grid" | "carousel";
  /** grid columns 數 (only grid layout) */
  columns?: number;
  /** 顯示 uploader/notes/tags overlay (default true) */
  showOverlay?: boolean;
  /** 額外 CSS class 套在最外層 */
  className?: string;
}

/**
 * 從公開 JSON URL 抓 metadata
 * 預設: /photos-metadata.json (聖上 7-30 拍板的 public/photos-metadata.json)
 */
export async function fetchPhotosMetadata(
  url: string = "/photos-metadata.json"
): Promise<PhotosMetadata> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to fetch photos-metadata.json: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * 主入口: 把指定 album 的照片渲染到容器
 * - layout="grid" → 4 欄網格 (預設,可改 columns)
 * - layout="carousel" → 水平滑動, 每張 250px 寬, overflow-x auto
 *
 * 設計重點: photo 實體不搬移, 只改 JSON 欄位 → 主網頁改 URL/albumId 就重新排列
 */
export function renderGallery(
  metadata: PhotosMetadata,
  options: RenderOptions
): void {
  const {
    albumId,
    target,
    layout = "grid",
    columns = 4,
    showOverlay = true,
    className = "",
  } = options;

  // 1. 篩選
  let photos = metadata.photos;
  if (albumId) {
    photos = photos.filter((p) => p.albumId === albumId);
  }

  // 2. 依聖上拍板的 order 排序 (小→前)
  photos = [...photos].sort((a, b) => a.order - b.order);

  // 3. 找容器
  const container =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!container) {
    console.error(`[renderGallery] target not found: ${target}`);
    return;
  }

  // 4. Build HTML string
  const album = albumId
    ? metadata.albums.find((a) => a.id === albumId)
    : undefined;

  const headerHTML = album
    ? `<div class="gallery-header">
         <h2>${album.emoji ?? "📁"} ${escapeHtml(album.name)}
           <span class="count">${photos.length} 張</span>
         </h2>
       </div>`
    : `<div class="gallery-header">
         <h2>📷 所有照片 <span class="count">${photos.length} 張</span></h2>
       </div>`;

  const gridStyle = layout === "grid"
    ? `display:grid; grid-template-columns:repeat(${columns}, 1fr); gap:8px;`
    : `display:flex; overflow-x:auto; gap:12px; padding-bottom:12px; scroll-snap-type:x mandatory;`;

  const photosHTML = photos
    .map((p) => buildPhotoHTML(p, showOverlay, layout === "carousel"))
    .join("");

  // 5. 注入
  container.innerHTML = `
    <div class="photo-gallery ${className}">
      ${headerHTML}
      <div class="gallery-grid" style="${gridStyle}">
        ${photosHTML}
      </div>
    </div>
  `;
}

function buildPhotoHTML(
  p: PhotosMetadata["photos"][number],
  showOverlay: boolean,
  isCarousel: boolean
): string {
  const cardStyle = isCarousel
    ? `flex:0 0 250px; scroll-snap-align:start; aspect-ratio:1/1;`
    : `aspect-ratio:1/1;`;

  const overlay = showOverlay
    ? `<div class="photo-overlay">
         <div class="uploader">👤 ${escapeHtml(p.uploader)}</div>
         ${p.tags && p.tags.length > 0
           ? `<div class="tags">${p.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div>`
           : ""}
         ${p.notes ? `<div class="notes">${escapeHtml(p.notes)}</div>` : ""}
       </div>`
    : "";

  return `
    <figure class="photo-card"
            style="${cardStyle}"
            data-photo-id="${escapeHtml(p.id)}"
            data-album-id="${escapeHtml(p.albumId)}">
      <img src="${escapeHtml(p.src)}"
           alt="${escapeHtml(p.notes ?? p.id)}"
           loading="lazy"
           draggable="false"
           style="width:100%; height:100%; object-fit:cover;" />
      ${overlay}
    </figure>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

/* ────────────────────────────────────────────────────────────────────────
   完整 fetch + render 範例 (聖上要求 copy-paste 即用版):

   // 在主網頁的任意組件內 (client side):
   import { fetchPhotosMetadata, renderGallery } from "@/utils/renderGalleryExample";

   // 範例 1: 渲染 Day 1 晚餐當 4 欄網格
   const data = await fetchPhotosMetadata();
   renderGallery(data, {
     albumId: "day-1-dinner",
     target: "#day1-dinner-gallery",
     layout: "grid",
     columns: 4,
   });

   // 範例 2: 渲染夜景主題當 carousel slider
   renderGallery(data, {
     albumId: "night-scene",
     target: "#night-scene",
     layout: "carousel",
     columns: 4,
   });

   // 範例 3: 全部 3000+ 照片 (罕用, 只在最終 export 用)
   renderGallery(data, {
     target: "#all-photos",
     layout: "grid",
     columns: 6,
   });

   // 範例 4: 即時切換 album — 不用重新 fetch
   const onAlbumChange = (newAlbumId: string) => {
     renderGallery(data, {
       albumId: newAlbumId,
       target: "#gallery",
       layout: "grid",
     });
   };
   ──────────────────────────────────────────────────────────────────────── */
