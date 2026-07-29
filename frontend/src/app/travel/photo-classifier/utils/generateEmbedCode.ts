// 2026-07-30 聖上拍板: generateEmbedCode(albumId, options) 純函數工具
// 用法: 主網頁內 fetch('/api/photo-classifier/embed?albumId=xxx') 直接拉 JSON 渲染

import {
  type Photo,
  type EmbedCodeOptions,
  type EmbedCodeResult,
} from "../types";

/**
 * 將指定 album 的照片依聖上的 options 輸出標準 JSON
 *
 * 範例:
 *   const json = generateEmbedCode(albums, photos, "day-1-arrival", {
 *     fields: ["id", "src", "order"],
 *     limit: 20,
 *   }).json;
 *
 *   // fetch 在主站:
 *   // const data = JSON.parse(json);
 *   // data.items.map((p) => <Image src={p.src} />)
 *
 * @param albums 所有相簿
 * @param photos 所有照片
 * @param albumId 要導的 album id
 * @param options
 *   - fields?: 要保留哪些欄位 (預設全部)
 *   - reverse?: 倒序輸出 (預設 false, order 由小到大)
 *   - limit?: 只取前 N 個
 *   - tag?: 只導有這個 tag 的
 */
export function generateEmbedCode(
  albums: { id: string; [k: string]: unknown }[],
  photos: Photo[],
  albumId: string,
  options: EmbedCodeOptions = {}
): EmbedCodeResult {
  // 1. 拿 album metadata
  const album = albums.find((a) => a.id === albumId);
  if (!album) {
    return {
      json: JSON.stringify({
        error: `album not found: ${albumId}`,
        availableAlbums: albums.map((a) => a.id),
      }, null, 2),
      photoCount: 0,
      generatedAt: Date.now(),
    };
  }

  // 2. 篩 album
  let items = photos.filter((p) => p.albumId === albumId);

  // 3. tag 過濾 (optional)
  if (options.tag) {
    items = items.filter((p) => p.tags.includes(options.tag!));
  }

  // 4. order 排序
  items.sort((a, b) => a.order - b.order);
  if (options.reverse) items.reverse();

  // 5. limit
  if (options.limit && options.limit > 0) {
    items = items.slice(0, options.limit);
  }

  // 6. fields 過濾
  let finalItems: unknown[];
  if (options.fields) {
    finalItems = items.map((p) => {
      const out: Record<string, unknown> = {};
      for (const f of options.fields!) {
        if (f in p) out[f] = (p as never)[f];
      }
      return out;
    });
  } else {
    finalItems = items;
  }

  // 7. 包成標準 embed schema (跟聖上前端定下樣板一致, 可直接 fetch 主站渲染)
  const payload = {
    version: 1,
    album: {
      id: album.id,
      name: (album as never)["name"],
      emoji: (album as never)["emoji"],
    },
    photoCount: finalItems.length,
    generatedAt: Date.now(),
    items: finalItems,
  };

  return {
    json: JSON.stringify(payload, null, 2),
    photoCount: finalItems.length,
    generatedAt: payload.generatedAt,
  };
}

/**
 * 解析聖上 embed 用的 batch API:
 *   fetch(`/api/photo-classifier/embed?albumId=xxx&limit=20`)
 *   → 從 URLParams 拿 options 後呼叫 generateEmbedCode
 */
export function parseEmbedQuery(
  searchParams: URLSearchParams
): EmbedCodeOptions {
  const opts: EmbedCodeOptions = {};
  const limit = searchParams.get("limit");
  if (limit) opts.limit = parseInt(limit, 10);
  const reverse = searchParams.get("reverse");
  if (reverse === "true") opts.reverse = true;
  const tag = searchParams.get("tag");
  if (tag) opts.tag = tag;
  const fields = searchParams.get("fields");
  if (fields) opts.fields = fields.split(",") as Array<keyof Photo>;
  return opts;
}
